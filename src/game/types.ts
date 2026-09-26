/** The three calls a player can make before seeing the options. */
export type Call = 'safe' | 'sure' | 'allin';

export const CALLS: readonly Call[] = ['safe', 'sure', 'allin'];

/** Board ids. "mixed" feeds the global board; the rest are weekly category boards. */
export type BoardId =
  | 'mixed'
  | 'video-games'
  | 'music'
  | 'general'
  | 'history'
  | 'geography'
  | 'film'
  | 'science'
  | 'pop-culture'
  | 'tech'
  | 'anime'
  | 'tv'
  | 'books-art'
  | 'sports'
  | 'mind-games'
  | 'cricket'
  | 'bollywood';

/** A category board: every board except "mixed". */
export type CategoryId = Exclude<BoardId, 'mixed'>;

export type Question = {
  id: string;
  category: CategoryId;
  /** Full question text, shown with the options. */
  prompt: string;
  /** Optional hand-written teaser; otherwise the opening words of the prompt are used. */
  teaser?: string;
  /** Exactly four options for multiple choice, or two for true/false. */
  options: string[];
  /** Index of the correct option in `options`. */
  answerIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
};

/** What happened on one question of a run. */
export type AnswerRecord = {
  questionId: string;
  call: Call;
  /** Index the player tapped, or null if the timer ran out. */
  choice: number | null;
  correct: boolean;
  /** Milliseconds left on the 15-second timer when the player answered (0 on timeout). */
  msLeft: number;
  points: number;
  /** Running total after this question. */
  total: number;
};
