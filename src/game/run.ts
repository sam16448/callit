/**
 * The run as a pure state machine. It never decides right or wrong itself:
 * a driver does (the server when online, src/game/offlineDriver.ts offline)
 * and the screen feeds the results in:
 *
 *   TEASER ▶ call ──CALLED──▶ question ──ANSWERED──▶ result ──NEXT──▶ (TEASER) … ▶ summary
 */
import { featured, questionMoments, runMoments, type MomentId } from './moments';
import type { AnswerRecord, Call, CategoryId, Question } from './types';

export type Phase = 'call' | 'question' | 'result' | 'summary';

export type TeaserInfo = {
  teaser: string;
  category: CategoryId;
  /** Aura that Generational Lock-In would stake right now, or null/undefined if it isn't available. */
  lockinStake?: number | null;
};
export type Revealed = { prompt: string; options: string[] };

/** What the driver reports after an answer (or a timeout: choice null). */
export type Outcome = {
  choice: number | null;
  correct: boolean;
  answerIndex: number;
  msLeft: number;
  points: number;
  /** Running total from the server; worked out locally when missing. */
  total?: number;
  lockin?: boolean;
  stake?: number;
  questionId?: string;
};

export type RunState = {
  questionCount: number;
  index: number;
  phase: Phase;
  /** Null while the next teaser is loading. */
  teaser: TeaserInfo | null;
  call: Call | null;
  /** This question is a Generational Lock-In, with this much Aura staked. */
  lockin: boolean;
  stake: number;
  /** When the options appeared, on this phone's clock (ms). */
  shownAt: number | null;
  revealed: Revealed | null;
  /** Questions answered so far, with their answers, in order. */
  questions: Question[];
  answers: AnswerRecord[];
  total: number;
  /** Moments triggered by each answered question, same order as answers. */
  moments: MomentId[][];
  /** The moment to show right now. */
  spotlight: MomentId | null;
  /** Moments judged at the end of the run (perfect, new #1, streak). */
  endMoments: MomentId[];
  chill: boolean;
};

export type RunAction =
  | { type: 'TEASER'; teaser: TeaserInfo }
  | { type: 'CALLED'; call: Call; revealed: Revealed; shownAt: number; lockin?: boolean; stake?: number }
  | { type: 'ANSWERED'; outcome: Outcome }
  | { type: 'NEXT'; dayStreak?: number; isNewNumberOne?: boolean }
  | { type: 'QUIT' };

export function startRun(questionCount: number, opts: { chill?: boolean; startIndex?: number; startTotal?: number } = {}): RunState {
  const index = opts.startIndex ?? 0;
  return {
    questionCount,
    index,
    phase: questionCount > index ? 'call' : 'summary',
    teaser: null,
    call: null,
    lockin: false,
    stake: 0,
    shownAt: null,
    revealed: null,
    questions: [],
    answers: [],
    total: opts.startTotal ?? 0,
    moments: [],
    spotlight: null,
    endMoments: [],
    chill: Boolean(opts.chill),
  };
}

export function runReducer(s: RunState, a: RunAction): RunState {
  switch (a.type) {
    case 'TEASER':
      if (s.phase !== 'call') return s;
      return { ...s, teaser: a.teaser };
    case 'CALLED':
      if (s.phase !== 'call' || !s.teaser) return s;
      return { ...s, phase: 'question', call: a.call, revealed: a.revealed, shownAt: a.shownAt, lockin: Boolean(a.lockin), stake: a.stake ?? 0 };
    case 'ANSWERED': {
      if (s.phase !== 'question' || !s.call || !s.revealed || !s.teaser) return s;
      const o = a.outcome;
      const question: Question = {
        id: o.questionId ?? `q${s.index}`,
        category: s.teaser.category,
        prompt: s.revealed.prompt,
        teaser: s.teaser.teaser,
        options: s.revealed.options,
        answerIndex: o.answerIndex,
        difficulty: 'medium',
      };
      const total = o.total ?? s.total + o.points;
      const answer: AnswerRecord = {
        questionId: question.id,
        call: s.call,
        choice: o.choice,
        correct: o.correct,
        msLeft: o.msLeft,
        points: o.points,
        total,
        ...(s.lockin || o.lockin ? { lockin: true, stake: o.stake ?? s.stake } : {}),
      };
      const answers = [...s.answers, answer];
      const triggered = questionMoments(answers);
      return {
        ...s,
        phase: 'result',
        questions: [...s.questions, question],
        answers,
        total,
        moments: [...s.moments, triggered],
        spotlight: featured(triggered, { chill: s.chill }),
      };
    }
    case 'NEXT': {
      if (s.phase !== 'result') return s;
      const index = s.index + 1;
      const cleared = { call: null, shownAt: null, revealed: null, teaser: null, spotlight: null, lockin: false, stake: 0 };
      if (index < s.questionCount) return { ...s, ...cleared, index, phase: 'call' };
      const endMoments = runMoments(s.answers, {
        questionCount: s.questionCount,
        dayStreak: a.dayStreak,
        isNewNumberOne: a.isNewNumberOne,
      });
      return { ...s, ...cleared, index, phase: 'summary', endMoments, spotlight: featured(endMoments, { chill: s.chill }) };
    }
    case 'QUIT':
      // Leaving ends the run: unanswered questions simply score nothing.
      return { ...s, phase: 'summary', call: null, shownAt: null, revealed: null, spotlight: null };
    default:
      return s;
  }
}

/** Wordle-style row of squares: one per question. */
export function gridFor(answers: readonly Pick<AnswerRecord, 'call' | 'correct' | 'lockin'>[], questionCount: number): string {
  const glyph: Record<Call, [string, string]> = {
    safe: ['🟦', '⬜'],
    sure: ['🟩', '🟥'],
    allin: ['🟪', '💀'],
  };
  return Array.from({ length: questionCount }, (_, i) => {
    const a = answers[i];
    if (!a) return '▫️';
    if (a.lockin) return a.correct ? '🔒' : '📉';
    return glyph[a.call][a.correct ? 0 : 1];
  }).join('');
}

export function shareGrid(s: RunState): string {
  return gridFor(s.answers, s.questionCount);
}

/** Short summary numbers for the summary screen and share card. */
export function runStats(s: Pick<RunState, 'answers' | 'moments' | 'endMoments' | 'questionCount' | 'total'>) {
  const correct = s.answers.filter((a) => a.correct).length;
  const allins = s.answers.filter((a) => a.call === 'allin');
  const allMoments = [...s.moments.flat(), ...s.endMoments];
  let bestStreak = 0;
  let cur = 0;
  for (const a of s.answers) {
    cur = a.correct ? cur + 1 : 0;
    bestStreak = Math.max(bestStreak, cur);
  }
  return {
    total: s.total,
    correct,
    answered: s.answers.length,
    questionCount: s.questionCount,
    allinHits: allins.filter((a) => a.correct).length,
    allinCount: allins.length,
    bestStreak,
    allMoments,
    biggest: featured(allMoments),
  };
}
