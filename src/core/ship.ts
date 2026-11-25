import { PERK_VALUES, SHIP } from './content';
import { D, type Decimal } from './num';
import { perkLevel } from './perks';
import { makeMilestone } from './quests';
import type { Rng } from './rng';
import { makeBacklog } from './sprints';
import type { GameState } from './state';

/** Stars the player would get by shipping now. */
export function starsAvailable(s: GameState): number {
  // Cube root (plus a hair, so exact cubes don't round down): growth slows as releases get bigger.
  return Math.floor(Math.cbrt(s.thisRelease.div(SHIP.linesPerStar).toNumber()) + 1e-9);
}

/** Lines needed this release to be able to ship for n stars. */
export const linesForStars = (n: number): Decimal => D(SHIP.linesPerStar).mul(n * n * n);

export interface ShipResult {
  /** Stars gained by this ship. */
  stars: number;
  /** Stars held before shipping. */
  starsBefore: number;
  /** The new release number. */
  release: number;
  /** Spendable lines that were cleared (for the merge animation). */
  linesBefore: Decimal;
  /** Lines written during the release that was shipped. */
  releaseLines: Decimal;
}

/** Prestige: trade this release's lines and upgrades for permanent stars. */
export function ship(s: GameState, now: number, rng: Rng): ShipResult | null {
  const stars = starsAvailable(s);
  if (stars < 1) return null;
  const result: ShipResult = { stars, starsBefore: s.stars, release: s.release + 1, linesBefore: s.lines, releaseLines: s.thisRelease };
  s.stars += stars;
  s.release++;
  s.lines = D(0);
  s.thisRelease = D(0);
  // bootstrap.sh: start the new release with a few copies already installed.
  const head = PERK_VALUES.bootstrapCopies * perkLevel(s, 'bootstrap');
  s.owned = head > 0 ? { kb: head, duck: head } : {};
  s.sprint = null;
  s.lastSprint = null;
  s.backlog = makeBacklog(s, now, rng);
  s.milestone = makeMilestone(s);
  return result;
}
