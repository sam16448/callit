import type { BoardId, CategoryId } from './types';

export type Board = {
  id: BoardId;
  name: string;
  emoji: string;
  /** One line on the board's tile and run intro. */
  tagline: string;
  /** Questions in that day's run. */
  runLength: number;
};

export const MIXED_RUN_LENGTH = 10;
export const CATEGORY_RUN_LENGTH = 5;

const cat = (id: CategoryId, name: string, emoji: string, tagline: string): Board => ({
  id,
  name,
  emoji,
  tagline,
  runLength: CATEGORY_RUN_LENGTH,
});

/** All boards, in the order they appear in the app. */
export const BOARDS: readonly Board[] = [
  { id: 'mixed', name: 'Mixed', emoji: '🌍', tagline: 'A bit of everything. The global board.', runLength: MIXED_RUN_LENGTH },
  cat('memes', 'Ball Knowledge', '🧠', 'Memes and internet moments since 2022'),
  cat('trends', 'Trends', '📈', 'What blew up on Insta and TikTok'),
  cat('brainrot', 'Brainrot', '🗿', 'Lore only the chronically online know'),
  cat('f1', 'F1', '🏎️', 'Drivers, drama, radio messages'),
  cat('football', 'Football', '⚽', 'Real ball knowledge'),
  cat('cricket', 'Cricket', '🏏', 'IPL, India and the big moments'),
  cat('gaming', 'Gaming', '🎮', 'Games everyone is playing'),
  cat('pop-culture', 'Pop Culture', '🎬', 'Music, movies, celebs'),
  cat('anime', 'Anime', '🍥', 'Seasonal hits and the classics'),
  cat('tech-ai', 'Tech & AI', '🤖', 'Gadgets, AI and the internet itself'),
];

export function boardById(id: string): Board | undefined {
  return BOARDS.find((b) => b.id === id);
}
