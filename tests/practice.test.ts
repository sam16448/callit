import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { dailyRun } from '@/game/dailySet';
import { canPractice, offlinePracticePool, practiceLabel, scorePractice } from '@/game/practice';

describe('practice limits', () => {
  it('gives free players 20 a day and Pro unlimited', () => {
    expect(canPractice(0, false)).toBe(true);
    expect(canPractice(19, false)).toBe(true);
    expect(canPractice(20, false)).toBe(false);
    expect(canPractice(500, true)).toBe(true);
    expect(practiceLabel(8, false)).toBe('12 of 20 free left today');
    expect(practiceLabel(20, false)).toBe('Free practice used up today');
    expect(practiceLabel(99, true)).toBe('Unlimited with Pro');
  });
});

describe('practice scoring', () => {
  it('matches the ranked rules, lag allowance included', () => {
    const q = { answerIndex: 2 };
    expect(scorePractice(q, 'sure', 0, 2, 7_500, 100)).toMatchObject({ correct: true, points: 250, total: 350 });
    expect(scorePractice(q, 'allin', 0, 1, 3_000, 0)).toMatchObject({ correct: false, points: -300 });
    expect(scorePractice(q, 'safe', 0, null, 15_000, 0)).toMatchObject({ choice: null, points: 0 });
    expect(scorePractice(q, 'sure', 0, 2, 15_800, 0)).toMatchObject({ correct: true, points: 200 });
    expect(scorePractice(q, 'sure', 0, 2, 16_600, 0)).toMatchObject({ correct: false, choice: null, points: -150 });
  });
});

describe('offline practice pool', () => {
  it('never uses questions from today’s Mixed run', () => {
    const day = '2026-09-27';
    const pool = offlinePracticePool(SAMPLE_QUESTIONS, day, 'mixed');
    const ranked = new Set(dailyRun('mixed', day, SAMPLE_QUESTIONS).map((q) => q.id));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.some((q) => ranked.has(q.id))).toBe(false);
  });

  it('keeps to the chosen board', () => {
    const pool = offlinePracticePool(SAMPLE_QUESTIONS, '2026-09-27', 'tech');
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((q) => q.category === 'tech')).toBe(true);
  });
});
