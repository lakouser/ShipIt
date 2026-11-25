import { BUGS, PERK_VALUES } from './content';
import { addLines, perSecond, perTap } from './economy';
import { Decimal } from './num';
import { perkLevel } from './perks';
import type { Rng } from './rng';
import type { GameState } from './state';

export type BugChange = { type: 'spawned'; expiresAt: number } | { type: 'escaped' } | { type: 'autoSquashed'; reward: Decimal } | null;

/** Expires a bug that has been on screen too long, or spawns the next one when it is due. */
export function updateBugs(s: GameState, now: number, rng: Rng, canSpawn: boolean): BugChange {
  if (s.bug) {
    if (now < s.bug.expiresAt) return null;
    s.bug = null;
    s.stats.bugsEscaped++;
    return { type: 'escaped' };
  }
  if (!canSpawn || now < s.nextBugAt) return null;
  s.nextBugAt = now + BUGS.minGapMs + rng() * BUGS.extraGapMs;
  // oncall.yml: someone else got it.
  if (rng() < PERK_VALUES.oncallChance * perkLevel(s, 'oncall')) {
    const reward = bugReward(s, now);
    addLines(s, reward);
    s.stats.bugs++;
    return { type: 'autoSquashed', reward };
  }
  s.bug = { expiresAt: now + BUGS.lifetimeMs };
  return { type: 'spawned', expiresAt: s.bug.expiresAt };
}

export function bugReward(s: GameState, now: number): Decimal {
  const reward = perSecond(s, now).mul(BUGS.rewardAutoSeconds).add(perTap(s, now).mul(BUGS.rewardTaps));
  return Decimal.max(BUGS.minReward, reward).mul(1 + s.questBonus.bug).floor();
}

export function squashBug(s: GameState, now: number): Decimal | null {
  if (!s.bug) return null;
  s.bug = null;
  const reward = bugReward(s, now);
  addLines(s, reward);
  s.stats.bugs++;
  return reward;
}
