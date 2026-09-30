/**
 * Player stats (a Call It Pro perk), worked out from the runs saved on this
 * phone. Pure functions so they're easy to test.
 */
import { QUESTION_MS } from '@/game/scoring';
import type { BoardId, Call } from '@/game/types';
import type { RunRecord } from '@/state/runs';

export type CallStat = { call: Call; count: number; hits: number; net: number; hitRate: number };
export type BoardStat = { board: BoardId; runs: number; aura: number; answered: number; hits: number; accuracy: number };

export type Stats = {
  runs: number;
  answered: number;
  hits: number;
  accuracy: number;
  /** Average seconds taken on answered (not timed-out) questions. */
  avgSeconds: number | null;
  calls: CallStat[];
  boards: BoardStat[];
  best: RunRecord | null;
  lockins: { count: number; hits: number; net: number };
  /** One line of advice from the numbers, or null with too little data. */
  insight: string | null;
};

const CALLS: Call[] = ['safe', 'sure', 'allin'];

export function computeStats(records: RunRecord[]): Stats {
  const runs = records.filter((r) => r.answers.length > 0);
  const calls = new Map<Call, CallStat>(CALLS.map((c) => [c, { call: c, count: 0, hits: 0, net: 0, hitRate: 0 }]));
  const boards = new Map<BoardId, BoardStat>();
  let answered = 0;
  let hits = 0;
  let timeSum = 0;
  let timed = 0;
  const lockins = { count: 0, hits: 0, net: 0 };

  for (const r of runs) {
    const b = boards.get(r.board) ?? { board: r.board, runs: 0, aura: 0, answered: 0, hits: 0, accuracy: 0 };
    b.runs += 1;
    b.aura += r.total;
    for (const a of r.answers) {
      answered += 1;
      b.answered += 1;
      if (a.correct) {
        hits += 1;
        b.hits += 1;
      }
      if (a.choice !== null) {
        timeSum += (QUESTION_MS - Math.max(0, Math.min(QUESTION_MS, a.msLeft))) / 1000;
        timed += 1;
      }
      if (a.lockin) {
        lockins.count += 1;
        if (a.correct) lockins.hits += 1;
        lockins.net += a.points;
        continue;
      }
      const c = calls.get(a.call)!;
      c.count += 1;
      if (a.correct) c.hits += 1;
      c.net += a.points;
    }
    boards.set(r.board, b);
  }

  for (const c of calls.values()) c.hitRate = c.count ? c.hits / c.count : 0;
  for (const b of boards.values()) b.accuracy = b.answered ? b.hits / b.answered : 0;
  const best = runs.reduce<RunRecord | null>((m, r) => (!m || r.total > m.total ? r : m), null);

  const callList = [...calls.values()];
  return {
    runs: runs.length,
    answered,
    hits,
    accuracy: answered ? hits / answered : 0,
    avgSeconds: timed ? Math.round((timeSum / timed) * 10) / 10 : null,
    calls: callList,
    boards: [...boards.values()].sort((a, b) => b.aura - a.aura),
    best,
    lockins,
    insight: insightFor(callList),
  };
}

/** Plain-English read on how the player calls. Needs a few answers per call first. */
export function insightFor(calls: CallStat[]): string | null {
  const by = Object.fromEntries(calls.map((c) => [c.call, c])) as Record<Call, CallStat>;
  const total = calls.reduce((n, c) => n + c.count, 0);
  if (total < 8) return null;
  if (by.allin.count >= 4 && by.allin.hitRate < 0.5) return 'Your All-ins hit under half the time. That costs more than it pays: save them for sure things.';
  if (by.safe.count >= 4 && by.safe.hitRate >= 0.8) return 'You get your Safe calls right a lot. You know more than you think: call Sure more often.';
  if (by.allin.count >= 4 && by.allin.hitRate >= 0.75) return 'Your All-ins land. That’s real ball knowledge: keep backing yourself.';
  if (by.sure.count >= 4 && by.sure.hitRate >= 0.6) return 'Sure is your money call: steady Aura with low risk.';
  return 'Mix it up: All-in when you know, Safe when you don’t.';
}
