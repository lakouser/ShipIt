import {
  ACHIEVEMENT_BONUS,
  BASE_TAP,
  COMPANY_VALUES,
  DEBT,
  FORK_STEP,
  FORKS,
  forkChoices,
  FUNDING,
  PERK_VALUES,
  PROJECTS,
  SHIP,
  TEAM,
  TRAITS,
  UPGRADES,
  type ForkDef,
  type ForkId,
  type ProjectDef,
  type RoleId,
  type StackDef,
  type UpgradeDef,
  type UpgradeKind,
} from './content';
import { corpMultiplier } from './corp';
import { effectProduct, effectSum } from './effects';
import { chartMultiplier } from './market';
import { mods, stackOf } from './mods';
import { D, Decimal } from './num';
import { perkEffect } from './perks';
import type { Developer, GameState } from './state';

/* ---------- project, company and team bonuses ---------- */

/** The project this release is building. */
export const projectOf = (s: GameState): ProjectDef => PROJECTS.find((p) => p.id === s.project) ?? PROJECTS[0];

export const companyLevel = (s: GameState, id: string): number => s.company[id] ?? 0;

/** How strongly a developer works in a role (their trait's multiplier). */
export const traitMultiplier = (d: Developer, role: RoleId): number => TRAITS[d.trait].roles?.[role] ?? TRAITS[d.trait].all;

/** The team's combined strength in a role. */
export const roleStrength = (s: GameState, role: RoleId): number => s.team.reduce((sum, d) => sum + (d.role === role ? traitMultiplier(d, role) : 0), 0);

export const teamSlots = (s: GameState): number => TEAM.baseSlots + companyLevel(s, 'headcount');

/** Output kept after tech debt: 1 up to the grace amount, down to 1 - maxPenalty at full debt. */
export function debtMultiplier(s: GameState): number {
  const over = Math.max(0, s.debt - DEBT.grace) / (DEBT.max - DEBT.grace);
  return 1 - DEBT.maxPenalty * Math.min(1, over);
}

/* ---------- forks ---------- */

export function forkOutputMultiplier(s: GameState, id: string): number {
  let m = 1;
  for (const f of s.forks[id] ?? []) m *= FORKS[f]?.outputMul ?? 1;
  return m;
}

export function forkCostMultiplier(s: GameState, id: string): number {
  let m = 1;
  for (const f of s.forks[id] ?? []) m *= FORKS[f]?.costMul ?? 1;
  return m;
}

/** Plugin ecosystems boost every package of their kind. */
export function kindForkBonus(s: GameState, kind: UpgradeKind): number {
  let bonus = 0;
  for (const u of UPGRADES) if (u.kind === kind) for (const f of s.forks[u.id] ?? []) bonus += FORKS[f]?.kindBonus ?? 0;
  return 1 + bonus;
}

/** Late packages appear from a funding round on. */
export const isUpgradeAvailable = (s: GameState, u: UpgradeDef): boolean => (u.minRound ?? 0) <= s.round;

/** Each funding round raised multiplies all output. */
export const roundMultiplier = (s: GameState): number => FUNDING.outputPerRound ** s.round;

/** The language the editor writes: this run's stack. */
export const language = (s: GameState): StackDef => stackOf(s);

/** devrel: bigger bug, incident and boss rewards. */
export const devrelMultiplier = (s: GameState): number => 1 + COMPANY_VALUES.devrelReward * companyLevel(s, 'devrel');

/* ---------- packages ---------- */

export const owned = (s: GameState, id: string): number => s.owned[id] ?? 0;

export const findUpgrade = (id: string): UpgradeDef | undefined => UPGRADES.find((u) => u.id === id);

export const nextForkAt = (count: number): number => (Math.floor(count / FORK_STEP) + 1) * FORK_STEP;

export const totalOwned = (s: GameState): number => Object.values(s.owned).reduce((a, b) => a + b, 0);

/** Forks earned (one per FORK_STEP copies) but not chosen yet. */
export const forksPending = (s: GameState, id: string): number => Math.max(0, Math.floor(owned(s, id) / FORK_STEP) - (s.forks[id]?.length ?? 0));

/** The two forks to choose between for a package, or null if none is due. */
export function forkOptions(s: GameState, id: string): [ForkDef, ForkDef] | null {
  if (forksPending(s, id) < 1) return null;
  const [a, b] = forkChoices(s.forks[id]?.length ?? 0);
  return [FORKS[a], FORKS[b]];
}

export const upgradesWithForks = (s: GameState): UpgradeDef[] => UPGRADES.filter((u) => forksPending(s, u.id) > 0);

export function chooseFork(s: GameState, id: string, fork: ForkId): { upgrade: UpgradeDef; fork: ForkDef } | null {
  const u = findUpgrade(id);
  const options = forkOptions(s, id);
  if (!u || !options || !options.some((f) => f.id === fork)) return null;
  (s.forks[id] ??= []).push(fork);
  s.stats.forksChosen++;
  return { upgrade: u, fork: FORKS[fork] };
}

/* ---------- output ---------- */

/** Output multiplier from stars: each one held adds SHIP.bonusPerStar, spent or not. */
export const starBonus = (stars: number): number => 1 + SHIP.bonusPerStar * stars;

/** Stars, .zshrc, skills, the chart, the public company, achievements, funding and coffee: applies to everything the player writes. */
export function globalMultiplier(s: GameState, now: number): Decimal {
  return D(starBonus(s.stars))
    .mul(PERK_VALUES.zshrcMul ** perkEffect(s, 'zshrc'))
    .mul(mods(s).allMul)
    .mul(chartMultiplier(s, now))
    .mul(corpMultiplier(s))
    .mul(1 + ACHIEVEMENT_BONUS * s.achievements.length)
    .mul(roundMultiplier(s))
    .mul(effectProduct(s, 'allMul', now));
}

export function tapMultiplier(s: GameState, now: number): Decimal {
  return globalMultiplier(s, now)
    .mul(1 + PERK_VALUES.vimrcTap * perkEffect(s, 'vimrc'))
    .mul(mods(s).tapMul)
    .mul(1 + s.questBonus.tap)
    .mul(kindForkBonus(s, 'tap'))
    .mul(projectOf(s).tapMul ?? 1)
    .mul(effectProduct(s, 'tapMul', now));
}

/** Automation multiplier before tech debt. */
export function autoMultiplierBeforeDebt(s: GameState, now: number): Decimal {
  return globalMultiplier(s, now)
    .mul(1 + PERK_VALUES.teamAuto * perkEffect(s, 'team'))
    .mul(mods(s).autoMul)
    .mul(1 + s.questBonus.auto)
    .mul(kindForkBonus(s, 'auto'))
    .mul(1 + TEAM.featuresAuto * roleStrength(s, 'features'))
    .mul(projectOf(s).autoMul ?? 1)
    .mul(effectProduct(s, 'autoMul', now));
}

export const autoMultiplier = (s: GameState, now: number): Decimal => autoMultiplierBeforeDebt(s, now).mul(debtMultiplier(s));

const kindMultiplier = (s: GameState, kind: UpgradeKind, now: number): Decimal =>
  kind === 'tap' ? tapMultiplier(s, now) : autoMultiplier(s, now);

/** Output of one copy of an upgrade right now, including all multipliers. */
export function unitOutput(s: GameState, u: UpgradeDef, now: number): Decimal {
  return D(u.output).mul(forkOutputMultiplier(s, u.id)).mul(kindMultiplier(s, u.kind, now));
}

function baseTotal(s: GameState, kind: UpgradeKind): Decimal {
  let total = D(0);
  for (const u of UPGRADES) {
    if (u.kind !== kind) continue;
    const n = owned(s, u.id);
    if (n > 0) total = total.add(D(u.output).mul(n).mul(forkOutputMultiplier(s, u.id)));
  }
  return total;
}

/** Lines per tap before flow state and critical hits. */
export const perTap = (s: GameState, now: number): Decimal => baseTotal(s, 'tap').add(BASE_TAP).mul(tapMultiplier(s, now));

export const perSecond = (s: GameState, now: number): Decimal => baseTotal(s, 'auto').mul(autoMultiplier(s, now));

/** Lines per second there would be without tech debt (shows what the debt costs). */
export const perSecondBeforeDebt = (s: GameState, now: number): Decimal => baseTotal(s, 'auto').mul(autoMultiplierBeforeDebt(s, now));

/** Each owned package's share of its kind's output, biggest first. */
export function outputShares(s: GameState, kind: UpgradeKind): { upgrade: UpgradeDef; share: number }[] {
  const total = baseTotal(s, kind);
  if (total.lte(0)) return [];
  return UPGRADES.filter((u) => u.kind === kind && owned(s, u.id) > 0)
    .map((u) => ({ upgrade: u, share: D(u.output).mul(owned(s, u.id)).mul(forkOutputMultiplier(s, u.id)).div(total).toNumber() }))
    .sort((a, b) => b.share - a.share);
}

/** Chance (0–1) that a tap is critical. */
export const critChance = (s: GameState, now: number): number =>
  Math.min(0.9, PERK_VALUES.critPerLevel * perkEffect(s, 'keybindings') + mods(s).critAdd + effectSum(s, 'critChance', now));

/* ---------- prices ---------- */

/** Price multiplier from the cache.conf perk, the project and challenge rewards. */
export const costMultiplier = (s: GameState): number => (1 - PERK_VALUES.cacheDiscount * perkEffect(s, 'cache')) * (projectOf(s).costMul ?? 1) * mods(s).costMul;

/** Price of an upgrade's first copy, after discounts and LTS forks. */
export const baseCostOf = (s: GameState, u: UpgradeDef): number => u.baseCost * costMultiplier(s) * forkCostMultiplier(s, u.id);

export function costOf(s: GameState, u: UpgradeDef, count: number): Decimal {
  return Decimal.sumGeometricSeries(count, baseCostOf(s, u), mods(s).costGrowth, owned(s, u.id)).ceil();
}

export function maxAffordable(s: GameState, u: UpgradeDef): number {
  return Math.max(0, Decimal.affordGeometricSeries(s.lines, baseCostOf(s, u), mods(s).costGrowth, owned(s, u.id)).toNumber());
}

/** How many copies the current buy setting would purchase (at least 1, for display). */
export function quantityToBuy(s: GameState, u: UpgradeDef): number {
  const amount = s.settings.buyAmount;
  return amount === 'max' ? Math.max(1, maxAffordable(s, u)) : amount;
}

/** Credits written lines. Sprint progress only counts lines written while the sprint runs. */
export function addLines(s: GameState, n: Decimal, countTowardSprint = true): void {
  s.lines = s.lines.add(n);
  s.lifetime = s.lifetime.add(n);
  s.thisRelease = s.thisRelease.add(n);
  if (countTowardSprint && s.sprint) s.sprint.progress = s.sprint.progress.add(n);
}

export interface Purchase {
  upgrade: UpgradeDef;
  count: number;
  cost: Decimal;
  /** Set when this purchase crossed a fork threshold (a fork is ready to choose). */
  upgradeAt: number | null;
}

/** Position of a package among those of its kind (0 for the first). */
const tierOf = (u: UpgradeDef): number => UPGRADES.filter((x) => x.kind === u.kind).indexOf(u);

/** False for packages a challenge rules out (Solo dev: only the first few of each kind). */
export const canInstall = (s: GameState, u: UpgradeDef): boolean => tierOf(u) < mods(s).maxTier;

/** Buys `amount` copies (by default, what the buy setting asks for) if the player can afford them. */
export function buy(s: GameState, id: string, amount?: number): Purchase | null {
  const u = findUpgrade(id);
  if (!u || !isUpgradeAvailable(s, u) || !canInstall(s, u)) return null;
  const count = amount ?? quantityToBuy(s, u);
  const cost = costOf(s, u, count);
  if (s.lines.lt(cost)) return null;
  const before = owned(s, u.id);
  const after = before + count;
  s.lines = s.lines.sub(cost);
  s.owned[u.id] = after;
  s.stats.purchases += count;
  s.stats.maxOfOne = Math.max(s.stats.maxOfOne, after);
  const crossed = Math.floor(after / FORK_STEP) > Math.floor(before / FORK_STEP);
  return { upgrade: u, count, cost, upgradeAt: crossed ? Math.floor(after / FORK_STEP) * FORK_STEP : null };
}

/** An upgrade shows once it is available and the previous one of its kind is owned, or the player is getting close to its price. */
export function isUpgradeVisible(s: GameState, index: number): boolean {
  const u = UPGRADES[index];
  if (!isUpgradeAvailable(s, u) || !canInstall(s, u)) return false;
  const prev = UPGRADES.slice(0, index).filter((x) => x.kind === u.kind).at(-1);
  return !prev || owned(s, u.id) > 0 || owned(s, prev.id) > 0 || s.thisRelease.gte(u.baseCost * 0.4);
}

/** Lines the player would write over `seconds` at a steady pace: automation plus ASSUMED taps. */
export function typicalOutput(s: GameState, now: number, seconds: number, tapsPerSecond: number): Decimal {
  return perSecond(s, now).add(perTap(s, now).mul(tapsPerSecond)).mul(seconds);
}
