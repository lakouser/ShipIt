import { describe, expect, it } from 'vitest';
import { D } from '../src/core/num';
import { deserialize, SAVE_VERSION, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';

describe('saves', () => {
  it('round-trips the state, including numbers far past 1e308', () => {
    const s = newGame(0);
    s.lines = D('1.5e500');
    s.lifetime = D('3e900');
    s.owned = { kb: 12, duck: 30 };
    s.stars = 4;
    s.release = 3;
    s.achievements = ['hello', 'ship'];
    s.settings.buyAmount = 'max';
    s.settings.tab = 'ship';
    const back = deserialize(serialize(s, 1234), 5000)!;
    expect(back.lines.eq(s.lines)).toBe(true);
    expect(back.lifetime.eq(s.lifetime)).toBe(true);
    expect(back.owned).toEqual({ kb: 12, duck: 30 });
    expect(back.stars).toBe(4);
    expect(back.release).toBe(3);
    expect(back.achievements).toEqual(['hello', 'ship']);
    expect(back.settings.buyAmount).toBe('max');
    expect(back.settings.tab).toBe('ship');
    expect(back.savedAt).toBe(1234);
  });

  it('keeps an active sprint and the backlog', () => {
    const s = newGame(0);
    const ticket = { tier: 1, id: 'TKT-123', title: 'Make the logo bigger', durationS: 40, target: D(500), reward: D(1100) };
    s.backlog = [ticket];
    s.sprint = { ...ticket, slot: 0, endsAt: 99_000, progress: D(120) };
    const back = deserialize(serialize(s, 0), 0)!;
    expect(back.backlog[0].target.toNumber()).toBe(500);
    expect(back.sprint?.progress.toNumber()).toBe(120);
    expect(back.sprint?.endsAt).toBe(99_000);
  });

  it('rejects garbage and saves from a newer version', () => {
    expect(deserialize('not json', 0)).toBeNull();
    expect(deserialize('[]', 0)).toBeNull();
    expect(deserialize(JSON.stringify({ lines: '5' }), 0)).toBeNull();
    expect(deserialize(JSON.stringify({ v: SAVE_VERSION + 1 }), 0)).toBeNull();
  });

  it('fills missing or broken fields with defaults', () => {
    const back = deserialize(JSON.stringify({ v: SAVE_VERSION, lines: 'banana', owned: { kb: -3, duck: 2 }, stars: 'lots' }), 0)!;
    expect(back.lines.toNumber()).toBe(0);
    expect(back.owned).toEqual({ duck: 2 });
    expect(back.stars).toBe(0);
    expect(back.settings.tab).toBe('upgrades');
  });
});
