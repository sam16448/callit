import { describe, expect, it } from 'vitest';
import { cleanNickname, nicknameError } from '@/lib/nickname';

describe('nicknames', () => {
  it('accepts normal names, including non-English letters', () => {
    expect(nicknameError('sam')).toBeNull();
    expect(nicknameError('Quiz_King.07')).toBeNull();
    expect(nicknameError('आरव')).toBeNull();
    expect(nicknameError('  Riya  S  ')).toBeNull();
  });

  it('rejects too short, too long, symbols and blanks', () => {
    expect(nicknameError('ab')).toMatch(/At least/);
    expect(nicknameError('a'.repeat(17))).toMatch(/At most/);
    expect(nicknameError('hi<script>')).toMatch(/only/);
    expect(nicknameError('___')).toMatch(/letter or number/);
  });

  it('collapses spaces', () => {
    expect(cleanNickname('  Riya   S ')).toBe('Riya S');
  });
});
