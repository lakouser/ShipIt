import { describe, expect, it } from 'vitest';
import { CORP, FUNDING, ISSUES, RIVALS, TESTS } from '../src/core/content';
import { acquirePrice, corpMultiplier, quarterRunRate, rivalsLeft } from '../src/core/corp';
import { coverage } from '../src/core/coverage';
import { debtPerMinute } from '../src/core/debt';
import { perSecond, perTap } from '../src/core/economy';
import type { GameEvent } from '../src/core/game';
import { STORY_MAIL, CHOICE_MAIL } from '../src/core/mail';
import { chart, chartMultiplier, reviewScore, rivalUsers, standing } from '../src/core/market';
import { mods } from '../src/core/mods';
import { D } from '../src/core/num';
import { deserialize, serialize } from '../src/core/save';
import { linesForStars, shippedForStars } from '../src/core/ship';
import { stackUnlocked } from '../src/core/stacks';
import { STACKS } from '../src/core/content';
import { fixedRng, testGame } from './helpers';

const MIN = 60_000;
const events = (t: ReturnType<typeof testGame>) => {
  const list: GameEvent[] = [];
  t.game.on((e) => list.push(e));
  return list;
};

describe('the test suite', () => {
  it('opens after the third ship and splits written code into tests', () => {
    const t = testGame((s) => (s.owned = { duck: 100 }));
    expect(t.game.setTestBudget(0.2)).toBe(false); // not open yet
    t.state.stats.ships = TESTS.unlockShips;
    t.game.tick();
    expect(t.state.unlocked.tests).toBe(true);
    expect(t.game.setTestBudget(0.15)).toBe(false); // not one of the options
    expect(t.game.setTestBudget(0.2)).toBe(true);

    const rate = perSecond(t.state, t.now).toNumber();
    const before = t.state.thisRelease.toNumber();
    t.advance(10_000);
    t.game.tick();
    expect(t.state.thisRelease.toNumber() - before).toBeCloseTo(rate * 10 * 0.8, 0); // tests don't count toward the release
    expect(t.state.tests.toNumber()).toBeCloseTo(rate * 10 * 0.2, 0);
    expect(coverage(t.state)).toBeCloseTo(0.2 * TESTS.leverage * (t.state.tests.div(t.state.written).toNumber() / 0.2), 5);
  });

  it('lifts the review, catches escaping bugs and slows tech debt', () => {
    const t = testGame((s) => {
      s.unlocked.tests = true;
      s.owned = { duck: 10 };
      s.lifetime = D(1e6);
      s.written = D(1000);
      s.tests = D(100); // 10% of the code, x3 = 30% coverage
    });
    expect(coverage(t.state)).toBeCloseTo(0.3);
    expect(reviewScore(t.state, 0.5)).toBe(3.6); // 2.5 + 0.75 + 0.3
    const debt = debtPerMinute(t.state, t.now);
    t.state.tests = D(0);
    expect(debtPerMinute(t.state, t.now)).toBeCloseTo(debt / (1 - TESTS.debtCut * 0.3));

    t.state.tests = D(1000); // over 100%: capped
    expect(coverage(t.state)).toBe(1);
    const caught = testGame((s) => {
      s.unlocked.tests = true;
      s.written = D(10);
      s.tests = D(10);
    }, fixedRng(0.5));
    const list = events(caught);
    caught.state.bug = { expiresAt: caught.now - 1 };
    caught.game.tick();
    expect(list.some((e) => e.type === 'bugCaught')).toBe(true);
    expect(caught.state.stats.bugsEscaped).toBe(0);
    expect(caught.state.stats.testsCaught).toBe(1);
  });

  it('starts again with every release, and the release log keeps the coverage', () => {
    const t = testGame((s) => {
      s.unlocked.tests = true;
      s.thisRelease = D(2e6);
      s.written = D(2e6);
      s.tests = D(1e5);
    });
    const r = t.game.ship()!;
    expect(r.coverage).toBeCloseTo(0.15);
    expect(t.state.releaseLog[0].coverage).toBeCloseTo(0.15);
    expect(t.state.tests.toNumber()).toBe(0);
    expect(coverage(t.state)).toBe(0);
  });
});

describe('user issues', () => {
  it('arrive every few minutes, playing or away, until the queue is full', () => {
    const t = testGame((s) => (s.market.peak = ISSUES.unlockUsers));
    t.game.tick();
    expect(t.state.unlocked.issues).toBe(true);
    t.advance(ISSUES.everyMinutes * MIN);
    t.game.tick();
    expect(t.state.issues.open.length).toBe(1);
    t.advance(3 * 3600_000); // three hours away
    t.game.tick();
    expect(t.state.issues.open.length).toBe(ISSUES.max);
  });

  it('close in one go, paying lines, debt, review and users by kind', () => {
    const t = testGame((s) => {
      s.unlocked.issues = true;
      s.owned = { duck: 100 };
      s.debt = 20;
      s.market.users = 1_000_000;
      s.issues.open = ['bug', 'bug', 'feature', 'feature', 'support'];
    });
    const lines = t.state.lines;
    const result = t.game.triage()!;
    expect(result.closed).toBe(5);
    expect(t.state.lines.gt(lines)).toBe(true);
    expect(t.state.debt).toBe(20 + 2 * ISSUES.bugDebt);
    expect(t.state.issues.reviewBoost).toBeCloseTo(0.2);
    expect(t.state.market.users).toBeCloseTo(1_000_000 * (1 + ISSUES.supportUsers));
    expect(t.state.issues.open).toEqual([]);
    expect(t.game.triage()).toBeNull();
    // Feature requests go into the next review, then start again.
    expect(reviewScore(t.state, 0.5)).toBe(3.5); // 2.5 + 0.75 + 0.2, to one decimal
    t.state.thisRelease = D(2e6);
    t.game.ship();
    expect(t.state.issues.reviewBoost).toBe(0);
  });
});

describe('stacks', () => {
  it('are picked at a funding round and change the rules for the whole run', () => {
    const t = testGame((s) => {
      s.stars = FUNDING.starsPerRound[0];
      s.owned = { duck: 10, kb: 10 };
    });
    const result = t.game.raise('go')!;
    expect(result.stack).toBe('go');
    expect(t.state.stack).toBe('go');
    expect(t.state.stacksUsed).toEqual(['ts', 'go']);
    t.state.owned = { duck: 10, kb: 10 };
    expect(mods(t.state).autoMul).toBe(1.75);
    expect(mods(t.state).tapMul).toBe(0.75);
    // Not given, or locked: the next run keeps the current stack.
    t.state.stars = FUNDING.starsPerRound[1];
    expect(t.game.raise('hs')!.stack).toBe('go');
  });

  it('unlock Haskell with the first major and COBOL with Legacy Systems Inc', () => {
    const t = testGame();
    const hs = STACKS.find((x) => x.id === 'hs')!;
    const cob = STACKS.find((x) => x.id === 'cob')!;
    expect(stackUnlocked(t.state, hs)).toBe(false);
    t.state.stats.majors = 1;
    expect(stackUnlocked(t.state, hs)).toBe(true);
    expect(stackUnlocked(t.state, cob)).toBe(false);
    t.state.market.acquired = ['legacy'];
    expect(stackUnlocked(t.state, cob)).toBe(true);
  });

  it('Haskell doubles coverage; COBOL halves churn', () => {
    const t = testGame((s) => {
      s.unlocked.tests = true;
      s.written = D(100);
      s.tests = D(10);
      s.stack = 'hs';
    });
    expect(coverage(t.state)).toBeCloseTo(0.6);
    t.state.stack = 'cob';
    expect(mods(t.state).churnMul).toBe(0.5);
  });
});

describe('the IPO and quarters', () => {
  /** A company one round from the IPO, with users. */
  const preIpo = () =>
    testGame((s) => {
      s.round = FUNDING.maxRounds - 1;
      s.stars = FUNDING.starsPerRound[FUNDING.maxRounds - 1];
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1;
      s.market.users = 1e9;
      s.market.peak = 1e9;
    });

  it('the IPO starts the first quarter, with guidance from the users', () => {
    const t = preIpo();
    const r = t.game.raise()!;
    expect(r.ipo).toBe(true);
    expect(t.state.corp.ipoAt).toBe(t.now);
    expect(t.state.corp.quarter).toBe(1);
    expect(t.state.corp.guidance).toBeCloseTo(quarterRunRate(t.state) * CORP.firstGuidance);
    expect(t.state.corp.endingSeen).toBe(false);
  });

  it('a quarter is twenty minutes of play; beating guidance lifts the stock and output', () => {
    const t = preIpo();
    t.game.raise();
    const list = events(t);
    const output = corpMultiplier(t.state);
    for (let i = 0; i < CORP.quarterMinutes * 60; i++) {
      t.advance(1000);
      t.game.tick();
    }
    const q = list.find((e) => e.type === 'quarter');
    expect(q && q.type === 'quarter' && q.report.beat).toBe(true); // flat users beat guidance set at 90%
    expect(t.state.corp.quarter).toBe(2);
    expect(t.state.corp.beats).toBe(1);
    expect(t.state.corp.streak).toBe(1);
    expect(t.state.corp.stock).toBeGreaterThan(100);
    expect(t.state.corp.cash).toBeGreaterThan(0);
    expect(corpMultiplier(t.state)).toBeCloseTo(output + CORP.beatBonus);
    // The board wants growth: flat users miss the next one.
    expect(t.state.corp.guidance).toBeGreaterThan(quarterRunRate(t.state));
    for (let i = 0; i < CORP.quarterMinutes * 60; i++) {
      t.advance(1000);
      t.game.tick();
    }
    expect(t.state.corp.reports[0].beat).toBe(false);
    expect(t.state.corp.streak).toBe(0);
    expect(t.state.corp.beats).toBe(1);
  });

  it('time away brings in cash at the offline rate but does not run the clock', () => {
    const t = preIpo();
    t.game.raise();
    t.advance(3 * 3600_000);
    t.game.tick();
    expect(t.state.corp.quarter).toBe(1);
    expect(t.state.corp.elapsed).toBe(0);
    expect(t.state.corp.cash).toBeGreaterThan(0);
  });

  it('acquisitions take rivals off the chart, add their users and get dearer', () => {
    const t = preIpo();
    t.game.raise();
    expect(t.game.acquire('hello')).toBeNull(); // no cash yet
    const price = acquirePrice(t.state, RIVALS[0], t.now);
    t.state.corp.cash = price * 10;
    const users = t.state.market.users;
    const rivalCount = chart(t.state, t.now).length;
    const output = chartMultiplier(t.state, t.now);
    const a = t.game.acquire('hello')!;
    expect(a.users).toBeCloseTo(rivalUsers(t.state, RIVALS[0], t.now) * CORP.keepUsers);
    expect(t.state.market.users).toBeCloseTo(users + a.users);
    expect(chart(t.state, t.now).length).toBe(rivalCount - 1);
    expect(chartMultiplier(t.state, t.now)).toBe(output); // still counted as behind you
    expect(rivalsLeft(t.state).some((r) => r.id === 'hello')).toBe(false);
    expect(t.game.acquire('hello')).toBeNull();
    const foo = RIVALS[1];
    expect(acquirePrice(t.state, foo, t.now)).toBeCloseTo((rivalUsers(t.state, foo, t.now) * CORP.pricePerUser * CORP.acquireGrowth) / (t.state.corp.stock / 100));
  });

  it('with every rival bought, the chart is just you and drifting users simply leave', () => {
    const t = preIpo();
    t.game.raise();
    t.state.market.acquired = RIVALS.map((r) => r.id);
    expect(chart(t.state, t.now).length).toBe(1);
    expect(standing(t.state, t.now).rank).toBe(1);
    t.state.market.quietMinutes = 600;
    t.state.thisRelease = D(2e6);
    expect(() => t.game.ship()).not.toThrow();
    t.state.market.nextLaunchAt = 0;
    expect(() => t.game.tick()).not.toThrow();
    expect(t.state.market.launch).toBeNull();
  });

  it('a save that went public before quarters existed starts its first quarter on load', () => {
    const old = testGame((s) => {
      s.round = FUNDING.maxRounds;
      s.market.users = 1e6;
    });
    expect(old.state.corp.ipoAt).toBe(old.now);
    expect(old.state.corp.quarter).toBe(1);
  });
});

describe('workflows from challenges', () => {
  it('forks.yml picks package upgrades by policy', () => {
    const t = testGame((s) => {
      s.challengeLevels = { legacy: 1 };
      s.owned = { duck: 50, kb: 25 };
    });
    t.game.tick();
    expect(t.state.forks).toEqual({ duck: ['plugin', 'lts'], kb: ['plugin'] });
    t.game.setForkPolicy('major');
    t.state.owned.kb = 50;
    t.game.tick();
    expect(t.state.forks.kb).toEqual(['plugin', 'major']);
  });

  it('dotfiles.yml buys the cheapest dotfile it can afford', () => {
    const t = testGame((s) => {
      s.challengeLevels = { clean: 1 };
      s.stars = 3;
    });
    t.game.tick();
    expect(t.state.starsSpent).toBe(3); // vimrc 1, team.yml 1, cache.conf 1
    expect(t.state.perks).toEqual({ vimrc: 1, team: 1, cache: 1 });
  });

  it('pager.yml fixes outages; triage.yml closes issues as they come in; standup.yml starts sprints', () => {
    const t = testGame((s) => {
      s.challengeLevels = { keyboard: 1, cidown: 1, solo: 1 };
      s.lifetime = D(1e6);
      s.unlocked.sprints = true;
      s.unlocked.issues = true;
      s.owned = { duck: 1000 };
    });
    t.game.dev('incident', 'outage');
    expect(t.state.incident).toBeNull();
    expect(t.state.stats.outagesFixed).toBe(1);
    t.state.issues.nextAt = t.now - 1;
    t.game.tick();
    expect(t.state.issues.open).toEqual([]);
    expect(t.state.stats.issuesClosed).toBe(1);
    expect(t.state.sprint).not.toBeNull(); // automation alone can finish it
  });

  it('release.yml ships as the project last picked by hand', () => {
    const t = testGame((s) => {
      s.stats.ships = 15;
      s.release = 3;
      s.thisRelease = D(2e6);
    });
    t.game.ship('game');
    expect(t.state.preferredProject).toBe('game');
    t.state.project = 'webapp'; // a funding round or major version starts on the web app
    t.state.stars = 8;
    t.state.shipped = shippedForStars(8);
    t.state.thisRelease = linesForStars(t.state, 8);
    t.game.tick();
    expect(t.state.project).toBe('game');
  });
});

describe('saves', () => {
  it('migrate v4 saves: the language becomes the stack, challenges count as cleared once', () => {
    const v4 = { v: 4, round: 2, challengesDone: ['legacy', 'solo'], streak: { activity: { '2026-11-20': 5, '2026-11-02': 9 } }, savedAt: 5 };
    const back = deserialize(JSON.stringify(v4), 0)!;
    expect(back.stack).toBe('go'); // round 2 was written in Go
    expect(back.stacksUsed).toEqual(['go']);
    expect(back.challengeLevels).toEqual({ legacy: 1, solo: 1 });
    expect(back.createdAt).toBe(new Date('2026-11-02T00:00:00').getTime());
    expect(back.preferredProject).toBeNull();
    expect(back.corp.ipoAt).toBe(0);
  });

  it('keep the new systems', () => {
    const t = testGame((s) => {
      s.stack = 'rs';
      s.stacksUsed = ['ts', 'rs'];
      s.testBudget = 0.2;
      s.tests = D(5);
      s.written = D(50);
      s.issues = { open: ['bug', 'support'], nextAt: 123, reviewBoost: 0.3 };
      s.corp = { ipoAt: 9, endingSeen: true, quarter: 4, elapsed: 30, revenue: 7, guidance: 8, cash: 99, stock: 140, beats: 2, streak: 1, reports: [{ quarter: 3, revenue: 1, guidance: 2, beat: false, stock: 90, at: 4 }] };
      s.market.acquired = ['hello', 'nobody'];
      s.challengeLevels = { legacy: 3 };
      s.challengeBest = { legacy: 600 };
      s.forkPolicy = 'major';
      s.preferredProject = 'os';
    });
    const back = deserialize(serialize(t.state, 0), 0)!;
    expect([back.stack, back.testBudget, back.forkPolicy, back.preferredProject]).toEqual(['rs', 0.2, 'major', 'os']);
    expect(back.stacksUsed).toEqual(['ts', 'rs']);
    expect(back.tests.toNumber()).toBe(5);
    expect(back.issues).toEqual({ open: ['bug', 'support'], nextAt: 123, reviewBoost: 0.3 });
    expect(back.corp).toEqual(t.state.corp);
    expect(back.market.acquired).toEqual(['hello']);
    expect(back.challengeLevels).toEqual({ legacy: 3 });
    expect(back.challengeBest).toEqual({ legacy: 600 });
  });
});

describe('content', () => {
  it('gives every mail a unique id, and sends the new story', () => {
    const ids = [...STORY_MAIL, ...CHOICE_MAIL].map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const t = testGame((s) => {
      s.unlocked.mail = true;
      s.round = FUNDING.maxRounds;
      s.mailSeen = STORY_MAIL.map((m) => m.id).filter((id) => id !== 'ipo');
    });
    t.game.tick();
    expect(t.state.mail.some((m) => m.id === 'ipo')).toBe(true);
  });

  it('keeps every stack in one place with rules to show', () => {
    for (const st of STACKS) expect(st.rules.length).toBeGreaterThan(0);
    const t = testGame((s) => (s.owned = { kb: 1 }));
    t.state.stack = 'py';
    expect(perTap(t.state, t.now).toNumber()).toBeCloseTo(2 * 1.4); // base tap plus a keyboard, x1.4
  });
});
