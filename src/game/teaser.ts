import type { Question } from './types';

const MIN_WORDS = 4;
const MAX_WORDS = 8;

/**
 * The opening words shown on the call screen. Enough to guess the topic, not
 * enough to know the answer: about half the prompt, between 4 and 8 words,
 * and never the whole question.
 */
export function teaserFor(q: Pick<Question, 'prompt' | 'teaser'>): string {
  if (q.teaser?.trim()) return `${q.teaser.trim().replace(/[,;:?.!…]+$/, '')}…`;
  const words = q.prompt.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  let n = Math.ceil(words.length * 0.5);
  n = Math.max(MIN_WORDS, Math.min(MAX_WORDS, n));
  n = Math.min(n, words.length - 1);
  if (n <= 0) return '…';
  let text = words
    .slice(0, n)
    .join(' ')
    .replace(/[,;:?.!]+$/, '');
  // Never stop inside a quote ("Vernon…): cut back to before the open quote.
  if ((text.match(/"/g) ?? []).length % 2 === 1) {
    const cut = text.replace(/\s*"[^"]*$/, '').trim();
    if (cut) text = cut;
  }
  return `${text}…`;
}
