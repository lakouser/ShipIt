import Decimal, { type DecimalSource } from 'break_infinity.js';

/**
 * All game quantities (lines, costs, rates) are Decimals so they can grow past
 * the ~1.8e308 limit of a JavaScript number. Keep this file as the only place
 * that knows which big-number library is in use.
 */
export { Decimal };
export type NumLike = DecimalSource;

export const D = (value: NumLike): Decimal => new Decimal(value);

/** A Decimal that parsed cleanly (not NaN or infinite). */
export const isFiniteDecimal = (d: Decimal): boolean => Number.isFinite(d.mantissa) && Number.isFinite(d.exponent);

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

let notation: 'suffix' | 'sci' = 'suffix';
/** Display setting: "1.23M" (suffix) or "1.23e6" (sci). Formatting below a million is unaffected. */
export const setNotation = (n: 'suffix' | 'sci'): void => {
  notation = n;
};

/** Whole numbers: "1,234" below a million, then "1.23M", "4.56B" … and "7.89e45" past the named suffixes. */
export function fmt(value: NumLike): string {
  const d = D(value).floor();
  if (d.lt(1e6)) return d.toNumber().toLocaleString('en-US');
  const exp = Math.floor(d.log10());
  const group = Math.floor(exp / 3);
  if (notation === 'suffix' && group < SUFFIXES.length) return (d.toNumber() / 10 ** (group * 3)).toFixed(2) + SUFFIXES[group];
  return (10 ** (d.log10() - exp)).toFixed(2) + 'e' + exp;
}

/** Rates keep one decimal below 10 ("2.5"), then format like fmt. */
export function fmtRate(value: NumLike): string {
  const d = D(value);
  return d.lt(10) ? String(Math.round(d.toNumber() * 10) / 10) : fmt(d);
}

/** Multipliers: two decimals at most below 100 ("2.2", "1.18"), then like fmt ("115", "1.23M"). */
export function fmtMul(value: number): string {
  return value < 100 ? String(Math.round(value * 100) / 100) : fmt(value);
}

/** Durations for logs: "45s", "38m", "2h 5m". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** m:ss, rounded up so a timer never shows 0:00 while time is left. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
