import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MomentId } from '@/game/moments';
import type { AnswerRecord, BoardId } from '@/game/types';
import { KEYS, loadJson, saveJson } from '@/lib/storage';

/** One ranked attempt. Saved after every answer so quitting the app can't reset it. */
export type RunRecord = {
  day: string;
  board: BoardId;
  status: 'in_progress' | 'done';
  total: number;
  questionCount: number;
  answers: AnswerRecord[];
  moments: MomentId[];
  biggest: MomentId | null;
  grid: string;
  updatedAt: string;
};

export const runKey = (day: string, board: BoardId) => `${day}:${board}`;

type RunsCtx = {
  loaded: boolean;
  runs: Record<string, RunRecord>;
  get: (day: string, board: BoardId) => RunRecord | undefined;
  save: (r: RunRecord) => void;
};

const Ctx = createContext<RunsCtx | null>(null);

export function RunsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [runs, setRuns] = useState<Record<string, RunRecord>>({});
  const latest = useRef(runs);

  useEffect(() => {
    loadJson<Record<string, RunRecord>>(KEYS.runs).then((r) => {
      latest.current = r ?? {};
      setRuns(latest.current);
      setLoaded(true);
    });
  }, []);

  const get = useCallback((day: string, board: BoardId) => runs[runKey(day, board)], [runs]);

  const save = useCallback((r: RunRecord) => {
    latest.current = { ...latest.current, [runKey(r.day, r.board)]: r };
    setRuns(latest.current);
    saveJson(KEYS.runs, latest.current);
  }, []);

  const value = useMemo(() => ({ loaded, runs, get, save }), [loaded, runs, get, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRuns(): RunsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRuns must be used inside RunsProvider');
  return ctx;
}
