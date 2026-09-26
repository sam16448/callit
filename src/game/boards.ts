import type { BoardId, CategoryId } from './types';

export type Board = {
  id: BoardId;
  name: string;
  emoji: string;
  /** Questions in that day's run. */
  runLength: number;
  /** Open Trivia DB category names that feed this board (empty = our own questions). */
  sources: string[];
};

export const MIXED_RUN_LENGTH = 10;
export const CATEGORY_RUN_LENGTH = 5;

const cat = (id: CategoryId, name: string, emoji: string, sources: string[]): Board => ({
  id,
  name,
  emoji,
  runLength: CATEGORY_RUN_LENGTH,
  sources,
});

/** All 16 boards, in the order they appear in the app. */
export const BOARDS: readonly Board[] = [
  { id: 'mixed', name: 'Mixed', emoji: '🌍', runLength: MIXED_RUN_LENGTH, sources: [] },
  cat('video-games', 'Video Games', '🎮', ['Entertainment: Video Games']),
  cat('music', 'Music', '🎵', ['Entertainment: Music']),
  cat('general', 'General Knowledge', '🧠', ['General Knowledge']),
  cat('history', 'History', '🏛️', ['History']),
  cat('geography', 'Geography', '🗺️', ['Geography']),
  cat('film', 'Film', '🎬', ['Entertainment: Film']),
  cat('science', 'Science & Nature', '🔬', ['Science & Nature']),
  cat('pop-culture', 'Pop Culture', '✨', [
    'Celebrities',
    'Entertainment: Cartoon & Animations',
    'Entertainment: Comics',
    'Entertainment: Musicals & Theatres',
  ]),
  cat('tech', 'Tech', '💻', ['Science: Computers', 'Science: Gadgets']),
  cat('anime', 'Anime & Manga', '🍥', ['Entertainment: Japanese Anime & Manga']),
  cat('tv', 'TV', '📺', ['Entertainment: Television']),
  cat('books-art', 'Books & Art', '📚', ['Entertainment: Books', 'Art']),
  cat('sports', 'Sports', '⚽', ['Sports']),
  cat('mind-games', 'Mind Games', '♟️', ['Science: Mathematics', 'Entertainment: Board Games']),
  cat('cricket', 'Cricket', '🏏', []),
  cat('bollywood', 'Bollywood', '🎞️', []),
];

export function boardById(id: string): Board | undefined {
  return BOARDS.find((b) => b.id === id);
}
