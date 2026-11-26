import { PERK_VALUES, SHIP } from './content';
import { D, Decimal } from './num';
import { perkLevel } from './perks';
import { makeMilestone } from './quests';
import type { Rng } from './rng';
import { makeBacklog } from './sprints';
import type { GameState } from './state';

/**
 * Stars the curve pays for this many lines shipped in total: floor(starScale · cbrt(lines / linesPerStar)).
 * Growth slows as the codebase gets bigger, so each star needs more code than the last.
 */
export function starsForShipped(lines: Decimal): number {
  const raw = SHIP.starScale * lines.div(SHIP.linesPerStar).cbrt().toNumber();
  // A hair over, so exact cubes don't round down.
  const n = Math.floor(raw * (1 + 1e-12) + 1e-9);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** Total shipped lines at which the curve reaches n stars (the inverse of starsForShipped). */
export const shippedForStars = (n: number): Decimal => D(SHIP.linesPerStar).mul(Decimal.pow(n / SHIP.starScale, 3));

/** Stars the player would get by shipping now: what this release adds to the curve. */
export function starsAvailable(s: GameState): number {
  if (s.thisRelease.lt(SHIP.minRelease)) return 0;
  return Math.max(0, starsForShipped(s.shipped.add(s.thisRelease)) - starsForShipped(s.shipped));
}

/** Lines needed this release to be able to ship for n stars. */
export function linesForStars(s: GameState, n: number): Decimal {
  if (n <= 0) return D(0);
  const needed = shippedForStars(starsForShipped(s.shipped) + n).sub(s.shipped);
  return Decimal.max(needed, SHIP.minRelease);
}

/** Seconds the current release has been running (wall-clock, time away included), or null if unknown. */
export const releaseSeconds = (s: GameState, now: number): number | null => (s.releaseStartedAt >= 0 ? Math.max(0, (now - s.releaseStartedAt) / 1000) : null);

/** Stars per minute this release would pay if shipped now (0 while the release's start is unknown). */
export function starsPerMinute(s: GameState, now: number): number {
  const minutes = (releaseSeconds(s, now) ?? 0) / 60;
  return minutes > 0 ? starsAvailable(s) / minutes : 0;
}

/** How much shipping now would grow stars (0.5 = +50%); Infinity for a player's first stars. */
export function shipGain(s: GameState): number {
  const n = starsAvailable(s);
  if (n < 1) return 0;
  return s.stars > 0 ? n / s.stars : Infinity;
}

/** The ship panel's rule of thumb: a release is ready once it would grow stars by SHIP.readyAt. */
export const shipReady = (s: GameState): boolean => shipGain(s) >= SHIP.readyAt;

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
  /** How long the release took, in seconds (null if it began before releases were timed). */
  seconds: number | null;
}

/** Prestige: trade this release's lines and upgrades for permanent stars. */
export function ship(s: GameState, now: number, rng: Rng): ShipResult | null {
  const stars = starsAvailable(s);
  if (stars < 1) return null;
  const seconds = releaseSeconds(s, now);
  const result: ShipResult = { stars, starsBefore: s.stars, release: s.release + 1, linesBefore: s.lines, releaseLines: s.thisRelease, seconds };
  s.releaseLog = [{ release: result.release, lines: s.thisRelease, stars, seconds, at: now }, ...s.releaseLog].slice(0, SHIP.logSize);
  s.stars += stars;
  s.release++;
  s.shipped = s.shipped.add(s.thisRelease);
  s.lines = D(0);
  s.thisRelease = D(0);
  s.releaseStartedAt = now;
  s.releasePeak = 0;
  // bootstrap.sh: start the new release with a few copies already installed.
  const head = PERK_VALUES.bootstrapCopies * perkLevel(s, 'bootstrap');
  s.owned = head > 0 ? { kb: head, duck: head } : {};
  s.sprint = null;
  s.lastSprint = null;
  s.backlog = makeBacklog(s, now, rng);
  s.milestone = makeMilestone(s);
  return result;
}
