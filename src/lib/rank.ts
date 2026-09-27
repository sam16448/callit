/**
 * Aura ranks: a lifetime progression on top of the weekly boards, so every
 * run moves you somewhere even when you're not top of a board. Lifetime Aura
 * is the sum of your runs (never below 0).
 */
export type Rank = { title: string; emoji: string; min: number };

export const RANKS: readonly Rank[] = [
  { title: 'NPC', emoji: '🧍', min: 0 },
  { title: 'Rookie', emoji: '🐣', min: 1_000 },
  { title: 'Main Character', emoji: '🎬', min: 3_000 },
  { title: 'Sigma', emoji: '🗿', min: 7_500 },
  { title: 'Aura Farmer', emoji: '🌾', min: 15_000 },
  { title: 'Ball Knower', emoji: '🧠', min: 30_000 },
  { title: 'Generational', emoji: '👑', min: 60_000 },
];

export type RankInfo = { rank: Rank; next: Rank | null; index: number; lifetime: number; toNext: number; progress: number };

export function lifetimeAura(totals: Iterable<number>): number {
  let sum = 0;
  for (const t of totals) sum += t;
  return Math.max(0, Math.round(sum));
}

export function rankFor(lifetime: number): RankInfo {
  const aura = Math.max(0, lifetime);
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (aura >= RANKS[i].min) index = i;
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const span = next ? next.min - rank.min : 1;
  return {
    rank,
    next,
    index,
    lifetime: aura,
    toNext: next ? next.min - aura : 0,
    progress: next ? Math.min(1, (aura - rank.min) / span) : 1,
  };
}

/** The rank reached by this run, or null if the run didn't cross a rank line. */
export function rankUp(before: number, after: number): Rank | null {
  const a = rankFor(before).index;
  const b = rankFor(after).index;
  return b > a ? RANKS[b] : null;
}
