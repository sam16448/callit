import { describe, expect, it } from 'vitest';
import { shieldedStreak } from '@/game/time';
import type { AnswerRecord, BoardId, Call } from '@/game/types';
import { computeStats, insightFor } from '@/lib/stats';
import type { RunRecord } from '@/state/runs';

function ans(call: Call, correct: boolean, points: number, msLeft = 10_000, extra: Partial<AnswerRecord> = {}): AnswerRecord {
  return { questionId: Math.random().toString(), call, choice: correct ? 0 : 1, correct, msLeft, points, total: 0, ...extra };
}
function run(board: BoardId, day: string, answers: AnswerRecord[]): RunRecord {
  const total = answers.reduce((n, a) => n + a.points, 0);
  return { day, board, status: 'done', total, questionCount: answers.length, answers, questions: [], moments: [], biggest: null, grid: '', updatedAt: '' };
}

describe('stats', () => {
  it('adds up accuracy, calls, boards, Lock-Ins and the best run', () => {
    const s = computeStats([
      run('f1', '2026-09-28', [ans('allin', true, 420), ans('sure', false, -150), ans('safe', true, 130)]),
      run('memes', '2026-09-29', [ans('allin', false, -300), ans('allin', true, 400, 5_000, { lockin: true, stake: 500 })]),
      run('memes', '2026-09-30', []), // not started: ignored
    ]);
    expect(s.runs).toBe(2);
    expect(s.answered).toBe(5);
    expect(s.hits).toBe(3);
    expect(s.accuracy).toBeCloseTo(0.6);
    expect(s.avgSeconds).toBe(6); // 5+5+5+5+10 / 5
    const allin = s.calls.find((c) => c.call === 'allin')!;
    expect(allin).toMatchObject({ count: 2, hits: 1, net: 120 }); // the Lock-In is counted separately
    expect(s.lockins).toEqual({ count: 1, hits: 1, net: 400 });
    expect(s.boards[0].board).toBe('f1');
    expect(s.best?.board).toBe('f1');
  });

  it('only gives advice with enough answers', () => {
    const few = computeStats([run('f1', '2026-09-28', [ans('allin', false, -300)])]);
    expect(few.insight).toBeNull();
    const calls = [
      { call: 'safe' as const, count: 2, hits: 2, net: 260, hitRate: 1 },
      { call: 'sure' as const, count: 2, hits: 1, net: 100, hitRate: 0.5 },
      { call: 'allin' as const, count: 5, hits: 1, net: -800, hitRate: 0.2 },
    ];
    expect(insightFor(calls)).toMatch(/All-ins hit under half/);
  });
});

describe('streak shield', () => {
  it('covers exactly one missed day, once a week', () => {
    expect(shieldedStreak('2026-09-28', 5, '2026-09-30', true)).toEqual({ streak: 6, usedShield: true });
    expect(shieldedStreak('2026-09-28', 5, '2026-09-30', false)).toEqual({ streak: 1, usedShield: false });
    expect(shieldedStreak('2026-09-27', 5, '2026-09-30', true)).toEqual({ streak: 1, usedShield: false }); // two days missed
    expect(shieldedStreak('2026-09-29', 5, '2026-09-30', true)).toEqual({ streak: 6, usedShield: false }); // no miss
  });
});
