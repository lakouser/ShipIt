import { COMPANY_PERKS, FUNDING, ROUNDS, type CompanyPerkDef } from './content';
import { companyLevel } from './economy';
import { D } from './num';
import { makeMilestone } from './quests';
import type { Rng } from './rng';
import { makeBacklog } from './sprints';
import type { GameState } from './state';

/* ---------- funding rounds: trade every star and perk for equity and a permanent multiplier ---------- */

export const starsForNextRound = (s: GameState): number => FUNDING.starsPerRound[Math.min(s.round, FUNDING.starsPerRound.length - 1)];

export const canRaise = (s: GameState): boolean => s.round < FUNDING.maxRounds && s.stars >= starsForNextRound(s);

/** Equity granted for raising with this many stars. */
export const equityFor = (stars: number): number => Math.max(1, Math.floor(2 * Math.log10(Math.max(1, stars)) - 1));

export const roundName = (round: number): string => ROUNDS[Math.min(round, ROUNDS.length - 1)];

export interface RaiseResult {
  round: number;
  name: string;
  equity: number;
  starsBefore: number;
}

/** Raises the next round: stars, dotfiles, releases, packages, forks and debt start over; equity and the round multiplier stay. */
export function raiseRound(s: GameState, now: number, rng: Rng): RaiseResult | null {
  if (!canRaise(s)) return null;
  const result: RaiseResult = { round: s.round + 1, name: roundName(s.round + 1), equity: equityFor(s.stars), starsBefore: s.stars };
  s.round++;
  s.equity += result.equity;
  s.stars = 0;
  s.starsSpent = 0;
  s.perks = {};
  s.release = 1;
  s.lines = D(0);
  s.thisRelease = D(0);
  s.owned = {};
  s.forks = {};
  s.debt = 0;
  s.project = 'webapp';
  s.sprint = null;
  s.lastSprint = null;
  s.boss = null;
  s.backlog = makeBacklog(s, now, rng);
  s.milestone = makeMilestone(s);
  return result;
}

/* ---------- company perks, bought with equity ---------- */

export const equityAvailable = (s: GameState): number => s.equity - s.equitySpent;

export const findCompanyPerk = (id: string): CompanyPerkDef | undefined => COMPANY_PERKS.find((p) => p.id === id);

export const companyPerkCost = (p: CompanyPerkDef, level: number): number => p.baseCost + p.costStep * level;

export function companyPerkStatus(s: GameState, p: CompanyPerkDef): 'maxed' | 'affordable' | 'expensive' {
  const level = companyLevel(s, p.id);
  if (level >= p.maxLevel) return 'maxed';
  return equityAvailable(s) >= companyPerkCost(p, level) ? 'affordable' : 'expensive';
}

export function buyCompanyPerk(s: GameState, id: string): { perk: CompanyPerkDef; level: number } | null {
  const p = findCompanyPerk(id);
  if (!p || companyPerkStatus(s, p) !== 'affordable') return null;
  const level = companyLevel(s, id);
  s.equitySpent += companyPerkCost(p, level);
  s.company[id] = level + 1;
  return { perk: p, level: level + 1 };
}
