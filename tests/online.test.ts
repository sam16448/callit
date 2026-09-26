/**
 * The real online driver (src/services/onlineDriver.ts) playing against the
 * real SQL functions. Only the network hop is replaced: api calls go straight
 * to an in-memory Postgres instead of through supabase.rpc.
 */
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { runReducer, startRun, type RunState } from '@/game/run';
import { recordFromRecap } from '@/lib/share';
import { nearYou } from '@/lib/board';
import { createDb, rpcNamed } from './helpers/pg';

const ME = '00000000-0000-4000-8000-0000000000d1';
const FRIEND = '00000000-0000-4000-8000-0000000000d2';
let db: PGlite;
let currentUser = ME;

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  const rpc = async <T,>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
    try {
      return await rpcNamed<T>(db, currentUser, fn, args);
    } catch (e) {
      throw actual.toApiError(e as Error);
    }
  };
  return {
    ...actual,
    api: {
      teaser: (board: string, i: number) => rpc('get_teaser', { p_board: board, p_q_index: i }),
      call: (board: string, i: number, call: string) => rpc('place_call', { p_board: board, p_q_index: i, p_call: call }),
      answer: (board: string, i: number, choice: number | null) => rpc('submit_answer', { p_board: board, p_q_index: i, p_choice: choice }),
      today: () => rpc('my_today'),
      recap: (board: string) => rpc('run_recap', { p_board: board, p_day: null }),
      board: (board: string) => rpc('weekly_board', { p_board: board, p_week: null, p_league_id: null, p_limit: 100 }),
    },
  };
});

// The supabase client module touches React Native; the driver doesn't need it here.
vi.mock('@/services/supabase', () => ({ ONLINE: true, supabase: null, ensureSession: async () => ME }));

const { createOnlineDriver, localShownAt } = await import('@/services/onlineDriver');

beforeAll(async () => {
  db = await createDb([ME, FRIEND]);
  await rpcNamed(db, ME, 'set_profile', { p_nickname: 'sam', p_avatar: '🦊' });
  await rpcNamed(db, FRIEND, 'set_profile', { p_nickname: 'riya', p_avatar: '🦉' });
}, 60_000);

/** Plays questions from where the run is, like the screen does. All test questions have answer index 0. */
async function playThrough(s: RunState, d: ReturnType<typeof createOnlineDriver>, count: number, choice = 0): Promise<RunState> {
  for (let n = 0; n < count; n++) {
    const t = await d.teaser(s.index);
    s = runReducer(s, { type: 'TEASER', teaser: { teaser: t.teaser, category: t.category } });
    const r = await d.call(s.index, 'sure');
    s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt });
    s = runReducer(s, { type: 'ANSWERED', outcome: await d.answer(s.index, choice) });
    s = runReducer(s, { type: 'NEXT' });
  }
  return s;
}

describe('online driver ↔ database', () => {
  it('peeks without using up the attempt', async () => {
    const d = createOnlineDriver('tech');
    expect(await d.peek()).toEqual({ state: 'new', answered: 0 });
    expect(await d.peek()).toEqual({ state: 'new', answered: 0 });
  });

  it('plays a full run: teaser has no options, the server scores, the recap matches', async () => {
    const d = createOnlineDriver('tech');
    const start = await d.start();
    expect(start).toMatchObject({ status: 'ready', startIndex: 0, total: 0, questionCount: 5 });
    let s = startRun(5);

    const t = await d.teaser(0);
    expect(t.teaser).toMatch(/^Question \d+…$/);
    expect(t).not.toHaveProperty('options');

    s = await playThrough(s, d, 5);
    expect(s.phase).toBe('summary');
    expect(s.answers.every((a) => a.correct)).toBe(true);
    // Answered instantly: (100 + ~50) × 2 each.
    expect(s.total).toBeGreaterThanOrEqual(5 * 296);
    expect(s.endMoments).toContain('perfect_run');

    const rec = recordFromRecap(await d.recap(), 'today', 'tech', 5);
    expect(rec.total).toBe(s.total);
    expect(rec.grid).toBe('🟩🟩🟩🟩🟩');
    expect(await d.peek()).toMatchObject({ state: 'finished' });
    expect(await d.start()).toEqual({ status: 'finished', questionCount: 5 });
  });

  it('resumes a run left half-way, keeping the call already made', async () => {
    const first = createOnlineDriver('film');
    await first.start();
    let s = await playThrough(startRun(5), first, 2);
    expect(s.index).toBe(2);
    // Call question 2, then "close the app" before answering.
    await first.teaser(2);
    await first.call(2, 'allin');

    const again = createOnlineDriver('film');
    expect(await again.peek()).toEqual({ state: 'in_progress', answered: 2 });
    const start = await again.start();
    expect(start).toMatchObject({ status: 'ready', startIndex: 2 });
    const t = await again.teaser(2);
    expect(t.call).toBe('allin'); // the call stands
    const r = await again.call(2, 'safe');
    expect(r.call).toBe('allin');
    s = startRun(5, { startIndex: 2, startTotal: start.status === 'ready' ? start.total : 0 });
    s = runReducer(s, { type: 'TEASER', teaser: t });
    s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt });
    s = runReducer(s, { type: 'ANSWERED', outcome: await again.answer(2, 1) }); // wrong
    expect(s.answers[0].points).toBe(-300);
    expect(s.spotlight).toBe('allin_miss');
    s = await playThrough(runReducer(s, { type: 'NEXT' }), again, 2);
    expect(s.phase).toBe('summary');
    const recap = await again.recap();
    expect(recap).toHaveLength(5);
  });

  it('turns server errors into friendly ones', async () => {
    const d = createOnlineDriver('tech');
    await expect(d.teaser(0)).rejects.toMatchObject({ code: 'already_played' });
  });

  it('fills the weekly board and the near-you view', async () => {
    currentUser = FRIEND;
    const d = createOnlineDriver('tech');
    await d.start();
    await playThrough(startRun(5), d, 5, 1); // all wrong on Sure: −750
    const { api } = await import('@/services/api');
    const rows = (await api.board('tech')) as { nickname: string; is_me: boolean; total: number }[];
    expect(rows.map((r) => r.nickname)).toEqual(['sam', 'riya']);
    expect(rows[1]).toMatchObject({ is_me: true });
    expect(Number(rows[1].total)).toBe(-750);
    expect(nearYou(rows)).toHaveLength(2);
    currentUser = ME;
  });

  it('converts the server start time to the phone clock', () => {
    // Server says the question was shown 4 s ago; the phone clock is way off.
    expect(localShownAt('2026-09-27T10:00:00.000Z', '2026-09-27T10:00:04.000Z', 1_000_000)).toBe(996_000);
    expect(localShownAt('2026-09-27T10:00:05.000Z', '2026-09-27T10:00:04.000Z', 1_000_000)).toBe(1_000_000);
  });
});
