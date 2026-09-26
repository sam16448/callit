const NEAR = 5;

/** Rows within 5 places of you (or the top of the board if you're not on it). */
export function nearYou<T extends { is_me: boolean }>(rows: T[]): T[] {
  const me = rows.findIndex((r) => r.is_me);
  if (me < 0) return rows.slice(0, NEAR * 2 + 1);
  return rows.slice(Math.max(0, me - NEAR), me + NEAR + 1);
}
