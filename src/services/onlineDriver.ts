/**
 * Online driver: every step goes to the server, which scores the answer.
 * The phone never sees the right answer before answering.
 */
import type { RunDriver } from '@/game/driver';
import type { BoardId } from '@/game/types';
import { ApiError, api } from './api';

/** Converts the server's shown_at into this phone's clock, so a wrong phone clock can't shorten or stretch the timer. */
export function localShownAt(shownAtIso: string, serverNowIso: string, phoneNow: number): number {
  const elapsed = Date.parse(serverNowIso) - Date.parse(shownAtIso);
  return phoneNow - Math.max(0, elapsed);
}

export function createOnlineDriver(board: BoardId): RunDriver {
  return {
    mode: 'online',
    async peek() {
      const row = (await api.today()).find((r) => r.board === board);
      if (!row) return { state: 'new', answered: 0 };
      return { state: row.finished ? 'finished' : 'in_progress', answered: row.answered };
    },
    async start() {
      const today = await api.today();
      const row = today.find((r) => r.board === board);
      if (row?.finished) return { status: 'finished', questionCount: row.question_count };
      try {
        const t = await api.teaser(board, row?.answered ?? 0);
        return { status: 'ready', startIndex: t.q_index, total: t.total, questionCount: t.question_count };
      } catch (e) {
        // Everything left was already timed out on the server.
        if (e instanceof ApiError && e.code === 'already_played') return { status: 'finished', questionCount: row?.question_count ?? 0 };
        throw e;
      }
    },
    async teaser(i) {
      const t = await api.teaser(board, i);
      return { teaser: `${t.teaser}…`, category: t.category, call: t.call, lockin: t.lockin, lockinStake: t.lockin_stake };
    },
    async call(i, call, lockin = false) {
      const r = await api.call(board, i, call, lockin);
      return {
        call: r.call,
        lockin: r.lockin,
        stake: r.stake,
        prompt: r.prompt,
        options: r.options,
        shownAt: localShownAt(r.shown_at, r.server_now, Date.now()),
      };
    },
    async answer(i, choice) {
      const r = await api.answer(board, i, choice);
      return {
        choice: r.choice,
        correct: r.correct,
        answerIndex: r.answer_index,
        msLeft: r.ms_left,
        points: r.points,
        total: r.total,
        questionId: `${board}:${i}`,
        lockin: r.lockin,
        stake: r.stake,
      };
    },
    async recap() {
      const rows = (await api.recap(board)) ?? [];
      return rows.map((r) => ({
        call: r.call,
        lockin: r.lockin,
        stake: r.stake,
        choice: r.choice,
        correct: r.correct,
        msLeft: r.ms_left,
        points: r.points,
        question: {
          id: `${board}:${r.q_index}`,
          category: r.category,
          prompt: r.prompt,
          options: r.options,
          answerIndex: r.answer_index,
          difficulty: 'medium' as const,
        },
      }));
    },
  };
}
