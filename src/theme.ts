/**
 * Call It design tokens: near-black ink, one electric lime accent, and a colour
 * per call (Safe cyan, Sure lime, All-in hot pink). Space Grotesk for numbers
 * and headlines, Inter for text.
 */
import type { Call } from '@/game/types';

export const C = {
  bg: '#0B0A14',
  bgGlow: '#1E1638',
  surface: '#15131F',
  surfaceHi: '#1E1B2B',
  line: '#2A2640',
  text: '#F6F4FF',
  muted: '#A29CBD',
  faint: '#645E80',
  accent: '#C8FF2E',
  accentInk: '#141A00',
  accentSoft: 'rgba(200,255,46,0.12)',
  good: '#3DF29A',
  goodSoft: 'rgba(61,242,154,0.14)',
  bad: '#FF5470',
  badSoft: 'rgba(255,84,112,0.14)',
  gold: '#FFC940',
  scrim: 'rgba(6,5,12,0.82)',
} as const;

export const CALL_COLOR: Record<Call, { main: string; soft: string; ink: string }> = {
  safe: { main: '#3DDCFF', soft: 'rgba(61,220,255,0.13)', ink: '#001A22' },
  sure: { main: '#C8FF2E', soft: 'rgba(200,255,46,0.13)', ink: '#141A00' },
  allin: { main: '#FF3D7F', soft: 'rgba(255,61,127,0.15)', ink: '#2A0010' },
};

export const F = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
} as const;

export const R = { sm: 10, md: 14, lg: 20, xl: 28 } as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const T = {
  hero: { fontFamily: F.display, fontSize: 48, letterSpacing: -1.2 },
  h1: { fontFamily: F.display, fontSize: 30, letterSpacing: -0.6, lineHeight: 36 },
  h2: { fontFamily: F.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: F.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' as const },
};
