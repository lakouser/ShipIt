import { PERK_VALUES, SHIP, type ChallengeId } from './content';
import { mods } from './mods';
import { D, Decimal } from './num';
import { perkEffect } from './perks';
import { makeMilestone, milestoneBonus } from './quests';
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

/** Steps this release adds to the star curve, before XP and skills multiply them. */
function curveSteps(s: GameState): number {
  if (s.thisRelease.lt(SHIP.minRelease)) return 0;
  return Math.max(0, starsForShipped(s.shipped.add(s.thisRelease)) - starsForShipped(s.shipped));
}

/** Stars the player would get by shipping now: what this release adds to the curve, times the star gain from XP and skills. */
export function starsAvailable(s: GameState): number {
  return Math.floor(curveSteps(s) * mods(s).starGain * (1 + 1e-12));
}

/** Lines needed this release to be able to ship for n stars. */
export function linesForStars(s: GameState, n: number): Decimal {
  if (n <= 0) return D(0);
  const steps = Math.ceil(n / mods(s).starGain - 1e-9);
  const needed = shippedForStars(starsForShipped(s.shipped) + steps).sub(s.shipped);
  return Decimal.max(needed, SHIP.minRelease);
}

/** A version tag: "1.4", shown as v1.4. */
export const versionTag = (major: number, minor: number): string => `${major}.${minor}`;
/** The version being shipped now and the next one. */
export const currentVersion = (s: GameState): string => versionTag(s.major, s.minor);
export const nextVersion = (s: GameState): string => versionTag(s.major, s.minor + 1);

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
  /** Stars gained by this ship, milestone bonus included. */
  stars: number;
  /** The part of `stars` that came from finishing the release milestone. */
  bonus: number;
  /** Stars held before shipping. */
  starsBefore: number;
  /** The new release number. */
  release: number;
  /** The version just shipped, "1.4". */
  version: string;
  /** The challenge release this was, if any, and whether it met its goal. */
  challenge: { id: ChallengeId; done: boolean } | null;
  /** Spendable lines that were cleared (for the merge animation). */
  linesBefore: Decimal;
  /** Lines written during the release that was shipped. */
  releaseLines: Decimal;
  /** How long the release took, in seconds (null if it began before releases were timed). */
  seconds: number | null;
}

/** Prestige: trade this release's lines and upgrades for permanent stars. */
export function ship(s: GameState, now: number, rng: Rng): ShipResult | null {
  const curve = starsAvailable(s);
  if (curve < 1) return null;
  const bonus = milestoneBonus(s, curve);
  const stars = curve + bonus;
  const seconds = releaseSeconds(s, now);
  let challenge: ShipResult['challenge'] = null;
  if (s.challenge) {
    challenge = { id: s.challenge.id, done: s.thisRelease.gte(s.challenge.goal) };
    if (challenge.done && !s.challengesDone.includes(challenge.id)) {
      s.challengesDone.push(challenge.id);
      s.stats.challenges++;
    }
    s.challenge = null;
  }
  const version = versionTag(s.major, s.minor + 1);
  const result: ShipResult = { stars, bonus, starsBefore: s.stars, release: s.release + 1, version, challenge, linesBefore: s.lines, releaseLines: s.thisRelease, seconds };
  s.releaseLog = [{ release: result.release, version, lines: s.thisRelease, stars, seconds, at: now }, ...s.releaseLog].slice(0, SHIP.logSize);
  s.stars += stars;
  s.stats.starsEarned += stars;
  s.release++;
  s.minor++;
  s.shipped = s.shipped.add(s.thisRelease);
  resetRelease(s, now, rng);
  return result;
}

/** Starts a fresh release: lines, packages, the sprint backlog and the milestone (shipping, challenges, majors). */
export function resetRelease(s: GameState, now: number, rng: Rng): void {
  s.lines = D(0);
  s.thisRelease = D(0);
  s.releaseStartedAt = now;
  s.releasePeak = 0;
  // bootstrap.sh: start the new release with a few copies already installed.
  const head = PERK_VALUES.bootstrapCopies * perkEffect(s, 'bootstrap');
  s.owned = head > 0 ? { kb: head, duck: head } : {};
  s.sprint = null;
  s.lastSprint = null;
  s.backlog = makeBacklog(s, now, rng);
  s.milestone = makeMilestone(s);
}
