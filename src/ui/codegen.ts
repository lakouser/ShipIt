import type { LanguageId } from '../core/content';

/**
 * Generates endless plausible-looking (and meaningless) code for the editor, in the language of the
 * current funding round. Purely cosmetic: none of this affects the economy.
 */

/** k keyword, f function, s string, n number, t type, c comment, i identifier, p punctuation/space */
export type TokenClass = 'k' | 'f' | 's' | 'n' | 't' | 'c' | 'i' | 'p';
export type Token = readonly [TokenClass, string];
export type CodeLine = readonly Token[];

const WORDS = {
  id: ['user', 'cache', 'payload', 'buffer', 'config', 'session', 'widget', 'queue', 'token', 'router', 'deadline', 'coffee', 'synergy', 'legacy', 'blob', 'kitten', 'pixel', 'vibes', 'ticket', 'backlog'],
  fn: ['fetch', 'parse', 'resolve', 'normalize', 'hydrate', 'debounce', 'yeet', 'retry', 'validate', 'flush', 'reticulate', 'summon', 'compile', 'memoize', 'sanitize', 'ship_it'],
  type: ['User', 'Payload', 'Widget', 'Config', 'Vibe', 'Ticket', 'Sprint', 'Deadline', 'Monolith'],
  prop: ['id', 'data', 'status', 'count', 'meta', 'next', 'value', 'length', 'mood'],
  str: ['prod', 'v2', 'TODO', '/api/v3', 'utf-8', 'hotfix', 'main', 'it works', 'friday-deploy'],
  num: ['0', '1', '2', '3', '7', '42', '64', '128', '404', '500', '1337', '9000'],
  comment: ['TODO: refactor before anyone notices', 'do not touch, it works', 'temporary fix (2019)', 'magic number, ask Dave', 'this should never happen', 'added by intern, reviewed by no one', 'performance: fine, probably', 'legacy, do not delete', 'why does this work', 'ship it'],
} as const;

type Pick = <T>(items: readonly T[]) => T;
/** A block template returns lines; a leading number on a line is its extra indent level within the block. */
type Block = (w: Words) => (readonly (number | Token)[])[];

interface Words {
  kw(s: string): Token;
  p(s: string): Token;
  id(): Token;
  fn(name?: string): Token;
  type(name?: string): Token;
  prop(): Token;
  str(): Token;
  num(n?: string): Token;
  comment(): Token;
}

const SP: Token = ['p', ' '];

export type { LanguageId };

interface Syntax {
  /** File extension, for the editor tab. */
  ext: string;
  quote: string;
  comment: string;
  blocks: readonly Block[];
}

const SYNTAX: Record<LanguageId, Syntax> = {
  ts: {
    ext: 'ts',
    quote: "'",
    comment: '//',
    blocks: [
      (w) => [
        [
          w.kw('const'),
          SP,
          w.id(),
          w.p(' = '),
          w.kw('await'),
          SP,
          w.id(),
          w.p('.'),
          w.fn(),
          w.p('('),
          w.str(),
          w.p(', '),
          w.num(),
          w.p(');'),
        ],
      ],
      (w) => {
        const v = w.id();
        return [
          [w.kw('if'), w.p(' ('), v, w.p('.'), w.prop(), w.p(' !== '), w.num(), w.p(') {')],
          [1, w.fn(), w.p('('), v, w.p(');')],
          [w.p('}')],
        ];
      },
      (w) => [
        [w.kw('function'), SP, w.fn(), w.p('('), w.id(), w.p(', '), w.id(), w.p(') {')],
        [
          1,
          w.kw('return'),
          SP,
          w.id(),
          w.p('.'),
          w.fn('map'),
          w.p('(x => x.'),
          w.prop(),
          w.p(' * '),
          w.num(),
          w.p(');'),
        ],
        [w.p('}')],
      ],
      (w) => [[w.comment()]],
      (w) => [[w.kw('import'), w.p(' { '), w.type(), w.p(' } '), w.kw('from'), SP, w.str(), w.p(';')]],
      (w) => [
        [w.kw('for'), w.p(' ('), w.kw('let'), w.p(' i = '), w.num('0'), w.p('; i < '), w.num(), w.p('; i++) {')],
        [1, w.id(), w.p('.'), w.fn('push'), w.p('('), w.kw('await'), SP, w.fn(), w.p('(i));')],
        [w.p('}')],
      ],
      (w) => [
        [w.kw('try'), w.p(' { '), w.fn(), w.p('(); } '), w.kw('catch'), w.p(' (e) { '), w.fn('log'), w.p('(e); }')],
      ],
      (w) => [[w.kw('export'), SP, w.kw('default'), SP, w.type(), w.p(';')]],
      (w) => [[w.kw('const'), SP, w.id(), w.p(': '), w.type(), w.p(' = '), w.kw('new'), SP, w.type(), w.p('();')]],
      (w) => [[w.id(), w.p('.'), w.prop(), w.p(' = '), w.id(), w.p('?.'), w.prop(), w.p(' ?? '), w.str(), w.p(';')]],
    ],
  },
  rs: {
    ext: 'rs',
    quote: '"',
    comment: '//',
    blocks: [
      (w) => [
        [
          w.kw('let'),
          SP,
          w.id(),
          w.p(' = '),
          w.id(),
          w.p('.'),
          w.fn(),
          w.p('('),
          w.str(),
          w.p(', '),
          w.num(),
          w.p(').'),
          w.kw('await'),
          w.p('?;'),
        ],
      ],
      (w) => {
        const v = w.id();
        return [
          [w.kw('if'), SP, v, w.p('.'), w.prop(), w.p(' != '), w.num(), w.p(' {')],
          [1, w.fn(), w.p('(&'), v, w.p(');')],
          [w.p('}')],
        ];
      },
      (w) => [
        [
          w.kw('fn'),
          SP,
          w.fn(),
          w.p('('),
          w.id(),
          w.p(': &'),
          w.type(),
          w.p(') -> '),
          w.type('Result'),
          w.p('<'),
          w.type(),
          w.p('> {'),
        ],
        [
          1,
          w.type('Ok'),
          w.p('('),
          w.id(),
          w.p('.'),
          w.fn('iter'),
          w.p('().'),
          w.fn('map'),
          w.p('(|x| x.'),
          w.prop(),
          w.p(' * '),
          w.num(),
          w.p(').'),
          w.fn('collect'),
          w.p('())'),
        ],
        [w.p('}')],
      ],
      (w) => [[w.comment()]],
      (w) => [[w.kw('use'), SP, w.kw('crate'), w.p('::'), w.id(), w.p('::'), w.type(), w.p(';')]],
      (w) => [
        [w.kw('for'), w.p(' i '), w.kw('in'), SP, w.num('0'), w.p('..'), w.num(), w.p(' {')],
        [1, w.id(), w.p('.'), w.fn('push'), w.p('('), w.fn(), w.p('(i).'), w.kw('await'), w.p('?);')],
        [w.p('}')],
      ],
      (w) => [
        [
          w.kw('match'),
          SP,
          w.id(),
          w.p('.'),
          w.prop(),
          w.p(' { '),
          w.type('Some'),
          w.p('(x) => '),
          w.fn(),
          w.p('(x), '),
          w.type('None'),
          w.p(' => '),
          w.fn(),
          w.p('() }'),
        ],
      ],
      (w) => [
        [w.p('#['), w.fn('derive'), w.p('('), w.type('Debug'), w.p(', '), w.type('Clone'), w.p(')]')],
        [w.kw('struct'), SP, w.type(), w.p(' { '), w.prop(), w.p(': '), w.type('u64'), w.p(' }')],
      ],
      (w) => [
        [
          w.kw('let'),
          SP,
          w.kw('mut'),
          SP,
          w.id(),
          w.p(': '),
          w.type(),
          w.p(' = '),
          w.type(),
          w.p('::'),
          w.fn('new'),
          w.p('();'),
        ],
      ],
      (w) => [[w.kw('impl'), SP, w.type(), SP, w.kw('for'), SP, w.type(), w.p(' {}')]],
    ],
  },
  go: {
    ext: 'go',
    quote: '"',
    comment: '//',
    blocks: [
      (w) => [[w.id(), w.p(', err := '), w.id(), w.p('.'), w.fn(), w.p('('), w.str(), w.p(', '), w.num(), w.p(')')]],
      (w) => [
        [w.kw('if'), w.p(' err != '), w.kw('nil'), w.p(' {')],
        [1, w.kw('return'), SP, w.kw('nil'), w.p(', err')],
        [w.p('}')],
      ],
      (w) => [
        [
          w.kw('func'),
          SP,
          w.fn(),
          w.p('('),
          w.id(),
          w.p(' *'),
          w.type(),
          w.p(') (*'),
          w.type(),
          w.p(', '),
          w.type('error'),
          w.p(') {'),
        ],
        [1, w.kw('return'), SP, w.id(), w.p('.'), w.fn(), w.p('('), w.num(), w.p('), '), w.kw('nil')],
        [w.p('}')],
      ],
      (w) => [[w.comment()]],
      (w) => [[w.kw('import'), SP, w.str()]],
      (w) => [
        [w.kw('for'), w.p(' i := '), w.num('0'), w.p('; i < '), w.num(), w.p('; i++ {')],
        [1, w.id(), w.p(' = '), w.fn('append'), w.p('('), w.id(), w.p(', '), w.fn(), w.p('(i))')],
        [w.p('}')],
      ],
      (w) => [
        [w.kw('type'), SP, w.type(), SP, w.kw('struct'), w.p(' { '), w.type('Mood'), SP, w.type('int'), w.p(' }')],
      ],
      (w) => [[w.kw('go'), SP, w.fn(), w.p('('), w.id(), w.p(')')]],
      (w) => [[w.kw('defer'), SP, w.id(), w.p('.'), w.fn('Close'), w.p('()')]],
      (w) => [[w.kw('var'), SP, w.id(), SP, w.type(), w.p(' = '), w.fn('New'), w.p('('), w.str(), w.p(')')]],
    ],
  },
  py: {
    ext: 'py',
    quote: "'",
    comment: '#',
    blocks: [
      (w) => [
        [
          w.id(),
          w.p(' = '),
          w.kw('await'),
          SP,
          w.id(),
          w.p('.'),
          w.fn(),
          w.p('('),
          w.str(),
          w.p(', '),
          w.num(),
          w.p(')'),
        ],
      ],
      (w) => {
        const v = w.id();
        return [
          [w.kw('if'), SP, v, w.p('.'), w.prop(), w.p(' != '), w.num(), w.p(':')],
          [1, w.fn(), w.p('('), v, w.p(')')],
        ];
      },
      (w) => [
        [w.kw('def'), SP, w.fn(), w.p('('), w.id(), w.p(', '), w.id(), w.p('):')],
        [
          1,
          w.kw('return'),
          w.p(' [x.'),
          w.prop(),
          w.p(' * '),
          w.num(),
          SP,
          w.kw('for'),
          w.p(' x '),
          w.kw('in'),
          SP,
          w.id(),
          w.p(']'),
        ],
      ],
      (w) => [[w.comment()]],
      (w) => [[w.kw('from'), SP, w.id(), SP, w.kw('import'), SP, w.type()]],
      (w) => [
        [w.kw('for'), w.p(' i '), w.kw('in'), SP, w.fn('range'), w.p('('), w.num(), w.p('):')],
        [1, w.id(), w.p('.'), w.fn('append'), w.p('('), w.kw('await'), SP, w.fn(), w.p('(i))')],
      ],
      (w) => [
        [w.kw('class'), SP, w.type(), w.p('('), w.type(), w.p('):')],
        [1, w.prop(), w.p(' = '), w.num()],
      ],
      (w) => [
        [w.kw('try'), w.p(':')],
        [1, w.fn(), w.p('()')],
        [w.kw('except'), SP, w.type('Exception'), SP, w.kw('as'), w.p(' e:')],
        [1, w.fn('log'), w.p('(e)')],
      ],
      (w) => [
        [w.kw('with'), SP, w.fn('open'), w.p('('), w.str(), w.p(') '), w.kw('as'), SP, w.id(), w.p(':')],
        [1, w.id(), w.p('.'), w.fn('flush'), w.p('()')],
      ],
      (w) => [[w.id(), w.p(': '), w.type(), w.p(' = '), w.type(), w.p('()')]],
    ],
  },
};

export const languageExt = (id: LanguageId): string => SYNTAX[id].ext;

export class CodeStream {
  private readonly queue: CodeLine[] = [];
  private readonly pick: Pick;
  private readonly words: Words;
  private lang: Syntax = SYNTAX.ts;

  constructor(private readonly rng: () => number = Math.random) {
    this.pick = <T>(items: readonly T[]): T => items[Math.floor(this.rng() * items.length)];
    const pick = this.pick;
    this.words = {
      kw: (s) => ['k', s],
      p: (s) => ['p', s],
      id: () => ['i', pick(WORDS.id)],
      fn: (name) => ['f', name ?? pick(WORDS.fn)],
      type: (name) => ['t', name ?? pick(WORDS.type)],
      prop: () => ['i', pick(WORDS.prop)],
      str: () => ['s', `${this.lang.quote}${pick(WORDS.str)}${this.lang.quote}`],
      num: (n) => ['n', n ?? pick(WORDS.num)],
      comment: () => ['c', `${this.lang.comment} ${pick(WORDS.comment)}`],
    };
  }

  /** Switches language; lines already queued in the old one are dropped. */
  setLanguage(id: LanguageId): void {
    if (this.lang === SYNTAX[id]) return;
    this.lang = SYNTAX[id];
    this.queue.length = 0;
  }

  next(): CodeLine {
    if (this.queue.length === 0) this.refill();
    return this.queue.shift()!;
  }

  private refill(): void {
    const base = this.rng() < 0.35 ? 1 : 0;
    for (const raw of this.pick(this.lang.blocks)(this.words)) {
      const extra = typeof raw[0] === 'number' ? raw[0] : 0;
      const tokens = raw.filter((t): t is Token => typeof t !== 'number');
      const indent = base + extra;
      this.queue.push(indent ? [['p', '  '.repeat(indent)], ...tokens] : tokens);
    }
    if (this.rng() < 0.2) this.queue.push([]);
  }
}
