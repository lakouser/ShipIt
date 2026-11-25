import { BASE_TAP, COST_GROWTH, DOUBLING_STEP, SHIP, UPGRADES, type UpgradeDef, type UpgradeKind } from './content';
import { D, Decimal } from './num';
import type { GameState } from './state';

export const owned = (s: GameState, id: string): number => s.owned[id] ?? 0;

export const findUpgrade = (id: string): UpgradeDef | undefined => UPGRADES.find((u) => u.id === id);

/** 2x for every DOUBLING_STEP copies owned. */
export const doublingMultiplier = (count: number): Decimal => Decimal.pow(2, Math.floor(count / DOUBLING_STEP));

export const nextDoublingAt = (count: number): number => (Math.floor(count / DOUBLING_STEP) + 1) * DOUBLING_STEP;

export const boostActive = (s: GameState, now: number): boolean => !!s.boost && now < s.boost.endsAt;

/** Stars and any active boost; applies to everything the player writes. */
export function globalMultiplier(s: GameState, now: number): Decimal {
  const stars = D(1 + SHIP.bonusPerStar * s.stars);
  return boostActive(s, now) ? stars.mul(s.boost!.multiplier) : stars;
}

/** Output of one copy of an upgrade right now, including all multipliers. */
export function unitOutput(s: GameState, u: UpgradeDef, now: number): Decimal {
  return D(u.output).mul(doublingMultiplier(owned(s, u.id))).mul(globalMultiplier(s, now));
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

export const perTap = (s: GameState, now: number): Decimal => baseTotal(s, 'tap').add(BASE_TAP).mul(globalMultiplier(s, now));

export const perSecond = (s: GameState, now: number): Decimal => baseTotal(s, 'auto').mul(globalMultiplier(s, now));

export function costOf(s: GameState, u: UpgradeDef, count: number): Decimal {
  return Decimal.sumGeometricSeries(count, u.baseCost, COST_GROWTH, owned(s, u.id)).ceil();
}

export function maxAffordable(s: GameState, u: UpgradeDef): number {
  return Math.max(0, Decimal.affordGeometricSeries(s.lines, u.baseCost, COST_GROWTH, owned(s, u.id)).toNumber());
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
  const crossed = Math.floor(after / DOUBLING_STEP) > Math.floor(before / DOUBLING_STEP);
  return { upgrade: u, count, cost, doubledAt: crossed ? Math.floor(after / DOUBLING_STEP) * DOUBLING_STEP : null };
}

/** An upgrade shows once the previous one of its kind is owned, or the player is getting close to its price. */
export function isUpgradeVisible(s: GameState, index: number): boolean {
  const u = UPGRADES[index];
  const prev = UPGRADES.slice(0, index).filter((x) => x.kind === u.kind).at(-1);
  return !prev || owned(s, u.id) > 0 || owned(s, prev.id) > 0 || s.thisRelease.gte(u.baseCost * 0.4);
}
