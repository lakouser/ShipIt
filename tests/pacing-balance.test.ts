import { describe, expect, it } from 'vitest';
import { FUNDING, type LanguageId, type ProjectId, type SegmentId } from '../src/core/content';
import { simulate } from './sim';

/** The median of some numbers. */
const median = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Choices should be choices: no project, no stack and no roadmap segment may carry an engaged player through the game far faster than the
 * rest (once, a CLI-only run raised its Seed round in a quarter of the web app's time). Each is played on its own by
 * the engaged bot; the fastest may be at most a quarter quicker than the median.
 */
describe('balance', () => {
  it('no project runs away with the game', () => {
    const projects: ProjectId[] = ['cli', 'enterprise', 'game', 'startup', 'os'];
    const seed = projects.map((id) => simulate({ minutes: 150, tapsPerSecond: 4, engaged: true, projects: [id, 'webapp'], stacks: ['ts'], until: (s) => s.round >= 1 }).raises[0]?.minute ?? 150);
    expect(Math.min(...seed)).toBeGreaterThan(median(seed) * 0.75);
  }, 300_000);

  it('no segment runs away with the game', () => {
    const segments: SegmentId[] = ['dev', 'biz', 'fun'];
    const ipo = segments.map(
      (id) =>
        simulate({ minutes: 200, tapsPerSecond: 4, engaged: true, segment: id, until: (s) => s.round >= FUNDING.maxRounds }).raises.find((r) => r.round === FUNDING.maxRounds)?.minute ?? 200,
    );
    expect(Math.min(...ipo)).toBeGreaterThan(median(ipo) * 0.75);
  }, 300_000);

  it('no stack runs away with the game', () => {
    const stacks: LanguageId[] = ['ts', 'py', 'go', 'rs'];
    const ipo = stacks.map(
      (id) =>
        simulate({ minutes: 200, tapsPerSecond: 4, engaged: true, stacks: [id], until: (s) => s.round >= FUNDING.maxRounds }).raises.find((r) => r.round === FUNDING.maxRounds)?.minute ?? 200,
    );
    expect(Math.min(...ipo)).toBeGreaterThan(median(ipo) * 0.75);
  }, 300_000);
});
