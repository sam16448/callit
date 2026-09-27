/** League codes: 6 characters from an alphabet without look-alikes (no 0/O, 1/I/L), as the server makes them. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** Cleans what someone typed or pasted: case, spaces and dashes. Characters that can't be in a code are dropped. */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .split('')
    .filter((c) => CODE_ALPHABET.includes(c))
    .join('')
    .slice(0, CODE_LENGTH);
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

export const LEAGUE_NAME_MIN = 3;
export const LEAGUE_NAME_MAX = 30;

export function leagueNameError(raw: string): string | null {
  const name = raw.trim();
  if (name.length < LEAGUE_NAME_MIN) return `At least ${LEAGUE_NAME_MIN} characters.`;
  if (name.length > LEAGUE_NAME_MAX) return `At most ${LEAGUE_NAME_MAX} characters.`;
  return null;
}

/** The deep link that opens the join screen in the app. */
export function inviteLink(code: string): string {
  return `callit://join/${code}`;
}

/** The message sent to friends: works even if the link can't be tapped (the code is typed in). */
export function inviteText(name: string, code: string): string {
  return [`Join my Call It league "${name}" 🏆`, `Code: ${code}`, `Open in the app: ${inviteLink(code)}`, 'Got ball? Prove it. Same daily questions for everyone; money never buys rank.'].join('\n');
}

/** Pulls a league code out of anything pasted: a code, an invite link or the whole invite message. */
export function codeFromText(text: string): string | null {
  const link = text.match(/callit:\/\/join\/([A-Za-z0-9]+)/);
  if (link) {
    const c = normalizeCode(link[1]);
    return isValidCode(c) ? c : null;
  }
  const labelled = text.match(/code:\s*([A-Za-z0-9-]{6,8})\b/i);
  // Otherwise only a bare code counts, so ordinary text isn't mistaken for one.
  const bare = text.trim().replace(/[\s-]/g, '');
  const candidate = labelled ? labelled[1] : /^[A-Za-z0-9]{6}$/.test(bare) ? bare : '';
  const c = normalizeCode(candidate);
  return isValidCode(c) ? c : null;
}
