import { ASSUMED_TAPS_PER_SECOND, ISSUES, type IssueKind } from './content';
import { coverage } from './coverage';
import { addDebt } from './debt';
import { addLines, typicalOutput } from './economy';
import { Decimal } from './num';
import type { Rng } from './rng';
import type { GameState } from './state';

/*
 * Users file issues: one every ISSUES.everyMinutes, playing or away, until ISSUES.max are open (about an hour's worth).
 * Closing them is one tap and pays out by kind. A full queue costs nothing; it just stops filling.
 */

const EVERY_MS = ISSUES.everyMinutes * 60_000;

/** The queue opens once the app has had ISSUES.unlockUsers users. */
export const issuesReady = (s: GameState): boolean => s.market.peak >= ISSUES.unlockUsers;

/** Bug reports come in more often with low test coverage. */
function pickKind(s: GameState, rng: Rng): IssueKind {
  const weights: [IssueKind, number][] = [
    ['bug', 0.2 + 0.4 * (1 - coverage(s))],
    ['feature', 0.3],
    ['support', 0.3],
  ];
  let roll = rng() * weights.reduce((sum, [, w]) => sum + w, 0);
  for (const [kind, w] of weights) {
    roll -= w;
    if (roll < 0) return kind;
  }
  return 'support';
}

/** Files the issues due by now (time away included). Returns what was filed. */
export function updateIssues(s: GameState, now: number, rng: Rng): IssueKind[] {
  const q = s.issues;
  if (!s.unlocked.issues) return [];
  if (q.nextAt <= 0) q.nextAt = now + EVERY_MS;
  if (now < q.nextAt) return [];
  const due = Math.floor((now - q.nextAt) / EVERY_MS) + 1;
  q.nextAt += due * EVERY_MS;
  const filed: IssueKind[] = [];
  for (let i = 0; i < due && q.open.length < ISSUES.max; i++) {
    const kind = pickKind(s, rng);
    q.open.push(kind);
    filed.push(kind);
  }
  return filed;
}

export const issueCounts = (s: GameState): Record<IssueKind, number> => {
  const counts: Record<IssueKind, number> = { bug: 0, feature: 0, support: 0 };
  for (const k of s.issues.open) counts[k]++;
  return counts;
};

/** Lines closing these issues would pay: seconds of typical output each, by kind. */
export function triageLines(s: GameState, now: number, kinds: readonly IssueKind[] = s.issues.open): Decimal {
  const seconds = kinds.reduce((sum, k) => sum + ISSUES.seconds[k], 0);
  return seconds > 0 ? Decimal.max(50, typicalOutput(s, now, seconds, ASSUMED_TAPS_PER_SECOND)).floor() : new Decimal(0);
}

export interface Triage {
  closed: number;
  counts: Record<IssueKind, number>;
  lines: Decimal;
  /** Tech debt paid off, review added to the next release, users kept. */
  debt: number;
  review: number;
  users: number;
}

/** Closes every open issue and pays for them. Null when there are none. */
export function triage(s: GameState, now: number): Triage | null {
  const kinds = s.issues.open;
  if (!kinds.length) return null;
  const counts: Record<IssueKind, number> = { bug: 0, feature: 0, support: 0 };
  for (const k of kinds) counts[k]++;
  const lines = triageLines(s, now, kinds);
  const debt = ISSUES.bugDebt * counts.bug;
  const before = Math.min(ISSUES.featureCap, s.issues.reviewBoost);
  s.issues.reviewBoost = Math.min(ISSUES.featureCap, s.issues.reviewBoost + ISSUES.featureReview * counts.feature);
  const users = s.market.users * ((1 + ISSUES.supportUsers) ** counts.support - 1);
  addLines(s, lines);
  addDebt(s, debt);
  s.market.users += users;
  s.market.peak = Math.max(s.market.peak, s.market.users);
  s.issues.open = [];
  s.stats.issuesClosed += kinds.length;
  return { closed: kinds.length, counts, lines, debt, review: s.issues.reviewBoost - before, users };
}
