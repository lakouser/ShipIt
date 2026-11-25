import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../src/core/content';
import { buy, costOf, maxAffordable, perSecond, perTap } from '../src/core/economy';
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

  it('doubles an upgrade at every 25 copies', () => {
    const s = newGame(0);
    s.owned.duck = 24;
    expect(perSecond(s, 0).toNumber()).toBe(24);
    s.lines = D(1e9);
    const p = buy(s, 'duck')!;
    expect(p.doubledAt).toBe(25);
    expect(perSecond(s, 0).toNumber()).toBe(50);
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
