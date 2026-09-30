/**
 * Day and week keys. Every player worldwide shares the same run for a UTC day,
 * and weekly boards reset Monday 00:00 UTC. In India that is 5:30 AM IST.
 */

/** "YYYY-MM-DD" for the UTC day containing `now`. */
export function utcDay(now: Date | number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** The UTC day before `day`. */
export function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDay(d);
}

/** Monday (UTC) of the week containing `now`, as "YYYY-MM-DD". */
export function weekStart(now: Date | number = Date.now()): string {
  const d = new Date(`${utcDay(now)}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return utcDay(d);
}

/** Milliseconds until the next 00:00 UTC. */
export function msUntilNextRun(now: number = Date.now()): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return next - now;
}

/** "5h 12m" style countdown. */
export function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * New day-streak after playing on `today`.
 * Same day: unchanged. Played yesterday: +1. Otherwise it starts again at 1.
 */
/**
 * Streak with Pro's streak shield: if exactly one day was missed and the
 * shield hasn't been used this week, the streak carries on (the shield is spent).
 */
export function shieldedStreak(
  lastPlayed: string | null,
  streak: number,
  today: string,
  shieldAvailable: boolean,
): { streak: number; usedShield: boolean } {
  if (shieldAvailable && lastPlayed && streak > 0 && previousDay(previousDay(today)) === lastPlayed) {
    return { streak: streak + 1, usedShield: true };
  }
  return { streak: nextDayStreak(lastPlayed, streak, today), usedShield: false };
}

export function nextDayStreak(lastPlayed: string | null, streak: number, today: string): number {
  if (lastPlayed === today) return Math.max(1, streak);
  if (lastPlayed && previousDay(today) === lastPlayed) return streak + 1;
  return 1;
}
