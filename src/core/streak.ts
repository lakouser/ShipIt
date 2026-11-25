import { STREAK, type EffectId } from './content';
import { addLines, perSecond } from './economy';
import { grantScript } from './effects';
import { D, Decimal } from './num';
import type { GameState } from './state';

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
}

export interface CheckIn {
  count: number;
  lines: Decimal;
  script: EffectId | null;
}

/**
 * First session of a new day: extends (or restarts) the commit streak and pays a daily bonus.
 * Returns null if the player already checked in today.
 */
export function checkIn(s: GameState, now: number): CheckIn | null {
  const today = dayKey(now);
  if (s.streak.lastDay === today) return null;
  const count = s.streak.lastDay === previousDay(today) ? s.streak.count + 1 : 1;
  s.streak = { lastDay: today, count, days: [...s.streak.days.filter((d) => d !== today), today].slice(-STREAK.daysKept) };

  const lines = Decimal.max(STREAK.minLines, perSecond(s, now).mul(STREAK.dailyAutoSeconds)).floor();
  addLines(s, lines, false);
  const script: EffectId | null = count % 7 === 0 ? 'sudo' : count % 3 === 0 ? 'turbo' : null;
  if (script) grantScript(s, script);
  return { count, lines: D(lines), script };
}
