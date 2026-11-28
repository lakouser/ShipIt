import { ROADMAP, SEGMENTS, type Mods, type SegmentDef, type SegmentId } from './content';
import type { GameState } from './state';

/*
 * The roadmap: who the app is for. The player points it at a segment; every release then ships that segment's next
 * feature as its headline, which brings more users and counts all of them into that segment. Each segment pays in its
 * own way, in proportion to its share of the users, so the mix is a slow, deliberate choice.
 */

export const findSegment = (id: SegmentId): SegmentDef => SEGMENTS.find((x) => x.id === id) ?? SEGMENTS[0];

/** The roadmap opens once enough releases have shipped. */
export const roadmapReady = (s: GameState): boolean => s.stats.ships >= ROADMAP.unlockShips;

/** A segment's share of all users, 0–1. */
export const segmentShare = (s: GameState, id: SegmentId): number => Math.max(0, Math.min(1, s.roadmap.shares[id] ?? 0));

/** Users who belong to no segment. */
export const generalShare = (s: GameState): number => Math.max(0, 1 - SEGMENTS.reduce((sum, x) => sum + segmentShare(s, x.id), 0));

/** The next headline feature a segment would get: its features in order, then again as "dark mode v2". */
export function nextFeature(s: GameState, id: SegmentId): string {
  const def = findSegment(id);
  const n = s.roadmap.shipped[id] ?? 0;
  const round = Math.floor(n / def.features.length);
  return `${def.features[n % def.features.length]}${round > 0 ? ` v${round + 1}` : ''}`;
}

/** Points the roadmap at a segment (or at nobody). */
export function setFocus(s: GameState, id: SegmentId | null): boolean {
  if (!s.unlocked.roadmap || (id !== null && !SEGMENTS.some((x) => x.id === id))) return false;
  s.roadmap.focus = id;
  return true;
}

/** What the segments pay: developers automation, companies stars, everyone else typing and new users. */
export function roadmapMods(s: GameState): Partial<Mods> {
  return {
    autoMul: 1 + ROADMAP.devAuto * segmentShare(s, 'dev'),
    starGain: 1 + ROADMAP.bizStars * segmentShare(s, 'biz'),
    tapMul: 1 + ROADMAP.funTap * segmentShare(s, 'fun'),
    usersMul: 1 + ROADMAP.funUsers * segmentShare(s, 'fun'),
  };
}

/** Companies pay more per user once there is revenue. */
export const revenueMultiplier = (s: GameState): number => 1 + ROADMAP.bizRevenue * segmentShare(s, 'biz');

/** The headline's lift to a release's new users (1 with no focus). */
export const headlineMultiplier = (s: GameState): number => (s.unlocked.roadmap && s.roadmap.focus ? ROADMAP.headlineUsers : 1);

export interface Headline {
  segment: SegmentDef;
  feature: string;
}

/**
 * A release shipped with `added` new users on top of `before`: with a focus, they all join that segment and its
 * feature ships; with none, they are nobody in particular and every segment's share thins out.
 */
export function roadmapOnShip(s: GameState, before: number, added: number): Headline | null {
  const r = s.roadmap;
  const focus = s.unlocked.roadmap ? r.focus : null;
  mixIn(s, before, added, focus);
  if (!focus) return null;
  const feature = nextFeature(s, focus);
  r.shipped[focus] = (r.shipped[focus] ?? 0) + 1;
  s.stats.headlines++;
  return { segment: findSegment(focus), feature };
}

/** Adds users to the mix: all of them into `segment`, or into none. */
export function mixIn(s: GameState, before: number, added: number, segment: SegmentId | null): void {
  const total = before + added;
  if (added <= 0 || total <= 0) return;
  for (const x of SEGMENTS) {
    const own = segmentShare(s, x.id) * before + (x.id === segment ? added : 0);
    s.roadmap.shares[x.id] = Math.max(0, Math.min(1, own / total));
  }
}
