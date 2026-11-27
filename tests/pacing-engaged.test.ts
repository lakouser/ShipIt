import { describe, expect, it } from 'vitest';
import { FUNDING } from '../src/core/content';
import { simulate } from './sim';

/**
 * Pacing for an engaged player: a bot that plays every system (package upgrades, the team, boss incidents, mail,
 * refactoring, projects, tests, issues, stacks, challenges and acquisitions). Engaged play is meant to be faster than
 * the official bot's, but not so fast that the campaign is over before its systems have had their turn, and never with a
 * long wait for something new. `npm run simulate` prints the official bot's run; see tests/sim.ts for both.
 */
describe('pacing: an engaged player', () => {
  it('reaches each round and the IPO within bounds, with something new every so often', () => {
    const r = simulate({ minutes: 200, tapsPerSecond: 4, engaged: true, until: (s) => s.corp.quarter >= 2 });
    const round = (n: number) => r.raises.find((x) => x.round === n)?.minute ?? Infinity;
    expect(r.ships[0].minute).toBeGreaterThan(3);
    expect(r.ships[0].minute).toBeLessThan(8);
    // The test suite and the issue queue fill the stretch before the first round.
    expect(r.unlocks.tests).toBeLessThan(round(1));
    expect(r.unlocks.issues).toBeLessThan(round(2));
    expect(round(1)).toBeGreaterThan(40);
    expect(round(1)).toBeLessThan(80);
    expect(round(FUNDING.maxRounds)).toBeGreaterThan(80);
    expect(round(FUNDING.maxRounds)).toBeLessThan(160);
    expect(r.longestWait.minutes).toBeLessThan(25);
    // After the IPO: a quarter reported, rivals bought.
    expect(r.quarters.length).toBeGreaterThanOrEqual(1);
    expect(r.acquisitions.length).toBeGreaterThan(0);
  }, 300_000);
});
