import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { BOARDS } from '@/game/boards';
import { dailyRun, hasRun, seededShuffle } from '@/game/dailySet';
import { currentQuestion, runReducer, runStats, shareGrid, startRun, type RunState } from '@/game/run';
import { QUESTION_MS } from '@/game/scoring';
import { teaserFor } from '@/game/teaser';
import { formatCountdown, msUntilNextRun, nextDayStreak, utcDay, weekStart } from '@/game/time';
import type { Call } from '@/game/types';

const DAY = '2026-09-27';

/** Plays one question: call, then answer after `takenMs` (null choice = let the timer run out). */
function play(s: RunState, call: Call, correct: boolean | null, takenMs = 3_000, t0 = 1_000_000): RunState {
  const q = currentQuestion(s)!;
  s = runReducer(s, { type: 'PLACE_CALL', call, now: t0 });
  if (correct === null) s = runReducer(s, { type: 'TIMEOUT', now: t0 + QUESTION_MS });
  else s = runReducer(s, { type: 'ANSWER', choice: correct ? q.answerIndex : (q.answerIndex + 1) % q.options.length, now: t0 + takenMs });
  return runReducer(s, { type: 'NEXT' });
}

describe('sample questions', () => {
  it('has 30 valid questions with unique ids', () => {
    expect(SAMPLE_QUESTIONS).toHaveLength(30);
    expect(new Set(SAMPLE_QUESTIONS.map((q) => q.id)).size).toBe(30);
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

  it('gives Mixed 10 questions spread across all six categories', () => {
    const run = dailyRun('mixed', DAY, SAMPLE_QUESTIONS);
    expect(run).toHaveLength(10);
    expect(new Set(run.map((q) => q.id)).size).toBe(10);
    expect(new Set(run.map((q) => q.category)).size).toBe(6);
  });

  it('gives category runs 5 questions from that category only', () => {
    const run = dailyRun('science', DAY, SAMPLE_QUESTIONS);
    expect(run).toHaveLength(5);
    expect(run.every((q) => q.category === 'science')).toBe(true);
  });

  it('knows which boards have enough questions offline', () => {
    expect(hasRun('mixed', SAMPLE_QUESTIONS)).toBe(true);
    expect(hasRun('tech', SAMPLE_QUESTIONS)).toBe(true);
    expect(hasRun('cricket', SAMPLE_QUESTIONS)).toBe(false);
  });

  it('seededShuffle keeps every item', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(seededShuffle(items, 'x').sort()).toEqual(items);
  });
});

describe('run state machine', () => {
  const questions = dailyRun('tech', DAY, SAMPLE_QUESTIONS);

  it('goes call → question → result → call and ends on the summary', () => {
    let s = startRun(questions);
    expect(s.phase).toBe('call');
    s = runReducer(s, { type: 'PLACE_CALL', call: 'sure', now: 0 });
    expect(s.phase).toBe('question');
    s = runReducer(s, { type: 'ANSWER', choice: questions[0].answerIndex, now: 7_500 });
    expect(s.phase).toBe('result');
    expect(s.answers[0].points).toBe(250);
    s = runReducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('call');
    expect(s.index).toBe(1);
    for (let i = 1; i < questions.length; i++) s = play(s, 'safe', true);
    expect(s.phase).toBe('summary');
  });

  it('ignores actions that do not fit the phase (no double answers)', () => {
    let s = startRun(questions);
    const before = s;
    expect(runReducer(s, { type: 'ANSWER', choice: 0, now: 1 })).toBe(before);
    s = runReducer(s, { type: 'PLACE_CALL', call: 'safe', now: 0 });
    expect(runReducer(s, { type: 'PLACE_CALL', call: 'allin', now: 1 }).call).toBe('safe');
    s = runReducer(s, { type: 'ANSWER', choice: 0, now: 1_000 });
    const answered = s.answers.length;
    s = runReducer(s, { type: 'ANSWER', choice: 1, now: 1_100 });
    s = runReducer(s, { type: 'TIMEOUT', now: 20_000 });
    expect(s.answers.length).toBe(answered);
  });

  it('treats a timeout and a too-late tap as a miss', () => {
    let s = startRun(questions);
    s = runReducer(s, { type: 'PLACE_CALL', call: 'allin', now: 0 });
    s = runReducer(s, { type: 'TIMEOUT', now: QUESTION_MS });
    expect(s.answers[0]).toMatchObject({ choice: null, correct: false, points: -300, msLeft: 0 });

    let t = startRun(questions);
    t = runReducer(t, { type: 'PLACE_CALL', call: 'sure', now: 0 });
    t = runReducer(t, { type: 'ANSWER', choice: questions[0].answerIndex, now: QUESTION_MS + 50 });
    expect(t.answers[0]).toMatchObject({ choice: null, correct: false, points: -150 });
  });

  it('spotlights one moment per question and a perfect run at the end', () => {
    let s = startRun(questions);
    s = runReducer(s, { type: 'PLACE_CALL', call: 'allin', now: 0 });
    s = runReducer(s, { type: 'ANSWER', choice: questions[0].answerIndex, now: 1_000 });
    expect(s.spotlight).toBe('allin_hit');
    s = runReducer(s, { type: 'NEXT' });
    for (let i = 1; i < questions.length; i++) s = play(s, 'safe', true, 5_000);
    expect(s.endMoments).toContain('perfect_run');
    expect(s.spotlight).toBe('perfect_run');
  });

  it('QUIT ends the run with what was answered', () => {
    let s = play(startRun(questions), 'sure', true, 7_500);
    s = runReducer(s, { type: 'QUIT' });
    expect(s.phase).toBe('summary');
    expect(runStats(s)).toMatchObject({ answered: 1, total: 250, questionCount: 5 });
  });

  it('builds stats and a share grid', () => {
    let s = startRun(questions);
    s = play(s, 'allin', true, 1_000);
    s = play(s, 'sure', false);
    s = play(s, 'safe', null);
    s = play(s, 'safe', true);
    s = play(s, 'sure', true);
    const st = runStats(s);
    expect(st).toMatchObject({ correct: 3, answered: 5, allinHits: 1, allinCount: 1, bestStreak: 2 });
    expect(st.biggest).toBe('allin_hit');
    expect(shareGrid(s)).toBe('🟪🟥⬜🟦🟩');
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
