import { CHALLENGE, CHALLENGES, COST_GROWTH, MAJOR, RFC, SKILL_VALUES, STACKS, type ChallengeId, type Mods, type StackDef } from './content';
import { founderParts } from './founder';
import { infraParts } from './infra';
import { rfcDone } from './rfcs';
import { roadmapMods } from './roadmap';
import type { GameState } from './state';

const neutral = (): Mods => ({
  tapMul: 1, autoMul: 1, allMul: 1, costGrowth: COST_GROWTH, costMul: 1, critAdd: 0,
  sprintReward: 1, bugReward: 1, starGain: 1, maxTier: Infinity, dotfiles: true,
  debtMul: 1, coverageMul: 1, churnMul: 1, usersMul: 1,
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
  m.usersMul *= part.usersMul ?? 1;
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

/* mods() is asked for on every output and price calculation, so its answer is kept until something it reads changes. */
const SIG = 16;
let memoState: GameState | null = null;
let memoBoard: unknown = null;
let memoSig = new Float64Array(SIG);
let nextSig = new Float64Array(SIG);
let memoMods: Mods = neutral();

/** Everything mods() reads from the state, as numbers (the board's parts are compared by identity, separately). */
function signature(s: GameState, out: Float64Array): void {
  let levels = 0;
  for (let i = 0; i < CHALLENGES.length; i++) levels = levels * (CHALLENGE.maxLevel + 1) + challengeLevel(s, CHALLENGES[i].id);
  const sh = s.roadmap.shares;
  out[0] = levels;
  let challenge = 0;
  if (s.challenge) for (let i = 0; i < CHALLENGES.length; i++) if (CHALLENGES[i].id === s.challenge.id) challenge = i + 1;
  let stack = 0;
  for (let i = 0; i < STACKS.length; i++) if (STACKS[i].id === s.stack) stack = i;
  out[1] = challenge;
  out[2] = stack;
  out[3] = s.unlocked.roadmap ? 1 : 0;
  out[4] = sh.dev;
  out[5] = sh.biz;
  out[6] = sh.fun;
  out[7] = s.founder.exits;
  out[8] = s.founder.traits.length;
  out[9] = s.contribBonus;
  out[10] = s.skills.tenx ?? 0;
  out[11] = s.skills.pairing ?? 0;
  out[12] = s.xp;
  out[13] = s.rfc.done.length;
}

/**
 * The rule changes that come from major versions and the stack, combined: finished challenge rewards, the challenge in
 * progress, skills, XP and the language of this run, plus the architecture board, the roadmap's segments, adopted RFCs,
 * contributors' rewrites and the founder's traits. (Projects, funding and the company apply their own bonuses in economy.ts.)
 * The result is shared between calls: read it, never change it.
 */
export function mods(s: GameState): Readonly<Mods> {
  const board = infraParts(s);
  signature(s, nextSig);
  let same = s === memoState && board === memoBoard;
  for (let i = 0; same && i < SIG; i++) same = nextSig[i] === memoSig[i];
  if (same) return memoMods;
  memoState = s;
  memoBoard = board;
  [memoSig, nextSig] = [nextSig, memoSig];
  return (memoMods = compute(s, board));
}

function compute(s: GameState, board: Partial<Mods>[]): Mods {
  const m = neutral();
  if (rfcDone(s, 'monorepo')) m.costGrowth = RFC.monorepoGrowth;
  for (const c of CHALLENGES) {
    const level = challengeLevel(s, c.id);
    if (level > 0) apply(m, challengeReward(c, level));
  }
  if (s.challenge) {
    const c = CHALLENGES.find((x) => x.id === s.challenge!.id);
    if (c) apply(m, c.mods);
  }
  apply(m, stackOf(s).mods);
  for (const part of board) apply(m, part);
  if (s.unlocked.roadmap) apply(m, roadmapMods(s));
  for (const part of founderParts(s)) apply(m, part);
  m.allMul *= 1 + s.contribBonus;
  m.allMul *= SKILL_VALUES.tenxMul ** skillLevel(s, 'tenx');
  m.starGain *= (1 + SKILL_VALUES.pairingGain * skillLevel(s, 'pairing')) * (1 + MAJOR.starGainPerXp * s.xp);
  return m;
}
