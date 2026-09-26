/**
 * Where run questions come from.
 *
 * Today (offline): the 30 sample questions bundled in the app, picked per UTC
 * day with a seeded shuffle, so answers live on the phone.
 * Next (Supabase): `get_teaser` / `place_call` / `submit_answer` server
 * functions; the phone never receives the correct answer before answering.
 * Screens only talk to this file, so that swap stays in one place.
 */
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { dailyRun, hasRun } from '@/game/dailySet';
import type { BoardId, Question } from '@/game/types';

export const QUESTION_SOURCE = 'offline' as 'offline' | 'supabase';

export function isBoardPlayable(board: BoardId): boolean {
  return hasRun(board, SAMPLE_QUESTIONS);
}

export function loadDailyRun(board: BoardId, day: string): Question[] {
  return dailyRun(board, day, SAMPLE_QUESTIONS);
}
