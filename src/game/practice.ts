/**
 * Practice: endless questions, scored like a ranked run but never counted for
 * any board. Free players get FREE_PRACTICE_PER_DAY a day; Pro is unlimited.
 */
import { FREE_PRACTICE_PER_DAY } from '@/lib/pro';
import { dailyRun } from './dailySet';
import { GRACE_MS } from './offlineDriver';
import type { Outcome } from './run';
import { QUESTION_MS, clampMsLeft, scoreAnswer } from './scoring';
import type { BoardId, Call, Question } from './types';

/** Can one more practice question be served? */
export function canPractice(servedToday: number, pro: boolean): boolean {
  return pro || servedToday < FREE_PRACTICE_PER_DAY;
}

/** "12 of 20 free today" / "Unlimited with Pro". */
export function practiceLabel(servedToday: number, pro: boolean): string {
  if (pro) return 'Unlimited with Pro';
  const left = Math.max(0, FREE_PRACTICE_PER_DAY - servedToday);
  return left === 0 ? 'Free practice used up today' : `${left} of ${FREE_PRACTICE_PER_DAY} free left today`;
}

/** Scores a practice answer with exactly the ranked rules (including the lag allowance). */
export function scorePractice(q: Pick<Question, 'answerIndex'>, call: Call, shownAt: number, choice: number | null, now: number, total: number): Outcome {
  const elapsed = now - shownAt;
  const late = choice === null || elapsed > QUESTION_MS + GRACE_MS;
  const msLeft = late ? 0 : clampMsLeft(QUESTION_MS - elapsed);
  const correct = !late && choice === q.answerIndex;
  const points = scoreAnswer(call, correct, msLeft);
  return { choice: late ? null : choice, correct, answerIndex: q.answerIndex, msLeft, points, total: total + points };
}

/**
 * Offline practice (demo mode): questions from the bundled samples that are not
 * in today's Mixed run, so practice can't spoil the global board. With only 30
 * samples the category runs necessarily use every question in their category;
 * online, practice has its own question pool that ranked runs never use.
 */
export function offlinePracticePool(all: readonly Question[], day: string, board: BoardId): Question[] {
  const mixed = new Set(dailyRun('mixed', day, all).map((q) => q.id));
  const inBoard = all.filter((q) => board === 'mixed' || q.category === board);
  const pool = inBoard.filter((q) => !mixed.has(q.id));
  return pool.length ? pool : inBoard;
}
