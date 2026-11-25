import { CodeStream, type CodeLine } from './codegen';
import { esc } from './dom';
import { LOG_TAGS, type LogKind } from './messages';

const MAX_LINES = 70;
const MINIMAP_ROWS = 60;

interface LiveLine {
  tokens: CodeLine;
  length: number;
  typed: number;
}

/** Line number storage lives in the game state so it survives reloads. */
export interface LineCounter {
  get(): number;
  set(n: number): void;
}

/**
 * The code editor on screen: types generated code a few characters at a time,
 * prints game messages as highlighted log lines, and keeps a minimap in sync.
 */
export class Editor {
  private readonly stream = new CodeStream();
  private live!: LiveLine;
  private readonly minimap: { width: number; indent: number; cls: string }[] = [];

  constructor(
    private readonly els: { lines: HTMLElement; live: HTMLElement; minimap: HTMLElement },
    private readonly counter: LineCounter,
  ) {
    this.nextLine();
  }

  /** Fills the screen with already-written code ending at the saved line number. */
  prefill(lines: number): void {
    const end = this.counter.get();
    this.counter.set(Math.max(1, end - lines));
    let guard = 0;
    while (this.counter.get() < end && guard++ < 500) this.type(200);
    this.type(12);
  }

  /** Types n characters, finishing lines as needed. */
  type(n: number): void {
    let guard = 0;
    while (n > 0 && guard++ < 40) {
      const left = this.live.length - this.live.typed;
      if (left <= n) {
        n -= left;
        this.finishLine();
      } else {
        this.live.typed += n;
        n = 0;
      }
    }
    this.renderLive();
  }

  /** Prints a tagged log line ([ ok ], [warn], $ …) above the line being typed. */
  log(text: string, kind: LogKind = 'info'): void {
    const row = document.createElement('div');
    row.className = 'ln sys';
    row.innerHTML = `<span class="g"></span><span class="tx"><span class="tag tag-${kind}">${LOG_TAGS[kind]}</span> </span>`;
    row.lastElementChild!.append(text);
    this.els.lines.insertBefore(row, this.els.live);
    this.trim();
  }

  private nextLine(): void {
    const tokens = this.stream.next();
    this.live = { tokens, length: tokens.reduce((sum, t) => sum + t[1].length, 0), typed: 0 };
  }

  private paint(line: LiveLine, chars: number): string {
    let out = '';
    let left = chars;
    for (const [cls, text] of line.tokens) {
      if (left <= 0) break;
      const part = text.slice(0, left);
      left -= part.length;
      out += `<span class="${cls}">${esc(part)}</span>`;
    }
    return out;
  }

  private renderLive(): void {
    this.els.live.innerHTML = `<span class="g">${this.counter.get()}</span><span class="tx">${this.paint(this.live, this.live.typed)}<i class="cur"></i></span>`;
  }

  private finishLine(): void {
    const row = document.createElement('div');
    row.className = 'ln new';
    row.innerHTML = `<span class="g">${this.counter.get()}</span><span class="tx">${this.paint(this.live, this.live.length)}</span>`;
    this.els.lines.insertBefore(row, this.els.live);
    this.counter.set(this.counter.get() + 1);

    const first = this.live.tokens[0];
    const indent = first && first[0] === 'p' && first[1].trim() === '' ? first[1].length / 2 : 0;
    const main = this.live.tokens.find((t) => t[0] !== 'p');
    this.minimap.push({ width: Math.min(100, this.live.length * 1.7), indent: indent * 14, cls: main ? `mm${main[0]}` : 'mmx' });
    if (this.minimap.length > MINIMAP_ROWS) this.minimap.shift();
    this.els.minimap.innerHTML = this.minimap
      .map((m) => `<b class="${m.cls}" style="width:${m.width}%;margin-left:${m.indent}%"></b>`)
      .join('');

    this.nextLine();
    this.trim();
  }

  private trim(): void {
    while (this.els.lines.children.length > MAX_LINES) this.els.lines.firstElementChild!.remove();
  }
}
