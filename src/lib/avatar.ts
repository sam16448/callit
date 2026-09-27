/**
 * Avatars are either a plain emoji ("🦊") or one of the Call It crew,
 * stored as "bx:<id>" (fits the server's 16-character limit).
 */
export const CHARACTER_IDS = ['frigo', 'gelato', 'samosa', 'chai', 'mango', 'donut', 'cubo', 'lampa', 'sushi', 'pizza', 'boba', 'toast'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

const PREFIX = 'bx:';

export function characterAvatar(id: CharacterId): string {
  return PREFIX + id;
}

/** The crew member behind an avatar value, or null for an emoji avatar. */
export function characterIdOf(avatar: string | null | undefined): CharacterId | null {
  if (!avatar?.startsWith(PREFIX)) return null;
  const id = avatar.slice(PREFIX.length);
  return (CHARACTER_IDS as readonly string[]).includes(id) ? (id as CharacterId) : null;
}

/** Text-only fallback (share text, notifications): emoji stays, crew shows as 🗿. */
export function avatarText(avatar: string | null | undefined): string {
  if (!avatar) return '';
  return avatar.startsWith(PREFIX) ? '🗿' : avatar;
}
