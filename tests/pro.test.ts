import { describe, expect, it } from 'vitest';
import { FREE_PRACTICE_PER_DAY, PAYWALL_COPY, PRO_PERKS, annualSaving, isPaywallReason, perMonth } from '@/lib/pro';

describe('paywall copy', () => {
  it('has a headline for every reason and never promises points', () => {
    for (const [reason, copy] of Object.entries(PAYWALL_COPY)) {
      expect(isPaywallReason(reason)).toBe(true);
      expect(copy.title.length).toBeGreaterThan(5);
      // "never more points" is the promise; "more points" on its own would be the problem.
      expect(`${copy.title} ${copy.sub}`.replace(/never (more|extra) points/gi, '')).not.toMatch(/\b(bonus|extra|more) points\b/i);
    }
    expect(PRO_PERKS.map((p) => p.text).join(' ')).not.toMatch(/\bpoints?\b/i);
    expect(isPaywallReason('casino')).toBe(false);
    expect(FREE_PRACTICE_PER_DAY).toBe(20);
    // The two perks that exist today must not be marked "soon".
    expect(PRO_PERKS.filter((p) => !p.soon).map((p) => p.icon)).toEqual(expect.arrayContaining(['infinite-outline', 'people-outline']));
  });
});

describe('plan maths', () => {
  it('shows the yearly price per month, rounded down', () => {
    expect(perMonth(14.99)).toBe('$1.24/mo');
    expect(perMonth(1199, '₹')).toBe('₹99.91/mo');
    expect(perMonth(0)).toBeNull();
    expect(perMonth(Number.NaN)).toBeNull();
  });

  it('works out the yearly saving', () => {
    expect(annualSaving(2.99, 14.99)).toBe(58);
    expect(annualSaving(2.99, 40)).toBeNull(); // yearly isn't cheaper
    expect(annualSaving(0, 14.99)).toBeNull();
  });
});
