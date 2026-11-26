import { CHALLENGE, CHALLENGES, MAJOR, SHIP, SKILL_VALUES, SKILLS, type ChallengeDef, type ChallengeId, type SkillDef } from './content';
import { skillLevel } from './mods';
import type { Decimal } from './num';
import { perkCost } from './perks';
import type { Rng } from './rng';
import { releaseSeconds, resetRelease, resetRun, shippedForStars, starsAvailable, starsForShipped, versionTag } from './ship';
import type { GameState } from './state';

/* ---------- XP: the currency of major versions, the endless reset from Series B on ---------- */

/** Major versions open at the Series B round, where runs start to stall; funding carries on alongside them. */
export const majorsUnlocked = (s: GameState): boolean => s.round >= MAJOR.unlockRound || s.major > 0;

/** The major tab appears a round early, to show what's coming. */
export const majorTabUnlocked = (s: GameState): boolean => s.round >= MAJOR.unlockRound - 1 || s.major > 0;

/** XP the curve pays for this many stars banked in total: floor(cbrt(stars / starsPerXp)). */
export function xpForStars(stars: number): number {
  const n = Math.floor(Math.cbrt(Math.max(0, stars) / MAJOR.starsPerXp) * (1 + 1e-12) + 1e-9);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** Stars banked in total at which the curve reaches n XP. */
export const starsForXp = (n: number): number => MAJOR.starsPerXp * n ** 3;

/** Stars a major version would bank now: those held plus the release in progress, which it ships. */
export const starsToBank = (s: GameState): number => s.stars + starsAvailable(s);

/** XP a major version would earn now: what it adds to the curve (0 before Series B). */
export const xpAvailable = (s: GameState): number =>
  majorsUnlocked(s) ? Math.max(0, xpForStars(s.banked + starsToBank(s)) - xpForStars(s.banked)) : 0;

/** Stars to bank (held plus pending) for the next point of XP. */
export const starsForNextXp = (s: GameState): number => starsForXp(xpForStars(s.banked + starsToBank(s)) + 1) - s.banked;

export const nextMajorVersion = (s: GameState): string => versionTag(s.major + 1, 0);

export interface MajorResult {
  xp: number;
  /** The new version, "1.0". */
  version: string;
  starsBanked: number;
  /** Spendable lines cleared (for the splash). */
  linesBefore: Decimal;
  releaseLines: Decimal;
}

/**
 * Bank every star (and the release in progress) for XP, then start v{major+1}.0. Stars, dotfiles (unless muscle memory),
 * releases, lines and packages reset; funding, equity, XP, skills, achievements, workflows, challenge rewards,
 * the team and users stay.
 */
export function cutMajor(s: GameState, now: number, rng: Rng): MajorResult | null {
  const xp = xpAvailable(s);
  if (xp < 1) return null;
  const banked = starsToBank(s);
  const version = versionTag(s.major + 1, 0);
  const result: MajorResult = { xp, version, starsBanked: banked, linesBefore: s.lines, releaseLines: s.thisRelease };
  s.releaseLog = [{ version, lines: s.thisRelease, stars: 0, seconds: releaseSeconds(s, now), at: now, xp }, ...s.releaseLog].slice(0, SHIP.logSize);
  s.banked += banked;
  s.xp += xp;
  s.stats.majors++;
  s.major++;
  s.minor = 0;
  s.release = 1;
  s.project = 'webapp';
  s.boss = null;
  s.stars = SKILL_VALUES.headstartStars * skillLevel(s, 'headstart');
  s.starsSpent = 0;
  if (skillLevel(s, 'muscle') < 1) s.perks = {};
  resetRun(s);
  resetRelease(s, now, rng);
  return result;
}

/* ---------- skills ---------- */

export const findSkill = (id: string): SkillDef | undefined => SKILLS.find((k) => k.id === id);
export const xpToSpend = (s: GameState): number => s.xp - s.xpSpent;
export const skillCost = (k: SkillDef, level: number): number => perkCost(k, level);

export type SkillStatus = 'maxed' | 'affordable' | 'expensive';

export function skillStatus(s: GameState, k: SkillDef): SkillStatus {
  const level = skillLevel(s, k.id);
  if (level >= k.maxLevel) return 'maxed';
  return xpToSpend(s) >= skillCost(k, level) ? 'affordable' : 'expensive';
}

export function buySkill(s: GameState, id: string): { skill: SkillDef; level: number } | null {
  const k = findSkill(id);
  if (!k || skillStatus(s, k) !== 'affordable') return null;
  const level = skillLevel(s, id);
  s.xpSpent += skillCost(k, level);
  s.skills[id] = level + 1;
  return { skill: k, level: level + 1 };
}

/* ---------- challenge releases ---------- */

export const findChallenge = (id: ChallengeId): ChallengeDef => CHALLENGES.find((c) => c.id === id)!;
export const challengesUnlocked = (s: GameState): boolean => s.major >= 1;

/** This run's star curve so far, before bonuses multiply it. */
const curveSoFar = (s: GameState): number => starsForShipped(s.shipped);

/** True once enough has shipped this run for a challenge to mean something. */
export const challengeReady = (s: GameState): boolean => curveSoFar(s) >= CHALLENGE.minCurve;

/** Lines shipped this run before challenges open. */
export const linesForChallenges = (): Decimal => shippedForStars(CHALLENGE.minCurve);

/** Lines a challenge started now would need: one release that grows this run's curve by CHALLENGE.goalGain. */
export function challengeGoal(s: GameState): Decimal {
  const curve = Math.max(curveSoFar(s), CHALLENGE.minCurve);
  return shippedForStars(Math.ceil(curve * (1 + CHALLENGE.goalGain))).sub(s.shipped).max(SHIP.minRelease);
}

/**
 * Restarts the current release under a challenge's restriction. Ship it with at least the goal for the reward;
 * shipping short of the goal, or abandoning, just ends it.
 */
export function startChallenge(s: GameState, id: ChallengeId, now: number, rng: Rng): ChallengeDef | null {
  if (!challengesUnlocked(s) || !challengeReady(s) || s.challenge || s.challengesDone.includes(id) || !CHALLENGES.some((c) => c.id === id)) return null;
  s.challenge = { id, goal: challengeGoal(s) };
  resetRelease(s, now, rng);
  return findChallenge(id);
}

export function abandonChallenge(s: GameState): ChallengeId | null {
  const id = s.challenge?.id ?? null;
  s.challenge = null;
  return id;
}
