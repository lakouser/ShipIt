import { COMPANY_VALUES, PERK_VALUES, PROJECTS, SHIP, type ProjectDef, type ProjectId } from './content';
import { companyLevel, projectOf } from './economy';
import { D, type Decimal } from './num';
import { perkLevel } from './perks';
import { makeMilestone } from './quests';
import type { Rng } from './rng';
import { makeBacklog } from './sprints';
import type { GameState } from './state';

/** Stars from shipping are multiplied by the project and the brand perk. */
export const starMultiplier = (s: GameState): number => (projectOf(s).starMul ?? 1) * (1 + COMPANY_VALUES.brandStars * companyLevel(s, 'brand'));

/** Stars the player would get by shipping now. */
export function starsAvailable(s: GameState): number {
  // Cube root (plus a hair, so exact cubes don't round down): growth slows as releases get bigger.
  return Math.floor(Math.cbrt(s.thisRelease.div(SHIP.linesPerStar).toNumber()) * starMultiplier(s) + 1e-9);
}

/** Lines needed this release to be able to ship for n stars. */
export const linesForStars = (s: GameState, n: number): Decimal => D(SHIP.linesPerStar).mul((n / starMultiplier(s)) ** 3);

/** Projects the next release can be. */
export const nextProjects = (s: GameState): ProjectDef[] => PROJECTS.filter((p) => p.minRelease <= s.release + 1);

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
  /** The project that shipped, and the one the new release builds. */
  shipped: ProjectDef;
  next: ProjectDef;
}

/** Prestige: trade this release's lines, upgrades, forks and debt for permanent stars, and start the next project. */
export function ship(s: GameState, now: number, rng: Rng, next: ProjectId = 'webapp'): ShipResult | null {
  const stars = starsAvailable(s);
  const project = nextProjects(s).find((p) => p.id === next);
  if (stars < 1 || !project) return null;
  const shipped = projectOf(s);
  const result: ShipResult = { stars, starsBefore: s.stars, release: s.release + 1, linesBefore: s.lines, releaseLines: s.thisRelease, shipped, next: project };
  if (!s.projectsShipped.includes(shipped.id)) s.projectsShipped.push(shipped.id);
  s.stars += stars;
  s.release++;
  s.lines = D(0);
  s.thisRelease = D(0);
  s.project = project.id;
  s.debt = 0;
  s.forks = {};
  // bootstrap.sh: start the new release with a few copies already installed.
  const head = PERK_VALUES.bootstrapCopies * perkLevel(s, 'bootstrap');
  s.owned = head > 0 ? { kb: head, duck: head } : {};
  s.sprint = null;
  s.lastSprint = null;
  s.backlog = makeBacklog(s, now, rng);
  s.milestone = makeMilestone(s);
  return result;
}
