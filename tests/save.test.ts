import { describe, expect, it } from 'vitest';
import { D } from '../src/core/num';
import { deserialize, exportSave, importSave, SAVE_VERSION, serialize } from '../src/core/save';
import { ship, starsAvailable, starsForShipped, starsPerMinute } from '../src/core/ship';
import { newGame } from '../src/core/state';

describe('saves', () => {
  it('round-trips the state, including numbers far past 1e308', () => {
    const s = newGame(0);
    s.lines = D('1.5e500');
    s.lifetime = D('3e900');
    s.owned = { kb: 12, duck: 30 };
    s.stars = 4;
    s.starsSpent = 2;
    s.perks = { vimrc: 2 };
    s.release = 3;
    s.achievements = ['hello', 'ship'];
    s.scripts = { turbo: 2, sudo: 1 };
    s.questBonus.tap = 0.04;
    s.streak = { lastDay: '2026-11-25', count: 3, days: ['2026-11-23', '2026-11-24', '2026-11-25'] };
    s.settings.buyAmount = 'max';
    s.settings.skin = 'amber';
    s.settings.tab = 'ship';
    s.shipped = D('4.2e40');
    s.releaseStartedAt = 777;
    s.releasePeak = 1.5;
    s.releaseLog = [{ release: 3, lines: D('2e40'), stars: 3, seconds: 95.5, at: 600 }];
    const back = deserialize(serialize(s, 1234), 5000)!;
    expect(back.lines.eq(s.lines)).toBe(true);
    expect(back.lifetime.eq(s.lifetime)).toBe(true);
    expect(back.owned).toEqual({ kb: 12, duck: 30 });
    expect(back.perks).toEqual({ vimrc: 2 });
    expect(back.starsSpent).toBe(2);
    expect(back.scripts).toEqual({ turbo: 2, sudo: 1 });
    expect(back.questBonus.tap).toBe(0.04);
    expect(back.streak.count).toBe(3);
    expect(back.settings.skin).toBe('amber');
    expect(back.settings.tab).toBe('ship');
    expect(back.savedAt).toBe(1234);
    expect(back.shipped.eq(s.shipped)).toBe(true);
    expect(back.releaseStartedAt).toBe(777);
    expect(back.releasePeak).toBe(1.5);
    expect(back.releaseLog).toHaveLength(1);
    expect(back.releaseLog[0].lines.eq(D('2e40'))).toBe(true);
    expect(back.releaseLog[0]).toMatchObject({ release: 3, stars: 3, seconds: 95.5, at: 600 });
  });

  it('migrates a version 2 save onto the shipped-lines star curve without losing stars', () => {
    const v2 = { v: 2, lines: '500', lifetime: '9e12', thisRelease: '3000000', stars: 20, starsSpent: 15, release: 9 };
    const back = deserialize(JSON.stringify(v2), 0)!;
    expect(back.stars).toBe(20);
    expect(back.starsSpent).toBe(15);
    // The curve starts where the player's stars are: 20 stars ↔ 2B lines shipped.
    expect(back.shipped.toNumber()).toBeCloseTo(2e9, -3);
    expect(starsForShipped(back.shipped)).toBe(20);
    // 3M more lines on top of 2B adds nothing yet; the old curve would have paid 1 star.
    expect(starsAvailable(back)).toBe(0);
    expect(back.releaseLog).toEqual([]);
    // The release in progress began before releases were timed: no made-up duration or rate.
    expect(back.releaseStartedAt).toBe(-1);
    expect(starsPerMinute(back, 10 * 60_000)).toBe(0);
    back.thisRelease = D(2e10);
    const ship1 = ship(back, 10 * 60_000, () => 0.5)!;
    expect(ship1.stars).toBe(24); // 2B + 20B shipped: 2·cbrt(11000) = 44.5
    expect(ship1.seconds).toBeNull();
    expect(back.releaseLog[0].seconds).toBeNull();
    expect(back.releaseStartedAt).toBe(10 * 60_000); // the next release is timed
    const again = deserialize(serialize(back, 0), 0)!;
    expect(again.releaseLog[0].seconds).toBeNull();
  });

  it('keeps an active sprint, the backlog, tasks and the milestone', () => {
    const s = newGame(0);
    const ticket = { tier: 1, id: 'TKT-123', title: 'Make the logo bigger', durationS: 40, target: D(500), reward: D(1100), readyAt: 0 };
    s.backlog = [ticket];
    s.sprint = { ...ticket, slot: 0, endsAt: 99_000, progress: D(120) };
    s.quests = [{ template: 'taps', target: '200', baseline: '10', reward: { kind: 'script', script: 'nightly' } }];
    s.milestone = { release: 1, stars: 1, done: false, tasks: [{ kind: 'lines', target: '50000', baseline: '0' }] };
    const back = deserialize(serialize(s, 0), 0)!;
    expect(back.backlog[0].target.toNumber()).toBe(500);
    expect(back.sprint?.progress.toNumber()).toBe(120);
    expect(back.quests[0]).toEqual(s.quests[0]);
    expect(back.milestone).toEqual(s.milestone);
  });

  it('migrates a version 1 save', () => {
    const v1 = { v: 1, lines: '500', lifetime: '9000', thisRelease: '9000', owned: { kb: 4 }, stars: 1, release: 2, bugsSquashed: 7, sprintsMerged: 3, boost: { multiplier: 2, endsAt: 5 }, settings: { sound: true, buyAmount: 10, tab: 'ship' } };
    const back = deserialize(JSON.stringify(v1), 0)!;
    expect(back.stats.bugs).toBe(7);
    expect(back.stats.sprints).toBe(3);
    expect(back.owned).toEqual({ kb: 4 });
    expect(back.settings.sound).toBe(true);
    expect(back.settings.buyAmount).toBe(10);
    expect(back.lines.toNumber()).toBe(500);
  });

  it('exports and imports as a single line', () => {
    const s = newGame(0);
    s.lines = D('123456789');
    const text = exportSave(s, 0);
    expect(text.startsWith('SHIPIT:')).toBe(true);
    expect(importSave(text, 0)?.lines.toNumber()).toBeCloseTo(123456789, 0);
    expect(importSave('SHIPIT:not-base64!!', 0)).toBeNull();
    expect(importSave('hello', 0)).toBeNull();
  });

  it('rejects garbage and saves from a newer version', () => {
    expect(deserialize('not json', 0)).toBeNull();
    expect(deserialize('[]', 0)).toBeNull();
    expect(deserialize(JSON.stringify({ lines: '5' }), 0)).toBeNull();
    expect(deserialize(JSON.stringify({ v: SAVE_VERSION + 1 }), 0)).toBeNull();
  });

  it('fills missing or broken fields with defaults', () => {
    const back = deserialize(JSON.stringify({ v: SAVE_VERSION, lines: 'banana', owned: { kb: -3, duck: 2 }, stars: 'lots', perks: { nope: 3 } }), 0)!;
    expect(back.lines.toNumber()).toBe(0);
    expect(back.owned).toEqual({ duck: 2 });
    expect(back.stars).toBe(0);
    expect(back.perks).toEqual({});
    expect(back.settings.tab).toBe('upgrades');
  });
});
