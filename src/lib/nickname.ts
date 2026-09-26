/** Nickname rules: what shows on every board. No password, so keep it tidy. */

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;

/** Starter avatars. Plain Unicode emoji, so nothing to license. */
export const AVATARS = ['🦊', '🐯', '🦉', '🐙', '🦖', '🐼', '🦄', '🐸', '🐺', '🦁', '🐧', '🦈', '🐝', '🦜', '🐲', '👾'] as const;

export function cleanNickname(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Returns a friendly error, or null when the nickname is fine. */
export function nicknameError(raw: string): string | null {
  const name = cleanNickname(raw);
  if (name.length < NICKNAME_MIN) return `At least ${NICKNAME_MIN} characters.`;
  if (name.length > NICKNAME_MAX) return `At most ${NICKNAME_MAX} characters.`;
  if (!/^[\p{L}\p{N}_. -]+$/u.test(name)) return 'Letters, numbers, spaces, dots and underscores only.';
  if (!/[\p{L}\p{N}]/u.test(name)) return 'Needs at least one letter or number.';
  return null;
}
