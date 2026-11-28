import { CORP, FUNDING, MARKET, RIVALS, type RivalDef } from './content';
import { rivalUsers, usersNow } from './market';
import { mixIn, revenueMultiplier } from './roadmap';
import { newCorp, type GameState, type QuarterReport } from './state';

/*
 * After the IPO the company reports every quarter (CORP.quarterMinutes of play). Users bring in revenue; the board
 * sets guidance; beating it lifts the stock and adds a permanent output bonus, missing it only costs the stock.
 * Cash buys rival companies: their users join yours and they leave the chart. Nothing here ever resets.
 */

const QUARTER_S = CORP.quarterMinutes * 60;
const clamp = (lo: number, hi: number, x: number) => Math.min(hi, Math.max(lo, x));

export const isPublic = (s: GameState): boolean => s.round >= FUNDING.maxRounds;

/** True once quarters have started (at the IPO). */
export const quartersStarted = (s: GameState): boolean => s.corp.ipoAt > 0;

/** Revenue per second of play: users × CORP.revenuePerUser over a quarter. */
export const revenueRate = (s: GameState): number => quarterRunRate(s) / QUARTER_S;

/** What the users right now would bring in over a whole quarter. */
export const quarterRunRate = (s: GameState): number => usersNow(s) * CORP.revenuePerUser * revenueMultiplier(s);

/** Seconds of play left in the quarter. */
export const quarterLeft = (s: GameState): number => Math.max(0, QUARTER_S - s.corp.elapsed);

/** Revenue this quarter would end on at the current rate. */
export const quarterProjection = (s: GameState): number => s.corp.revenue + revenueRate(s) * quarterLeft(s);

/** Starts the public company and its first quarter. Called at the IPO, or on loading a save that is already public. */
export function goPublic(s: GameState, now: number): boolean {
  if (s.corp.ipoAt > 0 || !isPublic(s)) return false;
  s.corp = { ...newCorp(), ipoAt: now, endingSeen: s.corp.endingSeen, quarter: 1, guidance: Math.max(1, quarterRunRate(s) * CORP.firstGuidance) };
  return true;
}

/** The board's guidance after a quarter: growth on the better of that quarter and the run rate, more for every beat in a row. */
const nextGuidance = (s: GameState): number =>
  Math.max(1, Math.max(s.corp.revenue, quarterRunRate(s)) * (CORP.growth + Math.min(CORP.streakCap, CORP.streakStep * s.corp.streak)));

/** Closes the quarter: beat or miss, the stock moves, the board sets the next guidance. */
function closeQuarter(s: GameState, now: number): QuarterReport {
  const c = s.corp;
  const beat = c.revenue >= c.guidance;
  const surprise = c.guidance > 0 ? c.revenue / c.guidance - 1 : 0;
  c.stock = Math.max(1, c.stock * (1 + clamp(CORP.stockFloor, CORP.stockCap, surprise)));
  const report: QuarterReport = { quarter: c.quarter, revenue: c.revenue, guidance: c.guidance, beat, stock: c.stock, at: now };
  c.reports = [report, ...c.reports].slice(0, CORP.reportsKept);
  if (beat) {
    c.beats++;
    c.streak++;
  } else c.streak = 0;
  c.guidance = nextGuidance(s);
  c.quarter++;
  c.elapsed = 0;
  c.revenue = 0;
  return report;
}

/** Runs the quarter clock over `seconds` of play. Returns the report when a quarter ends. */
export function tickCorp(s: GameState, now: number, seconds: number): QuarterReport | null {
  const c = s.corp;
  if (!c.ipoAt || seconds <= 0) return null;
  const step = Math.min(seconds, quarterLeft(s));
  const earned = revenueRate(s) * step;
  c.revenue += earned;
  c.cash += earned;
  c.elapsed += step;
  return c.elapsed >= QUARTER_S ? closeQuarter(s, now) : null;
}

/** Revenue while away comes in at the offline rate; the quarter clock waits. Returns the cash earned. */
export function creditCorpAway(s: GameState, seconds: number, rate: number): number {
  if (!s.corp.ipoAt || seconds <= 0) return 0;
  const cash = revenueRate(s) * seconds * rate;
  s.corp.cash += cash;
  return cash;
}

/** Output from the public company: quarters beaten and rivals acquired. */
export const corpMultiplier = (s: GameState): number => 1 + CORP.beatBonus * s.corp.beats + CORP.acquireBonus * s.market.acquired.length;

/* ---------- acquisitions ---------- */

export const rivalsLeft = (s: GameState): RivalDef[] => RIVALS.filter((r) => !s.market.acquired.includes(r.id));

/** A rival's price: its users × CORP.pricePerUser, more for every rival bought before, paid partly in stock (cheaper as it rises). */
export const acquirePrice = (s: GameState, r: RivalDef, now: number): number =>
  (rivalUsers(s, r, now) * CORP.pricePerUser * CORP.acquireGrowth ** s.market.acquired.length) / (s.corp.stock / 100);

export interface Acquisition {
  rival: RivalDef;
  price: number;
  users: number;
}

/** True for the last rival left: buying it has to get past the antitrust committee first. */
export const hearingNeeded = (s: GameState, id: string): boolean => !s.corp.monopolyAt && rivalsLeft(s).length === 1 && rivalsLeft(s)[0].id === id;

/** True while the antitrust hearing is being fought (a hearing whose fight was cut short by something else is over). */
export const hearingOn = (s: GameState): boolean => !!s.corp.hearing && s.boss?.kind === 'antitrust';

/** True when the purchase of `r` could go ahead (or go to a hearing) right now. */
export const canAcquire = (s: GameState, r: RivalDef, now: number): boolean =>
  quartersStarted(s) && !s.market.acquired.includes(r.id) && s.corp.cash >= acquirePrice(s, r, now) && !(hearingNeeded(s, r.id) && (now < s.corp.hearingRetryAt || hearingOn(s)));

/**
 * Buys a rival: its users (CORP.keepUsers of them) join yours and it leaves the chart for good. The last one needs
 * `cleared` (the hearing was won): it then costs what the cash covers, and the chart is a list of one.
 */
export function acquire(s: GameState, id: string, now: number, cleared = false): Acquisition | null {
  const r = RIVALS.find((x) => x.id === id);
  if (!quartersStarted(s) || !r || s.market.acquired.includes(id)) return null;
  const last = hearingNeeded(s, id);
  if (last && !cleared) return null;
  const price = cleared ? Math.min(s.corp.cash, acquirePrice(s, r, now)) : acquirePrice(s, r, now);
  if (s.corp.cash < price) return null;
  const m = s.market;
  const users = rivalUsers(s, r, now) * CORP.keepUsers;
  s.corp.cash -= price;
  // The users who come with a company are nobody in particular: every segment's share thins out.
  mixIn(s, m.users, users, null);
  if (last) {
    s.corp.monopolyAt = now;
    s.corp.hearing = null;
  }
  m.users += users;
  m.peak = Math.max(m.peak, m.users);
  m.acquired.push(id);
  if (!m.passed.includes(id)) m.passed.push(id);
  delete m.absorbed[id];
  if (m.launch?.rival === id) {
    m.launch = null;
    m.nextLaunchAt = now + MARKET.launch.minGapMs;
  }
  s.stats.acquisitions++;
  return { rival: r, price, users };
}
