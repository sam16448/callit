/**
 * Offline driver: the day's run from bundled questions, scored on the phone
 * with the same rules as the server. Used when Supabase isn't configured.
 */
import type { RecapItem, RunDriver } from './driver';
import { QUESTION_MS, clampMsLeft, scoreAnswer } from './scoring';
import { teaserFor } from './teaser';
import type { Call, Question } from './types';

/** Taps up to this long after the clock hits 0 still count (same as the server's lag allowance). */
export const GRACE_MS = 1_500;

export function createOfflineDriver(questions: Question[], clock: () => number = () => Date.now()): RunDriver {
  const shown = new Map<number, { call: Call; at: number }>();
  const done: RecapItem[] = [];
  let total = 0;

  const question = (i: number) => {
    const q = questions[i];
    if (!q) throw new Error('No such question');
    return q;
  };

  return {
    mode: 'offline',
    // Offline, "already played" is tracked by the saved runs on the phone.
    async peek() {
      return { state: done.length ? 'in_progress' : 'new', answered: done.length };
    },
    async start() {
      return { status: 'ready', startIndex: 0, total: 0, questionCount: questions.length };
    },
    async teaser(i) {
      const q = question(i);
      return { teaser: teaserFor(q), category: q.category, call: shown.get(i)?.call ?? null };
    },
    async call(i, call) {
      const q = question(i);
      if (i !== done.length) throw new Error('Not the current question');
      if (!shown.has(i)) shown.set(i, { call, at: clock() });
      const s = shown.get(i)!;
      return { call: s.call, prompt: q.prompt, options: q.options, shownAt: s.at };
    },
    async answer(i, choice) {
      const q = question(i);
      const s = shown.get(i);
      if (!s) throw new Error('Make your call first');
      if (done.length > i) throw new Error('Already answered');
      const elapsed = clock() - s.at;
      const late = choice === null || elapsed > QUESTION_MS + GRACE_MS;
      const msLeft = late ? 0 : clampMsLeft(QUESTION_MS - elapsed);
      const correct = !late && choice === q.answerIndex;
      const points = scoreAnswer(s.call, correct, msLeft);
      total += points;
      done.push({ call: s.call, choice: late ? null : choice, correct, msLeft, points, question: q });
      return { choice: late ? null : choice, correct, answerIndex: q.answerIndex, msLeft, points, total, questionId: q.id };
    },
    async recap() {
      return done.slice();
    },
  };
}
