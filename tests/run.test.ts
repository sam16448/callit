import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { fixtureQuestions } from './helpers/fixtures';
import { BOARDS } from '@/game/boards';
import { dailyRun, hasRun, seededShuffle } from '@/game/dailySet';
import type { RunDriver } from '@/game/driver';
import { createOfflineDriver } from '@/game/offlineDriver';
import { runReducer, runStats, shareGrid, startRun, type RunState } from '@/game/run';
import { QUESTION_MS } from '@/game/scoring';
import { teaserFor } from '@/game/teaser';
import { formatCountdown, msUntilNextRun, nextDayStreak, utcDay, weekStart } from '@/game/time';
import type { Call, Question } from '@/game/types';

const DAY = '2026-09-27';
const FIX = fixtureQuestions();

/** A fake clock the tests move by hand. */
function fakeClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

/** Plays one question through the driver and reducer, like the screen does. */
async function play(
  s: RunState,
  d: RunDriver,
  clock: ReturnType<typeof fakeClock>,
  call: Call,
  outcome: 'right' | 'wrong' | 'timeout',
  takenMs = 3_000,
): Promise<RunState> {
  s = runReducer(s, { type: 'TEASER', teaser: await d.teaser(s.index) });
  const r = await d.call(s.index, call);
  s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt });
  clock.advance(takenMs);
  const right = questionsFor(d)[s.index].answerIndex;
  const choice = outcome === 'timeout' ? null : outcome === 'right' ? right : (right + 1) % r.options.length;
  s = runReducer(s, { type: 'ANSWERED', outcome: await d.answer(s.index, choice) });
  return runReducer(s, { type: 'NEXT' });
}

const driverQuestions = new WeakMap<RunDriver, Question[]>();
function questionsFor(d: RunDriver): Question[] {
  return driverQuestions.get(d)!;
}
function newDriver(questions: Question[], clock: ReturnType<typeof fakeClock>): RunDriver {
  const d = createOfflineDriver(questions, clock.now);
  driverQuestions.set(d, questions);
  return d;
}

describe('sample questions', () => {
  it('has 33 valid questions with unique ids', () => {
    expect(SAMPLE_QUESTIONS).toHaveLength(33);
    expect(new Set(SAMPLE_QUESTIONS.map((q) => q.id)).size).toBe(33);
    for (const q of SAMPLE_QUESTIONS) {
      expect([2, 4]).toContain(q.options.length);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(BOARDS.some((b) => b.id === q.category)).toBe(true);
    }
  });

  it('teasers are the opening words of the prompt and never the whole question', () => {
    for (const q of SAMPLE_QUESTIONS) {
      const t = teaserFor(q).replace(/…$/, '');
      expect(q.prompt.startsWith(t)).toBe(true);
      expect(t.length).toBeLessThan(q.prompt.length);
    }
  });
});

describe('teaserFor (automatic)', () => {
  it('shows about half the words, 4 to 8, and hides at least one', () => {
    expect(teaserFor({ prompt: 'What is the capital city of Australia?' })).toBe('What is the capital…');
    expect(teaserFor({ prompt: 'Name this one?' })).toBe('Name this…');
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen';
    expect(teaserFor({ prompt: long })).toBe('one two three four five six seven eight…');
    // Stops before an open quote instead of cutting a name in half.
    expect(teaserFor({ prompt: 'Who voices the character "Vernon Cherry" in "Red Dead Redemption"?' })).toBe('Who voices the character…');
    expect(teaserFor({ prompt: 'The song "Naatu Naatu" is from which film?' })).toBe('The song "Naatu Naatu"…');
  });
});

describe('dailyRun', () => {
  it('is identical for everyone on the same day and differs across days', () => {
    const a = dailyRun('mixed', DAY, SAMPLE_QUESTIONS).map((q) => q.id);
    const b = dailyRun('mixed', DAY, SAMPLE_QUESTIONS).map((q) => q.id);
    const c = dailyRun('mixed', '2026-09-28', SAMPLE_QUESTIONS).map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('gives Mixed 10 questions, one from each board', () => {
    const run = dailyRun('mixed', DAY, SAMPLE_QUESTIONS);
    expect(run).toHaveLength(10);
    expect(new Set(run.map((q) => q.id)).size).toBe(10);
    expect(new Set(run.map((q) => q.category)).size).toBe(10);
  });

  it('gives category runs 5 questions from that category only', () => {
    const run = dailyRun('f1', DAY, FIX);
    expect(run).toHaveLength(5);
    expect(run.every((q) => q.category === 'f1')).toBe(true);
  });

  it('knows which boards have enough questions offline', () => {
    // 3 samples per board: offline, only Mixed can make a full run (practice covers every board).
    expect(hasRun('mixed', SAMPLE_QUESTIONS)).toBe(true);
    expect(hasRun('f1', SAMPLE_QUESTIONS)).toBe(false);
    expect(hasRun('f1', FIX)).toBe(true);
    // Offline demo: 3-question category runs from the samples.
    expect(hasRun('f1', SAMPLE_QUESTIONS, 3)).toBe(true);
    expect(dailyRun('f1', '2026-09-27', SAMPLE_QUESTIONS)).toHaveLength(3);
  });

  it('seededShuffle keeps every item', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(seededShuffle(items, 'x').sort()).toEqual(items);
  });
});

describe('run state machine with the offline driver', () => {
  const questions = dailyRun('gaming', DAY, FIX);

  it('goes teaser → call → question → result and ends on the summary', async () => {
    const clock = fakeClock();
    const d = newDriver(questions, clock);
    let s = startRun(questions.length);
    expect(s.phase).toBe('call');
    expect(s.teaser).toBeNull(); // loading
    s = runReducer(s, { type: 'TEASER', teaser: await d.teaser(0) });
    expect(s.teaser?.teaser).toBe(teaserFor(questions[0]));
    const r = await d.call(0, 'sure');
    s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt });
    expect(s.phase).toBe('question');
    expect(s.revealed?.options).toEqual(questions[0].options);
    clock.advance(7_500);
    s = runReducer(s, { type: 'ANSWERED', outcome: await d.answer(0, questions[0].answerIndex) });
    expect(s.phase).toBe('result');
    expect(s.answers[0].points).toBe(250);
    expect(s.questions[0].answerIndex).toBe(questions[0].answerIndex);
    s = runReducer(s, { type: 'NEXT' });
    expect(s).toMatchObject({ phase: 'call', index: 1, teaser: null });
    for (let i = 1; i < questions.length; i++) s = await play(s, d, clock, 'safe', 'right');
    expect(s.phase).toBe('summary');
  });

  it('ignores actions that do not fit the phase', async () => {
    const clock = fakeClock();
    const d = newDriver(questions, clock);
    let s = startRun(questions.length);
    const before = s;
    expect(runReducer(s, { type: 'CALLED', call: 'safe', revealed: { prompt: 'x', options: [] }, shownAt: 0 })).toBe(before); // no teaser yet
    s = runReducer(s, { type: 'TEASER', teaser: await d.teaser(0) });
    const r = await d.call(0, 'safe');
    s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt });
    expect(runReducer(s, { type: 'CALLED', call: 'allin', revealed: r, shownAt: 5 }).call).toBe('safe');
    s = runReducer(s, { type: 'ANSWERED', outcome: await d.answer(0, 0) });
    expect(runReducer(s, { type: 'ANSWERED', outcome: { choice: 1, correct: true, answerIndex: 1, msLeft: 1, points: 999 } })).toBe(s);
  });

  it('the driver allows one answer, keeps the first call and blocks skipping', async () => {
    const clock = fakeClock();
    const d = newDriver(questions, clock);
    await expect(d.answer(0, 0)).rejects.toThrow(/call first/);
    await expect(d.call(1, 'safe')).rejects.toThrow(/current question/);
    await d.call(0, 'safe');
    expect((await d.call(0, 'allin')).call).toBe('safe');
    await d.answer(0, 0);
    await expect(d.answer(0, 1)).rejects.toThrow(/Already answered/);
  });

  it('treats a timeout and a tap after the grace period as a miss, but allows a little lag', async () => {
    const clock = fakeClock();
    const d = newDriver(questions, clock);
    await d.call(0, 'allin');
    clock.advance(15_000);
    expect(await d.answer(0, null)).toMatchObject({ choice: null, correct: false, points: -300, msLeft: 0 });

    await d.call(1, 'sure');
    clock.advance(16_600);
    expect(await d.answer(1, questions[1].answerIndex)).toMatchObject({ choice: null, correct: false, points: -150 });

    await d.call(2, 'sure');
    clock.advance(15_800);
    expect(await d.answer(2, questions[2].answerIndex)).toMatchObject({ correct: true, points: 200 });
  });

  it('spotlights one moment per question and a perfect run at the end', async () => {
    const clock = fakeClock();
    const d = newDriver(questions, clock);
    let s = startRun(questions.length);
    s = runReducer(s, { type: 'TEASER', teaser: await d.teaser(0) });
    const r = await d.call(0, 'allin');
    s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt });
    clock.advance(1_000);
    s = runReducer(s, { type: 'ANSWERED', outcome: await d.answer(0, questions[0].answerIndex) });
    expect(s.spotlight).toBe('allin_hit');
    s = runReducer(s, { type: 'NEXT' });
    for (let i = 1; i < questions.length; i++) s = await play(s, d, clock, 'safe', 'right', 5_000);
    expect(s.endMoments).toContain('perfect_run');
    expect(s.spotlight).toBe('perfect_run');
  });

  it('QUIT ends the run with what was answered', async () => {
    const clock = fakeClock();
    const d = newDriver(questions, clock);
    let s = await play(startRun(questions.length), d, clock, 'sure', 'right', 7_500);
    s = runReducer(s, { type: 'QUIT' });
    expect(s.phase).toBe('summary');
    expect(runStats(s)).toMatchObject({ answered: 1, total: 250, questionCount: 5 });
  });

  it('builds stats and a share grid, and the driver recap matches', async () => {
    const clock = fakeClock();
    const d = newDriver(questions, clock);
    let s = startRun(questions.length);
    s = await play(s, d, clock, 'allin', 'right', 1_000);
    s = await play(s, d, clock, 'sure', 'wrong');
    s = await play(s, d, clock, 'safe', 'timeout', 15_000);
    s = await play(s, d, clock, 'safe', 'right');
    s = await play(s, d, clock, 'sure', 'right');
    const st = runStats(s);
    expect(st).toMatchObject({ correct: 3, answered: 5, allinHits: 1, allinCount: 1, bestStreak: 2 });
    expect(st.biggest).toBe('allin_hit');
    expect(shareGrid(s)).toBe('🟪🟥⬜🟦🟩');
    const recap = await d.recap();
    expect(recap.map((r) => r.points)).toEqual(s.answers.map((a) => a.points));
  });

  it('Lock-In: stakes the week, doubles it on a hit, zeroes it on a miss, once per run', async () => {
    const clock = fakeClock();
    // 200 Aura from earlier runs this week on this board.
    const d = createOfflineDriver(questions, clock.now, 200);
    let s = startRun(questions.length);
    const t0 = await d.teaser(0);
    expect(t0.lockinStake).toBe(200);
    s = runReducer(s, { type: 'TEASER', teaser: t0 });
    const r = await d.call(0, 'safe', true);
    expect(r).toMatchObject({ call: 'allin', lockin: true, stake: 200 });
    s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt, lockin: r.lockin, stake: r.stake });
    clock.advance(0);
    s = runReducer(s, { type: 'ANSWERED', outcome: await d.answer(0, questions[0].answerIndex) });
    expect(s.answers[0]).toMatchObject({ lockin: true, stake: 200, points: 650 }); // 450 + 200
    expect(s.spotlight).toBe('lockin_hit');
    expect(shareGrid({ ...s, questionCount: 1 })).toBe('🔒');
    expect((await d.teaser(1)).lockinStake).toBeNull(); // used
    await expect(d.call(1, 'sure', true)).rejects.toThrow(/already used/);

    const miss = createOfflineDriver(questions, clock.now, 300);
    await miss.call(0, 'sure', true);
    clock.advance(2_000);
    const out = await miss.answer(0, (questions[0].answerIndex + 1) % questions[0].options.length);
    expect(out).toMatchObject({ points: -300, total: -300, lockin: true }); // week 300 → 0
    const none = createOfflineDriver(questions, clock.now, 0);
    expect((await none.teaser(0)).lockinStake).toBeNull();
    await expect(none.call(0, 'safe', true)).rejects.toThrow(/Nothing to lock in/);
  });

  it('can start part-way through (resuming a run)', () => {
    const s = startRun(10, { startIndex: 4, startTotal: 620 });
    expect(s).toMatchObject({ index: 4, total: 620, phase: 'call' });
    expect(startRun(5, { startIndex: 5 }).phase).toBe('summary');
  });
});

describe('time helpers', () => {
  it('uses UTC days and Monday weeks', () => {
    // 2026-09-27 00:33 IST is still 26 Sep in UTC.
    expect(utcDay(Date.parse('2026-09-27T00:33:00+05:30'))).toBe('2026-09-26');
    expect(weekStart(Date.parse('2026-09-27T12:00:00Z'))).toBe('2026-09-21');
    expect(weekStart(Date.parse('2026-09-28T00:00:00Z'))).toBe('2026-09-28');
  });

  it('counts down to the next 00:00 UTC', () => {
    const now = Date.parse('2026-09-27T18:30:00Z');
    expect(msUntilNextRun(now)).toBe(5.5 * 3_600_000);
    expect(formatCountdown(msUntilNextRun(now))).toBe('5h 30m');
    expect(formatCountdown(59_000)).toBe('1m');
  });

  it('grows the day streak only on consecutive days', () => {
    expect(nextDayStreak(null, 0, DAY)).toBe(1);
    expect(nextDayStreak('2026-09-26', 4, DAY)).toBe(5);
    expect(nextDayStreak(DAY, 5, DAY)).toBe(5);
    expect(nextDayStreak('2026-09-20', 9, DAY)).toBe(1);
  });
});
