import { describe, expect, it } from 'vitest';
import { currentStreak, featured, questionMoments, runMoments } from '@/game/moments';
import type { AnswerRecord, Call } from '@/game/types';

function a(call: Call, correct: boolean, msLeft = 8_000, total = 0): AnswerRecord {
  return { questionId: 'q', call, choice: correct ? 0 : 1, correct, msLeft, points: 0, total };
}

describe('questionMoments', () => {
  it('flags All-in hits and misses', () => {
    expect(questionMoments([a('allin', true)])).toContain('allin_hit');
    expect(questionMoments([a('allin', false)])).toContain('allin_miss');
    expect(questionMoments([a('sure', true)])).not.toContain('allin_hit');
  });

  it('flags Clutch under 1 s left and Speedrun under 2 s taken, only when right', () => {
    expect(questionMoments([a('safe', true, 999)])).toContain('clutch');
    expect(questionMoments([a('safe', true, 1_000)])).not.toContain('clutch');
    expect(questionMoments([a('safe', false, 500)])).not.toContain('clutch');
    expect(questionMoments([a('safe', true, 13_001)])).toContain('speedrun');
    expect(questionMoments([a('safe', true, 13_000)])).not.toContain('speedrun');
  });

  it('flags Heating up at 3 in a row and Unstoppable at 5', () => {
    const three = [a('safe', false), a('safe', true), a('safe', true), a('safe', true)];
    expect(questionMoments(three)).toContain('heating_up');
    const four = [...three, a('safe', true)];
    expect(questionMoments(four)).not.toContain('heating_up');
    expect(questionMoments([...four, a('safe', true)])).toContain('unstoppable');
  });

  it('flags 6-7 when the running score ends in 67', () => {
    expect(questionMoments([a('safe', true, 8_000, 267)])).toContain('six_seven');
    expect(questionMoments([a('sure', false, 8_000, -67)])).toContain('six_seven');
    expect(questionMoments([a('safe', true, 8_000, 670)])).not.toContain('six_seven');
  });

  it('returns nothing for an empty run', () => {
    expect(questionMoments([])).toEqual([]);
  });
});

describe('currentStreak', () => {
  it('counts trailing correct answers', () => {
    expect(currentStreak([a('safe', true), a('safe', false), a('safe', true), a('safe', true)])).toBe(2);
    expect(currentStreak([a('safe', false)])).toBe(0);
  });
});

describe('featured', () => {
  it('shows only one moment: the highest priority', () => {
    expect(featured(['speedrun', 'allin_hit', 'heating_up'])).toBe('allin_hit');
    expect(featured(['six_seven', 'clutch'])).toBe('clutch');
    expect(featured([])).toBeNull();
  });

  it('keeps only big moments in chill mode', () => {
    expect(featured(['speedrun', 'heating_up'], { chill: true })).toBeNull();
    expect(featured(['speedrun', 'clutch'], { chill: true })).toBe('clutch');
  });
});

describe('runMoments', () => {
  it('awards a perfect run only when every question was answered correctly', () => {
    const all = Array.from({ length: 5 }, () => a('safe', true));
    expect(runMoments(all, { questionCount: 5 })).toContain('perfect_run');
    expect(runMoments(all.slice(0, 4), { questionCount: 5 })).not.toContain('perfect_run');
    expect(runMoments([...all.slice(0, 4), a('safe', false)], { questionCount: 5 })).not.toContain('perfect_run');
  });

  it('adds new #1 and streak milestones when told', () => {
    expect(runMoments([], { questionCount: 5, isNewNumberOne: true })).toContain('new_number_one');
    expect(runMoments([], { questionCount: 5, dayStreak: 7 })).toContain('streak_milestone');
    expect(runMoments([], { questionCount: 5, dayStreak: 8 })).not.toContain('streak_milestone');
  });
});
