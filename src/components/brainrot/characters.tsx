/**
 * The Call It crew: original brainrot-style characters (everyday things with
 * pseudo-Italian names), drawn here as plain SVG so they're ours to use.
 * None of them copy an existing meme character.
 */
import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { CharacterId } from '@/lib/avatar';

const INK = '#1B1830';
const W = 2.5;

export type { CharacterId };

export type Character = { id: CharacterId; name: string; bg: string; art: ReactNode };

/** Two googly eyes and a mouth. `mood` changes the mouth. */
function Face({ x, y, gap = 8, eye = 5.5, mood = 'grin' }: { x: number; y: number; gap?: number; eye?: number; mood?: 'grin' | 'smirk' | 'o' | 'fangs' }) {
  return (
    <G>
      <Circle cx={x - gap} cy={y} r={eye} fill="#fff" stroke={INK} strokeWidth={2} />
      <Circle cx={x + gap} cy={y} r={eye} fill="#fff" stroke={INK} strokeWidth={2} />
      <Circle cx={x - gap + 1.5} cy={y + 1} r={eye * 0.45} fill={INK} />
      <Circle cx={x + gap + 1.5} cy={y + 1} r={eye * 0.45} fill={INK} />
      {mood === 'grin' ? <Path d={`M${x - 7} ${y + 10} Q${x} ${y + 18} ${x + 7} ${y + 10} Z`} fill={INK} /> : null}
      {mood === 'smirk' ? <Path d={`M${x - 6} ${y + 12} Q${x + 2} ${y + 16} ${x + 8} ${y + 9}`} stroke={INK} strokeWidth={W} fill="none" strokeLinecap="round" /> : null}
      {mood === 'o' ? <Ellipse cx={x} cy={y + 13} rx={3.5} ry={4.5} fill={INK} /> : null}
      {mood === 'fangs' ? (
        <G>
          <Path d={`M${x - 8} ${y + 10} Q${x} ${y + 17} ${x + 8} ${y + 10}`} stroke={INK} strokeWidth={W} fill="none" strokeLinecap="round" />
          <Polygon points={`${x - 5},${y + 12} ${x - 2},${y + 12} ${x - 3.5},${y + 17}`} fill="#fff" stroke={INK} strokeWidth={1} />
          <Polygon points={`${x + 2},${y + 12} ${x + 5},${y + 12} ${x + 3.5},${y + 17}`} fill="#fff" stroke={INK} strokeWidth={1} />
        </G>
      ) : null}
    </G>
  );
}

function Shades({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Rect x={x - 19} y={y - 5} width={16} height={10} rx={4} fill={INK} />
      <Rect x={x + 3} y={y - 5} width={16} height={10} rx={4} fill={INK} />
      <Line x1={x - 3} y1={y - 2} x2={x + 3} y2={y - 2} stroke={INK} strokeWidth={W} />
      <Line x1={x - 15} y1={y - 3} x2={x - 10} y2={y - 3} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={x + 7} y1={y - 3} x2={x + 12} y2={y - 3} stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
    </G>
  );
}

export const CHARACTERS: Character[] = [
  {
    id: 'frigo',
    name: 'Frigorifero Flamingetto',
    bg: '#2B2250',
    art: (
      <G>
        <Path d="M42 78 L39 88 L43 96 M58 78 L61 88 L57 96" stroke="#FF6FA8" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M38 96 H46 M54 96 H62" stroke="#FF6FA8" strokeWidth={4} strokeLinecap="round" />
        <Rect x={28} y={12} width={44} height={68} rx={9} fill="#EAF6FF" stroke={INK} strokeWidth={W} />
        <Line x1={28} y1={34} x2={72} y2={34} stroke={INK} strokeWidth={W} />
        <Rect x={64} y={18} width={3.5} height={11} rx={1.5} fill={INK} />
        <Rect x={64} y={40} width={3.5} height={14} rx={1.5} fill={INK} />
        <Path d="M50 12 Q46 4 52 2 Q58 1 56 7" stroke="#FF6FA8" strokeWidth={4} fill="none" strokeLinecap="round" />
        <Face x={47} y={52} mood="grin" />
      </G>
    ),
  },
  {
    id: 'gelato',
    name: 'Gelatino Astronautino',
    bg: '#14304A',
    art: (
      <G>
        <Polygon points="36,58 64,58 50,95" fill="#E9A95B" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Path d="M40 66 L58 80 M45 60 L61 72 M60 66 L43 80 M55 60 L39 72" stroke="#B9762E" strokeWidth={1.5} />
        <Circle cx={50} cy={46} r={19} fill="#FF9EC7" stroke={INK} strokeWidth={W} />
        <Circle cx={50} cy={44} r={30} fill="rgba(190,235,255,0.22)" stroke="#BFE9FF" strokeWidth={3} />
        <Path d="M30 30 Q36 20 46 18" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.8} />
        <Line x1={50} y1={14} x2={50} y2={6} stroke="#BFE9FF" strokeWidth={2.5} />
        <Circle cx={50} cy={5} r={3.5} fill="#FF5470" />
        <Face x={50} y={44} gap={7} eye={5} mood="o" />
      </G>
    ),
  },
  {
    id: 'samosa',
    name: 'Samosa Supremo',
    bg: '#3A1E2E',
    art: (
      <G>
        <Path d="M32 42 L16 92 L84 92 L68 42 Z" fill="#E6394A" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Polygon points="50,12 86,82 14,82" fill="#F2B544" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Path d="M44 22 l4 3 M38 34 l4 3 M32 46 l4 3 M56 22 l-4 3 M62 34 l-4 3 M68 46 l-4 3" stroke="#A8701C" strokeWidth={2} strokeLinecap="round" />
        <Circle cx={50} cy={74} r={4.5} fill="#3DF29A" stroke={INK} strokeWidth={1.5} />
        <Face x={50} y={54} gap={8} eye={5.5} mood="grin" />
      </G>
    ),
  },
  {
    id: 'chai',
    name: 'Chai Chai Occhialini',
    bg: '#3B2418',
    art: (
      <G>
        <Path d="M40 24 Q36 16 40 10 M50 22 Q46 14 50 6 M60 24 Q56 16 60 10" stroke="#fff" strokeWidth={2.5} fill="none" opacity={0.7} strokeLinecap="round" />
        <Path d="M25 32 H75 L66 92 H34 Z" fill="#C8643B" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Ellipse cx={50} cy={32} rx={25} ry={6} fill="#D9A066" stroke={INK} strokeWidth={W} />
        <Path d="M30 78 H70" stroke="#9E4A26" strokeWidth={2} />
        <Shades x={50} y={52} />
        <Path d="M42 66 Q50 72 58 66" stroke={INK} strokeWidth={W} fill="none" strokeLinecap="round" />
      </G>
    ),
  },
  {
    id: 'mango',
    name: 'Mangolino Reale',
    bg: '#3A2A08',
    art: (
      <G>
        <Path d="M50 22 C74 20 84 44 78 66 C72 88 46 96 32 84 C18 72 22 44 32 32 C38 25 44 22 50 22 Z" fill="#FFB627" stroke={INK} strokeWidth={W} />
        <Circle cx={66} cy={70} r={10} fill="#FF7A3D" opacity={0.6} />
        <Path d="M52 22 Q62 12 74 16 Q64 26 52 22 Z" fill="#3DBE5A" stroke={INK} strokeWidth={2} />
        <Polygon points="32,20 36,6 43,15 50,4 57,15 64,6 68,20" fill="#FFC940" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={50} cy={9} r={2.2} fill="#FF3D7F" />
        <Face x={49} y={52} mood="grin" />
      </G>
    ),
  },
  {
    id: 'donut',
    name: 'Donutto Diavoletto',
    bg: '#2E1030',
    art: (
      <G>
        <Path d="M78 70 Q94 66 90 50 L86 54 M90 50 L94 55" stroke="#E6394A" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Polygon points="30,34 28,16 42,28" fill="#E6394A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <Polygon points="70,34 72,16 58,28" fill="#E6394A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={50} cy={58} r={21} fill="none" stroke={INK} strokeWidth={24} />
        <Circle cx={50} cy={58} r={21} fill="none" stroke="#E0A060" strokeWidth={19} />
        <Circle cx={50} cy={58} r={21} fill="none" stroke="#FF5FA2" strokeWidth={14} />
        <Path d="M36 44 l3 2 M60 42 l3 -1 M68 60 l1 3 M34 66 l3 1 M46 78 l3 0 M62 74 l2 2" stroke="#C8FF2E" strokeWidth={2.5} strokeLinecap="round" />
        <Face x={50} y={40} gap={9} eye={4.5} mood="fangs" />
      </G>
    ),
  },
  {
    id: 'cubo',
    name: 'Cubetto Glaciale',
    bg: '#0E2A3A',
    art: (
      <G>
        <Polygon points="24,32 38,20 80,20 66,32" fill="#E4FAFF" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Polygon points="66,32 80,20 80,72 66,84" fill="#8FD8F0" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Rect x={24} y={32} width={42} height={52} rx={4} fill="#BFEFFF" stroke={INK} strokeWidth={W} />
        <Path d="M30 40 L36 36" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        <Path d="M40 84 Q40 92 43 92 Q46 92 46 86" fill="#8FD8F0" stroke={INK} strokeWidth={1.5} />
        <Shades x={45} y={52} />
        <Path d="M37 68 Q46 72 55 64" stroke={INK} strokeWidth={W} fill="none" strokeLinecap="round" />
      </G>
    ),
  },
  {
    id: 'lampa',
    name: 'Lampadina Lupetto',
    bg: '#2A2A10',
    art: (
      <G>
        <Path d="M14 40 H6 M86 40 H94 M22 16 L16 10 M78 16 L84 10" stroke="#FFF27A" strokeWidth={3} strokeLinecap="round" />
        <Polygon points="30,26 32,6 46,18" fill="#8A8FA8" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <Polygon points="70,26 68,6 54,18" fill="#8A8FA8" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M50 14 C68 14 78 28 76 44 C74 56 64 60 62 70 H38 C36 60 26 56 24 44 C22 28 32 14 50 14 Z" fill="#FFF27A" stroke={INK} strokeWidth={W} />
        <Rect x={38} y={70} width={24} height={18} rx={3} fill="#A7ABBF" stroke={INK} strokeWidth={W} />
        <Path d="M38 76 H62 M38 82 H62" stroke={INK} strokeWidth={1.5} />
        <Face x={50} y={38} gap={9} eye={5} mood="fangs" />
      </G>
    ),
  },
  {
    id: 'sushi',
    name: 'Sushino Sumotto',
    bg: '#301418',
    art: (
      <G>
        <Path d="M16 62 Q6 54 12 46 M84 62 Q94 54 88 46" stroke="#FFFFFF" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Circle cx={12} cy={45} r={4.5} fill="#fff" stroke={INK} strokeWidth={1.5} />
        <Circle cx={88} cy={45} r={4.5} fill="#fff" stroke={INK} strokeWidth={1.5} />
        <Ellipse cx={50} cy={66} rx={34} ry={22} fill="#FFFFFF" stroke={INK} strokeWidth={W} />
        <Path d="M16 50 Q50 20 84 50 Q50 62 16 50 Z" fill="#FF8A5B" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Path d="M32 40 Q40 48 36 54 M48 34 Q56 44 52 54 M64 38 Q70 46 68 52" stroke="#FFD2BC" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Rect x={17} y={66} width={66} height={11} rx={3} fill="#1F3B2A" stroke={INK} strokeWidth={2} />
        <Face x={50} y={84} gap={8} eye={4} mood="smirk" />
      </G>
    ),
  },
  {
    id: 'pizza',
    name: 'Pizzetta Rockstar',
    bg: '#34160E',
    art: (
      <G>
        <Polygon points="20,26 80,26 50,94" fill="#FFD447" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Rect x={16} y={18} width={68} height={12} rx={6} fill="#C77A36" stroke={INK} strokeWidth={W} />
        <Circle cx={40} cy={40} r={5} fill="#E6394A" />
        <Circle cx={60} cy={62} r={5} fill="#E6394A" />
        <Circle cx={50} cy={80} r={4} fill="#E6394A" />
        <Path d="M12 30 Q12 2 50 4 Q88 2 88 30" stroke={INK} strokeWidth={4} fill="none" />
        <Rect x={6} y={24} width={12} height={18} rx={5} fill="#FF3D7F" stroke={INK} strokeWidth={2} />
        <Rect x={82} y={24} width={12} height={18} rx={5} fill="#FF3D7F" stroke={INK} strokeWidth={2} />
        <Face x={50} y={48} gap={8} eye={5} mood="grin" />
      </G>
    ),
  },
  {
    id: 'boba',
    name: 'Boba Bombastico',
    bg: '#2A1A36',
    art: (
      <G>
        <Path d="M30 52 Q14 50 16 36 Q22 30 26 38 M70 52 Q86 50 84 36 Q78 30 74 38" stroke="#F3D9B1" strokeWidth={7} fill="none" strokeLinecap="round" />
        <Circle cx={21} cy={36} r={6} fill="#F3D9B1" stroke={INK} strokeWidth={1.5} />
        <Circle cx={79} cy={36} r={6} fill="#F3D9B1" stroke={INK} strokeWidth={1.5} />
        <Rect x={54} y={2} width={7} height={30} rx={3} fill="#FF3D7F" stroke={INK} strokeWidth={1.5} transform="rotate(18 57 17)" />
        <Path d="M29 28 H71 L64 94 H36 Z" fill="#F3D9B1" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Ellipse cx={50} cy={28} rx={24} ry={5} fill="#FFFFFF" stroke={INK} strokeWidth={W} />
        <Circle cx={42} cy={86} r={3.5} fill={INK} />
        <Circle cx={50} cy={88} r={3.5} fill={INK} />
        <Circle cx={58} cy={86} r={3.5} fill={INK} />
        <Circle cx={46} cy={80} r={3.5} fill={INK} />
        <Circle cx={54} cy={80} r={3.5} fill={INK} />
        <Face x={50} y={50} gap={8} eye={5} mood="grin" />
      </G>
    ),
  },
  {
    id: 'toast',
    name: 'Toastolino Turbo',
    bg: '#3A2410',
    art: (
      <G>
        <Path d="M34 82 Q38 98 44 86 Q48 100 52 86 Q58 100 62 84 Q66 96 68 82 Z" fill="#FF7A1A" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M42 84 Q46 92 50 84 Q54 92 58 84 Z" fill="#FFE14D" />
        <Path d="M26 30 C22 12 44 8 50 18 C56 8 78 12 74 30 V82 H26 Z" fill="#C8863A" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
        <Path d="M32 32 C30 20 44 17 50 25 C56 17 70 20 68 32 V76 H32 Z" fill="#F6D9A0" />
        <Rect x={42} y={24} width={16} height={9} rx={2} fill="#FFE870" stroke={INK} strokeWidth={1.5} />
        <Path d="M36 44 L45 47 M64 44 L55 47" stroke={INK} strokeWidth={W} strokeLinecap="round" />
        <Face x={50} y={54} gap={8} eye={5} mood="grin" />
      </G>
    ),
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<CharacterId, Character>;
