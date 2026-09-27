import { describe, expect, it } from 'vitest';
import { RANKS, lifetimeAura, rankFor, rankUp } from '@/lib/rank';

describe('Aura ranks', () => {
  it('starts everyone as an NPC and never goes below 0', () => {
    expect(rankFor(0).rank.title).toBe('NPC');
    expect(rankFor(-500).lifetime).toBe(0);
    expect(lifetimeAura([400, -900])).toBe(0);
    expect(lifetimeAura([1200, 300, -100])).toBe(1400);
  });

  it('works out progress to the next rank', () => {
    const r = rankFor(2_000);
    expect(r.rank.title).toBe('Rookie');
    expect(r.next?.title).toBe('Main Character');
    expect(r.toNext).toBe(1_000);
    expect(r.progress).toBeCloseTo(0.5);
  });

  it('tops out at Generational', () => {
    const r = rankFor(1_000_000);
    expect(r.rank.title).toBe('Generational');
    expect(r.next).toBeNull();
    expect(r.progress).toBe(1);
  });

  it('spots a rank-up only when a line is crossed', () => {
    expect(rankUp(900, 1_100)?.title).toBe('Rookie');
    expect(rankUp(1_100, 1_900)).toBeNull();
    expect(rankUp(2_000, 800)).toBeNull();
    expect(RANKS.every((r, i) => i === 0 || r.min > RANKS[i - 1].min)).toBe(true);
  });
});
