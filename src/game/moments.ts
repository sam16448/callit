/**
 * Moments: meme-style reactions to what just happened.
 *
 * Detection is pure and deterministic. Captions live here as defaults and will
 * later be overridden by rows in the Supabase `moments` table, so the jokes can
 * change with trends without an app update.
 *
 * Rule: at most ONE moment is featured per question (the highest priority one).
 */
import { QUESTION_MS } from './scoring';
import type { AnswerRecord } from './types';

export type MomentId =
  | 'lockin_hit'
  | 'lockin_miss'
  | 'allin_hit'
  | 'allin_miss'
  | 'clutch'
  | 'speedrun'
  | 'heating_up'
  | 'unstoppable'
  | 'six_seven'
  | 'perfect_run'
  | 'new_number_one'
  | 'streak_milestone';

export type MomentTier = 'big' | 'small';

export type MomentCaption = { title: string; sub: string; emoji: string; tier: MomentTier };

export const DEFAULT_CAPTIONS: Record<MomentId, MomentCaption> = {
  lockin_hit: { title: 'GENERATIONAL', sub: 'Locked in the whole week. Cashed out. Aura doubled.', emoji: '🔒', tier: 'big' },
  lockin_miss: { title: 'FUMBLED THE BAG', sub: 'Locked in the week and missed. Back to zero.', emoji: '📉', tier: 'big' },
  allin_hit: { title: 'AURA +1000', sub: 'All-in and right. Main character.', emoji: '💥', tier: 'big' },
  allin_miss: { title: '−1000 aura', sub: 'All-in and wrong. Cooked.', emoji: '🫠', tier: 'big' },
  clutch: { title: 'CLUTCH', sub: 'Under a second to spare.', emoji: '⏱️', tier: 'big' },
  perfect_run: { title: 'GOAT', sub: 'Perfect run. Every single one.', emoji: '🐐', tier: 'big' },
  new_number_one: { title: 'NEW #1', sub: 'Top of the board. For now.', emoji: '👑', tier: 'big' },
  speedrun: { title: 'Speedrun', sub: 'Answered in under 2 seconds.', emoji: '⚡', tier: 'small' },
  heating_up: { title: 'Locked in', sub: '3 in a row.', emoji: '🔥', tier: 'small' },
  unstoppable: { title: 'Unstoppable', sub: '5 in a row.', emoji: '🚀', tier: 'small' },
  six_seven: { title: '6-7', sub: 'Your score ends in 67.', emoji: '🤷', tier: 'small' },
  streak_milestone: { title: 'Streak', sub: 'Days in a row.', emoji: '📅', tier: 'small' },
};

/** Higher number wins when several moments trigger on the same question. */
const PRIORITY: Record<MomentId, number> = {
  lockin_hit: 95,
  lockin_miss: 95,
  new_number_one: 100,
  perfect_run: 90,
  allin_hit: 80,
  allin_miss: 80,
  clutch: 70,
  unstoppable: 60,
  heating_up: 50,
  speedrun: 40,
  six_seven: 30,
  streak_milestone: 20,
};

export const CLUTCH_MS = 1_000;
export const SPEEDRUN_MS = 2_000;
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;

/** Number of correct answers in a row at the end of `answers`. */
export function currentStreak(answers: readonly AnswerRecord[]): number {
  let n = 0;
  for (let i = answers.length - 1; i >= 0 && answers[i].correct; i--) n++;
  return n;
}

/** Every moment the latest answer triggers (answers includes the latest one). */
export function questionMoments(answers: readonly AnswerRecord[]): MomentId[] {
  const last = answers[answers.length - 1];
  if (!last) return [];
  const found: MomentId[] = [];
  if (last.lockin) found.push(last.correct ? 'lockin_hit' : 'lockin_miss');
  else if (last.call === 'allin') found.push(last.correct ? 'allin_hit' : 'allin_miss');
  if (last.correct) {
    if (last.msLeft < CLUTCH_MS) found.push('clutch');
    if (QUESTION_MS - last.msLeft < SPEEDRUN_MS) found.push('speedrun');
    const streak = currentStreak(answers);
    if (streak === 5) found.push('unstoppable');
    else if (streak === 3) found.push('heating_up');
  }
  if (last.total !== 0 && Math.abs(last.total) % 100 === 67) found.push('six_seven');
  return found;
}

/** Moments that can only be judged once the run is over. */
export function runMoments(
  answers: readonly AnswerRecord[],
  opts: { questionCount: number; isNewNumberOne?: boolean; dayStreak?: number },
): MomentId[] {
  const found: MomentId[] = [];
  if (opts.isNewNumberOne) found.push('new_number_one');
  if (answers.length === opts.questionCount && answers.length > 0 && answers.every((a) => a.correct)) {
    found.push('perfect_run');
  }
  if (opts.dayStreak && (STREAK_MILESTONES as readonly number[]).includes(opts.dayStreak)) {
    found.push('streak_milestone');
  }
  return found;
}

/** The one moment to show, or null. In chill mode only big moments are shown (and quietly). */
export function featured(ids: readonly MomentId[], opts: { chill?: boolean } = {}): MomentId | null {
  let best: MomentId | null = null;
  for (const id of ids) {
    if (opts.chill && DEFAULT_CAPTIONS[id].tier !== 'big') continue;
    if (best === null || PRIORITY[id] > PRIORITY[best]) best = id;
  }
  return best;
}

/** The biggest moment across a whole run, for the share card. */
export function biggestMoment(all: readonly MomentId[]): MomentId | null {
  return featured(all);
}
