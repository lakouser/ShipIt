import { ACHIEVEMENT_BONUS, BASE_TAP, COST_GROWTH, DOUBLING_STEP, PERK_VALUES, SHIP, UPGRADES, type UpgradeDef, type UpgradeKind } from './content';
import { effectProduct, effectSum } from './effects';
import { D, Decimal } from './num';
import { perkLevel } from './perks';
import type { GameState } from './state';

export const owned = (s: GameState, id: string): number => s.owned[id] ?? 0;

export const findUpgrade = (id: string): UpgradeDef | undefined => UPGRADES.find((u) => u.id === id);

/** 2x for every DOUBLING_STEP copies owned. */
export const doublingMultiplier = (count: number): Decimal => Decimal.pow(2, Math.floor(count / DOUBLING_STEP));

export const nextDoublingAt = (count: number): number => (Math.floor(count / DOUBLING_STEP) + 1) * DOUBLING_STEP;

export const totalOwned = (s: GameState): number => Object.values(s.owned).reduce((a, b) => a + b, 0);

/** Stars, achievements and coffee: applies to everything the player writes. */
export function globalMultiplier(s: GameState, now: number): Decimal {
  return D(1 + SHIP.bonusPerStar * s.stars)
    .mul(1 + ACHIEVEMENT_BONUS * s.achievements.length)
    .mul(effectProduct(s, 'allMul', now));
}

export function tapMultiplier(s: GameState, now: number): Decimal {
  return globalMultiplier(s, now)
    .mul(1 + PERK_VALUES.vimrcTap * perkLevel(s, 'vimrc'))
    .mul(1 + s.questBonus.tap)
    .mul(effectProduct(s, 'tapMul', now));
}

export function autoMultiplier(s: GameState, now: number): Decimal {
  return globalMultiplier(s, now)
    .mul(1 + PERK_VALUES.teamAuto * perkLevel(s, 'team'))
    .mul(1 + s.questBonus.auto)
    .mul(effectProduct(s, 'autoMul', now));
}

const kindMultiplier = (s: GameState, kind: UpgradeKind, now: number): Decimal =>
  kind === 'tap' ? tapMultiplier(s, now) : autoMultiplier(s, now);

/** Output of one copy of an upgrade right now, including all multipliers. */
export function unitOutput(s: GameState, u: UpgradeDef, now: number): Decimal {
  return D(u.output).mul(doublingMultiplier(owned(s, u.id))).mul(kindMultiplier(s, u.kind, now));
}

function baseTotal(s: GameState, kind: UpgradeKind): Decimal {
  let total = D(0);
  for (const u of UPGRADES) {
    if (u.kind !== kind) continue;
    const n = owned(s, u.id);
    if (n > 0) total = total.add(D(u.output).mul(n).mul(doublingMultiplier(n)));
  }
  return total;
}

/** Lines per tap before flow state and critical hits. */
export const perTap = (s: GameState, now: number): Decimal => baseTotal(s, 'tap').add(BASE_TAP).mul(tapMultiplier(s, now));

export const perSecond = (s: GameState, now: number): Decimal => baseTotal(s, 'auto').mul(autoMultiplier(s, now));

/** Chance (0–1) that a tap is critical. */
export const critChance = (s: GameState, now: number): number =>
  Math.min(0.9, PERK_VALUES.critPerLevel * perkLevel(s, 'keybindings') + effectSum(s, 'critChance', now));

/** Price multiplier from the cache.conf perk. */
export const costMultiplier = (s: GameState): number => 1 - PERK_VALUES.cacheDiscount * perkLevel(s, 'cache');

export function costOf(s: GameState, u: UpgradeDef, count: number): Decimal {
  return Decimal.sumGeometricSeries(count, u.baseCost * costMultiplier(s), COST_GROWTH, owned(s, u.id)).ceil();
}

export function maxAffordable(s: GameState, u: UpgradeDef): number {
  return Math.max(0, Decimal.affordGeometricSeries(s.lines, u.baseCost * costMultiplier(s), COST_GROWTH, owned(s, u.id)).toNumber());
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
  /** Set when this purchase crossed a doubling threshold. */
  doubledAt: number | null;
}

export function buy(s: GameState, id: string): Purchase | null {
  const u = findUpgrade(id);
  if (!u) return null;
  const count = quantityToBuy(s, u);
  const cost = costOf(s, u, count);
  if (s.lines.lt(cost)) return null;
  const before = owned(s, u.id);
  const after = before + count;
  s.lines = s.lines.sub(cost);
  s.owned[u.id] = after;
  s.stats.purchases += count;
  s.stats.maxOfOne = Math.max(s.stats.maxOfOne, after);
  const crossed = Math.floor(after / DOUBLING_STEP) > Math.floor(before / DOUBLING_STEP);
  return { upgrade: u, count, cost, doubledAt: crossed ? Math.floor(after / DOUBLING_STEP) * DOUBLING_STEP : null };
}

/** An upgrade shows once the previous one of its kind is owned, or the player is getting close to its price. */
export function isUpgradeVisible(s: GameState, index: number): boolean {
  const u = UPGRADES[index];
  const prev = UPGRADES.slice(0, index).filter((x) => x.kind === u.kind).at(-1);
  return !prev || owned(s, u.id) > 0 || owned(s, prev.id) > 0 || s.thisRelease.gte(u.baseCost * 0.4);
}

/** Lines the player would write over `seconds` at a steady pace: automation plus ASSUMED taps. */
export function typicalOutput(s: GameState, now: number, seconds: number, tapsPerSecond: number): Decimal {
  return perSecond(s, now).add(perTap(s, now).mul(tapsPerSecond)).mul(seconds);
}
