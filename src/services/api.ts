/**
 * Typed wrappers around the Supabase functions in
 * supabase/migrations/20260927000000_init.sql. Scoring happens there.
 */
import type { BoardId, Call, CategoryId } from '@/game/types';
import { ensureSession, supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: 'already_played' | 'already_answered' | 'not_signed_in' | 'no_questions' | 'network' | 'other',
  ) {
    super(message);
  }
}

/** Server messages → friendly text + a code the screens can act on. */
export function toApiError(raw: { message?: string } | null | undefined): ApiError {
  const m = raw?.message ?? 'Something went wrong';
  if (/already played today/i.test(m)) return new ApiError("You've already played this run today.", 'already_played');
  if (/already answered/i.test(m)) return new ApiError('That question is already answered.', 'already_answered');
  if (/not signed in|JWT|profile missing/i.test(m)) return new ApiError('Signing you in failed. Try again.', 'not_signed_in');
  if (/not enough questions/i.test(m)) return new ApiError("This board's questions aren't loaded yet.", 'no_questions');
  if (/fetch|network|timeout|Failed to/i.test(m)) return new ApiError('No connection. Check your internet and try again.', 'network');
  return new ApiError(m, 'other');
}

async function rawRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new ApiError('Offline mode', 'other');
  try {
    await ensureSession();
  } catch (e) {
    throw toApiError(e as Error);
  }
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toApiError(error);
  return data as T;
}

/** The nickname/avatar to send before the first game call (the server needs a profile). */
let wantedProfile: { nickname: string; avatar: string } | null = null;
let sentProfile: Promise<unknown> | null = null;

/** Called by the profile store whenever the nickname or avatar is set. */
export function syncProfile(nickname: string, avatar: string): Promise<unknown> {
  wantedProfile = { nickname, avatar };
  sentProfile = rawRpc('set_profile', { p_nickname: nickname, p_avatar: avatar }).catch((e) => {
    sentProfile = null; // try again on the next call
    throw e;
  });
  return sentProfile;
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (wantedProfile && !sentProfile) syncProfile(wantedProfile.nickname, wantedProfile.avatar).catch(() => {});
  if (sentProfile) await sentProfile.catch(() => {});
  return rawRpc<T>(fn, args);
}

export type TeaserRes = {
  day: string;
  q_index: number;
  question_count: number;
  category: CategoryId;
  teaser: string;
  total: number;
  call: Call | null;
};
export type CallRes = { q_index: number; call: Call; prompt: string; options: string[]; shown_at: string; server_now: string };
export type AnswerRes = {
  q_index: number;
  call: Call;
  choice: number | null;
  correct: boolean;
  answer_index: number;
  ms_left: number;
  points: number;
  total: number;
  answered: number;
  finished: boolean;
};
export type TodayRow = { board: BoardId; total: number; answered: number; correct: number; question_count: number; finished: boolean };
export type RecapRow = {
  q_index: number;
  call: Call;
  choice: number | null;
  correct: boolean;
  ms_left: number;
  points: number;
  prompt: string;
  options: string[];
  answer_index: number;
  category: CategoryId;
};
export type BoardRow = { rank: number; user_id: string; nickname: string; avatar: string; is_pro: boolean; total: number; runs: number; is_me: boolean };
export type LeagueRow = { id: string; code: string; name: string; is_owner: boolean; members: number };

export const api = {
  teaser: (board: BoardId, i: number) => rpc<TeaserRes>('get_teaser', { p_board: board, p_q_index: i }),
  call: (board: BoardId, i: number, call: Call) => rpc<CallRes>('place_call', { p_board: board, p_q_index: i, p_call: call }),
  answer: (board: BoardId, i: number, choice: number | null) => rpc<AnswerRes>('submit_answer', { p_board: board, p_q_index: i, p_choice: choice }),
  today: () => rpc<TodayRow[]>('my_today'),
  recap: (board: BoardId, day?: string) => rpc<RecapRow[] | null>('run_recap', { p_board: board, p_day: day ?? null }),
  board: (board: BoardId, leagueId?: string) =>
    rpc<BoardRow[]>('weekly_board', { p_board: board, p_week: null, p_league_id: leagueId ?? null, p_limit: 100 }),
  myLeagues: () => rpc<LeagueRow[]>('my_leagues'),
  createLeague: (name: string) => rpc<{ id: string; code: string; name: string }>('create_league', { p_name: name }),
  joinLeague: (code: string) => rpc<{ id: string; code: string; name: string }>('join_league', { p_code: code }),
  leaveLeague: (id: string) => rpc<void>('leave_league', { p_league_id: id }),
};
