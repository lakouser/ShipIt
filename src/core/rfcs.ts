import { RFC, RFCS, type RfcDef, type RfcId } from './content';
import type { GameState } from './state';

/*
 * RFCs: research on a real clock. One is under discussion at a time and takes hours, playing or away; once adopted it
 * is kept for good (through rounds, major versions and new companies). Other modules ask rfcDone() for their rule.
 */

export const findRfc = (id: RfcId): RfcDef | undefined => RFCS.find((r) => r.id === id);

export const rfcDone = (s: GameState, id: RfcId): boolean => s.rfc.done.includes(id);

/** RFCs open once enough releases have shipped. */
export const rfcsReady = (s: GameState): boolean => s.stats.ships >= RFC.unlockShips;

/** Hours the next RFC takes: the first is quick, each one after takes longer, up to the last entry. */
export const rfcHours = (s: GameState): number => RFC.hours[Math.min(s.rfc.done.length, RFC.hours.length - 1)];

/** RFCs not adopted yet, in the order they are listed. */
export const rfcsOpen = (s: GameState): RfcDef[] => RFCS.filter((r) => !rfcDone(s, r.id));

/** Opens an RFC for discussion. Only one at a time. */
export function startRfc(s: GameState, id: RfcId, now: number): RfcDef | null {
  const def = findRfc(id);
  if (!def || !s.unlocked.rfcs || s.rfc.active || rfcDone(s, id)) return null;
  s.rfc.active = { id, startedAt: now, endsAt: now + rfcHours(s) * 3_600_000 };
  return def;
}

/** Withdraws the RFC under discussion; the time spent on it is lost. */
export function withdrawRfc(s: GameState): RfcId | null {
  const id = s.rfc.active?.id ?? null;
  s.rfc.active = null;
  return id;
}

/** Adopts the RFC under discussion once its time is up. */
export function updateRfc(s: GameState, now: number): RfcDef | null {
  const a = s.rfc.active;
  if (!a || now < a.endsAt) return null;
  s.rfc.active = null;
  if (!rfcDone(s, a.id)) s.rfc.done.push(a.id);
  return findRfc(a.id) ?? null;
}

/** How far the RFC under discussion is, 0–1, and the seconds left. */
export function rfcProgress(s: GameState, now: number): { progress: number; left: number } | null {
  const a = s.rfc.active;
  if (!a) return null;
  const span = Math.max(1, a.endsAt - a.startedAt);
  return { progress: Math.max(0, Math.min(1, (now - a.startedAt) / span)), left: Math.max(0, (a.endsAt - now) / 1000) };
}
