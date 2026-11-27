import { ISSUES, MARKET, OUTLETS, RIVALS, TESTS, type RivalDef } from './content';
import { coverage } from './coverage';
import { grantScript, randomScript } from './effects';
import { mods } from './mods';
import type { Decimal } from './num';
import type { Rng } from './rng';
import type { GameState, Headline, ReleaseCounters } from './state';

/*
 * The app in the market. Every release is reviewed; reviews bring users; users drift to rival
 * companies when the app goes quiet. Rivals are fictional and grow on their own, and the chart
 * position pays an output bonus. Nothing here resets with a release or a major version.
 */

const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];
const clamp = (lo: number, hi: number, x: number) => Math.min(hi, Math.max(lo, x));

/* ---------- reviews ---------- */

const incidentsResolved = (s: GameState): number => s.stats.coffees + s.stats.outagesFixed + s.stats.conflictsResolved;

export const releaseCounters = (s: GameState): ReleaseCounters => ({ sprints: s.stats.sprints, bugs: s.stats.bugs, escaped: s.stats.bugsEscaped, incidents: incidentsResolved(s) });

/** Starts counting what happens during a new release, for its review. */
export function startReleaseCounters(s: GameState): void {
  s.market.base = releaseCounters(s);
}

/** What the test suite and closed feature requests add to this release's review. */
export const qualityBonus = (s: GameState): number =>
  (s.unlocked.tests ? TESTS.reviewBonus * coverage(s) : 0) + Math.min(ISSUES.featureCap, s.issues.reviewBoost);

/**
 * A release's review, 1–5 stars: 2.5, plus up to 1.5 for size (a release that grows stars by 100% or more
 * gets it all), plus up to ±1 for polish (sprints merged, bugs squashed or escaped, incidents handled), plus
 * test coverage and feature requests closed.
 */
export function reviewScore(s: GameState, gain: number): number {
  const b = s.market.base;
  const sprints = s.stats.sprints - b.sprints;
  const bugs = s.stats.bugs - b.bugs;
  const escaped = s.stats.bugsEscaped - b.escaped;
  const incidents = incidentsResolved(s) - b.incidents;
  const size = 1.5 * Math.min(1, Number.isFinite(gain) ? gain : 1);
  const polish = clamp(-1, 1, Math.min(0.9, 0.3 * sprints) + Math.min(0.5, 0.1 * bugs) - Math.min(1, 0.2 * escaped) + Math.min(0.5, 0.25 * incidents));
  return Math.round(clamp(1, 5, 2.5 + size + polish + qualityBonus(s)) * 10) / 10;
}

/** Average of the last few reviews, or null before the first. */
export const rating = (s: GameState): number | null =>
  s.market.reviews.length ? Math.round((s.market.reviews.reduce((a, b) => a + b, 0) / s.market.reviews.length) * 10) / 10 : null;

/** New users a release brings: usersPerCubeRootLine × cbrt(lines) × (review / 3)². */
export const usersFromRelease = (lines: Decimal, review: number): number =>
  Math.floor(MARKET.usersPerCubeRootLine * lines.cbrt().toNumber() * (review / 3) ** 2);

/* ---------- churn ---------- */

/** Wall-clock minutes since the last update (ship or major version), for display. */
export const minutesSinceUpdate = (s: GameState, now: number): number => (s.market.lastUpdateAt ? Math.max(0, (now - s.market.lastUpdateAt) / 60_000) : 0);

/** Quiet minutes at which churn reaches this share. */
const quietFor = (share: number): number => MARKET.graceMinutes + Math.log(1 - share) / Math.log(1 - MARKET.churnPerMinute);

/**
 * Counts time without an update: in full while playing, at MARKET.awayChurnRate while away.
 * Time away alone can't push churn past MARKET.awayMaxChurn (or past where it already was).
 */
export function addQuietTime(s: GameState, seconds: number, away: boolean): void {
  const m = s.market;
  if (!m.lastUpdateAt || seconds <= 0) return;
  if (!away) {
    m.quietMinutes += seconds / 60;
    return;
  }
  const limit = Math.max(m.quietMinutes, quietFor(MARKET.awayMaxChurn));
  m.quietMinutes = Math.min(limit, m.quietMinutes + (seconds / 60) * MARKET.awayChurnRate);
}

/** Quiet minutes left before users start drifting. */
export const graceLeft = (s: GameState): number => Math.max(0, MARKET.graceMinutes - s.market.quietMinutes);

/** Share of the users at the last update who have drifted to rivals since. */
export function churnShare(s: GameState): number {
  const m = s.market;
  if (!m.lastUpdateAt || m.users <= 0) return 0;
  const over = (m.quietMinutes - MARKET.graceMinutes) * mods(s).churnMul;
  if (over <= 0) return 0;
  return Math.min(MARKET.maxChurn, 1 - (1 - MARKET.churnPerMinute) ** over);
}

export const usersNow = (s: GameState): number => s.market.users * (1 - churnShare(s));
const usersLost = (s: GameState): number => s.market.users * churnShare(s);

/* ---------- rivals and the chart ---------- */

/** A rival's users: its starting base growing each day since the player's first ship, plus users it took from the player. */
export function rivalUsers(s: GameState, r: RivalDef, now: number): number {
  const m = s.market;
  const days = m.startedAt ? Math.max(0, (now - m.startedAt) / 86_400_000) : 0;
  return r.users * (1 + r.growthPerDay * days) + (m.absorbed[r.id] ?? 0);
}

/** Rivals still in the chart (not acquired). */
const rivalsInChart = (s: GameState): RivalDef[] => RIVALS.filter((r) => !s.market.acquired.includes(r.id));

/** Where drifting users go: the nearest rival above the player, or the nearest below for a chart leader; null once all are bought. */
function churnTarget(s: GameState, now: number, you: number): RivalDef | null {
  const sized = rivalsInChart(s).map((r) => ({ r, users: rivalUsers(s, r, now) }));
  const above = sized.filter((x) => x.users > you).sort((a, b) => a.users - b.users)[0];
  if (above) return above.r;
  return sized.sort((a, b) => b.users - a.users)[0]?.r ?? null;
}

export interface ChartRow {
  id: string;
  name: string;
  app: string;
  users: number;
  you: boolean;
}

/** Everyone in the chart, most users first, with users drifting right now shown at the rival taking them. */
export function chart(s: GameState, now: number): ChartRow[] {
  const you = usersNow(s);
  const lost = s.market.users - you;
  const target = lost > 0 ? churnTarget(s, now, you) : null;
  const rows: ChartRow[] = rivalsInChart(s).map((r) => ({ id: r.id, name: r.name, app: r.app, users: rivalUsers(s, r, now) + (r === target ? lost : 0), you: false }));
  rows.push({ id: 'you', name: s.market.appName, app: s.market.appName, users: you, you: true });
  return rows.sort((a, b) => b.users - a.users || (a.you ? -1 : 1));
}

/** Chart position (1 = top) and how many rivals are behind the player. */
export function standing(s: GameState, now: number): { rank: number; behind: number } {
  const rows = chart(s, now);
  const i = rows.findIndex((r) => r.you);
  return { rank: i + 1, behind: rows.length - 1 - i };
}

/** Output multiplier from the chart: +MARKET.rankBonus for each rival behind the player (acquired ones count as behind). */
export const chartMultiplier = (s: GameState, now: number): number =>
  s.market.startedAt ? 1 + MARKET.rankBonus * (standing(s, now).behind + s.market.acquired.length) : 1;

/* ---------- the press ---------- */

export function headline(s: GameState, now: number, rng: Rng, text: string): Headline {
  const h: Headline = { at: now, outlet: pick(OUTLETS, rng), text };
  s.market.press = [h, ...s.market.press].slice(0, MARKET.pressKept);
  return h;
}

function reviewHeadline(app: string, version: string, review: number, tiny: boolean, rng: Rng): string {
  const v = `${app} v${version}`;
  if (tiny) return pick([`Another tiny patch from ${app}`, `${v} changes almost nothing`, `${app} ships v${version}; nobody notices`], rng);
  if (review >= 4.5) return pick([`${v} is the update everyone wanted`, `Reviewers love ${v}`, `${v}: polished, fast, shipped`], rng);
  if (review >= 3.5) return pick([`${v} lands with solid improvements`, `${app} ships v${version} and users approve`, `Hands-on with ${v}: worth the update`], rng);
  if (review >= 2.5) return pick([`${v} is fine, mostly`, `${app} pushes v${version} to mixed reviews`, `Small steps in ${v}`], rng);
  return pick([`Users underwhelmed by ${v}`, `${v}: is that it?`, `${v} draws a wave of one-star reviews`], rng);
}

/* ---------- what happens when the player ships ---------- */

export interface ShipNews {
  review: number;
  newUsers: number;
  /** Users who came back for a well-reviewed release, and users lost since the last update. */
  regained: number;
  lost: number;
  stole: RivalDef | null;
  overtook: RivalDef[];
  headlines: Headline[];
}

const nextLaunch = (now: number, rng: Rng): number => now + MARKET.launch.minGapMs + rng() * MARKET.launch.extraGapMs;

/** Locks in users lost since the last update: they now belong to the rival they went to. */
function settleChurn(s: GameState, now: number, regainShare: number): { lost: number; regained: number } {
  const m = s.market;
  const lost = usersLost(s);
  if (lost <= 0) return { lost: 0, regained: 0 };
  const target = churnTarget(s, now, m.users - lost);
  const regained = lost * regainShare;
  // With every rival bought, drifting users just leave.
  if (target) m.absorbed[target.id] = (m.absorbed[target.id] ?? 0) + lost - regained;
  m.users = m.users - lost + regained;
  return { lost, regained };
}

/** A release shipped: review it, count its users, settle churn, check the chart and write it up. */
export function marketOnShip(s: GameState, now: number, rng: Rng, review: number, lines: Decimal, version: string, tiny: boolean): ShipNews {
  const m = s.market;
  if (!m.startedAt) {
    m.startedAt = now;
    m.nextLaunchAt = now + MARKET.launch.firstDelayMs;
  }
  const { lost, regained } = settleChurn(s, now, review >= MARKET.winBackAt ? MARKET.winBack : 0);
  const stole = m.launch && now < m.launch.endsAt ? (RIVALS.find((r) => r.id === m.launch!.rival) ?? null) : null;
  if (stole) {
    m.launch = null;
    m.nextLaunchAt = nextLaunch(now, rng);
    s.stats.steals++;
  }
  const newUsers = Math.floor(usersFromRelease(lines, review) * (stole ? MARKET.launch.stealMul : 1));
  m.users += newUsers;
  m.peak = Math.max(m.peak, m.users);
  m.lastUpdateAt = now;
  m.quietMinutes = 0;
  m.staleNoticed = false;
  m.reviews = [review, ...m.reviews].slice(0, MARKET.reviewsKept);
  if (review >= 5) s.stats.fiveStars++;

  const headlines = [headline(s, now, rng, reviewHeadline(m.appName, version, review, tiny, rng))];
  if (stole) headlines.push(headline(s, now, rng, `${m.appName} beats ${stole.name} to launch, stealing the headline`));
  const overtook = rivalsInChart(s).filter((r) => !m.passed.includes(r.id) && rivalUsers(s, r, now) < m.users);
  for (const r of overtook) {
    m.passed.push(r.id);
    for (let i = 0; i < MARKET.overtakeScripts; i++) grantScript(s, randomScript(rng));
  }
  const top = overtook.at(-1);
  if (top) headlines.push(headline(s, now, rng, `${m.appName} overtakes ${top.name}'s ${top.app} in the charts`));
  m.rank = standing(s, now).rank;
  return { review, newUsers, regained, lost, stole, overtook, headlines };
}

/** A major version counts as an update: churn is settled and the press covers the rewrite. */
export function marketOnMajor(s: GameState, now: number, rng: Rng, version: string): Headline | null {
  const m = s.market;
  if (!m.startedAt) return null;
  settleChurn(s, now, 0);
  m.lastUpdateAt = now;
  m.quietMinutes = 0;
  m.staleNoticed = false;
  m.rank = standing(s, now).rank;
  return headline(s, now, rng, pick([`${m.appName} ${version} arrives, rewritten from scratch`, `${m.appName} ${version}: a whole new app, the same users`, `Hands-on with ${m.appName} ${version}`], rng));
}

/** A funding round makes the news (once the app is on the market). */
export function marketOnRaise(s: GameState, now: number, rng: Rng, round: string): Headline | null {
  if (!s.market.startedAt) return null;
  return headline(s, now, rng, pick([`${s.market.appName} raises its ${round}`, `Investors pile into ${s.market.appName}'s ${round}`, `${s.market.appName} closes ${round}, promises to ship faster`], rng));
}

/* ---------- what happens over time ---------- */

export type MarketNews =
  | { kind: 'stale'; headline: Headline }
  | { kind: 'overtaken'; headline: Headline; rival: string; rank: number }
  | { kind: 'launch'; headline: Headline; rival: RivalDef; endsAt: number }
  | { kind: 'launched'; headline: Headline; rival: RivalDef };

/** Quiet spells, rival launches and rivals passing the player. Call every tick. */
export function updateMarket(s: GameState, now: number, rng: Rng, canSpawn: boolean): MarketNews[] {
  const m = s.market;
  if (!m.startedAt) return [];
  const news: MarketNews[] = [];

  if (!m.staleNoticed && churnShare(s) > 0) {
    m.staleNoticed = true;
    news.push({ kind: 'stale', headline: headline(s, now, rng, pick([`Is ${m.appName} still maintained? Users start to wonder`, `${m.appName} goes quiet as rivals ship`, `Users drift away from ${m.appName} after months without an update`], rng)) });
  }

  if (m.launch && now >= m.launch.endsAt) {
    const r = RIVALS.find((x) => x.id === m.launch!.rival);
    m.launch = null;
    m.nextLaunchAt = nextLaunch(now, rng);
    if (r) {
      m.absorbed[r.id] = (m.absorbed[r.id] ?? 0) + MARKET.launch.rivalGain * rivalUsers(s, r, now);
      news.push({ kind: 'launched', rival: r, headline: headline(s, now, rng, `${r.name} launches a new ${r.app} to strong reviews`) });
    }
  } else if (!m.launch && canSpawn && now >= m.nextLaunchAt) {
    const r = churnTarget(s, now, usersNow(s));
    if (r) {
      m.launch = { rival: r.id, endsAt: now + MARKET.launch.warningMs };
      news.push({ kind: 'launch', rival: r, endsAt: m.launch.endsAt, headline: headline(s, now, rng, `${r.name} teases a big ${r.app} launch`) });
    } else m.nextLaunchAt = nextLaunch(now, rng);
  }

  const rows = chart(s, now);
  const rank = rows.findIndex((r) => r.you) + 1;
  if (m.rank && rank > m.rank && rows[rank - 2]) {
    const passer = rows[rank - 2];
    news.push({ kind: 'overtaken', rival: passer.name, rank, headline: headline(s, now, rng, `${passer.name} passes ${m.appName} in the charts`) });
  }
  m.rank = rank;
  return news;
}

/** Renames the app: letters, digits, spaces, dots, dashes and underscores, up to 24 characters. */
export function renameApp(s: GameState, name: string): string {
  const clean = name.replace(/[^\w .-]/g, '').trim().slice(0, 24);
  s.market.appName = clean || MARKET.defaultName;
  return s.market.appName;
}
