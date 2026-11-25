import { describe, expect, it } from 'vitest';
import { simulate } from './sim';

/**
 * Pacing guard rails. A bot plays the real game rules; these bounds catch balance
 * changes that make the early game drag or let players blow through all the content.
 * For a longer, printed run: `npm run simulate` (SIM_MINUTES, SIM_TAPS to adjust).
 */
declare const process: { env: Record<string, string | undefined> };

const minutes = Number(process.env.SIM_MINUTES ?? 120);
const taps = Number(process.env.SIM_TAPS ?? 4);
const verbose = !!process.env.SIM_MINUTES;

describe('pacing', () => {
  it(`plays ${minutes} minutes at ${taps} taps/s within bounds`, () => {
    const r = simulate({ minutes, tapsPerSecond: taps });
    if (verbose) {
      console.log(JSON.stringify({ ...r, timeline: undefined }, null, 2));
      console.table(r.timeline);
    }
    // Tabs open in the first minutes, not instantly and not after ages.
    expect(r.unlocks.sprints).toBeLessThan(2);
    expect(r.unlocks.todo).toBeLessThan(4);
    // First ship lands in a satisfying window.
    expect(r.ships.length).toBeGreaterThan(0);
    expect(r.ships[0].minute).toBeGreaterThan(5);
    expect(r.ships[0].minute).toBeLessThan(35);
    if (minutes >= 120) {
      expect(r.ships.length).toBeGreaterThanOrEqual(3);
      // Two hours in, the last tiers should still be ahead (longer runs may reach them).
      const atTwoHours = r.timeline.find((t) => t.minute >= 120)?.top ?? r.topUpgrade;
      expect(['quantum', 'agents', 'neural']).not.toContain(atTwoHours);
    }
  }, 120_000);
});
