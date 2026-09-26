import type { RecapItem } from '@/game/driver';
import { DEFAULT_CAPTIONS, featured, questionMoments, runMoments, type MomentId } from '@/game/moments';
import { gridFor, runStats, shareGrid, type RunState } from '@/game/run';
import type { AnswerRecord, BoardId } from '@/game/types';
import type { RunRecord } from '@/state/runs';
import { formatPoints } from './format';

/** Snapshot of a run in progress (or just finished) to save on the phone. */
export function recordFromRun(s: RunState, day: string, board: BoardId, status: RunRecord['status']): RunRecord {
  const st = runStats(s);
  return {
    day,
    board,
    status,
    total: s.total,
    questionCount: s.questionCount,
    answers: s.answers,
    questions: s.questions,
    moments: st.allMoments,
    biggest: st.biggest,
    grid: shareGrid(s),
    updatedAt: new Date().toISOString(),
  };
}

/** Rebuilds a finished run from the server's recap (e.g. after resuming or reinstalling). */
export function recordFromRecap(
  items: RecapItem[],
  day: string,
  board: BoardId,
  questionCount: number,
  opts: { dayStreak?: number } = {},
): RunRecord {
  const answers: AnswerRecord[] = [];
  const moments: MomentId[] = [];
  let total = 0;
  for (const it of items) {
    total += it.points;
    answers.push({ questionId: it.question.id, call: it.call, choice: it.choice, correct: it.correct, msLeft: it.msLeft, points: it.points, total });
    moments.push(...questionMoments(answers));
  }
  moments.push(...runMoments(answers, { questionCount, dayStreak: opts.dayStreak }));
  return {
    day,
    board,
    status: 'done',
    total,
    questionCount,
    answers,
    questions: items.map((it) => it.question),
    moments,
    biggest: featured(moments),
    grid: gridFor(answers, questionCount),
    updatedAt: new Date().toISOString(),
  };
}

/** "27 Sep" for a "YYYY-MM-DD" UTC day. */
export function shortDay(day: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, m, d] = day.split('-').map(Number);
  return `${d} ${months[(m ?? 1) - 1]}`;
}

/** Wordle-style text to paste in a group chat. No spoilers: only calls and hits. */
export function shareText(r: Pick<RunRecord, 'day' | 'total' | 'grid' | 'biggest'>, boardName: string): string {
  const lines = [`Call It · ${boardName} · ${shortDay(r.day)}`, r.grid, `${formatPoints(r.total)} pts`];
  if (r.biggest) {
    const cap = DEFAULT_CAPTIONS[r.biggest];
    lines[2] += ` · ${cap.title} ${cap.emoji}`;
  }
  lines.push('Think you can call it better?');
  return lines.join('\n');
}
