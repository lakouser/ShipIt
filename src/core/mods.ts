import { CHALLENGES, COST_GROWTH, MAJOR, SKILL_VALUES, STACKS, type Mods } from './content';
import type { GameState } from './state';

const neutral = (): Mods => ({
  tapMul: 1, autoMul: 1, allMul: 1, costGrowth: COST_GROWTH, costMul: 1, autoCostMul: 1, critAdd: 0,
  sprintTime: 1, sprintReward: 1, bugReward: 1, starGain: 1, maxTier: Infinity, dotfiles: true,
});

function apply(m: Mods, part: Partial<Mods>): void {
  m.tapMul *= part.tapMul ?? 1;
  m.autoMul *= part.autoMul ?? 1;
  m.allMul *= part.allMul ?? 1;
  m.costMul *= part.costMul ?? 1;
  m.autoCostMul *= part.autoCostMul ?? 1;
  m.critAdd += part.critAdd ?? 0;
  m.sprintTime *= part.sprintTime ?? 1;
  m.sprintReward *= part.sprintReward ?? 1;
  m.bugReward *= part.bugReward ?? 1;
  m.starGain *= part.starGain ?? 1;
  if (part.costGrowth !== undefined) m.costGrowth = part.costGrowth;
  if (part.maxTier !== undefined) m.maxTier = Math.min(m.maxTier, part.maxTier);
  if (part.dotfiles === false) m.dotfiles = false;
}

export const skillLevel = (s: GameState, id: string): number => s.skills[id] ?? 0;

/**
 * Everything that bends the rules, combined: the stack, finished challenge rewards, the challenge in progress
 * (applied last, so its price growth wins over the stack's), skills and XP.
 */
export function mods(s: GameState): Mods {
  const m = neutral();
  const stack = STACKS.find((x) => x.id === s.stack);
  if (stack) apply(m, stack.mods);
  for (const id of s.challengesDone) {
    const c = CHALLENGES.find((x) => x.id === id);
    if (c) apply(m, c.rewardMods);
  }
  if (s.challenge) {
    const c = CHALLENGES.find((x) => x.id === s.challenge!.id);
    if (c) apply(m, c.mods);
  }
  m.allMul *= SKILL_VALUES.tenxMul ** skillLevel(s, 'tenx');
  m.starGain *= (1 + SKILL_VALUES.pairingGain * skillLevel(s, 'pairing')) * (1 + MAJOR.starGainPerXp * s.xp);
  return m;
}
