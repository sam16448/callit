/**
 * Call It scoring rules. This file is the written spec: the Supabase
 * `submit_answer` function must produce exactly the same numbers, and the
 * tests in tests/scoring.test.ts pin them down.
 *
 *   right:          (100 + speed bonus) × call multiplier
 *   wrong/timeout:  Safe 0, Sure −150, All-in −300
 *   speed bonus:    0–50, proportional to time left on the 15 s timer
 */
import type { Call } from './types';

export const QUESTION_MS = 15_000;
export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 50;

export const MULTIPLIER: Record<Call, number> = { safe: 1, sure: 2, allin: 3 };
export const MISS_PENALTY: Record<Call, number> = { safe: 0, sure: -150, allin: -300 };

export const CALL_LABEL: Record<Call, string> = { safe: 'Safe', sure: 'Sure', allin: 'All-in' };

/** Clamp the time left into [0, QUESTION_MS] and round to whole milliseconds. */
export function clampMsLeft(msLeft: number): number {
  if (!Number.isFinite(msLeft)) return 0;
  return Math.round(Math.min(QUESTION_MS, Math.max(0, msLeft)));
}

/** 0–50 points for answering fast. Floors, so the bonus only hits 50 at the very first instant. */
export function speedBonus(msLeft: number): number {
  return Math.floor((MAX_SPEED_BONUS * clampMsLeft(msLeft)) / QUESTION_MS);
}

/** Points for one question. A timeout is a miss with 0 ms left. */
export function scoreAnswer(call: Call, correct: boolean, msLeft: number): number {
  if (!correct) return MISS_PENALTY[call];
  return (BASE_POINTS + speedBonus(msLeft)) * MULTIPLIER[call];
}

/** Best and worst possible outcome of a call, for the call screen. */
export function callRange(call: Call): { best: number; worst: number } {
  return { best: scoreAnswer(call, true, QUESTION_MS), worst: MISS_PENALTY[call] };
}
