import { TESTS } from './content';
import { addLines } from './economy';
import { mods } from './mods';
import { D, type Decimal } from './num';
import type { GameState } from './state';

/*
 * The test suite. Once it opens, part of the code the player writes (taps, automation, time away) can go to tests
 * instead: those lines don't count toward stars or spending, but this release's coverage rises, which catches bugs
 * before they escape, slows tech debt and lifts the release's review (more users, the chart, issues and revenue).
 */

/** The share of written code going to tests right now (0 until the suite opens). */
export const testShare = (s: GameState): number => (s.unlocked.tests ? s.testBudget : 0);

/** This release's coverage, 0–1: the share of its code written as tests, times TESTS.leverage and the stack's coverage bonus. */
export function coverage(s: GameState): number {
  if (s.written.lte(0)) return 0;
  return Math.max(0, Math.min(1, s.tests.div(s.written).toNumber() * TESTS.leverage * mods(s).coverageMul));
}

/** Coverage a budget would reach over a whole release. */
export const coverageAt = (s: GameState, budget: number): number => Math.min(1, budget * TESTS.leverage * mods(s).coverageMul);

/**
 * Credits code the player writes (a tap, automation, time away), splitting off the test budget. Every line counts toward
 * a running sprint and toward lines written in all; test lines don't count toward this release or spending.
 */
export function writeLines(s: GameState, n: Decimal, countTowardSprint = true): void {
  s.written = s.written.add(n);
  const share = testShare(s);
  if (share <= 0) return addLines(s, n, countTowardSprint);
  const tests = n.mul(share);
  s.tests = s.tests.add(tests);
  s.lifetime = s.lifetime.add(tests);
  addLines(s, n.sub(tests), false);
  if (countTowardSprint && s.sprint) s.sprint.progress = s.sprint.progress.add(n);
}

/** Picks a test budget from TESTS.budgets. */
export function setTestBudget(s: GameState, budget: number): boolean {
  if (!s.unlocked.tests || !TESTS.budgets.includes(budget)) return false;
  s.testBudget = budget;
  return true;
}

/** A fresh release starts with no tests (and no code). */
export function resetCoverage(s: GameState): void {
  s.tests = D(0);
  s.written = D(0);
}
