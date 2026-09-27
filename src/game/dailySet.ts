/**
 * Offline stand-in for the server's `daily_sets` table: picks the same
 * questions for every player on a given UTC day, using a seeded shuffle.
 * On Monday this moves to Supabase and the client never sees answers early.
 */
import { MIXED_RUN_LENGTH, boardById } from './boards';
import type { BoardId, Question } from './types';

/** 32-bit FNV-1a hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small, fast seeded PRNG (mulberry32). Returns numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice();
  const rand = seededRandom(hashString(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Questions available to a board's run. */
export function poolFor(board: BoardId, all: readonly Question[]): Question[] {
  return board === 'mixed' ? all.slice() : all.filter((q) => q.category === board);
}

/**
 * True when a board has enough questions for a run: a full one by default, or
 * at least `min` (the offline demo plays 3-question category runs).
 */
export function hasRun(board: BoardId, all: readonly Question[], min?: number): boolean {
  const b = boardById(board);
  return Boolean(b) && poolFor(board, all).length >= Math.min(min ?? Infinity, b?.runLength ?? Infinity);
}

/**
 * The day's run for a board. Mixed runs spread across categories: the
 * shuffled pool is walked round-robin by category so one topic can't dominate.
 */
export function dailyRun(board: BoardId, day: string, all: readonly Question[]): Question[] {
  const b = boardById(board);
  if (!b) return [];
  const pool = seededShuffle(poolFor(board, all), `${day}:${board}`);
  if (board !== 'mixed') return pool.slice(0, b.runLength);

  const byCat = new Map<string, Question[]>();
  for (const q of pool) byCat.set(q.category, [...(byCat.get(q.category) ?? []), q]);
  const cats = seededShuffle([...byCat.keys()].sort(), `${day}:mixed:cats`);
  const out: Question[] = [];
  while (out.length < MIXED_RUN_LENGTH && cats.some((c) => (byCat.get(c)?.length ?? 0) > 0)) {
    for (const c of cats) {
      const next = byCat.get(c)?.shift();
      if (next && out.length < MIXED_RUN_LENGTH) out.push(next);
    }
  }
  return out;
}
