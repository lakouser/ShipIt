import { describe, expect, it } from 'vitest';
import { BOSSES, FOUNDER, INFRA, PULLS, RFC, RFCS, RIVALS, ROADMAP, RULES, SHIP } from '../src/core/content';
import { acquirePrice } from '../src/core/corp';
import { costOf, findUpgrade, perSecond, perTap } from '../src/core/economy';
import { activeLinks, activePatterns, boardParts, draftDirty, infraSlots } from '../src/core/infra';
import { HISTORY, recordHistory } from '../src/core/market';
import { mods } from '../src/core/mods';
import { D } from '../src/core/num';
import { pullReward, pullTier } from '../src/core/pulls';
import { questSlots } from '../src/core/quests';
import { rfcDone, rfcHours } from '../src/core/rfcs';
import { segmentShare } from '../src/core/roadmap';
import { ruleSlots } from '../src/core/rules';
import { deserialize, serialize } from '../src/core/save';
import type { GameState } from '../src/core/state';
import { fixedRng, testGame } from './helpers';

const HOUR = 3_600_000;

/** A public company with every rival but the last bought and cash for the last. */
function nearMonopoly(s: GameState, now = 1_000_000): void {
  s.round = 5;
  s.market.startedAt = now;
  s.market.users = 1e9;
  s.corp.ipoAt = now;
  s.corp.quarter = 1;
  s.market.acquired = RIVALS.slice(0, -1).map((r) => r.id);
  s.corp.cash = 1e40;
}

describe('the architecture board', () => {
  it('opens with the seed round and grows a slot each round', () => {
    const t = testGame();
    expect(infraSlots(t.state)).toBe(0);
    t.state.round = 1;
    t.game.tick();
    expect(t.state.unlocked.infra).toBe(true);
    expect(infraSlots(t.state)).toBe(INFRA.baseSlots);
    t.state.round = 5;
    expect(infraSlots(t.state)).toBe(INFRA.maxSlots);
  });

  it('links neighbours, builds patterns and boosts what sits next to the monitor', () => {
    // api | cache | db in a row: two links and the three-tier pattern.
    const row = ['api', 'cache', 'db'] as const;
    expect(activeLinks(row, 3).map((l) => l.link.name).sort()).toEqual(['cache-aside', 'query cache']);
    expect(activePatterns(row, 3).map((p) => p.id)).toEqual(['threetier']);
    // In any order along the row the three are still joined up; with the cache off in a corner they are not.
    expect(activePatterns(['api', 'db', 'cache'], 3).map((p) => p.id)).toEqual(['threetier']);
    expect(activePatterns(['api', 'db', null, null, null, 'cache'], 6)).toHaveLength(0);
    // The monitor makes its neighbour's own effect half as strong again.
    const plain = boardParts(['api', null, null], 3)[0].tapMul!;
    const watched = boardParts(['api', 'monitor', null], 3)[0].tapMul!;
    expect(watched - 1).toBeCloseTo((plain - 1) * (1 + INFRA.monitorBoost));
  });

  it('only counts what has been deployed, once per release', () => {
    const t = testGame((s) => {
      s.round = 1;
      s.unlocked.infra = true;
    });
    const before = perTap(t.state, t.now);
    t.game.placeService(0, 'api');
    expect(draftDirty(t.state)).toBe(true);
    expect(perTap(t.state, t.now).eq(before)).toBe(true);
    expect(t.game.deployInfra()).not.toBeNull();
    expect(perTap(t.state, t.now).div(before).toNumber()).toBeCloseTo(1.15);
    expect(t.state.stats.deploys).toBe(1);
    // A second deploy has to wait for the next release.
    t.game.placeService(1, 'cache');
    expect(t.game.deployInfra()).toBeNull();
    t.state.thisRelease = D(SHIP.minRelease * 4);
    t.game.ship();
    expect(t.state.infra.canDeploy).toBe(true);
    const result = t.game.deployInfra();
    expect(result?.links.map((l) => l.link.name)).toEqual(['cache-aside']);
  });

  it('moves a service that is already on the draft instead of placing it twice', () => {
    const t = testGame((s) => {
      s.round = 1;
      s.unlocked.infra = true;
    });
    t.game.placeService(0, 'api');
    t.game.placeService(1, 'db');
    t.game.placeService(1, 'api');
    expect(t.state.infra.draft.slice(0, 3)).toEqual(['db', 'api', null]);
    expect(t.game.placeService(5, 'cache')).toBe(false);
  });

  it('builds a pattern once for the record', () => {
    const t = testGame((s) => {
      s.round = 1;
      s.unlocked.infra = true;
    });
    (['api', 'cache', 'db'] as const).forEach((id, i) => t.game.placeService(i, id));
    const result = t.game.deployInfra();
    expect(result?.found.map((p) => p.id)).toEqual(['threetier']);
    expect(t.state.infra.found).toEqual(['threetier']);
    expect(mods(t.state).allMul).toBeCloseTo(1.1);
  });
});

describe('the roadmap', () => {
  it('opens after four releases and does nothing until pointed at a segment', () => {
    const t = testGame((s) => {
      s.stats.ships = ROADMAP.unlockShips;
    });
    t.game.tick();
    expect(t.state.unlocked.roadmap).toBe(true);
    expect(mods(t.state).autoMul).toBe(1);
  });

  it('counts a release’s new users into the segment in focus, and pays by share', () => {
    const t = testGame((s) => {
      s.unlocked.roadmap = true;
      s.unlocked.ship = true;
      s.market.startedAt = 1;
      s.market.users = 1000;
      s.thisRelease = D(SHIP.minRelease * 8);
    });
    expect(t.game.setFocus('dev')).toBe(true);
    t.game.ship();
    const share = segmentShare(t.state, 'dev');
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(1);
    expect(mods(t.state).autoMul).toBeCloseTo(1 + ROADMAP.devAuto * share);
    expect(t.state.roadmap.shipped.dev).toBe(1);
    expect(t.state.stats.headlines).toBe(1);
    // A release for somebody else thins the developers out.
    t.game.setFocus('biz');
    t.state.thisRelease = D(SHIP.minRelease * 200);
    t.game.ship();
    expect(segmentShare(t.state, 'dev')).toBeLessThan(share);
    expect(mods(t.state).starGain).toBeGreaterThan(1);
  });

  it('brings more users with a headline than without', () => {
    const users = (focus: boolean): number => {
      const t = testGame((s) => {
        s.unlocked.roadmap = true;
        s.thisRelease = D(SHIP.minRelease * 8);
      }, fixedRng(0.5));
      if (focus) t.game.setFocus('biz');
      t.game.ship();
      return t.state.market.users;
    };
    expect(users(true) / users(false)).toBeCloseTo(ROADMAP.headlineUsers, 2);
  });
});

describe('rfcs', () => {
  const withRfcs = (setup: (s: GameState) => void = () => {}) =>
    testGame((s) => {
      s.unlocked.rfcs = true;
      setup(s);
    });

  it('takes real hours, one at a time, and longer each time', () => {
    const t = withRfcs();
    expect(rfcHours(t.state)).toBe(RFC.hours[0]);
    expect(t.game.startRfc('canary')).toBe(true);
    expect(t.game.startRfc('types')).toBe(false);
    t.advance(RFC.hours[0] * HOUR - 1000);
    t.game.tick();
    expect(rfcDone(t.state, 'canary')).toBe(false);
    t.advance(2000);
    t.game.tick();
    expect(rfcDone(t.state, 'canary')).toBe(true);
    expect(t.state.rfc.active).toBeNull();
    expect(rfcHours(t.state)).toBe(RFC.hours[1]);
    expect(t.game.startRfc('canary')).toBe(false);
  });

  it('finishes while the player is away', () => {
    const t = withRfcs();
    t.game.startRfc('remote');
    const back = deserialize(serialize(t.state, t.now), t.now + 9 * HOUR)!;
    const later = testGame((s) => Object.assign(s, back));
    later.advance(9 * HOUR);
    later.game.tick();
    expect(rfcDone(later.state, 'remote')).toBe(true);
  });

  it('applies what it says', () => {
    const t = withRfcs((s) => {
      s.rfc.done = ['monorepo', 'backlog', 'canary'];
      s.owned = { duck: 40, kb: 9 };
      s.thisRelease = D(SHIP.minRelease * 4);
    });
    expect(mods(t.state).costGrowth).toBe(RFC.monorepoGrowth);
    expect(questSlots(t.state)).toBe(4);
    t.game.ship();
    expect(t.state.owned).toEqual({ duck: 4 });
    // Cheaper growth shows in the price of the next copies.
    const plain = testGame((s) => (s.owned = { duck: 50 }));
    const mono = withRfcs((s) => {
      s.owned = { duck: 50 };
      s.rfc.done = ['monorepo'];
    });
    const duck = findUpgrade('duck')!;
    expect(costOf(mono.state, duck, 10).lt(costOf(plain.state, duck, 10))).toBe(true);
  });

  it('gives critical taps more with strict types', () => {
    const lines = (done: boolean): number => {
      const t = withRfcs((s) => {
        s.perks.keybindings = 5;
        if (done) s.rfc.done = ['types'];
      }, );
      const g = testGame((s) => Object.assign(s, t.state), fixedRng(0));
      return g.game.tap().toNumber();
    };
    expect(lines(true) / lines(false)).toBeCloseTo(RFC.critMultiplier / 5);
  });

  it('lists every rfc once', () => {
    expect(new Set(RFCS.map((r) => r.id)).size).toBe(RFCS.length);
  });
});

describe('pull requests', () => {
  const shipped = (s: GameState) => {
    s.market.startedAt = 1;
    s.market.users = 5000;
    s.owned = { duck: 10 };
  };

  it('are opened after half an hour away, better after longer', () => {
    expect(pullTier(PULLS.minAwayS)).toBe(1);
    expect(pullTier(3 * 3600)).toBe(2);
    expect(pullTier(7 * 3600)).toBe(3);
    const t = testGame(shipped);
    t.game.creditTimeAway(PULLS.minAwayS - 1);
    expect(t.state.pulls).toBeNull();
    t.game.creditTimeAway(PULLS.minAwayS);
    expect(t.state.pulls?.options).toHaveLength(PULLS.options);
    expect(t.state.pulls?.tier).toBe(1);
    // A longer absence replaces them with a better batch; a shorter one leaves them alone.
    t.game.creditTimeAway(7 * 3600);
    expect(t.state.pulls?.tier).toBe(3);
    t.game.creditTimeAway(PULLS.minAwayS);
    expect(t.state.pulls?.tier).toBe(3);
  });

  it('do not come before the app has shipped', () => {
    const t = testGame();
    t.game.creditTimeAway(8 * 3600);
    expect(t.state.pulls).toBeNull();
  });

  it('merge one and close the rest', () => {
    const t = testGame((s) => {
      shipped(s);
      s.pulls = { options: ['perf', 'deps', 'docs'], tier: 2 };
    });
    const reward = pullReward(t.state, 'perf', 2, t.now);
    const before = t.state.lines;
    const result = t.game.mergePull(0);
    expect(result?.pull.id).toBe('perf');
    expect(t.state.lines.sub(before).eq(reward.lines!)).toBe(true);
    expect(t.state.pulls).toBeNull();
    expect(t.state.stats.pullsMerged).toBe(1);
    expect(t.game.mergePull(0)).toBeNull();
  });

  it('offers one more with an open-source core', () => {
    const t = testGame((s) => {
      shipped(s);
      s.stars = 10;
      s.debt = 50;
      s.lifetime = D(1e6);
      s.rfc.done = ['oss'];
    });
    t.game.creditTimeAway(PULLS.minAwayS);
    expect(t.state.pulls?.options).toHaveLength(PULLS.options + 1);
  });

  it('caps what rewrites of the core can add', () => {
    const t = testGame((s) => {
      shipped(s);
      s.contribBonus = PULLS.coreCap - 0.01;
      s.pulls = { options: ['core'], tier: 3 };
    });
    t.game.mergePull(0);
    expect(t.state.contribBonus).toBeCloseTo(PULLS.coreCap);
    expect(mods(t.state).allMul).toBeCloseTo(1 + PULLS.coreCap);
  });
});

describe('~/bin/rules', () => {
  const withRules = (setup: (s: GameState) => void = () => {}) =>
    testGame((s) => {
      s.round = RULES.unlockRound;
      setup(s);
    });

  it('opens at series c with two slots, more with the skill', () => {
    const early = testGame((s) => (s.round = RULES.unlockRound - 1));
    expect(ruleSlots(early.state)).toBe(0);
    expect(early.game.addRule()).toBe(false);
    const t = withRules();
    expect(ruleSlots(t.state)).toBe(RULES.baseSlots);
    expect(t.game.addRule()).toBe(true);
    expect(t.game.addRule()).toBe(true);
    expect(t.game.addRule()).toBe(false);
    t.state.skills.shell = 2;
    expect(ruleSlots(t.state)).toBe(RULES.baseSlots + 2);
  });

  it('fires once when its condition becomes true, not while it stays true', () => {
    const t = withRules((s) => {
      s.scripts = { sudo: 3 };
      s.rules = [{ when: 'flow', then: 'sudo', on: true }];
    });
    t.game.tick();
    // Fill the flow meter.
    for (let i = 0; i < 30; i++) t.game.tap();
    t.advance(100);
    t.game.tick();
    expect(t.state.scripts.sudo).toBe(2);
    expect(t.state.stats.rulesFired).toBe(1);
    for (let i = 0; i < 5; i++) {
      t.game.tap();
      t.advance(100);
      t.game.tick();
    }
    expect(t.state.scripts.sudo).toBe(2);
  });

  it('does nothing when switched off or when its action cannot run', () => {
    const t = withRules((s) => {
      s.scripts = {};
      s.debt = 10;
      s.lines = D(1e9);
      s.rules = [
        { when: 'debt', then: 'turbo', on: true },
        { when: 'debt', then: 'refactor', on: false },
      ];
    });
    t.game.tick();
    t.state.debt = 80;
    t.advance(100);
    t.game.tick();
    expect(t.state.stats.rulesFired).toBe(0);
    expect(t.state.debt).toBeGreaterThan(50);
  });

  it('can refactor when tech debt passes the mark', () => {
    const t = withRules((s) => {
      s.debt = 10;
      s.lines = D(1e9);
      s.rules = [{ when: 'debt', then: 'refactor', on: true }];
    });
    t.game.tick();
    t.state.debt = 80;
    t.advance(100);
    t.game.tick();
    expect(t.state.debt).toBeLessThan(1);
    expect(t.state.stats.refactors).toBe(1);
  });
});

describe('the last rival', () => {
  it('goes to a hearing first, and a won hearing ends the chart', () => {
    const t = testGame((s) => nearMonopoly(s), fixedRng(0));
    const last = RIVALS[RIVALS.length - 1];
    const events: string[] = [];
    t.game.on((e) => events.push(e.type));
    expect(t.game.acquire(last.id)).toBeNull();
    expect(t.state.boss?.kind).toBe('antitrust');
    expect(t.state.boss?.phase).toBe('fight');
    expect(t.state.corp.hearing).toBe(last.id);
    // Win every stage: mash the taps, pick the right answer.
    for (let guard = 0; guard < 400 && t.state.boss; guard++) {
      const stage = BOSSES.antitrust.stages[t.state.boss.stage];
      if (stage.type === 'mash') t.game.tap();
      else t.game.bossPick(t.state.boss.correct);
    }
    expect(t.state.boss).toBeNull();
    expect(t.state.market.acquired).toHaveLength(RIVALS.length);
    expect(t.state.corp.monopolyAt).toBeGreaterThan(0);
    expect(events).toContain('hearing');
    expect(events).toContain('monopoly');
    // The antitrust hearing is not one of the bosses that count towards beating every kind.
    expect(t.state.bossKinds).not.toContain('antitrust');
  });

  it('blocks the deal for a while when the hearing is lost', () => {
    const t = testGame((s) => nearMonopoly(s), fixedRng(0));
    const last = RIVALS[RIVALS.length - 1];
    t.game.acquire(last.id);
    // Run the clock out on the first stage.
    t.advance(60_000);
    t.game.tick();
    expect(t.state.boss).toBeNull();
    expect(t.state.market.acquired).toHaveLength(RIVALS.length - 1);
    expect(t.state.corp.hearing).toBeNull();
    expect(t.state.corp.hearingRetryAt).toBe(t.now + FOUNDER.hearingRetryMs);
    t.game.acquire(last.id);
    expect(t.state.boss).toBeNull();
    t.advance(FOUNDER.hearingRetryMs + 1);
    t.game.acquire(last.id);
    expect(t.state.boss?.kind).toBe('antitrust');
  });

  it('leaves earlier purchases as they were', () => {
    const t = testGame((s) => {
      nearMonopoly(s);
      s.market.acquired = [];
    });
    const first = RIVALS[0];
    expect(acquirePrice(t.state, first, t.now)).toBeGreaterThan(0);
    expect(t.game.acquire(first.id)).not.toBeNull();
    expect(t.state.boss).toBeNull();
  });
});

describe('founding again', () => {
  it('needs the monopoly, keeps the founder and restarts the company', () => {
    const t = testGame((s) => {
      nearMonopoly(s);
      s.achievements = ['hello', 'ship'];
      s.stats.ships = 40;
      s.rfc.done = ['canary'];
      s.stars = 500;
      s.lifetime = D(1e30);
      s.skills.tenx = 3;
      s.xp = 12;
    });
    expect(t.game.foundStartup('hacker')).toBe(false);
    t.state.corp.monopolyAt = t.now;
    const base = testGame();
    expect(t.game.foundStartup('hacker')).toBe(true);
    const s = t.state;
    expect(s.founder).toEqual({ exits: 1, traits: ['hacker'] });
    expect(s.achievements).toEqual(['hello', 'ship']);
    expect(s.stats.ships).toBe(40);
    expect(s.rfc.done).toEqual(['canary']);
    expect(s.round).toBe(0);
    expect(s.stars).toBe(0);
    expect(s.xp).toBe(0);
    expect(s.corp.monopolyAt).toBe(0);
    expect(s.market.acquired).toEqual([]);
    expect(s.lifetime.eq(0)).toBe(true);
    expect(s.backlog.length).toBeGreaterThan(0);
    // The hacker types twice as much, and every exit doubles everything (the two trophies add 2%).
    const ratio = perTap(s, t.now).div(perTap(base.state, base.now)).toNumber();
    expect(ratio).toBeCloseTo(2 * FOUNDER.exitMul * 1.02);
    expect(perSecond(s, t.now).eq(0)).toBe(true);
  });

  it('survives a save and a reload', () => {
    const t = testGame((s) => {
      s.founder = { exits: 2, traits: ['operator', 'storyteller'] };
    });
    const back = deserialize(serialize(t.state, t.now), t.now)!;
    expect(back.founder).toEqual({ exits: 2, traits: ['operator', 'storyteller'] });
    expect(mods(back).starGain).toBeCloseTo(1.5);
    expect(mods(back).allMul).toBeCloseTo(FOUNDER.exitMul ** 2);
  });
});

describe('saves from before v0.7', () => {
  it('load with the new systems empty and the chart started', () => {
    const t = testGame((s) => {
      s.market.startedAt = 5;
      s.market.users = 1234;
    });
    const old = JSON.parse(serialize(t.state, t.now)) as Record<string, unknown>;
    old.v = 5;
    for (const key of ['infra', 'roadmap', 'rfc', 'pulls', 'rules', 'founder', 'contribBonus']) delete old[key];
    delete (old.market as Record<string, unknown>).history;
    const back = deserialize(JSON.stringify(old), t.now)!;
    expect(back.infra).toEqual({ live: [null, null, null, null, null, null], draft: [null, null, null, null, null, null], canDeploy: true, found: [] });
    expect(back.roadmap.focus).toBeNull();
    expect(back.rfc).toEqual({ active: null, done: [] });
    expect(back.rules).toEqual([]);
    expect(back.founder).toEqual({ exits: 0, traits: [] });
    expect(back.market.history).toEqual([{ at: t.now, users: 1234 }]);
    expect(back.settings.stackTint).toBe(true);
    expect(back.settings.scanlines).toBe(false);
  });

  it('keeps the new state through a round trip and throws out nonsense', () => {
    const t = testGame((s) => {
      s.round = 5;
      s.infra = { live: ['api', 'cache', null, null, null, null], draft: ['api', 'db', 'cache', null, null, null], canDeploy: false, found: ['threetier'] };
      s.roadmap = { shares: { dev: 0.5, biz: 0.25, fun: 0 }, focus: 'biz', shipped: { dev: 7, biz: 2, fun: 0 } };
      s.rfc = { active: { id: 'types', startedAt: 10, endsAt: 20 }, done: ['canary'] };
      s.pulls = { options: ['perf', 'core'], tier: 2 };
      s.rules = [{ when: 'flow', then: 'sudo', on: false }];
      s.contribBonus = 0.04;
      s.corp.ipoAt = 50;
      s.corp.monopolyAt = 99;
    });
    const back = deserialize(serialize(t.state, t.now), t.now)!;
    expect(back.infra).toEqual(t.state.infra);
    expect(back.roadmap).toEqual(t.state.roadmap);
    expect(back.rfc).toEqual(t.state.rfc);
    expect(back.pulls).toEqual(t.state.pulls);
    expect(back.rules).toEqual(t.state.rules);
    expect(back.contribBonus).toBe(0.04);
    expect(back.corp.monopolyAt).toBe(99);

    const bad = JSON.parse(serialize(t.state, t.now)) as Record<string, any>;
    bad.infra = { live: ['api', 'api', 'nope', 7], draft: 'x', found: ['threetier', 'made-up'] };
    bad.roadmap = { shares: { dev: 3, biz: 3, fun: -1 }, focus: 'nobody', shipped: { dev: -4 } };
    bad.rfc = { active: { id: 'canary' }, done: ['canary', 'canary', 'nope'] };
    bad.rules = [{ when: 'flow', then: 'explode' }, { when: 'debt', then: 'refactor' }];
    bad.pulls = { options: ['nope'], tier: 9 };
    const cleaned = deserialize(JSON.stringify(bad), t.now)!;
    expect(cleaned.infra.live).toEqual(['api', null, null, null, null, null]);
    expect(cleaned.infra.found).toEqual(['threetier']);
    expect(cleaned.roadmap.focus).toBeNull();
    expect(cleaned.roadmap.shares.dev + cleaned.roadmap.shares.biz + cleaned.roadmap.shares.fun).toBeCloseTo(1);
    expect(cleaned.rfc).toEqual({ active: null, done: ['canary'] });
    expect(cleaned.rules).toEqual([{ when: 'debt', then: 'refactor', on: true }]);
    expect(cleaned.pulls).toBeNull();
  });
});

describe('the users chart', () => {
  it('keeps a bounded history that still reaches back to the start', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.users = 10;
    });
    for (let i = 0; i < HISTORY.kept * 4; i++) {
      t.state.market.users = 10 + i;
      recordHistory(t.state, 1000 + i * HISTORY.everyMs);
    }
    const h = t.state.market.history;
    expect(h.length).toBeLessThanOrEqual(HISTORY.kept);
    expect(h[0].users).toBe(10);
    expect(h[h.length - 1].users).toBe(10 + HISTORY.kept * 4 - 1);
    // Not more than one sample a minute.
    const n = h.length;
    recordHistory(t.state, h[n - 1].at + 1000);
    expect(t.state.market.history.length).toBe(n);
  });
});

describe('fixes from review', () => {
  it('lets the hearing be called again after something else ended the fight', () => {
    const t = testGame((s) => nearMonopoly(s), fixedRng(0));
    const last = RIVALS[RIVALS.length - 1];
    t.game.acquire(last.id);
    expect(t.state.corp.hearing).toBe(last.id);
    // A major version (or anything else) clears the boss without a verdict.
    t.state.boss = null;
    t.advance(1000);
    t.game.tick();
    expect(t.state.corp.hearing).toBeNull();
    expect(t.state.corp.hearingRetryAt).toBe(0);
    t.game.acquire(last.id);
    expect(t.state.boss).toMatchObject({ kind: 'antitrust' });
  });

  it('gives a v0.6 save that already owned the chart its true ending', () => {
    const t = testGame((s) => {
      nearMonopoly(s);
      s.market.acquired = RIVALS.map((r) => r.id);
    });
    const old = JSON.parse(serialize(t.state, t.now)) as Record<string, any>;
    old.v = 5;
    delete old.corp.monopolyAt;
    const back = deserialize(JSON.stringify(old), t.now)!;
    expect(back.corp.monopolyAt).toBeGreaterThan(0);
    expect(back.corp.monopolySeen).toBe(false);
    // One short of the lot is not a monopoly.
    old.market.acquired = RIVALS.slice(1).map((r) => r.id);
    expect(deserialize(JSON.stringify(old), t.now)!.corp.monopolyAt).toBe(0);
  });

  it('fires "prod goes down" even when pager.yml fixes the outage at once', () => {
    const t = testGame((s) => {
      s.round = RULES.unlockRound;
      s.challengeLevels = { keyboard: 1 };
      s.challengesDone = ['keyboard'];
      s.scripts = { turbo: 2 };
      s.rules = [{ when: 'outage', then: 'turbo', on: true }];
    });
    t.game.tick();
    t.game.dev('incident', 'outage');
    expect(t.state.incident).toBeNull();
    expect(t.state.stats.outagesFixed).toBe(1);
    expect(t.state.stats.rulesFired).toBe(1);
    expect(t.state.scripts.turbo).toBe(1);
  });

  it('does not set a rule off with what another rule just did', () => {
    const t = testGame((s) => {
      s.round = RULES.unlockRound;
      s.unlocked.sprints = true;
      s.skills.shell = 1;
      s.scripts = { turbo: 5 };
      s.debt = 0;
      s.rules = [
        { when: 'sprint', then: 'turbo', on: true },
        { when: 'coffee', then: 'standup', on: true },
      ];
    });
    t.game.tick();
    // Starting a sprint by hand sets off the first rule once.
    t.game.startSprint(0);
    t.advance(200);
    t.game.tick();
    expect(t.state.stats.rulesFired).toBe(1);
    t.advance(200);
    t.game.tick();
    expect(t.state.stats.rulesFired).toBe(1);
  });

  it('starts a new company’s review counters from the stats it keeps', () => {
    const t = testGame((s) => {
      nearMonopoly(s);
      s.corp.monopolyAt = 5;
      s.stats.sprints = 400;
      s.stats.bugs = 900;
      s.stats.bugsEscaped = 30;
      s.stats.coffees = 50;
    });
    t.game.foundStartup('operator');
    expect(t.state.market.base).toEqual({ sprints: 400, bugs: 900, escaped: 30, incidents: 50 });
  });
});
