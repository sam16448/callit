/**
 * Where practice questions come from. Online: the server's practice-only pool
 * (ranked runs never use it) and its daily counter. Offline: bundled samples
 * not in today's Mixed run, counted on the phone.
 */
import { SAMPLE_QUESTIONS } from '@/data/sampleQuestions';
import { offlinePracticePool } from '@/game/practice';
import { teaserFor } from '@/game/teaser';
import type { BoardId, Question } from '@/game/types';
import { loadJson, saveJson } from '@/lib/storage';
import { api } from './api';
import { ONLINE } from './supabase';

const KEY = 'callit.practice.v1';

export type PracticeQuestion = { question: Question; teaser: string; servedToday: number };

async function localCount(day: string): Promise<number> {
  const saved = await loadJson<{ day: string; served: number }>(KEY);
  return saved?.day === day ? saved.served : 0;
}

/** How many practice questions have been served today. */
export async function practiceServedToday(day: string): Promise<number> {
  return ONLINE ? api.practiceToday() : localCount(day);
}

/** The next practice question. `avoid` skips the one just shown (offline). */
export async function nextPracticeQuestion(board: BoardId, day: string, avoid?: string): Promise<PracticeQuestion> {
  if (ONLINE) {
    const r = await api.practiceQuestion(board);
    return {
      question: { id: `practice:${r.id}`, category: r.category, prompt: r.prompt, options: r.options, answerIndex: r.answer_index, difficulty: 'medium' },
      teaser: `${r.teaser}…`,
      servedToday: r.served_today,
    };
  }
  const pool = offlinePracticePool(SAMPLE_QUESTIONS, day, board);
  const choices = pool.length > 1 ? pool.filter((q) => q.id !== avoid) : pool;
  const q = choices[Math.floor(Math.random() * choices.length)];
  const servedToday = (await localCount(day)) + 1;
  await saveJson(KEY, { day, served: servedToday });
  return { question: q, teaser: teaserFor(q), servedToday };
}
