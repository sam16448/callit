import { describe, expect, it } from 'vitest';
import { codeFromText, inviteLink, inviteText, isValidCode, leagueNameError, normalizeCode } from '@/lib/league';

describe('league codes', () => {
  it('cleans typed codes and fixes look-alike letters', () => {
    expect(normalizeCode('h7kq2m')).toBe('H7KQ2M');
    expect(normalizeCode(' H7K-Q2M ')).toBe('H7KQ2M');
    // 0, 1, O, I and L are never in codes (too easy to confuse), so they're dropped rather than guessed.
    expect(normalizeCode('0B1CDE')).toBe('BCDE');
    expect(normalizeCode('ABCDEFGH')).toBe('ABCDEF');
  });

  it('validates the server format', () => {
    expect(isValidCode('H7KQ2M')).toBe(true);
    expect(isValidCode('H7KQ2')).toBe(false);
    expect(isValidCode('H7KQ2I')).toBe(false);
  });

  it('finds the code in a pasted link or the whole invite message', () => {
    const msg = inviteText('Hostel B4', 'H7KQ2M');
    expect(codeFromText(msg)).toBe('H7KQ2M');
    expect(codeFromText(inviteLink('H7KQ2M'))).toBe('H7KQ2M');
    expect(codeFromText('h7kq2m')).toBe('H7KQ2M');
    expect(codeFromText('hello there')).toBeNull();
    expect(codeFromText('see you tomorrow at 7')).toBeNull();
    expect(codeFromText('HELLO1')).toBeNull(); // looks like a code but uses banned letters
  });

  it('writes an invite that works even without tapping the link', () => {
    const msg = inviteText('Hostel B4', 'H7KQ2M');
    expect(msg).toContain('"Hostel B4"');
    expect(msg).toContain('Code: H7KQ2M');
    expect(msg).toContain('callit://join/H7KQ2M');
  });

  it('checks league names like the server', () => {
    expect(leagueNameError('ab')).toMatch(/At least/);
    expect(leagueNameError('x'.repeat(31))).toMatch(/At most/);
    expect(leagueNameError('  Hostel B4 ')).toBeNull();
  });
});
