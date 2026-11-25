import { SHIP } from './content';
import { D, type Decimal } from './num';
import { makeBacklog, type Rng } from './sprints';
import type { GameState } from './state';

/** Stars the player would get by shipping now. */
export function starsAvailable(s: GameState): number {
  return s.thisRelease.div(SHIP.linesPerStar).sqrt().floor().toNumber();
}

/** Lines needed this release to be able to ship for n stars. */
export const linesForStars = (n: number): Decimal => D(SHIP.linesPerStar).mul(n * n);

export interface ShipResult {
  stars: number;
  release: number;
}

/** Prestige: trade this release's lines and upgrades for permanent stars. */
export function ship(s: GameState, now: number, rng: Rng): ShipResult | null {
  const stars = starsAvailable(s);
  if (stars < 1) return null;
  s.stars += stars;
  s.release++;
  s.lines = D(0);
  s.thisRelease = D(0);
  s.owned = {};
  s.sprint = null;
  s.lastSprint = null;
  s.boost = null;
  s.backlog = makeBacklog(s, now, rng);
  return { stars, release: s.release };
}
