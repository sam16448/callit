/**
 * Where the paywall can appear. It never interrupts a ranked run, and each
 * reason has its own honest headline. Pro never gives points.
 */
export type PaywallReason = 'practice_limit' | 'create_league' | 'stats' | 'streak_shield' | 'effects' | 'you';

export const FREE_PRACTICE_PER_DAY = 20;

export const PAYWALL_COPY: Record<PaywallReason, { title: string; sub: string }> = {
  practice_limit: {
    title: "That's today's 20 free practice questions",
    sub: 'Pro gives unlimited practice. Ranked runs stay free, and practice Aura never counts for the boards.',
  },
  create_league: {
    title: 'Start your own league',
    sub: 'Pro lets you create private leagues for your crew. Joining a friend’s league is always free.',
  },
  stats: {
    title: 'See how you really play',
    sub: 'Pro shows your accuracy by category, how your calls pay off, and your best runs.',
  },
  streak_shield: {
    title: 'Protect your streak',
    sub: 'Pro’s streak shield covers one missed day a week, so a busy day doesn’t reset your streak.',
  },
  effects: {
    title: 'Cosmetic effect packs',
    sub: 'Pro unlocks extra looks for your moments. Purely cosmetic: they never change your Aura.',
  },
  you: {
    title: 'Call It Pro',
    sub: 'More game, never more Aura.',
  },
};

/**
 * What Pro includes. `soon` marks perks that aren't built yet: the paywall
 * shows them as "Soon" so it never sells something that doesn't exist.
 * Flip the flag when each one ships.
 */
export const PRO_PERKS: {
  icon: 'infinite-outline' | 'people-outline' | 'stats-chart-outline' | 'shield-checkmark-outline' | 'sparkles-outline' | 'ribbon-outline';
  text: string;
  soon?: boolean;
}[] = [
  { icon: 'infinite-outline', text: `Unlimited practice (free: ${FREE_PRACTICE_PER_DAY} a day)` },
  { icon: 'people-outline', text: 'Create private leagues' },
  { icon: 'stats-chart-outline', text: 'Your stats: which calls pay off, best boards, best run' },
  { icon: 'shield-checkmark-outline', text: 'Streak shield: one missed day a week' },
  { icon: 'sparkles-outline', text: 'Cosmetic effect packs', soon: true },
  { icon: 'ribbon-outline', text: 'Pro badge on the boards' },
];

export function isPaywallReason(v: unknown): v is PaywallReason {
  return typeof v === 'string' && v in PAYWALL_COPY;
}

/** "$14.99/yr is $1.25/mo" — shown under the annual plan. Returns null if the price can't be read. */
export function perMonth(annualPrice: number, currencySymbol = '$'): string | null {
  if (!Number.isFinite(annualPrice) || annualPrice <= 0) return null;
  return `${currencySymbol}${(Math.floor((annualPrice / 12) * 100) / 100).toFixed(2)}/mo`;
}

/** Percent saved by paying yearly instead of monthly, rounded down. */
export function annualSaving(monthly: number, annual: number): number | null {
  if (!(monthly > 0) || !(annual > 0)) return null;
  const pct = Math.floor((1 - annual / (monthly * 12)) * 100);
  return pct > 0 ? pct : null;
}
