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

/** Lock-In scoring, identical to the server: right = All-in points + stake, wrong = exactly minus the stake. */
export function scoreLockIn(correct: boolean, msLeft: number, stake: number): number {
  return correct ? scoreAnswer('allin', true, msLeft) + stake : -stake;
}

/**
 * @param priorWeek Aura already earned on this board this week before today's run
 *   (offline it comes from runs saved on the phone). Lock-In stakes priorWeek + this run so far.
 */
export function createOfflineDriver(questions: Question[], clock: () => number = () => Date.now(), priorWeek = 0): RunDriver {
  const shown = new Map<number, { call: Call; at: number; lockin: boolean; stake: number }>();
  const done: RecapItem[] = [];
  let total = 0;
  let lockinUsed = false;
  const stakeNow = () => priorWeek + total;

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
      const s = shown.get(i);
      return {
        teaser: teaserFor(q),
        category: q.category,
        call: s?.call ?? null,
        lockin: s?.lockin ?? false,
        lockinStake: !lockinUsed && stakeNow() > 0 ? stakeNow() : null,
      };
    },
    async call(i, call, lockin = false) {
      const q = question(i);
      if (i !== done.length) throw new Error('Not the current question');
      if (!shown.has(i)) {
        if (lockin) {
          if (lockinUsed) throw new Error('Lock-in already used this run');
          if (stakeNow() <= 0) throw new Error('Nothing to lock in yet');
          lockinUsed = true;
          shown.set(i, { call: 'allin', at: clock(), lockin: true, stake: stakeNow() });
        } else {
          shown.set(i, { call, at: clock(), lockin: false, stake: 0 });
        }
      }
      const s = shown.get(i)!;
      return { call: s.call, lockin: s.lockin, stake: s.stake, prompt: q.prompt, options: q.options, shownAt: s.at };
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
      const points = s.lockin ? scoreLockIn(correct, msLeft, s.stake) : scoreAnswer(s.call, correct, msLeft);
      total += points;
      done.push({ call: s.call, choice: late ? null : choice, correct, msLeft, points, question: q, lockin: s.lockin, stake: s.stake });
      return {
        choice: late ? null : choice,
        correct,
        answerIndex: q.answerIndex,
        msLeft,
        points,
        total,
        questionId: q.id,
        lockin: s.lockin,
        stake: s.stake,
      };
    },
    async recap() {
      return done.slice();
    },
  };
}
