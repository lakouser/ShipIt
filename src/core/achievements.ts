import type { GameState } from './state';

export interface AchievementContext {
  /** Taps per second over the last two seconds. */
  tapRate: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  unlocked(s: GameState, ctx: AchievementContext): boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'hello', name: 'Hello, world', description: 'Write 100 lines', unlocked: (s) => s.lifetime.gte(100) },
  { id: 'wom', name: 'Works on my machine', description: 'Write 10,000 lines', unlocked: (s) => s.lifetime.gte(1e4) },
  { id: '10x', name: '10x engineer', description: 'Hit 8 taps per second', unlocked: (_s, ctx) => ctx.tapRate >= 8 },
  { id: 'ext', name: 'Exterminator', description: 'Squash 5 bugs', unlocked: (s) => s.bugsSquashed >= 5 },
  { id: 'crunch', name: 'Crunch time', description: 'Finish a sprint with under 3 seconds left', unlocked: (s) => !!s.flags.crunch },
  { id: 'ship', name: 'Shipped', description: 'Ship your first release', unlocked: (s) => s.release > 1 },
  { id: 'bigo', name: 'Big O', description: 'Write 1,000,000 lines in total', unlocked: (s) => s.lifetime.gte(1e6) },
];

/** Marks newly earned achievements on the state and returns them. */
export function checkAchievements(s: GameState, ctx: AchievementContext): AchievementDef[] {
  const earned = ACHIEVEMENTS.filter((a) => !s.achievements.includes(a.id) && a.unlocked(s, ctx));
  for (const a of earned) s.achievements.push(a.id);
  return earned;
}
