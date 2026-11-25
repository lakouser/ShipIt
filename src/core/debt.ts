import { COMPANY_VALUES, DEBT, TEAM, TRAITS } from './content';
import { companyLevel, perSecondBeforeDebt, projectOf, roleStrength } from './economy';
import { activeEffects } from './effects';
import { Decimal } from './num';
import type { GameState } from './state';

/** Tech debt shows once there is some, or once it can start building. */
export const debtVisible = (s: GameState): boolean => s.debt > 0 || s.lifetime.gte(DEBT.startsAtLifetime);

/** Adds (or with a negative amount, pays off) debt, kept between 0 and DEBT.max. */
export function addDebt(s: GameState, amount: number): void {
  s.debt = Math.max(0, Math.min(DEBT.max, s.debt + amount));
  if (s.debt >= DEBT.max) s.flags.bankrupt = true;
}

/**
 * Debt built per minute: a base rate plus more for each timed effect running, scaled by the project and
 * the platform team, plus 10x developers' share, minus what refactoring developers pay off.
 */
export function debtPerMinute(s: GameState, now: number): number {
  if (!s.lifetime.gte(DEBT.startsAtLifetime) || perSecondBeforeDebt(s, now).lte(0)) return 0;
  return (
    (DEBT.perMinute + DEBT.perMinutePerEffect * activeEffects(s, now).length) *
      (projectOf(s).debtMul ?? 1) *
      Math.max(0, 1 - COMPANY_VALUES.platformDebt * companyLevel(s, 'platform')) +
    s.team.reduce((sum, d) => sum + (TRAITS[d.trait].debtPerMinute ?? 0), 0) -
    TEAM.refactorPerMinute * roleStrength(s, 'refactor')
  );
}

/** Builds debt over `seconds`. True when it just crossed the warning level. */
export function tickDebt(s: GameState, now: number, seconds: number): boolean {
  const before = s.debt;
  addDebt(s, (debtPerMinute(s, now) * seconds) / 60);
  return before < DEBT.warnAt && s.debt >= DEBT.warnAt;
}

/** A refactor costs seconds of automation (before debt) per point of debt. */
export function refactorCost(s: GameState, now: number): Decimal {
  return Decimal.max(DEBT.minRefactorCost, perSecondBeforeDebt(s, now).mul(DEBT.refactorSecondsPerPoint * s.debt)).ceil();
}

/** Pays off all debt. */
export function refactor(s: GameState, now: number): { cost: Decimal; cleared: number } | null {
  if (s.debt < 1) return null;
  const cost = refactorCost(s, now);
  if (s.lines.lt(cost)) return null;
  const cleared = s.debt;
  s.lines = s.lines.sub(cost);
  s.debt = 0;
  s.stats.refactors++;
  return { cost, cleared };
}
