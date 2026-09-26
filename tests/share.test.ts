import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { dailyRun } from '@/game/dailySet';
import { currentQuestion, runReducer, startRun } from '@/game/run';
import { formatPoints } from '@/lib/format';
import { recordFromRun, shareText, shortDay } from '@/lib/share';

describe('formatPoints', () => {
  it('uses thousands separators and a real minus sign', () => {
    expect(formatPoints(1240)).toBe('1,240');
    expect(formatPoints(-300)).toBe('−300');
    expect(formatPoints(450, { sign: true })).toBe('+450');
    expect(formatPoints(0, { sign: true })).toBe('0');
  });
});

describe('share text', () => {
  it('shows board, day, grid, score and the biggest moment without the answers', () => {
    const qs = dailyRun('tech', '2026-09-27', SAMPLE_QUESTIONS);
    let s = startRun(qs);
    s = runReducer(s, { type: 'PLACE_CALL', call: 'allin', now: 0 });
    s = runReducer(s, { type: 'ANSWER', choice: currentQuestion(s)!.answerIndex, now: 1_000 });
    s = runReducer(s, { type: 'QUIT' });
    const rec = recordFromRun(s, '2026-09-27', 'tech', 'done');
    const text = shareText(rec, 'Tech');
    expect(text).toBe(['Call It · Tech · 27 Sep', '🟪▫️▫️▫️▫️', '438 pts · AURA +1000 💥', 'Think you can call it better?'].join('\n'));
    for (const opt of qs[0].options.filter((o) => o.length > 3)) expect(text).not.toContain(opt);
  });

  it('formats days', () => {
    expect(shortDay('2026-10-01')).toBe('1 Oct');
  });
});
