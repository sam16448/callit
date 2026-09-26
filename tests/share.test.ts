import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { dailyRun } from '@/game/dailySet';
import { createOfflineDriver } from '@/game/offlineDriver';
import { runReducer, startRun } from '@/game/run';
import { formatPoints } from '@/lib/format';
import { recordFromRecap, recordFromRun, shareText, shortDay } from '@/lib/share';

describe('formatPoints', () => {
  it('uses thousands separators and a real minus sign', () => {
    expect(formatPoints(1240)).toBe('1,240');
    expect(formatPoints(-300)).toBe('−300');
    expect(formatPoints(450, { sign: true })).toBe('+450');
    expect(formatPoints(0, { sign: true })).toBe('0');
  });
});

describe('share text', () => {
  it('shows board, day, grid, score and the biggest moment without the answers', async () => {
    const qs = dailyRun('tech', '2026-09-27', SAMPLE_QUESTIONS);
    let t = 0;
    const d = createOfflineDriver(qs, () => t);
    let s = startRun(qs.length);
    s = runReducer(s, { type: 'TEASER', teaser: await d.teaser(0) });
    const r = await d.call(0, 'allin');
    s = runReducer(s, { type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt });
    t += 1_000;
    s = runReducer(s, { type: 'ANSWERED', outcome: await d.answer(0, qs[0].answerIndex) });
    s = runReducer(s, { type: 'QUIT' });
    const rec = recordFromRun(s, '2026-09-27', 'tech', 'done');
    const text = shareText(rec, 'Tech');
    expect(text).toBe(['Call It · Tech · 27 Sep', '🟪▫️▫️▫️▫️', '438 pts · AURA +1000 💥', 'Think you can call it better?'].join('\n'));
    for (const opt of qs[0].options.filter((o) => o.length > 3)) expect(text).not.toContain(opt);
  });

  it('rebuilds the same record from a server recap', async () => {
    const qs = dailyRun('tech', '2026-09-27', SAMPLE_QUESTIONS);
    let t = 0;
    const d = createOfflineDriver(qs, () => t);
    for (let i = 0; i < qs.length; i++) {
      await d.call(i, i === 0 ? 'allin' : 'safe');
      t += 2_500;
      await d.answer(i, qs[i].answerIndex);
    }
    const rec = recordFromRecap(await d.recap(), '2026-09-27', 'tech', qs.length);
    expect(rec.answers).toHaveLength(5);
    expect(rec.grid).toBe('🟪🟦🟦🟦🟦');
    expect(rec.moments).toContain('perfect_run');
    expect(rec.biggest).toBe('perfect_run');
    expect(rec.total).toBe(rec.answers[4].total);
    expect(rec.questions.map((q) => q.id)).toEqual(qs.map((q) => q.id));
  });

  it('formats days', () => {
    expect(shortDay('2026-10-01')).toBe('1 Oct');
  });
});
