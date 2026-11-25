import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../src/core/content';
import { buy, chooseFork, costOf, forkOptions, maxAffordable, perSecond, perTap } from '../src/core/economy';
import { D, fmt } from '../src/core/num';
import { newGame } from '../src/core/state';

const kb = UPGRADES.find((u) => u.id === 'kb')!;

describe('economy', () => {
  it('starts at 1 line per tap and nothing automated', () => {
    const s = newGame(0);
    expect(perTap(s, 0).toNumber()).toBe(1);
    expect(perSecond(s, 0).toNumber()).toBe(0);
  });

  it('prices copies on a 1.15 geometric curve', () => {
    const s = newGame(0);
    expect(costOf(s, kb, 1).toNumber()).toBe(kb.baseCost);
    s.owned.kb = 1;
    expect(costOf(s, kb, 1).toNumber()).toBe(Math.ceil(kb.baseCost * 1.15));
    s.owned.kb = 0;
    const ten = kb.baseCost * ((1.15 ** 10 - 1) / 0.15);
    expect(costOf(s, kb, 10).toNumber()).toBe(Math.ceil(ten));
  });

  it('buys only when affordable and deducts the cost', () => {
    const s = newGame(0);
    s.lines = D(kb.baseCost - 1);
    expect(buy(s, 'kb')).toBeNull();
    s.lines = D(kb.baseCost + 5);
    const p = buy(s, 'kb')!;
    expect(p.count).toBe(1);
    expect(s.lines.toNumber()).toBe(5);
    expect(perTap(s, 0).toNumber()).toBe(2);
  });

  it('buys as many as possible on Max', () => {
    const s = newGame(0);
    s.settings.buyAmount = 'max';
    s.lines = D(1000);
    const expected = maxAffordable(s, kb);
    const p = buy(s, 'kb')!;
    expect(p.count).toBe(expected);
    expect(s.lines.gte(0)).toBe(true);
    expect(s.lines.lt(costOf(s, kb, 1))).toBe(true);
  });

  it('offers a fork at every 25 copies', () => {
    const s = newGame(0);
    s.owned.duck = 24;
    expect(perSecond(s, 0).toNumber()).toBe(24);
    s.lines = D(1e9);
    const p = buy(s, 'duck')!;
    expect(p.upgradeAt).toBe(25);
    // Nothing changes until the player picks one.
    expect(perSecond(s, 0).toNumber()).toBe(25);
    expect(forkOptions(s, 'duck')!.map((f) => f.id)).toEqual(['major', 'plugin']);
    expect(chooseFork(s, 'duck', 'lts')).toBeNull();
    expect(chooseFork(s, 'duck', 'major')!.fork.id).toBe('major');
    expect(perSecond(s, 0).toNumber()).toBe(50);
    expect(forkOptions(s, 'duck')).toBeNull();
    // The second fork offers the LTS build instead of the plugin ecosystem.
    s.owned.duck = 50;
    expect(forkOptions(s, 'duck')!.map((f) => f.id)).toEqual(['major', 'lts']);
    const before = costOf(s, UPGRADES.find((u) => u.id === 'duck')!, 1).toNumber();
    chooseFork(s, 'duck', 'lts');
    expect(costOf(s, UPGRADES.find((u) => u.id === 'duck')!, 1).toNumber()).toBe(Math.ceil(before / 2));
  });

  it('plugin ecosystems boost every package of their kind', () => {
    const s = newGame(0);
    s.owned.duck = 25;
    s.owned.intern = 1;
    const base = perSecond(s, 0).toNumber();
    chooseFork(s, 'duck', 'plugin');
    // duck x1.4 and a +8% bonus on all automation.
    expect(perSecond(s, 0).toNumber()).toBeCloseTo((25 * 1.4 + (base - 25)) * 1.08);
  });

  it('applies stars, achievements, perks and effects', () => {
    const s = newGame(0);
    s.owned.duck = 10;
    s.stars = 5;
    expect(perSecond(s, 0).toNumber()).toBeCloseTo(15);
    s.achievements = ['a', 'b'];
    expect(perSecond(s, 0).toNumber()).toBeCloseTo(15 * 1.02);
    s.achievements = [];
    s.perks.team = 2;
    expect(perSecond(s, 0).toNumber()).toBeCloseTo(15 * 1.5);
    s.effects.nightly = 100;
    expect(perSecond(s, 50).toNumber()).toBeCloseTo(15 * 1.5 * 2);
    expect(perSecond(s, 100).toNumber()).toBeCloseTo(15 * 1.5);
  });

  it('discounts prices with cache.conf', () => {
    const s = newGame(0);
    s.perks.cache = 5;
    expect(costOf(s, kb, 1).toNumber()).toBe(Math.ceil(kb.baseCost * 0.9));
  });
});

describe('fmt', () => {
  it('formats small, suffixed and huge numbers', () => {
    expect(fmt(1234)).toBe('1,234');
    expect(fmt(1_500_000)).toBe('1.50M');
    expect(fmt(D('2.5e12'))).toBe('2.50T');
    expect(fmt(D('7.89e400'))).toBe('7.89e400');
  });
});
