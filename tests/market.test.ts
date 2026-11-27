import { describe, expect, it } from 'vitest';
import { FUNDING, MAJOR, MARKET, RIVALS } from '../src/core/content';
import type { GameEvent } from '../src/core/game';
import { chart, chartMultiplier, churnShare, reviewScore, rivalUsers, standing, usersFromRelease, usersNow } from '../src/core/market';
import { D } from '../src/core/num';
import { deserialize, serialize } from '../src/core/save';
import { testGame } from './helpers';

const MIN = 60_000;
const events = (t: ReturnType<typeof testGame>) => {
  const list: GameEvent[] = [];
  t.game.on((e) => list.push(e));
  return list;
};

describe('reviews', () => {
  it('score size and polish', () => {
    const t = testGame();
    expect(reviewScore(t.state, 0.5)).toBe(3.3); // 2.5 + 0.75
    expect(reviewScore(t.state, 0.05)).toBe(2.6); // a tiny release
    expect(reviewScore(t.state, Infinity)).toBe(4); // first stars count as a full-size release
    t.state.stats.sprints = 1;
    t.state.stats.bugs = 2;
    expect(reviewScore(t.state, 1)).toBe(4.5); // 2.5 + 1.5 + 0.3 + 0.2
    t.state.stats.bugsEscaped = 4;
    expect(reviewScore(t.state, 1)).toBe(3.7); // -0.8 for escaped bugs
    t.state.stats.sprints = 3;
    t.state.stats.coffees = 2;
    t.state.stats.bugsEscaped = 0;
    expect(reviewScore(t.state, 1)).toBe(5); // polish is capped at +1
  });

  it('only count what happened during this release', () => {
    const t = testGame((s) => {
      s.stats.sprints = 10;
      s.thisRelease = D(2e6);
    });
    t.game.ship();
    expect(t.state.market.base.sprints).toBe(10);
    expect(reviewScore(t.state, 0.5)).toBe(3.3);
  });
});

describe('users', () => {
  it('arrive with each release, by its size and review', () => {
    const t = testGame((s) => (s.thisRelease = D(16e6)));
    const list = events(t);
    t.game.ship();
    const reviewed = list.find((e) => e.type === 'reviewed');
    expect(reviewed).toBeDefined();
    const news = reviewed!.type === 'reviewed' ? reviewed!.news : null;
    expect(news!.newUsers).toBe(usersFromRelease(D(16e6), news!.review));
    expect(t.state.market.users).toBe(news!.newUsers);
    expect(t.state.market.startedAt).toBe(t.now);
    expect(t.state.market.press).toHaveLength(1);
    t.game.tick();
    expect(t.state.unlocked.market).toBe(true);
  });

  it('drift to the rival above after a quiet spell, at most half of them', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1_000_000;
      s.market.users = 100_000;
    });
    t.state.market.quietMinutes = 44;
    expect(churnShare(t.state)).toBe(0);
    t.state.market.quietMinutes = 24 * 60;
    expect(churnShare(t.state)).toBe(MARKET.maxChurn);
    t.state.market.quietMinutes = 105;
    expect(churnShare(t.state)).toBeCloseTo(1 - 0.99 ** 60);
    const lost = 100_000 - usersNow(t.state);
    const above = RIVALS.find((r) => r.id === 'bar')!; // 200k: the nearest rival above 55k users
    const row = chart(t.state, t.now).find((r) => r.id === 'bar')!;
    expect(row.users).toBeCloseTo(rivalUsers(t.state, above, t.now) + lost);
  });

  it('count quiet time in full while playing and at 35% while away', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1_000_000;
      s.market.users = 100_000;
      s.market.nextLaunchAt = Infinity;
    });
    for (let i = 0; i < 30; i++) {
      t.advance(2000);
      t.game.tick(); // a minute of play, in normal ticks
    }
    expect(t.state.market.quietMinutes).toBeCloseTo(1);
    t.advance(100 * MIN); // the game was closed
    t.game.tick();
    expect(t.state.market.quietMinutes).toBeCloseTo(1 + 100 * MARKET.awayChurnRate);
    expect(churnShare(t.state)).toBe(0); // 18.5 quiet minutes: still inside the 45-minute grace
    t.game.creditTimeAway(10 * 3600); // a night away costs at most a quarter of the users
    expect(churnShare(t.state)).toBeCloseTo(MARKET.awayMaxChurn);
    t.state.market.quietMinutes += 600; // ten more hours idling in the game: up to half
    expect(churnShare(t.state)).toBe(MARKET.maxChurn);
    t.game.creditTimeAway(3600); // going away after that never brings users back
    expect(churnShare(t.state)).toBe(MARKET.maxChurn);
  });

  it('settle on the next release, and a well-reviewed one wins half of them back', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1_000_000;
      s.market.users = 100_000;
      s.stats.sprints = 3; // polish for a 4+ review
    });
    t.state.market.quietMinutes = 105;
    const lost = 100_000 - usersNow(t.state);
    t.state.thisRelease = D(16e6);
    const list = events(t);
    t.game.ship();
    const news = list.find((e) => e.type === 'reviewed');
    if (news?.type !== 'reviewed') throw new Error('no review');
    expect(news.news.review).toBeGreaterThanOrEqual(4);
    expect(news.news.lost).toBeCloseTo(lost);
    expect(news.news.regained).toBeCloseTo(lost / 2);
    expect(t.state.market.absorbed.bar).toBeCloseTo(lost / 2);
    expect(t.state.market.users).toBeCloseTo(100_000 - lost / 2 + news.news.newUsers);
    expect(churnShare(t.state)).toBe(0);
    expect(t.state.market.quietMinutes).toBe(0);
  });

  it('notice a quiet spell once, and a major version counts as an update', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1_000_000;
      s.market.users = 100_000;
      s.market.nextLaunchAt = Infinity;
      s.round = FUNDING.maxRounds;
      s.stars = MAJOR.starsPerXp;
    });
    const list = events(t);
    t.state.market.quietMinutes = 46;
    t.game.tick();
    t.advance(1000);
    t.game.tick();
    expect(list.filter((e) => e.type === 'market' && e.news.kind === 'stale')).toHaveLength(1);
    t.game.cutMajor();
    expect(t.state.market.lastUpdateAt).toBe(t.now);
    expect(t.state.market.quietMinutes).toBe(0);
    expect(t.state.market.users).toBeLessThan(100_000);
    expect(list.some((e) => e.type === 'news')).toBe(true);
  });
});

describe('funding rounds', () => {
  it('make the news, keep users and restart the star curve', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1_000_000;
      s.market.users = 100_000;
      s.stars = 150;
      s.shipped = D(1e12);
    });
    const list = events(t);
    expect(t.game.raise()).not.toBeNull();
    expect(t.state.market.users).toBe(100_000);
    expect(t.state.shipped.toNumber()).toBe(0);
    expect(list.some((e) => e.type === 'news' && e.headline.text.includes('Seed'))).toBe(true);
  });
});

describe('the chart', () => {
  it('pays +5% output per rival behind, and a first overtake drops scripts', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1_000_000;
      s.market.users = 40_000; // ahead of Hello World and Foo Corp
      s.scripts = {};
    });
    expect(standing(t.state, t.now)).toEqual({ rank: RIVALS.length - 1, behind: 2 });
    expect(chartMultiplier(t.state, t.now)).toBeCloseTo(1.1);
    t.state.thisRelease = D(2e18); // enough users to pass BarSoft
    const list = events(t);
    t.game.ship();
    expect(t.state.market.passed).toContain('bar');
    const scripts = Object.values(t.state.scripts).reduce((a, b) => a + (b ?? 0), 0);
    expect(scripts).toBeGreaterThanOrEqual(MARKET.overtakeScripts);
    const reviewed = list.find((e) => e.type === 'reviewed');
    expect(reviewed?.type === 'reviewed' && reviewed.news.headlines.some((h) => h.text.includes('overtakes'))).toBe(true);
  });

  it('runs rival launches: ship first to steal the headline, or the rival grows', () => {
    const t = testGame((s) => {
      s.market.startedAt = 1;
      s.market.lastUpdateAt = 1_000_000;
      s.market.users = 10_000;
      s.market.nextLaunchAt = 1_000_000;
    });
    t.game.tick();
    const launch = t.state.market.launch!;
    expect(launch.rival).toBe('foo'); // the rival just above
    t.state.thisRelease = D(16e6);
    const list = events(t);
    t.game.ship();
    const news = list.find((e) => e.type === 'reviewed');
    if (news?.type !== 'reviewed') throw new Error('no review');
    expect(news.news.stole?.id).toBe('foo');
    expect(news.news.newUsers).toBe(Math.floor(usersFromRelease(D(16e6), news.news.review) * MARKET.launch.stealMul));
    expect(t.state.stats.steals).toBe(1);
    expect(t.state.market.launch).toBeNull();

    t.state.market.nextLaunchAt = t.now;
    t.game.tick();
    const rival = RIVALS.find((r) => r.id === t.state.market.launch!.rival)!;
    const before = rivalUsers(t.state, rival, t.now);
    t.advance(MARKET.launch.warningMs + 1);
    t.game.tick();
    expect(rivalUsers(t.state, rival, t.now)).toBeGreaterThan(before * 1.04);
  });
});

describe('app name and saves', () => {
  it('renames the app safely and keeps the market in the save', () => {
    const t = testGame();
    expect(t.game.renameApp('  <b>todo-list</b> 2  ')).toBe('btodo-listb 2');
    expect(t.game.renameApp('!!!')).toBe(MARKET.defaultName);
    t.state.market = { ...t.state.market, appName: 'shiply', users: 1234, peak: 2000, startedAt: 5, lastUpdateAt: 6, reviews: [4.2, 3.1], absorbed: { foo: 50 }, passed: ['hello'], rank: 14, launch: { rival: 'foo', endsAt: 99 }, press: [{ at: 1, outlet: '/dev/news', text: 'hi' }] };
    const back = deserialize(serialize(t.state, 0), 0)!;
    expect(back.market).toMatchObject({ appName: 'shiply', users: 1234, peak: 2000, reviews: [4.2, 3.1], absorbed: { foo: 50 }, passed: ['hello'], launch: { rival: 'foo', endsAt: 99 } });
    expect(back.market.press[0].text).toBe('hi');

    const older = JSON.parse(serialize(t.state, 0));
    delete older.market.quietMinutes;
    older.market.lastUpdateAt = 1_000_000;
    older.savedAt = 1_000_000 + 30 * MIN;
    expect(deserialize(JSON.stringify(older), 0)!.market.quietMinutes).toBeCloseTo(30);
  });
});
