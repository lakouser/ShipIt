/**
 * Generates endless plausible-looking (and meaningless) TypeScript for the editor.
 * Purely cosmetic: none of this affects the economy.
 */

/** k keyword, f function, s string, n number, t type, c comment, i identifier, p punctuation/space */
export type TokenClass = 'k' | 'f' | 's' | 'n' | 't' | 'c' | 'i' | 'p';
export type Token = readonly [TokenClass, string];
export type CodeLine = readonly Token[];

const WORDS = {
  id: ['user', 'cache', 'payload', 'buffer', 'config', 'session', 'widget', 'queue', 'token', 'router', 'deadline', 'coffee', 'synergy', 'legacy', 'blob', 'kitten', 'pixel', 'vibes', 'ticket', 'backlog'],
  fn: ['fetch', 'parse', 'resolve', 'normalize', 'hydrate', 'debounce', 'yeet', 'retry', 'validate', 'flush', 'reticulate', 'summon', 'compile', 'memoize', 'sanitize', 'shipIt'],
  type: ['User', 'Payload', 'Widget', 'Config', 'Vibe', 'Ticket', 'Sprint', 'Deadline', 'Monolith'],
  prop: ['id', 'data', 'status', 'count', 'meta', 'next', 'value', 'length', 'mood'],
  str: ["'prod'", "'v2'", "'TODO'", "'/api/v3'", "'utf-8'", "'hotfix'", "'main'", "'it works'", "'friday-deploy'"],
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
  type(): Token;
  prop(): Token;
  str(): Token;
  num(n?: string): Token;
  comment(): Token;
}

const SP: Token = ['p', ' '];

const BLOCKS: readonly Block[] = [
  (w) => [[w.kw('const'), SP, w.id(), w.p(' = '), w.kw('await'), SP, w.id(), w.p('.'), w.fn(), w.p('('), w.str(), w.p(', '), w.num(), w.p(');')]],
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
    [1, w.kw('return'), SP, w.id(), w.p('.'), w.fn('map'), w.p('(x => x.'), w.prop(), w.p(' * '), w.num(), w.p(');')],
    [w.p('}')],
  ],
  (w) => [[w.comment()]],
  (w) => [[w.kw('import'), w.p(' { '), w.type(), w.p(' } '), w.kw('from'), SP, w.str(), w.p(';')]],
  (w) => [
    [w.kw('for'), w.p(' ('), w.kw('let'), w.p(' i = '), w.num('0'), w.p('; i < '), w.num(), w.p('; i++) {')],
    [1, w.id(), w.p('.'), w.fn('push'), w.p('('), w.kw('await'), SP, w.fn(), w.p('(i));')],
    [w.p('}')],
  ],
  (w) => [[w.kw('try'), w.p(' { '), w.fn(), w.p('(); } '), w.kw('catch'), w.p(' (e) { '), w.fn('log'), w.p('(e); }')]],
  (w) => [[w.kw('export'), SP, w.kw('default'), SP, w.type(), w.p(';')]],
  (w) => [[w.kw('const'), SP, w.id(), w.p(': '), w.type(), w.p(' = '), w.kw('new'), SP, w.type(), w.p('();')]],
  (w) => [[w.id(), w.p('.'), w.prop(), w.p(' = '), w.id(), w.p('?.'), w.prop(), w.p(' ?? '), w.str(), w.p(';')]],
];

export class CodeStream {
  private readonly queue: CodeLine[] = [];
  private readonly pick: Pick;
  private readonly words: Words;

  constructor(private readonly rng: () => number = Math.random) {
    this.pick = <T>(items: readonly T[]): T => items[Math.floor(this.rng() * items.length)];
    const pick = this.pick;
    this.words = {
      kw: (s) => ['k', s],
      p: (s) => ['p', s],
      id: () => ['i', pick(WORDS.id)],
      fn: (name) => ['f', name ?? pick(WORDS.fn)],
      type: () => ['t', pick(WORDS.type)],
      prop: () => ['i', pick(WORDS.prop)],
      str: () => ['s', pick(WORDS.str)],
      num: (n) => ['n', n ?? pick(WORDS.num)],
      comment: () => ['c', `// ${pick(WORDS.comment)}`],
    };
  }

  next(): CodeLine {
    if (this.queue.length === 0) this.refill();
    return this.queue.shift()!;
  }

  private refill(): void {
    const base = this.rng() < 0.35 ? 1 : 0;
    for (const raw of this.pick(BLOCKS)(this.words)) {
      const extra = typeof raw[0] === 'number' ? raw[0] : 0;
      const tokens = raw.filter((t): t is Token => typeof t !== 'number');
      const indent = base + extra;
      this.queue.push(indent ? [['p', '  '.repeat(indent)], ...tokens] : tokens);
    }
    if (this.rng() < 0.2) this.queue.push([]);
  }
}
