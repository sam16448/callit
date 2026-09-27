import type { BoardId, CategoryId } from './types';

export type Board = {
  id: BoardId;
  name: string;
  emoji: string;
  /** One line on the board's tile and run intro. */
  tagline: string;
  /** Questions in that day's run. */
  runLength: number;
  /** The board's colour on tiles and run screens. */
  color: string;
};

export const MIXED_RUN_LENGTH = 10;
export const CATEGORY_RUN_LENGTH = 5;

const cat = (id: CategoryId, name: string, emoji: string, tagline: string, color: string): Board => ({
  id,
  name,
  emoji,
  tagline,
  color,
  runLength: CATEGORY_RUN_LENGTH,
});

/** All boards, in the order they appear in the app. */
export const BOARDS: readonly Board[] = [
  { id: 'mixed', name: 'Mixed', emoji: '🌍', tagline: 'A bit of everything. The global board.', runLength: MIXED_RUN_LENGTH, color: '#C8FF2E' },
  cat('now', 'Trending Now', '🔥', 'What the internet is on this month', '#FF6A3D'),
  cat('memes', 'Ball Knowledge', '🧠', 'Memes and internet moments since 2022', '#B983FF'),
  cat('trends', 'Trends Vault', '📈', 'Every Insta and TikTok trend since 2022', '#FF3D7F'),
  cat('brainrot', 'Brainrot', '🗿', 'Lore only the chronically online know', '#7CF5C8'),
  cat('f1', 'F1', '🏎️', 'Drivers, drama, radio messages', '#FF4D4D'),
  cat('football', 'Football', '⚽', 'Real ball knowledge', '#3DF29A'),
  cat('cricket', 'Cricket', '🏏', 'IPL, India and the big moments', '#3DDCFF'),
  cat('gaming', 'Gaming', '🎮', 'Games everyone is playing', '#8C7CFF'),
  cat('pop-culture', 'Pop Culture', '🎬', 'Music, movies, celebs', '#FFC940'),
  cat('anime', 'Anime', '🍥', 'Seasonal hits and the classics', '#FF8AD8'),
  cat('tech-ai', 'Tech & AI', '🤖', 'Gadgets, AI and the internet itself', '#5AA9FF'),
];

export function boardById(id: string): Board | undefined {
  return BOARDS.find((b) => b.id === id);
}
