import { describe, expect, it } from 'vitest';
import { QUESTION_MS, callRange, clampMsLeft, scoreAnswer, speedBonus } from '@/game/scoring';

describe('speedBonus', () => {
  it('is 50 at the instant the options appear and 0 when time runs out', () => {
    expect(speedBonus(QUESTION_MS)).toBe(50);
    expect(speedBonus(0)).toBe(0);
  });

  it('is proportional to time left and floors', () => {
    expect(speedBonus(7_500)).toBe(25);
    expect(speedBonus(14_999)).toBe(49);
    expect(speedBonus(299)).toBe(0);
    expect(speedBonus(300)).toBe(1);
  });

  it('clamps bad inputs', () => {
    expect(speedBonus(-5)).toBe(0);
    expect(speedBonus(99_000)).toBe(50);
    expect(clampMsLeft(Number.NaN)).toBe(0);
  });
});

describe('scoreAnswer', () => {
  it('multiplies (100 + speed bonus) by the call when right', () => {
    expect(scoreAnswer('safe', true, QUESTION_MS)).toBe(150);
    expect(scoreAnswer('sure', true, QUESTION_MS)).toBe(300);
    expect(scoreAnswer('allin', true, QUESTION_MS)).toBe(450);
    expect(scoreAnswer('allin', true, 0)).toBe(300);
    expect(scoreAnswer('sure', true, 7_500)).toBe(250);
  });

  it('applies fixed penalties when wrong, whatever the speed', () => {
    expect(scoreAnswer('safe', false, QUESTION_MS)).toBe(0);
    expect(scoreAnswer('sure', false, 3_000)).toBe(-150);
    expect(scoreAnswer('allin', false, 0)).toBe(-300);
  });

  it('never lets Safe lose points', () => {
    for (let ms = 0; ms <= QUESTION_MS; ms += 500) {
      expect(scoreAnswer('safe', false, ms)).toBe(0);
      expect(scoreAnswer('safe', true, ms)).toBeGreaterThanOrEqual(100);
    }
  });

  it('reports the best and worst case of each call', () => {
    expect(callRange('safe')).toEqual({ best: 150, worst: 0 });
    expect(callRange('sure')).toEqual({ best: 300, worst: -150 });
    expect(callRange('allin')).toEqual({ best: 450, worst: -300 });
  });
});
