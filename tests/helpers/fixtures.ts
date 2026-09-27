import { BOARDS } from '@/game/boards';
import type { CategoryId, Question } from '@/game/types';

/** Made-up questions (6 per board) so game-mechanics tests don't depend on real content. Answer is always "Right". */
export function fixtureQuestions(perBoard = 6): Question[] {
  const out: Question[] = [];
  for (const b of BOARDS) {
    if (b.id === 'mixed') continue;
    for (let i = 0; i < perBoard; i++) {
      out.push({
        id: `${b.id}-${i}`,
        category: b.id as CategoryId,
        prompt: `Made-up question ${i} about ${b.name} for the tests?`,
        options: i % 3 === 0 ? ['Right', 'Wrong'] : ['Wrong', 'Right', 'Other', 'Else'],
        answerIndex: i % 3 === 0 ? 0 : 1,
        difficulty: 'medium',
      });
    }
  }
  return out;
}
