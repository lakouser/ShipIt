import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/state';
import { GROUPS, etaText, groupBadge, groupOf, short, tabState, unlockPath } from '../src/ui/nav';

describe('tmux bar windows', () => {
  it('formats compact counts without losing zeros', () => {
    expect([150, 1180, 1200, 10_000, 60_000, 100_000, 150_000, 200_000, 999_499].map(short)).toEqual(['150', '1.18K', '1.2K', '10K', '60K', '100K', '150K', '200K', '999K']);
    expect(short(999_999)).toBe('1M');
    expect(short(2_500_000)).toBe('2.50M');
  });

  it('only guesses waits under an hour', () => {
    expect(etaText(30)).toBe('~30s');
    expect(etaText(540)).toBe('~9 min');
    expect(etaText(3600)).toBeNull();
    expect(etaText(Infinity)).toBeNull();
  });

  it('puts every panel in exactly one window', () => {
    const all = GROUPS.flatMap((g) => g.tabs);
    expect(new Set(all).size).toBe(all.length);
    expect(groupOf('todo')).toBe('work');
    expect(unlockPath('sprints')).toBe('work/backlog');
    expect(unlockPath('ship')).toBe('ship');
    expect(unlockPath('market')).toBe('co/market');
  });

  it('shows a new game only pkgs and more', () => {
    const s = newGame(0);
    const visible = GROUPS.filter((g) => g.tabs.some((t) => tabState(s, t) !== 'hidden')).map((g) => g.id);
    expect(visible).toEqual(['pkgs', 'more']);
    s.unlocked.ship = true;
    expect(tabState(s, 'major')).toBe('locked');
    expect(tabState(s, 'dotfiles')).toBe('open');
  });

  it('adds up waiting counts, and a ready check wins', () => {
    expect(groupBadge([{ text: '1', kind: 'count' }, { text: '2', kind: 'count' }, null])).toEqual({ text: '3', kind: 'count' });
    expect(groupBadge([{ text: '81%', kind: 'prog' }, { text: '3', kind: 'star' }])).toEqual({ text: '81%', kind: 'prog' });
    expect(groupBadge([{ text: '2', kind: 'count' }, { text: '✓', kind: 'ok' }])).toEqual({ text: '✓', kind: 'ok' });
    expect(groupBadge([{ text: '3', kind: 'star' }])).toBeNull();
  });
});
