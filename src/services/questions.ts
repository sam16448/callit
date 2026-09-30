/**
 * Where a run's questions come from.
 *
 * Online (Supabase keys in .env): the server picks the day's questions and
 * scores every answer.
 * Offline (no keys): the 33 bundled sample questions (3 per board, so
 * category runs are 3 questions), picked per UTC day and scored on the phone
 * with the same rules. Screens only use this file.
 */
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { dailyRun, hasRun } from '@/game/dailySet';
import type { RunDriver } from '@/game/driver';
import { createOfflineDriver } from '@/game/offlineDriver';
import type { BoardId } from '@/game/types';
import { createOnlineDriver } from './onlineDriver';
import { ONLINE } from './supabase';

/** Offline category runs use what the samples have (3), not the online 5. */
const OFFLINE_MIN_RUN = 3;

export const QUESTION_SOURCE: 'offline' | 'supabase' = ONLINE ? 'supabase' : 'offline';

export function isBoardPlayable(board: BoardId): boolean {
  return ONLINE || hasRun(board, SAMPLE_QUESTIONS, OFFLINE_MIN_RUN);
}

/** @param priorWeek offline only: Aura from earlier runs this week on the board (for Lock-In). */
export function createDriver(board: BoardId, day: string, priorWeek = 0): RunDriver {
  return ONLINE ? createOnlineDriver(board) : createOfflineDriver(dailyRun(board, day, SAMPLE_QUESTIONS), undefined, priorWeek);
}

/** How many questions today's run on a board will have (offline category runs are shorter). */
export function plannedRunLength(board: BoardId, runLength: number, day: string): number {
  return ONLINE ? runLength : dailyRun(board, day, SAMPLE_QUESTIONS).length;
}
