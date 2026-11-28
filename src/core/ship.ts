import { CHALLENGE, COMPANY_VALUES, PERK_VALUES, PROJECTS, RFC, SHIP, type ChallengeId, type ProjectDef, type ProjectId } from './content';
import { coverage, resetCoverage } from './coverage';
import { companyLevel, projectOf } from './economy';
import { challengeLevel, mods } from './mods';
import { D, Decimal } from './num';
import { perkEffect } from './perks';
import { makeMilestone, milestoneBonus } from './quests';
import { rfcDone } from './rfcs';
import type { Rng } from './rng';
import { makeBacklog } from './sprints';
import type { GameState, ReleaseEntry } from './state';

/* ---------- the star curve ---------- */

/**
 * Stars the curve pays for this many lines shipped this run: floor(starScale · cbrt(lines / linesPerStar)).
 * Growth slows as the codebase gets bigger, so each star needs more code than the last.
 */
export function starsForShipped(lines: Decimal): number {
  const raw = SHIP.starScale * lines.div(SHIP.linesPerStar).cbrt().toNumber();
  // A hair over, so exact cubes don't round down.
  const n = Math.floor(raw * (1 + 1e-12) + 1e-9);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/** Lines shipped this run at which the curve reaches n stars (the inverse of starsForShipped). */
export const shippedForStars = (n: number): Decimal => D(SHIP.linesPerStar).mul(Decimal.pow(n / SHIP.starScale, 3));

/** Stars from shipping are multiplied by the project, the brand perk, XP, skills and challenge rewards. */
export const starMultiplier = (s: GameState): number =>
  (projectOf(s).starMul ?? 1) * (1 + COMPANY_VALUES.brandStars * companyLevel(s, 'brand')) * mods(s).starGain;

/** Steps this release adds to the star curve, before bonuses multiply them. */
function curveSteps(s: GameState): number {
  if (s.thisRelease.lt(SHIP.minRelease)) return 0;
  return Math.max(0, starsForShipped(s.shipped.add(s.thisRelease)) - starsForShipped(s.shipped));
}

/** Stars the player would get by shipping now: what this release adds to the curve, times the star bonuses. */
export function starsAvailable(s: GameState): number {
  return Math.floor(curveSteps(s) * starMultiplier(s) * (1 + 1e-12));
}

/** Lines needed this release to be able to ship for n stars. */
export function linesForStars(s: GameState, n: number): Decimal {
  if (n <= 0) return D(0);
  const steps = Math.ceil(n / starMultiplier(s) - 1e-9);
  const needed = shippedForStars(starsForShipped(s.shipped) + steps).sub(s.shipped);
  return Decimal.max(needed, SHIP.minRelease);
}

/** Seconds the current release has been running (wall-clock, time away included), or null if unknown. */
export const releaseSeconds = (s: GameState, now: number): number | null => (s.releaseStartedAt >= 0 ? Math.max(0, (now - s.releaseStartedAt) / 1000) : null);

/** Stars per minute this release would pay if shipped now (0 while the release's start is unknown). */
export function starsPerMinute(s: GameState, now: number): number {
  const minutes = (releaseSeconds(s, now) ?? 0) / 60;
  return minutes > 0 ? starsAvailable(s) / minutes : 0;
}

/** How much shipping now would grow stars (0.5 = +50%); Infinity for the first stars of a run. */
export function shipGain(s: GameState): number {
  const n = starsAvailable(s);
  if (n < 1) return 0;
  return s.stars > 0 ? n / s.stars : Infinity;
}

/** The ship panel's rule of thumb: a release is ready once it would grow stars by SHIP.readyAt. */
export const shipReady = (s: GameState): boolean => shipGain(s) >= SHIP.readyAt;

/* ---------- versions ---------- */

/** A version tag: "1.4", shown as v1.4. */
export const versionTag = (major: number, minor: number): string => `${major}.${minor}`;
/** The version shipped last and the one being written now. */
export const currentVersion = (s: GameState): string => versionTag(s.major, s.minor);
export const nextVersion = (s: GameState): string => versionTag(s.major, s.minor + 1);

/* ---------- shipping ---------- */

/** Projects the next release can be. */
export const nextProjects = (s: GameState): ProjectDef[] => PROJECTS.filter((p) => p.minRelease <= s.release + 1);

export interface ShipResult {
  /** Stars gained by this ship, milestone bonus included. */
  stars: number;
  /** The part of `stars` that came from finishing the release milestone. */
  bonus: number;
  /** Stars held before shipping. */
  starsBefore: number;
  /** The new release number (this run). */
  release: number;
  /** The version just shipped, "1.4". */
  version: string;
  /** Spendable lines that were cleared (for the merge animation). */
  linesBefore: Decimal;
  /** Lines written during the release that was shipped. */
  releaseLines: Decimal;
  /** How long the release took, in seconds (null if it began before releases were timed). */
  seconds: number | null;
  /**
   * The challenge release this was, if any: whether it met its goal, the times it has now been cleared, whether this was
   * the first clear (which unlocks its workflow) and whether it beat the fastest clear.
   */
  challenge: { id: ChallengeId; done: boolean; level: number; first: boolean; record: boolean } | null;
  /** Test coverage the release shipped with (null before the test suite opens). */
  coverage: number | null;
  /** The project that shipped, and the one the new release builds. */
  shipped: ProjectDef;
  next: ProjectDef;
}

/** Prestige: trade this release's lines, upgrades, forks and debt for permanent stars, and start the next project. */
export function ship(s: GameState, now: number, rng: Rng, next: ProjectId = 'webapp'): ShipResult | null {
  const curve = starsAvailable(s);
  const project = nextProjects(s).find((p) => p.id === next);
  if (curve < 1 || !project) return null;
  const bonus = milestoneBonus(s, curve);
  const stars = curve + bonus;
  const shippedProject = projectOf(s);
  const seconds = releaseSeconds(s, now);
  let challenge: ShipResult['challenge'] = null;
  if (s.challenge) {
    const id = s.challenge.id;
    const before = challengeLevel(s, id);
    const done = s.thisRelease.gte(s.challenge.goal);
    const best = s.challengeBest[id];
    const record = done && seconds !== null && (best === undefined || seconds < best);
    challenge = { id, done, level: done ? Math.min(CHALLENGE.maxLevel, before + 1) : before, first: done && before === 0, record };
    if (done) {
      s.challengeLevels[id] = challenge.level;
      if (!s.challengesDone.includes(id)) s.challengesDone.push(id);
      if (record) s.challengeBest[id] = Math.round(seconds!);
      s.stats.challenges++;
    }
    s.challenge = null;
  }
  const version = versionTag(s.major, s.minor + 1);
  const cov = s.unlocked.tests ? coverage(s) : null;
  const result: ShipResult = {
    stars, bonus, starsBefore: s.stars, release: s.release + 1, version, linesBefore: s.lines, releaseLines: s.thisRelease, seconds, challenge,
    coverage: cov, shipped: shippedProject, next: project,
  };
  if (!s.projectsShipped.includes(shippedProject.id)) s.projectsShipped.push(shippedProject.id);
  const entry: ReleaseEntry = { version, lines: s.thisRelease, stars, seconds, at: now };
  if (cov !== null) entry.coverage = cov;
  s.releaseLog = [entry, ...s.releaseLog].slice(0, SHIP.logSize);
  s.stars += stars;
  s.stats.starsEarned += stars;
  s.stats.ships++;
  s.release++;
  s.minor++;
  s.shipped = s.shipped.add(s.thisRelease);
  s.lastReleaseLines = s.thisRelease;
  s.project = project.id;
  // Canary deploys: a tenth of every package survives the release.
  const canary = rfcDone(s, 'canary') ? Object.entries(s.owned).map(([id, n]) => [id, Math.floor(n * RFC.canaryKeep)] as const) : [];
  resetRelease(s, now, rng);
  for (const [id, n] of canary) if (n > (s.owned[id] ?? 0)) s.owned[id] = n;
  return result;
}

/** Starts a fresh release: lines, packages, forks, debt, the sprint backlog and the milestone (shipping, challenges, majors, funding). */
export function resetRelease(s: GameState, now: number, rng: Rng): void {
  s.lines = D(0);
  s.thisRelease = D(0);
  s.releaseStartedAt = now;
  s.releasePeak = 0;
  s.debt = 0;
  s.forks = {};
  // bootstrap.sh: start the new release with a few copies already installed.
  const head = PERK_VALUES.bootstrapCopies * perkEffect(s, 'bootstrap');
  s.owned = head > 0 ? { kb: head, duck: head } : {};
  s.sprint = null;
  s.lastSprint = null;
  s.backlog = makeBacklog(s, now, rng);
  s.milestone = makeMilestone(s);
  resetCoverage(s);
  // The architecture board can be deployed once per release.
  s.infra.canDeploy = true;
}

/** Starts a fresh run (a funding round or a major version): the star curve and the milestone's last release start over. */
export function resetRun(s: GameState): void {
  s.shipped = D(0);
  s.lastReleaseLines = D(0);
  s.challenge = null;
}
