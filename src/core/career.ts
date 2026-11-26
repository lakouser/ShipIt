import { CAREER } from './content';
import type { GameState } from './state';

/** Index into CAREER for this many stars earned over the whole game. */
export function careerLevel(starsEarned: number): number {
  let level = 0;
  CAREER.forEach((c, i) => {
    if (starsEarned >= c.stars) level = i;
  });
  return level;
}

export const careerTitle = (s: GameState): string => CAREER[careerLevel(s.stats.starsEarned)].title;

/** The next title and the stars it needs, or null at the top. */
export function nextTitle(s: GameState): { title: string; stars: number } | null {
  return CAREER[careerLevel(s.stats.starsEarned) + 1] ?? null;
}
