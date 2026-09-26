import { describe, expect, it } from 'vitest';
import { OPENTDB_TO_BOARD, convertAll, convertRecord, countByBoard, type OpenTdbRecord } from '@/data/opentdb';

const enc = encodeURIComponent;

/** Builds a record the way the API returns it with encode=url3986. Text here is made up for the tests. */
function rec(p: Partial<Record<keyof OpenTdbRecord, string | string[]>>): OpenTdbRecord {
  const plain = {
    type: 'multiple',
    difficulty: 'easy',
    category: 'Geography',
    question: 'Which river runs through the made-up city of Testville?',
    correct_answer: 'Blue River',
    incorrect_answers: ['Red River', 'Green River', 'Grey River'],
    ...p,
  };
  return {
    type: enc(plain.type as string),
    difficulty: enc(plain.difficulty as string),
    category: enc(plain.category as string),
    question: enc(plain.question as string),
    correct_answer: enc(plain.correct_answer as string),
    incorrect_answers: (plain.incorrect_answers as string[]).map(enc),
  };
}

describe('Open Trivia DB mapping', () => {
  it('maps every source category from the plan to a board', () => {
    expect(OPENTDB_TO_BOARD['Entertainment: Video Games']).toBe('video-games');
    expect(OPENTDB_TO_BOARD['Celebrities']).toBe('pop-culture');
    expect(OPENTDB_TO_BOARD['Entertainment: Musicals & Theatres']).toBe('pop-culture');
    expect(OPENTDB_TO_BOARD['Science: Gadgets']).toBe('tech');
    expect(OPENTDB_TO_BOARD['Art']).toBe('books-art');
    expect(OPENTDB_TO_BOARD['Entertainment: Board Games']).toBe('mind-games');
    expect(OPENTDB_TO_BOARD['Mythology']).toBeUndefined();
    expect(Object.keys(OPENTDB_TO_BOARD)).toHaveLength(20);
  });

  it('decodes, shuffles stably, keeps the right answer and writes a teaser', () => {
    const a = convertRecord(rec({}));
    const b = convertRecord(rec({}));
    if (!('row' in a) || !('row' in b)) throw new Error('expected a row');
    expect(a.row.board).toBe('geography');
    expect(a.row.options).toEqual(b.row.options);
    expect(a.row.options[a.row.answer_index]).toBe('Blue River');
    expect(a.row.options).toHaveLength(4);
    expect(a.row.prompt.startsWith(a.row.teaser)).toBe(true);
    expect(a.row.teaser.length).toBeLessThan(a.row.prompt.length);
    expect(a.row.source_id).toMatch(/^opentdb:[a-z0-9]+$/);
  });

  it('keeps True/False in a fixed order', () => {
    const r = convertRecord(rec({ type: 'boolean', question: 'The made-up Testville river is blue.', correct_answer: 'False', incorrect_answers: ['True'] }));
    if (!('row' in r)) throw new Error('expected a row');
    expect(r.row.options).toEqual(['True', 'False']);
    expect(r.row.answer_index).toBe(1);
  });

  it('skips unmapped categories, overlong text, leftover HTML and duplicate options', () => {
    expect(convertRecord(rec({ category: 'Mythology' }))).toEqual({ skip: 'category' });
    expect(convertRecord(rec({ question: 'x'.repeat(200) }))).toEqual({ skip: 'too_long' });
    expect(convertRecord(rec({ question: 'What is &quot;this&quot;?' }))).toEqual({ skip: 'bad_text' });
    expect(convertRecord(rec({ incorrect_answers: ['blue river', 'Red River', 'Grey River'] }))).toEqual({ skip: 'duplicate_options' });
  });

  it('removes duplicates and counts per board', () => {
    const { rows, skipped } = convertAll([rec({}), rec({}), rec({ category: 'Sports', question: 'Which made-up team won the Testville Cup?' }), rec({ category: 'Politics' })]);
    expect(rows).toHaveLength(2);
    expect(skipped.category).toBe(1);
    expect(countByBoard(rows)).toEqual({ geography: 1, sports: 1 });
  });
});
