/**
 * The run as a pure state machine, so it can be tested without a phone:
 *
 *   call ──PLACE_CALL──▶ question ──ANSWER / TIMEOUT──▶ result ──NEXT──▶ call … ▶ summary
 *
 * Times are passed in (never read from the clock here). In a ranked online run
 * the server stamps these times; offline the phone does.
 */
import { featured, questionMoments, runMoments, type MomentId } from './moments';
import { QUESTION_MS, clampMsLeft, scoreAnswer } from './scoring';
import type { AnswerRecord, Call, Question } from './types';

export type Phase = 'call' | 'question' | 'result' | 'summary';

export type RunState = {
  questions: Question[];
  index: number;
  phase: Phase;
  call: Call | null;
  /** When the options were shown (ms). */
  shownAt: number | null;
  answers: AnswerRecord[];
  total: number;
  /** Moments triggered by each answered question, same order as answers. */
  moments: MomentId[][];
  /** The moment to show right now on the result screen. */
  spotlight: MomentId | null;
  /** Moments judged at the end of the run (perfect, new #1, streak). */
  endMoments: MomentId[];
  chill: boolean;
};

export type RunAction =
  | { type: 'PLACE_CALL'; call: Call; now: number }
  | { type: 'ANSWER'; choice: number; now: number }
  | { type: 'TIMEOUT'; now: number }
  | { type: 'NEXT'; dayStreak?: number; isNewNumberOne?: boolean }
  | { type: 'QUIT' };

export function startRun(questions: Question[], opts: { chill?: boolean } = {}): RunState {
  return {
    questions,
    index: 0,
    phase: questions.length ? 'call' : 'summary',
    call: null,
    shownAt: null,
    answers: [],
    total: 0,
    moments: [],
    spotlight: null,
    endMoments: [],
    chill: Boolean(opts.chill),
  };
}

export function currentQuestion(s: RunState): Question | undefined {
  return s.questions[s.index];
}

export function msLeftAt(s: RunState, now: number): number {
  if (s.shownAt === null) return QUESTION_MS;
  return clampMsLeft(QUESTION_MS - (now - s.shownAt));
}

function record(s: RunState, choice: number | null, now: number): RunState {
  const q = currentQuestion(s);
  if (!q || s.call === null) return s;
  const msLeft = choice === null ? 0 : msLeftAt(s, now);
  // Answering after the timer ran out counts as a timeout.
  const late = choice !== null && msLeft <= 0;
  const correct = !late && choice !== null && choice === q.answerIndex;
  const points = scoreAnswer(s.call, correct, msLeft);
  const total = s.total + points;
  const answer: AnswerRecord = {
    questionId: q.id,
    call: s.call,
    choice: late ? null : choice,
    correct,
    msLeft: late ? 0 : msLeft,
    points,
    total,
  };
  const answers = [...s.answers, answer];
  const triggered = questionMoments(answers);
  return {
    ...s,
    phase: 'result',
    answers,
    total,
    moments: [...s.moments, triggered],
    spotlight: featured(triggered, { chill: s.chill }),
  };
}

export function runReducer(s: RunState, a: RunAction): RunState {
  switch (a.type) {
    case 'PLACE_CALL':
      if (s.phase !== 'call') return s;
      return { ...s, phase: 'question', call: a.call, shownAt: a.now };
    case 'ANSWER':
      if (s.phase !== 'question') return s;
      return record(s, a.choice, a.now);
    case 'TIMEOUT':
      if (s.phase !== 'question') return s;
      return record(s, null, a.now);
    case 'NEXT': {
      if (s.phase !== 'result') return s;
      const index = s.index + 1;
      if (index < s.questions.length) {
        return { ...s, index, phase: 'call', call: null, shownAt: null, spotlight: null };
      }
      const endMoments = runMoments(s.answers, {
        questionCount: s.questions.length,
        dayStreak: a.dayStreak,
        isNewNumberOne: a.isNewNumberOne,
      });
      return { ...s, index, phase: 'summary', call: null, shownAt: null, endMoments, spotlight: featured(endMoments, { chill: s.chill }) };
    }
    case 'QUIT':
      // Leaving ends the run: unanswered questions simply score nothing.
      return { ...s, phase: 'summary', call: null, shownAt: null, spotlight: null };
    default:
      return s;
  }
}

/** Short summary numbers for the summary screen and share card. */
export function runStats(s: RunState) {
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
    questionCount: s.questions.length,
    allinHits: allins.filter((a) => a.correct).length,
    allinCount: allins.length,
    bestStreak,
    allMoments,
    biggest: featured(allMoments),
  };
}

/** Wordle-style row of squares: one per question. */
export function shareGrid(s: RunState): string {
  const glyph: Record<Call, [string, string]> = {
    safe: ['🟦', '⬜'],
    sure: ['🟩', '🟥'],
    allin: ['🟪', '💀'],
  };
  const cells = s.questions.map((_, i) => {
    const a = s.answers[i];
    if (!a) return '▫️';
    return glyph[a.call][a.correct ? 0 : 1];
  });
  return cells.join('');
}
