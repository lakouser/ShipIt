import { FUNDING, PERKS, WORKFLOWS } from '../core/content';
import { upgradesWithForks } from '../core/economy';
import { canRaise, starsForNextRound } from '../core/funding';
import type { Game, UnlockTab } from '../core/game';
import { mailDef } from '../core/mail';
import { manUnlockedCount, manUnreadCount } from '../core/man';
import { majorsUnlocked, xpAvailable } from '../core/major';
import { churnShare } from '../core/market';
import { clock, fmt, type Decimal } from '../core/num';
import { perkStatus } from '../core/perks';
import { linesForStars, shipReady, starsAvailable } from '../core/ship';
import type { GameState, Tab } from '../core/state';
import { releasesShipped } from '../core/workflows';

/** The five windows in the tmux bar. Each holds one or more panels, shown as sub-tabs. */
export type Group = 'pkgs' | 'work' | 'ship' | 'co' | 'more';

export const GROUPS: readonly { id: Group; tabs: readonly Tab[] }[] = [
  { id: 'pkgs', tabs: ['upgrades'] },
  { id: 'work', tabs: ['sprints', 'todo'] },
  { id: 'ship', tabs: ['ship', 'dotfiles', 'auto', 'major', 'round'] },
  { id: 'co', tabs: ['team', 'mail', 'market'] },
  { id: 'more', tabs: ['man', 'trophies', 'stats', 'settings'] },
];

export const TAB_LABEL: Record<Tab, string> = {
  upgrades: 'pkgs',
  sprints: 'backlog',
  todo: 'todo',
  ship: 'release',
  dotfiles: 'dotfiles',
  auto: 'auto',
  major: 'major',
  round: 'round',
  team: 'team',
  mail: 'mail',
  market: 'market',
  man: 'man',
  trophies: 'trophies',
  stats: 'stats',
  settings: 'cfg',
};

export const groupOf = (tab: Tab): Group => GROUPS.find((g) => g.tabs.includes(tab))!.id;

/** Where a newly unlocked panel lives, for the log and the notice: "work/backlog", "ship". */
export function unlockPath(tab: UnlockTab): string {
  const group = groupOf(tab);
  return group === TAB_LABEL[tab] || GROUPS.find((g) => g.id === group)!.tabs.length === 1 ? group : `${group}/${TAB_LABEL[tab]}`;
}

/** The funding round shows once it has started, or once a quarter of the stars for the first round are in. */
export const fundingVisible = (s: GameState): boolean =>
  s.round > 0 || s.equity > 0 || (s.round < FUNDING.maxRounds && s.stars >= starsForNextRound(s) * 0.25);

/** hidden: not discovered yet; locked: shown dashed, with what it needs; open: usable. */
export type TabState = 'hidden' | 'locked' | 'open';

export function tabState(s: GameState, tab: Tab): TabState {
  const u = s.unlocked;
  const shipping = u.ship ? 'locked' : 'hidden';
  switch (tab) {
    case 'upgrades':
    case 'trophies':
    case 'stats':
    case 'settings':
      return 'open';
    case 'sprints':
    case 'todo':
    case 'team':
    case 'mail':
    case 'market':
    case 'ship':
      return u[tab] ? 'open' : 'hidden';
    case 'dotfiles':
      return u.ship ? 'open' : 'hidden';
    case 'auto':
      return releasesShipped(s) >= WORKFLOWS[0].releases ? 'open' : shipping;
    case 'major':
      return u.major ? 'open' : shipping;
    case 'round':
      return fundingVisible(s) ? 'open' : shipping;
    case 'man':
      return manUnlockedCount(s) > 0 ? 'open' : 'hidden';
  }
}

export const groupVisible = (s: GameState, group: Group): boolean => GROUPS.find((g) => g.id === group)!.tabs.some((t) => tabState(s, t) !== 'hidden');

/**
 * A badge on a tab. count: something waiting for the player (a coral box); ok: worth doing now (a green
 * box); prog: progress or a timer; star: something stars can buy; new: something to read.
 */
export interface Badge {
  text: string;
  kind: 'count' | 'ok' | 'prog' | 'star' | 'new';
}

/** Progress (0–1) towards the next star of this release. */
export function nextStarProgress(s: GameState): number {
  const stars = starsAvailable(s);
  const prev = linesForStars(s, stars);
  const next = linesForStars(s, stars + 1);
  const span = next.sub(prev);
  return span.lte(0) ? 1 : Math.max(0, Math.min(1, s.thisRelease.sub(prev).div(span).toNumber()));
}

/** Mail that needs the player: unread, or a choice not answered yet. */
export const mailWaiting = (s: GameState): number => s.mail.filter((m) => !m.read || (m.choice === null && !!mailDef(m.id)?.options)).length;

/** What the UI remembers to badge "new" things: tasks and trophies seen on the last visit. */
export interface Seen {
  quests: Set<string>;
  trophies: number;
}

export const questKey = (q: GameState['quests'][number]): string => `${q.template}:${q.subject ?? ''}:${q.target}:${q.baseline}`;

export function tabBadge(game: Game, tab: Tab, seen: Seen): Badge | null {
  const s = game.state;
  const now = game.now();
  const count = (n: number): Badge | null => (n > 0 ? { text: String(n), kind: 'count' } : null);
  switch (tab) {
    case 'upgrades':
      return count(upgradesWithForks(s).length);
    case 'sprints':
      if (s.sprint) return { text: clock((s.sprint.endsAt - now) / 1000), kind: 'prog' };
      return count(s.backlog.filter((t) => t.readyAt <= now).length);
    case 'todo':
      return count(s.quests.filter((q) => !seen.quests.has(questKey(q))).length);
    case 'ship':
      if (!s.unlocked.ship) return null;
      return shipReady(s) ? { text: '✓', kind: 'ok' } : { text: `${Math.floor(nextStarProgress(s) * 100)}%`, kind: 'prog' };
    case 'dotfiles': {
      const n = PERKS.filter((p) => perkStatus(s, p) === 'affordable').length;
      return n > 0 ? { text: String(n), kind: 'star' } : null;
    }
    case 'major': {
      const xp = majorsUnlocked(s) ? xpAvailable(s) : 0;
      return xp >= 1 ? { text: `+${xp}`, kind: 'star' } : null;
    }
    case 'round':
      return canRaise(s) ? { text: '✓', kind: 'ok' } : null;
    case 'team':
      return count(s.applicant ? 1 : 0);
    case 'mail':
      return count(mailWaiting(s));
    case 'market':
      if (s.market.launch) return { text: clock((s.market.launch.endsAt - now) / 1000), kind: 'prog' };
      return churnShare(s) > 0 ? { text: '▼', kind: 'count' } : null;
    case 'man':
      return manUnreadCount(s) > 0 ? { text: 'new', kind: 'new' } : null;
    case 'trophies': {
      const n = s.achievements.length - seen.trophies;
      return n > 0 ? { text: `+${n}`, kind: 'new' } : null;
    }
    default:
      return null;
  }
}

/** The bar's badge for a window: things waiting add up; otherwise the most useful sub-tab badge. */
export function groupBadge(badges: (Badge | null)[]): Badge | null {
  const present = badges.filter((b): b is Badge => !!b);
  const waiting = present.filter((b) => b.kind === 'count' && /^\d+$/.test(b.text)).reduce((n, b) => n + Number(b.text), 0);
  const ok = present.find((b) => b.kind === 'ok');
  if (ok) return ok;
  if (waiting > 0) return { text: String(waiting), kind: 'count' };
  for (const kind of ['count', 'prog', 'new', 'star'] as const) {
    const b = present.find((x) => x.kind === kind);
    if (b) return kind === 'star' ? null : b;
  }
  return null;
}

/** Compact counts for tight spots: 150, 1.18K, 60K, then like fmt (1.23M). */
export function short(n: number): string {
  if (n < 1000) return String(Math.floor(n));
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 2 : n < 1e5 ? 1 : 0).replace(/\.?0+$/, '')}K`;
  return fmt(n);
}

/** Lines coming in per second right now: automation plus the player's recent tapping. */
export const incomeNow = (game: Game): Decimal => game.perSecond().add(game.perTap().mul(game.tapRate(5000)));

/**
 * "~40s", "~9 min"; null past an hour (or never). Income grows as you buy, so longer guesses
 * overstate the wait and only discourage.
 */
export function etaText(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= 3600) return null;
  return seconds < 60 ? `~${Math.max(1, Math.ceil(seconds))}s` : `~${Math.ceil(seconds / 60)} min`;
}

/** Seconds until `lines` more are written at the current income, or Infinity. */
export function secondsFor(game: Game, lines: Decimal): number {
  if (lines.lte(0)) return 0;
  const rate = incomeNow(game);
  return rate.gt(0) ? lines.div(rate).toNumber() : Infinity;
}
