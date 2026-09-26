/**
 * Turns raw Open Trivia DB records into Call It questions. Pure, so it's tested
 * (tests/opentdb.test.ts); the download/upload lives in scripts/import-questions.ts.
 *
 * Open Trivia DB questions are CC BY-SA 4.0: https://opentdb.com
 */
import { BOARDS } from '@/game/boards';
import { hashString, seededShuffle } from '@/game/dailySet';
import { teaserFor } from '@/game/teaser';
import type { CategoryId } from '@/game/types';

/** A record as the API returns it with encode=url3986 (every string URL-encoded). */
export type OpenTdbRecord = {
  type: string;
  difficulty: string;
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
};

/** A row for the `questions` table. */
export type QuestionRow = {
  source: 'opentdb' | 'callit';
  source_id: string;
  board: CategoryId;
  prompt: string;
  teaser: string;
  options: string[];
  answer_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
};

/** Open Trivia DB category name → our board. Categories not listed are skipped. */
export const OPENTDB_TO_BOARD: Record<string, CategoryId> = Object.fromEntries(
  BOARDS.filter((b) => b.id !== 'mixed').flatMap((b) => b.sources.map((s) => [s, b.id as CategoryId])),
);

const MAX_PROMPT = 180;
const MAX_OPTION = 60;

function decode(s: string): string {
  try {
    return decodeURIComponent(s).replace(/\s+/g, ' ').trim();
  } catch {
    return s.replace(/\s+/g, ' ').trim();
  }
}

export type SkipReason = 'category' | 'type' | 'too_long' | 'bad_text' | 'duplicate_options';

/** Converts one record, or says why it was skipped. */
export function convertRecord(raw: OpenTdbRecord): { row: QuestionRow } | { skip: SkipReason } {
  const category = decode(raw.category);
  const board = OPENTDB_TO_BOARD[category];
  if (!board) return { skip: 'category' };
  const type = decode(raw.type);
  if (type !== 'multiple' && type !== 'boolean') return { skip: 'type' };

  const prompt = decode(raw.question);
  const correct = decode(raw.correct_answer);
  const wrong = raw.incorrect_answers.map(decode);
  const all = [correct, ...wrong];

  if (prompt.length > MAX_PROMPT || all.some((o) => o.length > MAX_OPTION)) return { skip: 'too_long' };
  if (!prompt || all.some((o) => !o) || /<[a-z/][^>]*>|&[a-z]+;|&#\d+;/i.test([prompt, ...all].join(' '))) return { skip: 'bad_text' };
  if (new Set(all.map((o) => o.toLowerCase())).size !== all.length) return { skip: 'duplicate_options' };

  // Stable id from the question text, so re-importing updates instead of duplicating.
  const source_id = `opentdb:${hashString(`${category}|${prompt}`).toString(36)}`;

  let options: string[];
  if (type === 'boolean') {
    options = ['True', 'False'];
    if (correct !== 'True' && correct !== 'False') return { skip: 'bad_text' };
  } else {
    if (wrong.length !== 3) return { skip: 'type' };
    // Shuffle once, the same way every import, so the right answer isn't always first.
    options = seededShuffle(all, source_id);
  }

  const difficulty = (['easy', 'medium', 'hard'] as const).find((d) => d === decode(raw.difficulty)) ?? 'medium';
  return {
    row: {
      source: 'opentdb',
      source_id,
      board,
      prompt,
      teaser: teaserFor({ prompt }).replace(/…$/, ''),
      options,
      answer_index: options.indexOf(correct),
      difficulty,
    },
  };
}

/** Converts a batch, dropping duplicates by id, and counts what was skipped. */
export function convertAll(records: OpenTdbRecord[]) {
  const rows = new Map<string, QuestionRow>();
  const skipped: Record<SkipReason, number> = { category: 0, type: 0, too_long: 0, bad_text: 0, duplicate_options: 0 };
  for (const r of records) {
    const out = convertRecord(r);
    if ('skip' in out) skipped[out.skip]++;
    else rows.set(out.row.source_id, out.row);
  }
  return { rows: [...rows.values()], skipped };
}

/** Per-board counts, to check every board has enough for daily runs. */
export function countByBoard(rows: QuestionRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.board] = (out[r.board] ?? 0) + 1;
  return out;
}
