/**
 * How a run talks to whoever keeps score. Two implementations:
 *  - offline: bundled questions, scored on the phone (demo mode, no keys needed)
 *  - online:  Supabase functions, scored on the server (src/services/onlineDriver.ts)
 */
import type { Outcome, Revealed, TeaserInfo } from './run';
import type { Call, Question } from './types';

export type RunStart =
  | { status: 'ready'; startIndex: number; total: number; questionCount: number }
  | { status: 'finished'; questionCount: number };

export type RecapItem = {
  call: Call;
  choice: number | null;
  correct: boolean;
  msLeft: number;
  points: number;
  question: Question;
  lockin?: boolean;
  stake?: number;
};

export type RunPeek = { state: 'new' | 'in_progress' | 'finished'; answered: number };

export interface RunDriver {
  readonly mode: 'offline' | 'online';
  /** Has this run been started or finished already? No side effects. */
  peek(): Promise<RunPeek>;
  /** Uses up today's attempt. Where to begin: 0, or further on when resuming. */
  start(): Promise<RunStart>;
  /** The opening words, plus the call already made (after a reconnect) and what Lock-In would stake. */
  teaser(index: number): Promise<TeaserInfo & { call: Call | null; lockin?: boolean }>;
  /** Locks in the call (or Generational Lock-In) and reveals the options. shownAt is on this phone's clock. */
  call(index: number, call: Call, lockin?: boolean): Promise<Revealed & { call: Call; shownAt: number; lockin?: boolean; stake?: number }>;
  /** choice null = the timer ran out. */
  answer(index: number, choice: number | null): Promise<Outcome>;
  /** Full answers once the run is over (for the recap). */
  recap(): Promise<RecapItem[]>;
}
