import { BUGS } from './content';
import { addLines, perSecond, perTap } from './economy';
import { Decimal } from './num';
import type { Rng } from './sprints';
import type { GameState } from './state';

export type BugChange = 'spawned' | 'escaped' | null;

/** Expires a bug that has been on screen too long, or spawns the next one when it is due. */
export function updateBugs(s: GameState, now: number, rng: Rng, canSpawn: boolean): BugChange {
  if (s.bug) {
    if (now < s.bug.expiresAt) return null;
    s.bug = null;
    return 'escaped';
  }
  if (!canSpawn || now < s.nextBugAt) return null;
  s.bug = { expiresAt: now + BUGS.lifetimeMs };
  s.nextBugAt = now + BUGS.minGapMs + rng() * BUGS.extraGapMs;
  return 'spawned';
}

export function bugReward(s: GameState, now: number): Decimal {
  const reward = perSecond(s, now).mul(BUGS.rewardAutoSeconds).add(perTap(s, now).mul(BUGS.rewardTaps));
  return Decimal.max(BUGS.minReward, reward).floor();
}

export function squashBug(s: GameState, now: number): Decimal | null {
  if (!s.bug) return null;
  s.bug = null;
  const reward = bugReward(s, now);
  addLines(s, reward);
  s.bugsSquashed++;
  return reward;
}
