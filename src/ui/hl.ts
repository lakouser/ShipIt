import { esc } from './dom';

/**
 * Colour coding. Every kind of thing the game talks about has one colour, used everywhere:
 *   loc   lines of code (the main currency) and bonuses to all output  green
 *   tap   anything per tap: typing upgrades, taps, crits, flow          coral
 *   auto  anything per second: automation                               violet
 *   star  stars                                                         gold
 *   name  files, scripts, paths, packages, ticket ids, tabs             cyan
 *   bug   bugs and tech debt                                            red
 *   time  durations and countdowns                                      bright
 *   num   any other number                                              bright
 *   str   "quoted strings"                                              string green
 * The colours themselves are CSS variables (--c-loc …) so each theme can map them.
 */
export type Hue = 'loc' | 'tap' | 'auto' | 'star' | 'name' | 'bug' | 'time' | 'num' | 'str';

/** Wraps already-known text in a colour, for templates that know what a value is. */
export const tint = (hue: Hue, text: string | number): string => `<span class="h h-${hue}">${esc(String(text))}</span>`;

// Building blocks. B stops a number from matching in the middle of a word or a version ("v2.0").
const B = String.raw`(?<![\w.])`;
const SIGN = String.raw`[+\-−~]?`;
const NUM = String.raw`\d[\d,]*(?:\.\d+)?(?:e[+-]?\d+|Qa|Qi|Sx|Sp|Oc|No|Dc|[KMBT])?(?: (?:million|billion|trillion))?`;
const PCT = String.raw`[+\-]?\d+(?:\.\d+)?%`;
const MUL = String.raw`x\d+(?:\.\d+)?`;

// Order matters: where two rules could start at the same place, the earlier one wins.
const RULES: [Hue, string][] = [
  ['str', String.raw`"[^"\n]*"`],
  ['name', [
    String.raw`~\/[\w./-]*`,
    String.raw`(?<![\w.])\.?[\w-]+\.(?:sh|json|yml|conf|md|ts)\b`,
    String.raw`(?<![\w.])\.vimrc\b`,
    String.raw`\bcrontab\b`,
    String.raw`\bTKT-\d+\b`,
    String.raw`\b\d:(?:pkgs|sprints|todo|ship|team|mail)\b`,
    String.raw`(?<=npm i |npm update |× )[\w-]+`,
  ].join('|')],
  ['tap', [
    `${B}${SIGN}${NUM}(?: lines?)?(?:\\/tap| per tap)`,
    `${B}${PCT} (?:lines )?per tap`,
    `${B}${PCT} critical tap chance`,
    `\\b${MUL} (?:lines )?per tap`,
    `${B}${SIGN}${NUM} (?:critical )?taps?(?:\\/s| a second| per second)?`,
    `${B}${NUM} times\\b`,
    String.raw`\b(?:critical taps?|crits?|per tap|taps\/s)\b`,
  ].join('|')],
  ['auto', [
    `${B}${SIGN}${NUM}(?: lines?)?(?:\\/s\\b| per second)`,
    `${B}${PCT} automation`,
    `\\b${MUL} automation`,
    String.raw`\b(?:automation|loc\/s)\b`,
  ].join('|')],
  ['star', `${B}${SIGN}\\d+ ?(?:stars?\\b|★)|★`],
  ['bug', [
    `${B}${PCT} bug rewards`,
    `${B}\\d+ bugs?\\b`,
    String.raw`\bbugs?(?: #\d+)?\b`,
    `${B}${SIGN}\\d+(?:\\.\\d+)?%? tech debt`,
    String.raw`\btech debt\b`,
  ].join('|')],
  ['loc', [
    `${B}${SIGN}${NUM} (?:more )?(?:lines?|loc)\\b`,
    `\\b${MUL} everything`,
    `${B}${PCT}`,
  ].join('|')],
  ['time', [String.raw`\b\d+:\d\d\b`, `${B}\\+?\\d+h(?: \\d+m)?\\b`, `${B}\\d+[ms]\\b`, `${B}\\d+ days?\\b`].join('|')],
  ['num', `${B}${SIGN}${NUM}(?!\\w)|\\b${MUL}\\b`],
];

const PATTERN = new RegExp(RULES.map(([, src]) => `(${src})`).join('|'), 'g');

/** Escapes plain text and colours every number, file, rate and so on it recognises. */
export function hl(text: string): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    if (!m[0]) continue;
    const rule = m.slice(1).findIndex((g) => g !== undefined);
    out += esc(text.slice(last, m.index)) + `<span class="h h-${RULES[rule]![0]}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}
