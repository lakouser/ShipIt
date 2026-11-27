import { CHALLENGE, CHALLENGES, COST_GROWTH, MAJOR, SKILL_VALUES, STACKS, type ChallengeId, type Mods, type StackDef } from './content';
import type { GameState } from './state';

const neutral = (): Mods => ({
  tapMul: 1, autoMul: 1, allMul: 1, costGrowth: COST_GROWTH, costMul: 1, critAdd: 0,
  sprintReward: 1, bugReward: 1, starGain: 1, maxTier: Infinity, dotfiles: true,
  debtMul: 1, coverageMul: 1, churnMul: 1,
});

function apply(m: Mods, part: Partial<Mods>): void {
  m.tapMul *= part.tapMul ?? 1;
  m.autoMul *= part.autoMul ?? 1;
  m.allMul *= part.allMul ?? 1;
  m.costMul *= part.costMul ?? 1;
  m.critAdd += part.critAdd ?? 0;
  m.sprintReward *= part.sprintReward ?? 1;
  m.bugReward *= part.bugReward ?? 1;
  m.starGain *= part.starGain ?? 1;
  m.debtMul *= part.debtMul ?? 1;
  m.coverageMul *= part.coverageMul ?? 1;
  m.churnMul *= part.churnMul ?? 1;
  if (part.costGrowth !== undefined) m.costGrowth = part.costGrowth;
  if (part.maxTier !== undefined) m.maxTier = Math.min(m.maxTier, part.maxTier);
  if (part.dotfiles === false) m.dotfiles = false;
}

/** A multiplier's effect at this strength: x1.5 at strength 2 is x2, 0.9 (10% off) is 0.8. */
const scaled = (x: number | undefined, strength: number): number | undefined => (x === undefined ? undefined : 1 + (x - 1) * strength);

/**
 * A challenge's reward at a level: the first clear's reward, plus CHALLENGE.repeatStrength of it for each clear after.
 * Only multipliers scale; anything else is the first clear's.
 */
export function challengeReward(c: (typeof CHALLENGES)[number], level: number): Partial<Mods> {
  const strength = 1 + CHALLENGE.repeatStrength * Math.max(0, Math.min(CHALLENGE.maxLevel, level) - 1);
  const r = c.rewardMods;
  return {
    ...r,
    tapMul: scaled(r.tapMul, strength),
    autoMul: scaled(r.autoMul, strength),
    costMul: scaled(r.costMul, strength),
    sprintReward: scaled(r.sprintReward, strength),
    bugReward: scaled(r.bugReward, strength),
    starGain: scaled(r.starGain, strength),
  };
}

export const skillLevel = (s: GameState, id: string): number => s.skills[id] ?? 0;

/** Times a challenge has been cleared (0 if never). */
export const challengeLevel = (s: GameState, id: ChallengeId): number => s.challengeLevels[id] ?? (s.challengesDone.includes(id) ? 1 : 0);

/** The stack this run is written in. */
export const stackOf = (s: GameState): StackDef => STACKS.find((x) => x.id === s.stack) ?? STACKS[0];

/**
 * The rule changes that come from major versions and the stack, combined: finished challenge rewards, the challenge in
 * progress, skills, XP and the language of this run. (Projects, funding and the company apply their own bonuses in economy.ts.)
 */
export function mods(s: GameState): Mods {
  const m = neutral();
  for (const c of CHALLENGES) {
    const level = challengeLevel(s, c.id);
    if (level > 0) apply(m, challengeReward(c, level));
  }
  if (s.challenge) {
    const c = CHALLENGES.find((x) => x.id === s.challenge!.id);
    if (c) apply(m, c.mods);
  }
  apply(m, stackOf(s).mods);
  m.allMul *= SKILL_VALUES.tenxMul ** skillLevel(s, 'tenx');
  m.starGain *= (1 + SKILL_VALUES.pairingGain * skillLevel(s, 'pairing')) * (1 + MAJOR.starGainPerXp * s.xp);
  return m;
}
