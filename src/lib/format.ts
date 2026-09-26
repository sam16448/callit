/** "+1,240" / "−300" / "0" with a real minus sign. */
export function formatPoints(n: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(Math.round(n)).toLocaleString('en-US');
  if (n < 0) return `−${abs}`;
  if (opts.sign && n > 0) return `+${abs}`;
  return abs;
}
