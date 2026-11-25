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
    expect(costOf(s, kb, 1).toNumber()).toBe(15);
    s.owned.kb = 1;
    expect(costOf(s, kb, 1).toNumber()).toBe(Math.ceil(15 * 1.15));
    s.owned.kb = 0;
    const ten = 15 * ((1.15 ** 10 - 1) / 0.15);
    expect(costOf(s, kb, 10).toNumber()).toBe(Math.ceil(ten));
  });

  it('buys only when affordable and deducts the cost', () => {
    const s = newGame(0);
    s.lines = D(14);
    expect(buy(s, 'kb')).toBeNull();
    s.lines = D(20);
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

  it('applies stars and boosts to everything', () => {
    const s = newGame(0);
    s.owned.duck = 10;
    s.stars = 5;
    expect(perSecond(s, 0).toNumber()).toBeCloseTo(15);
    s.boost = { multiplier: 2, endsAt: 100 };
    expect(perSecond(s, 50).toNumber()).toBeCloseTo(30);
    expect(perSecond(s, 100).toNumber()).toBeCloseTo(15);
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
