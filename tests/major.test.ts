import { describe, expect, it } from 'vitest';
import { FUNDING, MAJOR } from '../src/core/content';
import { perSecond, perTap } from '../src/core/economy';
import { challengeGoal, starsForNextXp, xpAvailable, xpForStars } from '../src/core/major';
import { mods } from '../src/core/mods';
import { D } from '../src/core/num';
import { deserialize, serialize } from '../src/core/save';
import { linesForStars, starsAvailable } from '../src/core/ship';
import { testGame } from './helpers';

const K = MAJOR.starsPerXp;
const IPO = MAJOR.unlockRound; // majors open at Series B

describe('versions', () => {
  it('count releases as v{major}.{minor}, through funding rounds', () => {
    const t = testGame((s) => (s.thisRelease = D(2_000_000)));
    expect(t.game.ship()?.version).toBe('0.1');
    expect(t.state.releaseLog[0].version).toBe('0.1');
    expect([t.state.major, t.state.minor, t.state.release, t.state.stats.ships]).toEqual([0, 1, 2, 1]);
    t.state.stars = 150;
    t.game.raise();
    expect([t.state.minor, t.state.release]).toEqual([1, 1]); // a round restarts releases, not the version
  });
});

describe('major versions', () => {
  it('open at Series B and pay XP on a cube-root curve of stars banked, counting the release in progress', () => {
    expect([K - 1, K, 8 * K - 1, 8 * K, 27 * K].map(xpForStars)).toEqual([0, 1, 1, 2, 3]);
    const early = testGame((s) => (s.stars = 2 * K));
    expect(xpAvailable(early.state)).toBe(0); // before Series B
    const t = testGame((s) => {
      s.round = IPO;
      s.stars = 0.9 * K;
    });
    expect(xpAvailable(t.state)).toBe(0);
    t.state.thisRelease = linesForStars(t.state, 0.2 * K);
    expect(xpAvailable(t.state)).toBe(1);
    expect(starsForNextXp(t.state)).toBe(8 * K);
  });

  it('bank the stars for XP and start the next major, keeping funding and equity', () => {
    const t = testGame((s) => {
      s.round = IPO;
      s.equity = 12;
      s.company = { brand: 2 };
      s.stars = 1.5 * K;
      s.starsSpent = 300;
      s.perks = { vimrc: 5 };
      s.shipped = D(1e15);
      s.release = 12;
      s.minor = 40;
      s.owned = { duck: 50 };
      s.lines = D(1e9);
      s.achievements = ['hello'];
      s.questBonus.tap = 0.5;
      s.workflows.deps = false;
    });
    expect(t.game.cutMajor()?.xp).toBe(1);
    expect([t.state.major, t.state.minor, t.state.release, t.state.xp, t.state.banked, t.state.stats.majors]).toEqual([1, 0, 1, 1, 1.5 * K, 1]);
    expect([t.state.stars, t.state.starsSpent]).toEqual([0, 0]);
    expect(t.state.perks).toEqual({});
    expect(t.state.shipped.toNumber()).toBe(0);
    expect(t.state.owned).toEqual({});
    expect(t.state.lines.toNumber()).toBe(0);
    expect(t.state.releaseLog[0]).toMatchObject({ version: '1.0', xp: 1 });
    // kept
    expect([t.state.round, t.state.equity, t.state.company.brand]).toEqual([IPO, 12, 2]);
    expect(t.state.achievements).toEqual(['hello']);
    expect(t.state.questBonus.tap).toBe(0.5);
    expect(t.state.workflows.deps).toBe(false);
    expect(t.game.cutMajor()).toBeNull();
  });

  it('multiply stars from shipping by 1 + 0.5 per XP', () => {
    const t = testGame((s) => {
      s.xp = 2;
      s.thisRelease = D(2_000_000);
    });
    expect(mods(t.state).starGain).toBe(2);
    expect(starsAvailable(t.state)).toBe(4);
    const half = testGame((s) => {
      s.xp = 1;
      s.shipped = D(16_000_000);
    });
    for (let n = 1; n <= 6; n++) {
      const needed = linesForStars(half.state, n);
      half.state.thisRelease = needed;
      expect(starsAvailable(half.state)).toBeGreaterThanOrEqual(n);
      half.state.thisRelease = needed.sub(1);
      expect(starsAvailable(half.state)).toBeLessThan(n);
    }
  });
});

describe('skills', () => {
  it('cost XP and change the game', () => {
    const t = testGame((s) => {
      s.xp = 10;
      s.owned = { duck: 10 };
      s.round = IPO;
    });
    const before = perSecond(t.state, t.now).toNumber();
    expect(t.game.buySkill('tenx')).toBe(true);
    expect(t.game.buySkill('tenx')).toBe(true); // 1 + 2 XP
    expect(t.state.xpSpent).toBe(3);
    expect(perSecond(t.state, t.now).toNumber()).toBeCloseTo(before * 4);
    expect(t.game.buySkill('muscle')).toBe(true);
    expect(t.game.buySkill('headstart')).toBe(true);
    expect(t.game.buySkill('pairing')).toBe(true);
    expect(t.state.xpSpent).toBe(8);
    expect(mods(t.state).starGain).toBeCloseTo(1.25 * 6); // pairing x1.25, 10 XP x6
    expect(t.game.buySkill('muscle')).toBe(false); // maxed

    t.state.stars = 2000 * K;
    t.state.perks = { vimrc: 3 };
    t.state.starsSpent = 6;
    t.game.cutMajor();
    expect(t.state.perks).toEqual({ vimrc: 3 }); // muscle memory
    expect(t.state.starsSpent).toBe(0);
    expect(t.state.stars).toBe(25); // head start
  });
});

describe('challenge releases', () => {
  const afterFirstMajor = () =>
    testGame((s) => {
      s.major = 1;
      s.round = IPO;
      s.stars = 40;
      s.shipped = D(1e12);
      s.owned = { duck: 10 };
      s.thisRelease = D(5e11);
      s.lines = D(5e11);
    });

  it('unlock with the first major version and restart the release under a restriction', () => {
    const locked = testGame();
    expect(locked.game.startChallenge('cidown')).toBe(false);
    const fresh = testGame((s) => (s.major = 1));
    expect(fresh.game.startChallenge('cidown')).toBe(false); // nothing shipped this run yet
    fresh.state.shipped = D(2e9); // 20 on this run's curve
    expect(fresh.game.startChallenge('cidown')).toBe(true);
    expect(fresh.state.challenge?.goal.toNumber()).toBeCloseTo(2e6 * 12.5 ** 3 - 2e9, -3);

    const t = afterFirstMajor();
    const goal = challengeGoal(t.state);
    expect(t.game.startChallenge('cidown')).toBe(true);
    expect(t.state.challenge?.goal.eq(goal)).toBe(true);
    expect(t.state.thisRelease.toNumber()).toBe(0);
    t.state.owned = { duck: 10 };
    const ipo = FUNDING.outputPerRound ** IPO;
    expect(perSecond(t.state, t.now).toNumber()).toBeCloseTo(10 * 0.1 * 5 * ipo); // 10 ducks, x0.1, x5 from 40 stars, funding
    expect(t.game.startChallenge('legacy')).toBe(false); // one at a time
  });

  it('pay a permanent reward when the release ships with the goal met', () => {
    const t = afterFirstMajor();
    t.game.startChallenge('cidown');
    t.state.thisRelease = t.state.challenge!.goal.sub(1);
    expect(t.game.ship()?.challenge).toEqual({ id: 'cidown', done: false });
    expect(t.state.challengesDone).toEqual([]);
    t.game.startChallenge('cidown');
    t.state.thisRelease = t.state.challenge!.goal;
    expect(t.game.ship()?.challenge).toEqual({ id: 'cidown', done: true });
    expect(t.state.challengesDone).toEqual(['cidown']);
    expect(mods(t.state).autoMul).toBe(1.5);
    expect(t.game.startChallenge('cidown')).toBe(false);
  });

  it('Solo dev hides the later packages; Clean install switches dotfiles off without losing them', () => {
    const t = afterFirstMajor();
    t.game.startChallenge('solo');
    t.state.lines = D(1e15);
    expect(t.game.buy('ci')).not.toBeNull(); // 4th automation package
    expect(t.game.buy('pair')).toBeNull(); // 5th
    t.game.abandonChallenge();
    expect(t.state.challenge).toBeNull();

    t.state.perks = { team: 4 };
    t.state.owned = { duck: 10 };
    const withPerks = perSecond(t.state, t.now).toNumber();
    t.game.startChallenge('clean');
    t.state.owned = { duck: 10 };
    expect(perSecond(t.state, t.now).toNumber()).toBeCloseTo(withPerks / 2); // team.yml +100% gone
    expect(t.state.perks).toEqual({ team: 4 });
    expect(perTap(t.state, t.now).toNumber()).toBeGreaterThan(0);
  });
});

describe('saves', () => {
  it('keep major-version progress and migrate v0.3 saves onto the new curve and versions', () => {
    const t = testGame((s) => {
      s.major = 2;
      s.minor = 3;
      s.xp = 4;
      s.xpSpent = 1;
      s.banked = 64 * K;
      s.skills = { tenx: 1 };
      s.challenge = { id: 'solo', goal: D('1e20') };
      s.challengesDone = ['legacy'];
    });
    const back = deserialize(serialize(t.state, 0), 0)!;
    expect([back.major, back.minor, back.xp, back.xpSpent, back.banked]).toEqual([2, 3, 4, 1, 64 * K]);
    expect(back.skills).toEqual({ tenx: 1 });
    expect(back.challenge?.goal.eq(D('1e20'))).toBe(true);
    expect(back.challengesDone).toEqual(['legacy']);

    const v3 = { v: 3, release: 12, stars: 50, round: 2, equity: 5 };
    const old = deserialize(JSON.stringify(v3), 0)!;
    expect([old.major, old.minor, old.stats.ships, old.stats.starsEarned]).toEqual([0, 11, 11, 50]);
    expect([old.round, old.equity, old.stars]).toEqual([2, 5, 50]);
    expect(old.releaseStartedAt).toBe(-1);
    expect(starsAvailable(old)).toBe(0);
  });
});
