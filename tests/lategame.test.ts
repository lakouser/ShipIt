import { describe, expect, it } from 'vitest';
import { PERKS } from '../src/core/content';
import { perSecond } from '../src/core/economy';
import type { GameEvent } from '../src/core/game';
import { D } from '../src/core/num';
import { perkCost, perkStatus } from '../src/core/perks';
import { linesForStars, shippedForStars } from '../src/core/ship';
import { workflowOn } from '../src/core/workflows';
import { fixedRng, testGame } from './helpers';

const events = (t: ReturnType<typeof testGame>) => {
  const list: GameEvent[] = [];
  t.game.on((e) => list.push(e));
  return list;
};

describe('workflows', () => {
  it('unlock by releases shipped, start switched on and can be switched off', () => {
    const t = testGame((s) => (s.release = 3)); // two releases shipped
    expect(workflowOn(t.state, 'deps')).toBe(true);
    expect(workflowOn(t.state, 'devdeps')).toBe(false);
    t.game.setWorkflow('deps', false);
    expect(workflowOn(t.state, 'deps')).toBe(false);
  });

  it('announce a workflow when the release that unlocks it ships', () => {
    const t = testGame((s) => {
      s.release = 2;
      s.thisRelease = D(2_000_000);
    });
    const list = events(t);
    t.game.ship();
    expect(list.filter((e) => e.type === 'workflowUnlocked').map((e) => e.type === 'workflowUnlocked' && e.workflow.id)).toEqual(['deps']);
  });

  it('deps.yml installs the best-value automation packages, dev-deps.yml typing ones', () => {
    const t = testGame((s) => {
      s.release = 3;
      s.lines = D(1_000);
    });
    t.game.tick();
    expect((t.state.owned.duck ?? 0) + (t.state.owned.intern ?? 0)).toBeGreaterThan(0);
    expect(t.state.owned.kb ?? 0).toBe(0);
    expect(t.state.lines.toNumber()).toBeLessThan(400);

    const off = testGame((s) => {
      s.release = 5;
      s.lines = D(1_000);
      s.workflows.deps = false;
    });
    off.game.tick();
    expect(off.state.owned.kb ?? 0).toBeGreaterThan(0);
    expect(off.state.owned.duck ?? 0).toBe(0);
  });

  it('scripts.yml runs a script once the last run of it has ended', () => {
    const t = testGame((s) => {
      s.release = 7;
      s.scripts = { turbo: 2 };
    });
    t.game.tick();
    expect(t.state.scripts.turbo).toBe(1);
    expect(t.state.effects.turbo).toBeGreaterThan(t.now);
    t.advance(1000);
    t.game.tick();
    expect(t.state.scripts.turbo).toBe(1); // still running
    t.advance(60_000);
    t.game.tick();
    expect(t.state.scripts.turbo ?? 0).toBe(0);
  });

  it('triage.yml squashes bugs and grabs coffee as they appear', () => {
    const t = testGame((s) => {
      s.release = 11;
      s.lifetime = D(10_000);
      s.owned = { duck: 10 };
    }, fixedRng(0.1));
    const list = events(t);
    t.state.nextBugAt = t.now;
    t.state.nextIncidentAt = t.now;
    t.game.tick();
    expect(t.state.bug).toBeNull();
    expect(t.state.stats.bugs).toBe(1);
    expect(t.state.stats.coffees).toBe(1);
    expect(t.state.effects.coffee).toBeGreaterThan(t.now);
    expect(list.some((e) => e.type === 'incidentSpawned')).toBe(false);
  });

  it('release.yml ships once a release would grow stars by the chosen amount', () => {
    const t = testGame((s) => {
      s.release = 16;
      s.stars = 8;
      s.shipped = shippedForStars(8);
    });
    const list = events(t);
    t.state.thisRelease = linesForStars(t.state, 5); // +62%
    t.game.tick();
    expect(t.state.release).toBe(16);
    t.state.thisRelease = linesForStars(t.state, 6); // +75%
    t.game.tick();
    expect(t.state.release).toBe(17);
    expect(t.state.stats.autoShips).toBe(1);
    expect(list.find((e) => e.type === 'shipped')).toMatchObject({ auto: true });

    t.game.setAutoShipAt(2);
    t.state.thisRelease = linesForStars(t.state, 15);
    t.game.tick();
    expect(t.state.release).toBe(17);
    t.game.setAutoShipAt(0.33); // not one of the options
    expect(t.state.autoShipAt).toBe(2);
  });
});

describe('.zshrc', () => {
  it('has no cap, doubles in price and multiplies all output', () => {
    const zshrc = PERKS.find((p) => p.id === 'zshrc')!;
    expect([0, 1, 2, 5].map((l) => perkCost(zshrc, l))).toEqual([10, 20, 40, 320]);
    const t = testGame((s) => {
      s.owned = { duck: 10 };
      s.stars = 100;
    });
    expect(perkStatus(t.state, zshrc)).toBe('locked');
    t.state.perks.cache = 5;
    const before = perSecond(t.state, t.now).toNumber();
    expect(t.game.buyPerk('zshrc')).toBe(true);
    expect(t.game.buyPerk('zshrc')).toBe(true);
    expect(perSecond(t.state, t.now).toNumber()).toBeCloseTo(before * 1.21);
    t.state.perks.zshrc = 500;
    expect(perkStatus(t.state, zshrc)).not.toBe('maxed');
  });
});

describe('career and milestones', () => {
  it('promotes the player as stars are earned over the whole game', () => {
    const t = testGame((s) => (s.thisRelease = D(2_000_000)));
    const list = events(t);
    t.game.ship();
    expect(list.find((e) => e.type === 'promoted')).toMatchObject({ title: 'junior dev' });
  });

  it('asks each release milestone to beat the last release by half', () => {
    const t = testGame((s) => (s.thisRelease = D(1e12)));
    t.game.ship();
    expect(t.state.milestone?.tasks[0]).toMatchObject({ kind: 'lines', target: '2000000000000' });
  });
});

describe('content', () => {
  it('gives every achievement a unique id', async () => {
    const { ACHIEVEMENTS } = await import('../src/core/achievements');
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
