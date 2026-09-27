import type { MomentId } from '@/game/moments';
import type { CharacterId } from '@/lib/avatar';

/** Which crew member shows up for each big moment, and how they move. */
export const MOMENT_CREW: Partial<Record<MomentId, { id: CharacterId; mood: 'win' | 'fail' }>> = {
  lockin_hit: { id: 'mango', mood: 'win' },
  lockin_miss: { id: 'cubo', mood: 'fail' },
  allin_hit: { id: 'toast', mood: 'win' },
  allin_miss: { id: 'donut', mood: 'fail' },
  clutch: { id: 'chai', mood: 'win' },
  perfect_run: { id: 'gelato', mood: 'win' },
  new_number_one: { id: 'samosa', mood: 'win' },
};
