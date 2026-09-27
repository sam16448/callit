import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, avatarText, characterAvatar, characterIdOf } from '@/lib/avatar';
import { AVATARS } from '@/lib/nickname';

describe('avatars', () => {
  it('every picker avatar fits the server limit (1–16 characters)', () => {
    for (const a of AVATARS) {
      expect([...a].length).toBeGreaterThanOrEqual(1);
      expect(a.length).toBeLessThanOrEqual(16);
    }
    expect(new Set(AVATARS).size).toBe(AVATARS.length);
  });

  it('round-trips crew ids and leaves emoji alone', () => {
    for (const id of CHARACTER_IDS) expect(characterIdOf(characterAvatar(id))).toBe(id);
    expect(characterIdOf('🦊')).toBeNull();
    expect(characterIdOf('bx:nope')).toBeNull();
    expect(characterIdOf(undefined)).toBeNull();
  });

  it('text fallback never leaks the raw id', () => {
    expect(avatarText('bx:mango')).toBe('🗿');
    expect(avatarText('🦊')).toBe('🦊');
  });

  it('every crew id has a drawing with a name', () => {
    const src = readFileSync('src/components/brainrot/characters.tsx', 'utf8');
    for (const id of CHARACTER_IDS) expect(src).toMatch(new RegExp(`id: '${id}',\\s*name: '`));
  });
});
