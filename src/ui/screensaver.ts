/** Rain: column width and row height in pixels. */
const COL_W = 10;
const ROW_H = 18;
/** Milliseconds between frames (a deliberately low frame rate, like an old terminal). */
const FRAME_MS = 70;
const GLYPHS = '01{}[]()<>=+-*/;:.$#&|!?_~^%';
/** Pipes: grid cell size in pixels. */
const CELL = 14;
const DIRS: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

interface Drop {
  y: number;
  speed: number;
  ch: string;
}

/** Shown when the player goes idle: code rain and 3D-ish pipes, taking turns. Colours come from the active theme. */
export class Screensaver {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private raf = 0;
  private last = 0;
  private mode: 'rain' | 'pipes' = 'rain';
  private runs = 0;
  private w = 0;
  private h = 0;
  private colors = { bg: '#000', main: '#0f0', bright: '#fff', accents: ['#0f0'] };
  private drops: Drop[] = [];
  private pipe = { x: 0, y: 0, dir: 0, color: 0, steps: 0, total: 0 };

  constructor(
    private readonly root: HTMLElement,
    private readonly tag: HTMLElement,
  ) {
    this.canvas = root.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d');
  }

  get active(): boolean {
    return !this.root.hidden;
  }

  start(): void {
    if (this.active || !this.ctx) return;
    this.root.hidden = false;
    this.mode = this.runs++ % 2 === 0 ? 'rain' : 'pipes';
    this.resize();
    this.readColors();
    const ctx = this.ctx;
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    if (this.mode === 'rain') {
      const cols = Math.ceil(this.w / COL_W);
      this.drops = Array.from({ length: cols }, () => ({ y: -Math.random() * 30, speed: 0.4 + Math.random() * 0.8, ch: ' ' }));
    } else this.newPipe(true);
    this.last = 0;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop(): void {
    if (!this.active) return;
    cancelAnimationFrame(this.raf);
    this.root.hidden = true;
  }

  /** The label in the corner (how long the player has been away, what was written meanwhile). */
  setTag(text: string): void {
    if (this.tag.textContent !== text) this.tag.textContent = text;
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, this.root.clientWidth);
    this.h = Math.max(1, this.root.clientHeight);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private readColors(): void {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    this.colors = {
      bg: v('--pane', '#0a1511'),
      main: v('--green', '#7ee0a1'),
      bright: v('--c-time', '#ffffff'),
      accents: [v('--green', '#7ee0a1'), v('--cyan', '#74d0e0'), v('--butter', '#f2c94c'), v('--coral', '#ff6a3d'), v('--c-auto', '#b9a6ff')],
    };
  }

  private frame(t: number): void {
    if (!this.active) return;
    this.raf = requestAnimationFrame((t2) => this.frame(t2));
    if (t - this.last < FRAME_MS) return;
    this.last = t;
    if (this.root.clientWidth !== this.w || this.root.clientHeight !== this.h) {
      this.resize();
      this.ctx!.fillStyle = this.colors.bg;
      this.ctx!.fillRect(0, 0, this.w, this.h);
    }
    if (this.mode === 'rain') this.rain();
    else for (let i = 0; i < 3; i++) this.pipes();
  }

  private rain(): void {
    const ctx = this.ctx!;
    // Fade what is there a little each frame, leaving trails.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;
    ctx.font = "600 14px 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";
    ctx.textBaseline = 'top';
    const rows = Math.ceil(this.h / ROW_H);
    this.drops.forEach((d, i) => {
      const before = Math.floor(d.y);
      d.y += d.speed;
      const row = Math.floor(d.y);
      if (row !== before && row >= 0) {
        // The previous head turns ordinary; a new bright head appears below it.
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(i * COL_W, (row - 1) * ROW_H, COL_W, ROW_H);
        ctx.fillStyle = this.colors.main;
        ctx.fillText(d.ch, i * COL_W, (row - 1) * ROW_H);
        d.ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(i * COL_W, row * ROW_H, COL_W, ROW_H);
        ctx.fillStyle = this.colors.bright;
        ctx.fillText(d.ch, i * COL_W, row * ROW_H);
      }
      if (row > rows + 4 && Math.random() < 0.1) {
        d.y = -Math.random() * 12;
        d.speed = 0.4 + Math.random() * 0.8;
      }
    });
  }

  private newPipe(first = false): void {
    const cols = Math.max(2, Math.floor(this.w / CELL));
    const rows = Math.max(2, Math.floor(this.h / CELL));
    this.pipe = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
      dir: Math.floor(Math.random() * 4),
      color: first ? 0 : (this.pipe.color + 1) % this.colors.accents.length,
      steps: 0,
      total: first ? 0 : this.pipe.total,
    };
  }

  private pipes(): void {
    const ctx = this.ctx!;
    const p = this.pipe;
    const cols = Math.max(2, Math.floor(this.w / CELL));
    const rows = Math.max(2, Math.floor(this.h / CELL));
    // Start over once the screen is mostly full.
    if (p.total > cols * rows * 0.9) {
      ctx.fillStyle = this.colors.bg;
      ctx.fillRect(0, 0, this.w, this.h);
      p.total = 0;
      this.newPipe();
      return;
    }
    const turn = Math.random() < 0.22;
    if (turn) p.dir = (p.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
    const [dx, dy] = DIRS[p.dir];
    const nx = p.x + dx;
    const ny = p.y + dy;
    const px = (n: number) => n * CELL + CELL / 2;
    ctx.strokeStyle = this.colors.accents[p.color];
    ctx.fillStyle = this.colors.accents[p.color];
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(px(p.x), px(p.y));
    ctx.lineTo(px(nx), px(ny));
    ctx.stroke();
    // A joint at each turn.
    if (turn) ctx.fillRect(px(p.x) - 3, px(p.y) - 3, 6, 6);
    p.x = nx;
    p.y = ny;
    p.steps++;
    p.total++;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || p.steps > 60 + Math.random() * 80) this.newPipe();
  }
}
