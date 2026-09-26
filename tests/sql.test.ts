/// <reference types="node" />
/**
 * Runs the real Supabase migration against an in-memory Postgres (PGlite) and
 * plays the game through the same functions the app calls. Supabase's `auth`
 * schema is stubbed: auth.uid() reads the user id we set per call.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { scoreAnswer } from '@/game/scoring';
import type { Call } from '@/game/types';

const MIGRATION = readFileSync(new URL('../supabase/migrations/20260927000000_init.sql', import.meta.url), 'utf8');
const BOARDS = ['video-games', 'music', 'general', 'history', 'geography', 'film', 'science', 'pop-culture', 'tech', 'anime', 'tv', 'books-art', 'sports', 'mind-games', 'cricket', 'bollywood'];

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

let db: PGlite;

async function asUser<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role;');
  }
}

async function rpc<T = Record<string, unknown>>(uid: string, fn: string, args: unknown[] = []): Promise<T> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
  const rows = await asUser<{ r: T }>(uid, `select public.${fn}(${placeholders}) as r`, args);
  return rows[0].r;
}

async function expectError(p: Promise<unknown>, match: RegExp) {
  await expect(p).rejects.toThrow(match);
}

/** Pretends the current question was shown `ms` ago (now() is fixed inside a transaction, so we move shown_at instead). */
async function shownAgo(uid: string, board: string, qIndex: number, ms: number) {
  await db.query(`update public.answers set shown_at = now() - make_interval(secs => $1::float / 1000) where user_id = $2 and board = $3 and q_index = $4`, [ms, uid, board, qIndex]);
}

async function answerIndexFor(uid: string, board: string, qIndex: number): Promise<number> {
  const rows = (
    await db.query<{ answer_index: number }>(
      `select q.answer_index from public.answers a join public.questions q on q.id = a.question_id where a.user_id = $1 and a.board = $2 and a.q_index = $3`,
      [uid, board, qIndex],
    )
  ).rows;
  return rows[0].answer_index;
}

/** Plays one question: teaser → call → answer after `ms` (correct, wrong or null = timeout). */
async function playQuestion(uid: string, board: string, i: number, call: Call, outcome: 'right' | 'wrong' | 'timeout', ms = 3_000) {
  await rpc(uid, 'get_teaser', [board, i]);
  await rpc(uid, 'place_call', [board, i, call]);
  await shownAgo(uid, board, i, ms);
  const right = await answerIndexFor(uid, board, i);
  const choice = outcome === 'timeout' ? null : outcome === 'right' ? right : (right + 1) % 2;
  return rpc<{ points: number; correct: boolean; total: number; finished: boolean; ms_left: number }>(uid, 'submit_answer', [board, i, choice]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(MIGRATION);
  // Running it twice must be safe (people re-run it after edits).
  await db.exec(MIGRATION);

  await db.query(`insert into auth.users (id) values ($1), ($2), ($3)`, [A, B, C]);
  // 20 questions per board: enough for every run and for the no-repeat rule.
  const values: string[] = [];
  for (const b of BOARDS) {
    for (let i = 0; i < 20; i++) {
      values.push(`('${b}', 'Question ${i} about ${b}?', 'Question ${i}', array['Right','Wrong','Other','Else'], 0, 'test-${b}-${i}')`);
    }
  }
  await db.exec(`insert into public.questions (board, prompt, teaser, options, answer_index, source_id) values ${values.join(',')};`);
}, 60_000);

describe('score_answer (SQL) matches src/game/scoring.ts', () => {
  it('for every call, result and time left', async () => {
    const calls: Call[] = ['safe', 'sure', 'allin'];
    const ms = [-100, 0, 1, 299, 300, 999, 5_000, 7_500, 12_345, 14_999, 15_000, 20_000];
    for (const call of calls) {
      for (const correct of [true, false]) {
        for (const m of ms) {
          const rows = (await db.query<{ p: number }>('select public.score_answer($1, $2, $3) as p', [call, correct, m])).rows;
          expect(rows[0].p, `${call} ${correct} ${m}`).toBe(scoreAnswer(call, correct, m));
        }
      }
    }
  });
});

describe('profiles', () => {
  it('validates nicknames and allows non-English names', async () => {
    await rpc(A, 'set_profile', ['sam', '🦊']);
    await rpc(B, 'set_profile', ['आरव', '🐯']);
    await rpc(C, 'set_profile', ['Riya  S', '🦉']);
    const rows = await asUser<{ nickname: string }>(A, `select nickname from public.profiles order by nickname`);
    expect(rows.map((r) => r.nickname)).toEqual(['Riya S', 'sam', 'आरव']);
    await expectError(rpc(A, 'set_profile', ['ab', '🦊']), /invalid nickname/);
    await expectError(rpc(A, 'set_profile', ['<script>', '🦊']), /invalid nickname/);
    await expectError(rpc(A, 'set_profile', ['___', '🦊']), /invalid nickname/);
    await expectError(rpc(A, 'set_profile', ['back\\slash', '🦊']), /invalid nickname/);
  });

  it('refuses anyone who is not signed in', async () => {
    await expectError(rpc('', 'get_teaser', ['mixed', 0]), /not signed in/);
  });
});

describe('a ranked run', () => {
  it('shows only the teaser before the call, then options, then scores on the server', async () => {
    const t = await rpc<{ teaser: string; question_count: number; call: string | null }>(A, 'get_teaser', ['history', 0]);
    expect(t.teaser).toMatch(/^Question \d+$/);
    expect(t.question_count).toBe(5);
    expect(t).not.toHaveProperty('options');
    expect(t).not.toHaveProperty('answer_index');

    const q = await rpc<{ prompt: string; options: string[] }>(A, 'place_call', ['history', 0, 'allin']);
    expect(q.options).toEqual(['Right', 'Wrong', 'Other', 'Else']);
    expect(q).not.toHaveProperty('answer_index');

    await shownAgo(A, 'history', 0, 3_000);
    const res = await rpc<{ points: number; correct: boolean; ms_left: number }>(A, 'submit_answer', ['history', 0, 0]);
    expect(res.correct).toBe(true);
    // ~3 s taken: 12 s left → bonus 40 → (100 + 40) × 3. Allow 1 point for the clock ticking.
    expect(res.points).toBeGreaterThanOrEqual(417);
    expect(res.points).toBeLessThanOrEqual(420);
  });

  it('allows one answer per question and no skipping ahead', async () => {
    await expectError(rpc(A, 'submit_answer', ['history', 0, 1]), /already answered/);
    await expectError(rpc(A, 'get_teaser', ['history', 0]), /already answered/);
    await expectError(rpc(A, 'get_teaser', ['history', 2]), /answer the current question first/);
    await expectError(rpc(A, 'place_call', ['history', 2, 'safe']), /not the current question/);
    await expectError(rpc(A, 'submit_answer', ['history', 1, 0]), /make your call first/);
  });

  it('keeps the first call and start time if the call is sent again', async () => {
    await rpc(A, 'get_teaser', ['history', 1]);
    const first = await rpc<{ call: string; shown_at: string }>(A, 'place_call', ['history', 1, 'safe']);
    const again = await rpc<{ call: string; shown_at: string }>(A, 'place_call', ['history', 1, 'allin']);
    expect(again.call).toBe('safe');
    expect(again.shown_at).toBe(first.shown_at);
    const t = await rpc<{ call: string }>(A, 'get_teaser', ['history', 1]);
    expect(t.call).toBe('safe');
  });

  it('treats a timeout, and an answer after the clock plus grace, as a miss', async () => {
    await shownAgo(A, 'history', 1, 5_000);
    const timeout = await rpc<{ points: number; correct: boolean }>(A, 'submit_answer', ['history', 1, null]);
    expect(timeout).toMatchObject({ points: 0, correct: false }); // Safe loses nothing

    await rpc(A, 'get_teaser', ['history', 2]);
    await rpc(A, 'place_call', ['history', 2, 'sure']);
    await shownAgo(A, 'history', 2, 16_600);
    const late = await rpc<{ points: number; correct: boolean; choice: number | null }>(A, 'submit_answer', ['history', 2, await answerIndexFor(A, 'history', 2)]);
    expect(late).toMatchObject({ points: -150, correct: false, choice: null });
  });

  it('accepts a right answer that arrives just after 15 s (network lag) with no bonus', async () => {
    await rpc(A, 'get_teaser', ['history', 3]);
    await rpc(A, 'place_call', ['history', 3, 'sure']);
    await shownAgo(A, 'history', 3, 15_800);
    const res = await rpc<{ points: number; correct: boolean }>(A, 'submit_answer', ['history', 3, await answerIndexFor(A, 'history', 3)]);
    expect(res).toMatchObject({ points: 200, correct: true });
  });

  it('turns a question left open (app closed) into a timeout when you come back', async () => {
    await rpc(A, 'get_teaser', ['history', 4]);
    await rpc(A, 'place_call', ['history', 4, 'allin']);
    await shownAgo(A, 'history', 4, 30_000);
    const recap = await rpc<Array<{ points: number; choice: number | null }>>(A, 'run_recap', ['history']);
    expect(recap).toHaveLength(5);
    expect(recap[4]).toMatchObject({ points: -300, choice: null });
  });

  it('finishes the run, counts the day streak once and blocks a second attempt', async () => {
    const today = await asUser<{ board: string; finished: boolean; total: number; answered: number }>(A, 'select * from public.my_today()');
    expect(today).toEqual([expect.objectContaining({ board: 'history', finished: true, answered: 5 })]);
    await expectError(rpc(A, 'get_teaser', ['history', 0]), /already played today/);
    const p = (await db.query<{ day_streak: number }>('select day_streak from public.profiles where id = $1', [A])).rows[0];
    expect(p.day_streak).toBe(1);
  });

  it('keeps the recap closed until the run is finished', async () => {
    await rpc(B, 'get_teaser', ['history', 0]);
    await expectError(rpc(B, 'run_recap', ['history']), /run not finished/);
  });
});

describe('daily sets', () => {
  it('gives every player the same questions', async () => {
    const qa = await rpc<{ prompt: string }>(B, 'place_call', ['history', 0, 'safe']);
    const recapA = await rpc<Array<{ prompt: string }>>(A, 'run_recap', ['history']);
    expect(qa.prompt).toBe(recapA[0].prompt);
  });

  it('builds the Mixed run from 10 different boards', async () => {
    await rpc(C, 'get_teaser', ['mixed', 0]);
    const rows = (
      await db.query<{ n: number; boards: number }>(
        `select cardinality(d.question_ids) as n, (select count(distinct q.board) from public.questions q where q.id = any (d.question_ids))::int as boards
         from public.daily_sets d where d.board = 'mixed'`,
      )
    ).rows;
    expect(rows[0]).toEqual({ n: 10, boards: 10 });
  });

  it('rejects unknown boards', async () => {
    await expectError(rpc(C, 'get_teaser', ['casino', 0]), /unknown board/);
  });
});

describe('security', () => {
  it('hides questions, answers and daily sets from players', async () => {
    await expectError(asUser(A, 'select * from public.questions'), /permission denied/);
    await expectError(asUser(A, 'select * from public.daily_sets'), /permission denied/);
    await expectError(asUser(A, 'select * from public.answers'), /permission denied/);
  });

  it('shows only your own runs', async () => {
    const rows = await asUser<{ user_id: string }>(C, 'select user_id from public.runs');
    expect(rows.every((r) => r.user_id === C)).toBe(true);
  });

  it('blocks direct writes and internal functions', async () => {
    await expectError(asUser(A, `update public.runs set total = 99999`), /permission denied/);
    await expectError(asUser(A, `update public.profiles set is_pro = true`), /permission denied/);
    await expectError(asUser(A, `insert into public.moments (id, title, sub, emoji, tier) values ('x','x','x','x','big')`), /permission denied/);
    await expectError(rpc(A, 'record_answer', [A, '2026-01-01', 'history', 0, 0]), /permission denied/);
    await expectError(rpc(A, 'ensure_daily_set', ['tech', '2026-01-01']), /permission denied/);
  });

  it('lets anyone read moment captions', async () => {
    await db.exec(`reset role; set role anon;`);
    const rows = (await db.query('select id from public.moments')).rows;
    await db.exec('reset role;');
    expect(rows).toHaveLength(10);
  });
});

describe('boards and leagues', () => {
  it('ranks the week and always includes you', async () => {
    // B and C play the same geography run with different results.
    for (let i = 0; i < 5; i++) await playQuestion(B, 'geography', i, 'sure', 'right');
    for (let i = 0; i < 5; i++) await playQuestion(C, 'geography', i, 'allin', 'right');
    const board = await asUser<{ rank: number; nickname: string; total: number; is_me: boolean }>(B, `select * from public.weekly_board('geography')`);
    expect(board.map((r) => r.nickname)).toEqual(['Riya S', 'आरव']);
    expect(board[1].is_me).toBe(true);
    expect(Number(board[0].rank)).toBe(1);

    const top1 = await asUser(B, `select * from public.weekly_board('geography', null, null, 1)`);
    expect(top1).toHaveLength(2); // top 1 + your own row
  });

  it('creates a league with a code, joins it and filters the board', async () => {
    const league = await rpc<{ id: string; code: string }>(B, 'create_league', ['Hostel B4']);
    expect(league.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    await expectError(asUser(A, `select * from public.weekly_board('geography', null, '${league.id}')`), /not in that league/);
    await rpc(A, 'join_league', [league.code.toLowerCase()]);
    const board = await asUser<{ nickname: string }>(A, `select * from public.weekly_board('geography', null, '${league.id}')`);
    expect(board.map((r) => r.nickname)).toEqual(['आरव']); // A hasn't played geography, C isn't in the league
    const mine = await asUser<{ name: string; members: number; is_owner: boolean }>(A, 'select * from public.my_leagues()');
    expect(mine).toEqual([expect.objectContaining({ name: 'Hostel B4', is_owner: false })]);
    expect(Number(mine[0].members)).toBe(2);
    await expectError(rpc(A, 'join_league', ['ZZZZZZ']), /no league with that code/);
  });

  it('can require Pro to create leagues once the webhook is live', async () => {
    await db.exec(`update public.app_settings set value = 'true' where key = 'enforce_pro_server'`);
    await expectError(rpc(C, 'create_league', ['Nope League']), /needs Call It Pro/);
    await db.exec(`update public.profiles set is_pro = true where id = '${C}'`);
    await expect(rpc(C, 'create_league', ['Pro League'])).resolves.toBeTruthy();
    await db.exec(`update public.app_settings set value = 'false' where key = 'enforce_pro_server'`);
  });

  it('accepts reports only for questions you have answered', async () => {
    await expectError(rpc(C, 'report_question', ['tech', 0, 'wrong answer']), /answer it first/);
    await rpc(A, 'report_question', ['history', 0, 'The answer looks wrong']);
    const n = (await db.query<{ n: number }>('select count(*)::int as n from public.reports')).rows[0].n;
    expect(n).toBe(1);
  });
});
