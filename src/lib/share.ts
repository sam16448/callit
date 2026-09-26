import { DEFAULT_CAPTIONS } from '@/game/moments';
import { runStats, shareGrid, type RunState } from '@/game/run';
import type { BoardId } from '@/game/types';
import type { RunRecord } from '@/state/runs';
import { formatPoints } from './format';

/** Snapshot of a run to save on the phone (and later to show on the recap). */
export function recordFromRun(s: RunState, day: string, board: BoardId, status: RunRecord['status']): RunRecord {
  const st = runStats(s);
  return {
    day,
    board,
    status,
    total: s.total,
    questionCount: s.questions.length,
    answers: s.answers,
    moments: st.allMoments,
    biggest: st.biggest,
    grid: shareGrid(s),
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
