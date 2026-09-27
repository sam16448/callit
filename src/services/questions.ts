/**
 * Where a run's questions come from.
 *
 * Online (Supabase keys in .env): the server picks the day's questions and
 * scores every answer; all 16 boards are open.
 * Offline (no keys): the 30 bundled sample questions, picked per UTC day and
 * scored on the phone with the same rules. Screens only use this file.
 */
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { dailyRun, hasRun } from '@/game/dailySet';
import type { RunDriver } from '@/game/driver';
import { createOfflineDriver } from '@/game/offlineDriver';
import type { BoardId } from '@/game/types';
import { createOnlineDriver } from './onlineDriver';
import { ONLINE } from './supabase';

export const QUESTION_SOURCE: 'offline' | 'supabase' = ONLINE ? 'supabase' : 'offline';

export function isBoardPlayable(board: BoardId): boolean {
  return ONLINE || hasRun(board, SAMPLE_QUESTIONS);
}

/** @param priorWeek offline only: Aura from earlier runs this week on the board (for Lock-In). */
export function createDriver(board: BoardId, day: string, priorWeek = 0): RunDriver {
  return ONLINE ? createOnlineDriver(board) : createOfflineDriver(dailyRun(board, day, SAMPLE_QUESTIONS), undefined, priorWeek);
}
