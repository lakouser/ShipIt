import { CodeStream, type CodeLine, type LanguageId } from './codegen';
import { esc } from './dom';
import { hl } from './hl';
import { LOG_TAGS, type LogKind } from './messages';

const MAX_LINES = 70;
const MINIMAP_ROWS = 60;
/** Ghost cursors cycle through this many colours. */
const GHOST_HUES = 4;

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

/** A teammate typing their own line, with a coloured cursor and their name. */
interface Ghost {
  name: string;
  hue: number;
  row: HTMLElement | null;
  line: LiveLine;
}

/**
 * The code editor on screen: types generated code a few characters at a time,
 * prints game messages as highlighted log lines, and keeps a minimap in sync.
 * Teammates type alongside as "ghost" lines.
 */
export class Editor {
  private readonly stream = new CodeStream();
  private live: LiveLine;
  private readonly minimap: { width: number; indent: number; cls: string }[] = [];
  private ghosts: Ghost[] = [];
  private ghostTurn = 0;
  /** While true (the screensaver is up), nothing is typed. */
  frozen = false;

  constructor(
    private readonly els: { lines: HTMLElement; live: HTMLElement; minimap: HTMLElement },
    private readonly counter: LineCounter,
  ) {
    this.live = this.makeLine();
  }

  setLanguage(id: LanguageId): void {
    this.stream.setLanguage(id);
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
    if (this.frozen) return;
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
    row.lastElementChild!.insertAdjacentHTML('beforeend', hl(text));
    this.els.lines.insertBefore(row, this.els.live);
    this.trim();
  }

  /** Flashes the line being typed (a critical tap). */
  flashLive(): void {
    const el = this.els.live;
    el.classList.remove('crit');
    void el.offsetWidth; // restart the animation
    el.classList.add('crit');
  }

  /** The teammates who type alongside, by name. Those who left finish their line. */
  setGhosts(names: string[]): void {
    if (names.join('|') === this.ghosts.map((g) => g.name).join('|')) return;
    for (const g of this.ghosts) if (!names.includes(g.name)) this.finishGhost(g);
    this.ghosts = names.map((name, i) => this.ghosts.find((g) => g.name === name) ?? { name, hue: i % GHOST_HUES, row: null, line: this.makeLine() });
  }

  /** Types n characters spread over the teammates, a few each in turn. */
  typeGhosts(n: number): void {
    if (this.frozen || this.ghosts.length === 0) return;
    let guard = 0;
    while (n > 0 && guard++ < 12) {
      const g = this.ghosts[this.ghostTurn++ % this.ghosts.length];
      const chars = Math.min(n, 3);
      n -= chars;
      if (g.row && !g.row.isConnected) g.row = null; // trimmed off the top
      if (!g.row) this.startGhost(g);
      g.line.typed += chars;
      if (g.line.typed >= g.line.length) this.finishGhost(g);
      else this.paintGhost(g);
    }
  }

  private startGhost(g: Ghost): void {
    g.line = this.makeLine();
    let guard = 0;
    while (g.line.length === 0 && guard++ < 5) g.line = this.makeLine();
    const row = document.createElement('div');
    row.className = 'ln new ghost';
    row.innerHTML = `<span class="g">${this.counter.get()}</span><span class="tx"></span>`;
    this.els.lines.insertBefore(row, this.els.live);
    this.counter.set(this.counter.get() + 1);
    g.row = row;
    this.renderLive();
    this.trim();
  }

  private paintGhost(g: Ghost): void {
    if (!g.row) return;
    g.row.lastElementChild!.innerHTML = `${this.paint(g.line, g.line.typed)}<i class="cur gc gc${g.hue}"></i><b class="who gc${g.hue}">${esc(g.name)}</b>`;
  }

  private finishGhost(g: Ghost): void {
    if (g.row?.isConnected) {
      g.row.classList.remove('ghost');
      g.row.lastElementChild!.innerHTML = this.paint(g.line, g.line.length);
      this.pushMinimap(g.line);
    }
    g.row = null;
  }

  private makeLine(): LiveLine {
    const tokens = this.stream.next();
    return { tokens, length: tokens.reduce((sum, t) => sum + t[1].length, 0), typed: 0 };
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

  private pushMinimap(line: LiveLine): void {
    const first = line.tokens[0];
    const indent = first && first[0] === 'p' && first[1].trim() === '' ? first[1].length / 2 : 0;
    const main = line.tokens.find((t) => t[0] !== 'p');
    this.minimap.push({ width: Math.min(100, line.length * 1.7), indent: indent * 14, cls: main ? `mm${main[0]}` : 'mmx' });
    if (this.minimap.length > MINIMAP_ROWS) this.minimap.shift();
    this.els.minimap.innerHTML = this.minimap
      .map((m) => `<b class="${m.cls}" style="width:${m.width}%;margin-left:${m.indent}%"></b>`)
      .join('');
  }

  private finishLine(): void {
    const row = document.createElement('div');
    row.className = 'ln new';
    row.innerHTML = `<span class="g">${this.counter.get()}</span><span class="tx">${this.paint(this.live, this.live.length)}</span>`;
    this.els.lines.insertBefore(row, this.els.live);
    this.counter.set(this.counter.get() + 1);
    this.pushMinimap(this.live);
    this.live = this.makeLine();
    this.trim();
  }

  private trim(): void {
    while (this.els.lines.children.length > MAX_LINES) this.els.lines.firstElementChild!.remove();
  }
}
