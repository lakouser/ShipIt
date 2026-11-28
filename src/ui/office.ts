import type { RoleId } from '../core/content';
import { owned } from '../core/economy';
import { effectActive } from '../core/effects';
import type { Game } from '../core/game';
import { infraSlots } from '../core/infra';
import { prefersReducedMotion } from './dom';

/*
 * office.png: a small pixel-art view of the company, drawn on a canvas a few times a second. The room grows with the
 * funding rounds (a garage, a co-working space, an office floor, a tower), the team sit at their desks doing what
 * their roles say, the sky in the windows follows the real time of day, and whatever is going on in the game shows:
 * coffee steams, racks blink red in an outage, a bug crawls across the floor, confetti falls on a release.
 *
 * Everything is drawn in whole logical pixels and scaled up by the stylesheet (image-rendering: pixelated).
 */

/** Logical height of the scene in pixels. */
const H = 40;
const FLOOR_Y = 33;
/** Redraws per second. */
const FPS = 6;

type Rgb = [number, number, number];
const hex = (c: string): Rgb => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const rgb = ([r, g, b]: Rgb): string => `rgb(${r | 0},${g | 0},${b | 0})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** The sky by hour: top and horizon colours, joined up linearly between these. */
const SKY: [number, string, string][] = [
  [0, '#060a18', '#0c1630'],
  [4.5, '#0a0f24', '#1a2040'],
  [6, '#3a3566', '#e08a6a'],
  [7.5, '#5aa2e6', '#f6d6a8'],
  [10, '#4a98e2', '#b6dcf4'],
  [16, '#4a90dc', '#b0d6f0'],
  [18, '#6a5a9a', '#f2a060'],
  [19.5, '#3a2a5e', '#c0605a'],
  [21, '#0e1230', '#2a2850'],
  [24, '#060a18', '#0c1630'],
];

function skyAt(hour: number): { top: Rgb; low: Rgb; night: number } {
  let i = 0;
  while (i < SKY.length - 2 && hour >= SKY[i + 1][0]) i++;
  const [h0, t0, l0] = SKY[i];
  const [h1, t1, l1] = SKY[i + 1];
  const f = Math.max(0, Math.min(1, (hour - h0) / (h1 - h0)));
  // How dark it is, 0 (day) to 1 (night), for the lights.
  const night = hour < 5 ? 1 : hour < 7 ? (7 - hour) / 2 : hour < 18 ? 0 : hour < 21 ? (hour - 18) / 3 : 1;
  return { top: mix(hex(t0), hex(t1), f), low: mix(hex(l0), hex(l1), f), night };
}

/** A cheap repeatable noise in 0–1 from two integers. */
const noise = (a: number, b: number): number => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const SKIN = ['#f1c9a5', '#c68e62', '#8d5a3b', '#e8b890', '#a9714a', '#f5d7b8'];
const HAIR = ['#2b1d16', '#6b3f22', '#d9a441', '#1b1b1f', '#a03a2a', '#c9c9d4', '#3a2a5a', '#e07a9a'];
const SHIRT: Record<RoleId, string> = { features: '#b9a6ff', sprints: '#ff9a6b', oncall: '#ff6b81', bugs: '#74d0e0', refactor: '#7ee0a1' };

/** A seated developer facing left: hair H, skin S, shirt T, arm A, trousers P, chair C. */
const DEV = ['.HHH..', 'HHHH..', 'SSSH..', 'SSSH..', '.SS...', '.TTT.C', 'ATTT.C', '.TTT.C', '.TTTCC', '.PPPC.'];
const DEV_ARM_UP = ['.HHH..', 'HHHH..', 'SSSH..', 'SSSH..', '.SS...', 'ATTT.C', '.TTT.C', '.TTT.C', '.TTTCC', '.PPPC.'];
/** Leaning back with a mug. */
const DEV_IDLE = ['..HHH.', '.HHHH.', '.SSSH.', '.SSSH.', '..SS..', '.MTTTC', '.ATTTC', '..TTTC', '..TTCC', '.PPPC.'];
const DUCK = ['.YY.', 'OYYY', '.YY.'];
const PLANT = ['.G.G.', 'GGGG.', '.GGGG', '.GG..', '.BB..', '.BB..'];
const STAR = ['.Y.', 'YYY', '.Y.'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  life: number;
}

export class Office {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private w = 0;
  private scale = 2;
  private lastDraw = 0;
  private frame = 0;
  private particles: Particle[] = [];
  /** Set by the app: the player tapped within the last moment. */
  typing = false;
  /** For looking at the lighting: `?hour=22` in the address pins the time of day. */
  private readonly hourOverride = (() => {
    try {
      const h = Number(new URLSearchParams(location.search).get('hour') ?? NaN);
      return Number.isFinite(h) && h >= 0 && h < 24 ? h : null;
    } catch {
      return null;
    }
  })();

  constructor(
    private readonly el: HTMLElement,
    private readonly game: Game,
  ) {
    this.canvas = el.querySelector('canvas') ?? el.appendChild(document.createElement('canvas'));
    this.ctx = this.canvas.getContext('2d');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'The office');
  }

  /** Confetti from the ceiling (a release shipped). Not with reduced motion. */
  celebrate(): void {
    if (this.el.hidden || prefersReducedMotion()) return;
    const colours = ['#f2c94c', '#ff6a3d', '#7ee0a1', '#74d0e0', '#b9a6ff'];
    for (let i = 0; i < 46; i++)
      this.particles.push({ x: Math.random() * this.w, y: -Math.random() * 10, vx: (Math.random() - 0.5) * 0.8, vy: 0.6 + Math.random() * 0.9, c: colours[i % colours.length], life: 30 + Math.random() * 20 });
  }

  /** Redraws if the pane is showing and a frame is due. `now` is performance.now(). */
  update(now: number): void {
    if (this.el.hidden || !this.ctx) return;
    // With reduced motion the scene still keeps up with the game, once a second, without the flicker.
    if (now - this.lastDraw < (prefersReducedMotion() ? 1000 : 1000 / FPS)) return;
    this.lastDraw = now;
    this.frame++;
    this.resize();
    if (this.w > 0) this.draw();
  }

  private resize(): void {
    const css = this.el.clientWidth;
    if (css <= 0) return;
    const scale = css >= 620 ? 3 : 2;
    const w = Math.ceil(css / scale);
    if (w === this.w && scale === this.scale) return;
    this.w = w;
    this.scale = scale;
    this.canvas.width = w;
    this.canvas.height = H;
    this.canvas.style.height = `${H * scale}px`;
  }

  private px(x: number, y: number, w: number, h: number, c: string): void {
    this.ctx!.fillStyle = c;
    this.ctx!.fillRect(Math.round(x), Math.round(y), w, h);
  }

  private sprite(x: number, y: number, rows: readonly string[], pal: Record<string, string>): void {
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < rows[r].length; c++) {
        const colour = pal[rows[r][c]];
        if (colour) this.px(x + c, y + r, 1, 1, colour);
      }
  }

  /** The sky, with sun or moon, stars and clouds, clipped to a window. */
  private sky(x: number, y: number, w: number, h: number, hour: number, skyline: number): void {
    const ctx = this.ctx!;
    const { top, low, night } = skyAt(hour);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const y0 = y + Math.floor((h * i) / bands);
      const y1 = y + Math.floor((h * (i + 1)) / bands);
      this.px(x, y0, w, y1 - y0, rgb(mix(top, low, i / (bands - 1))));
    }
    // Stars come out as it gets dark.
    if (night > 0.4)
      for (let i = 0; i < 40; i++) {
        const sx = Math.floor(noise(i, 1) * this.w);
        const sy = 1 + Math.floor(noise(i, 2) * 20);
        if (noise(i, Math.floor(this.frame / 5)) > 0.25) this.px(sx, sy, 1, 1, `rgba(255,255,240,${0.35 + 0.5 * night * noise(i, 3)})`);
      }
    // The sun crosses from 6 to 19, the moon through the night.
    const arc = (from: number, span: number): [number, number] | null => {
      const t = (((hour - from) % 24) + 24) % 24 / span;
      if (t < 0 || t > 1) return null;
      return [6 + t * (this.w - 12), 15 - Math.sin(t * Math.PI) * 12];
    };
    const sun = arc(6, 13);
    if (sun) {
      this.px(sun[0] - 2, sun[1] - 2, 5, 5, 'rgba(255,236,170,0.25)');
      this.px(sun[0] - 1, sun[1] - 1, 3, 3, '#ffe9a0');
    }
    const moon = arc(19.5, 10.5);
    if (moon) {
      this.px(moon[0] - 1, moon[1] - 1, 3, 3, '#e8ecf4');
      this.px(moon[0], moon[1] - 1, 2, 2, rgb(mix(top, low, 0.2)));
    }
    // Clouds drift by day.
    if (night < 0.8)
      for (let i = 0; i < 3; i++) {
        const cx = ((this.frame * (0.05 + i * 0.02) + i * 70) % (this.w + 30)) - 15;
        const cy = 5 + i * 4;
        const c = `rgba(255,255,255,${0.5 * (1 - night)})`;
        this.px(cx, cy, 9, 2, c);
        this.px(cx + 2, cy - 1, 5, 1, c);
      }
    // A skyline along the bottom of the window, lit at night.
    if (skyline > 0) {
      const base = y + h;
      for (let bx = x - (x % 5); bx < x + w; bx += 5) {
        const bh = 2 + Math.floor(noise(bx, 9) * skyline);
        this.px(bx, base - bh, 4, bh, rgb(mix(hex('#1c2533'), low, 0.25 * (1 - night))));
        if (night > 0.3) for (let wy = base - bh + 1; wy < base - 1; wy += 2) if (noise(bx, wy) > 0.45) this.px(bx + 1 + (wy % 2), wy, 1, 1, '#ffd98a');
      }
    }
    ctx.restore();
  }

  private draw(): void {
    const s = this.game.state;
    const W = this.w;
    const f = this.frame;
    const date = new Date();
    const hour = this.hourOverride ?? date.getHours() + date.getMinutes() / 60;
    const { night } = skyAt(hour);
    const stage = s.round >= 4 ? 3 : s.round >= 2 ? 2 : s.round >= 1 ? 1 : 0;
    const alarm = s.incident?.kind === 'outage' || s.boss?.phase === 'fight';
    const coffee = effectActive(s, 'coffee', this.game.now());
    const blink = f % 2 === 0;

    /* ---- the room ---- */
    if (stage === 0) {
      // A garage: planks, a roller door with a row of little panes, a bare bulb, boxes.
      this.px(0, 0, W, FLOOR_Y, '#24272e');
      for (let y = 5; y < FLOOR_Y; y += 6) this.px(0, y, W, 1, '#2c3038');
      const dx = Math.floor(W * 0.6);
      const dw = W - dx - 5;
      this.px(dx - 1, 5, dw + 2, FLOOR_Y - 5, '#1a1c21');
      this.px(dx, 6, dw, FLOOR_Y - 6, '#3d434d');
      for (let y = 10; y < FLOOR_Y; y += 4) this.px(dx, y, dw, 1, '#2e333b');
      for (let x = dx + 2; x + 5 < dx + dw; x += 7) this.sky(x, 7, 5, 3, hour, 0);
      // A shelf of things that might be useful one day, and the bike that gets you here.
      const sx = 34;
      this.px(sx, 13, 22, 1, '#6b5238');
      this.px(sx + 1, 14, 1, 2, '#4a3826');
      this.px(sx + 20, 14, 1, 2, '#4a3826');
      [['#c2553f', 3], ['#3f7fc2', 4], ['#d9b44a', 2], ['#5aa86a', 4], ['#8a8f99', 3]].forEach(([c, h], i) => this.px(sx + 2 + i * 4, 13 - (h as number), 3, h as number, c as string));
      const kx = Math.floor(W * 0.3);
      if (kx > sx + 26) {
        for (const wx of [kx, kx + 9]) {
          this.px(wx + 1, FLOOR_Y - 6, 3, 1, '#11141a');
          this.px(wx + 1, FLOOR_Y - 1, 3, 1, '#11141a');
          this.px(wx, FLOOR_Y - 5, 1, 4, '#11141a');
          this.px(wx + 4, FLOOR_Y - 5, 1, 4, '#11141a');
        }
        this.px(kx + 2, FLOOR_Y - 7, 9, 1, '#d24a3a');
        this.px(kx + 6, FLOOR_Y - 6, 1, 3, '#d24a3a');
        this.px(kx + 10, FLOOR_Y - 9, 1, 3, '#d24a3a');
        this.px(kx + 9, FLOOR_Y - 9, 3, 1, '#8a8f99');
        this.px(kx + 1, FLOOR_Y - 8, 3, 1, '#2a2d33');
      }
      // Boxes of merchandise nobody ordered.
      const bx = Math.floor(W * 0.45);
      this.px(bx, FLOOR_Y - 6, 8, 6, '#9a7648');
      this.px(bx, FLOOR_Y - 4, 8, 1, '#c9a674');
      this.px(bx + 3, FLOOR_Y - 10, 6, 4, '#86653c');
      this.px(bx + 3, FLOOR_Y - 9, 6, 1, '#c9a674');
      this.px(0, FLOOR_Y, W, H - FLOOR_Y, '#3a3d43');
      this.px(Math.floor(W * 0.45) + 12, FLOOR_Y + 3, 9, 2, '#2f3237');
    } else if (stage === 1) {
      // A co-working space: brick, two tall windows, string lights.
      this.px(0, 0, W, FLOOR_Y, '#5c3b33');
      for (let y = 0; y < FLOOR_Y; y += 4) {
        this.px(0, y + 3, W, 1, '#472d27');
        for (let x = (y / 4) % 2 ? 0 : 4; x < W; x += 8) this.px(x, y, 1, 3, '#472d27');
      }
      for (const fx of [0.34, 0.62]) {
        const wx = Math.floor(W * fx);
        this.px(wx - 1, 4, 22, 21, '#2a1b17');
        this.sky(wx, 5, 20, 19, hour, 5);
        this.px(wx + 9, 5, 1, 19, '#2a1b17');
        this.px(wx, 14, 20, 1, '#2a1b17');
        this.px(wx - 2, 25, 24, 1, '#7a5348');
      }
      for (let x = 2; x < W; x += 6) {
        const y = 2 + Math.round(Math.sin(x / 9) * 1.2);
        this.px(x, y, 1, 1, ['#ffd98a', '#ff9a6b', '#9ae0ff'][((x / 6) | 0) % 3]);
      }
      this.px(0, FLOOR_Y, W, H - FLOOR_Y, '#7b5a3e');
      for (let x = 0; x < W; x += 14) this.px(x, FLOOR_Y, 1, H - FLOOR_Y, '#684a32');
      this.px(0, FLOOR_Y, W, 1, '#8c694a');
    } else if (stage === 2) {
      // An office floor: a long window, a whiteboard, carpet.
      this.px(0, 0, W, FLOOR_Y, '#2c3945');
      this.px(0, 0, W, 2, '#243039');
      const wx = 30;
      const ww = W - wx - 34;
      this.px(wx - 1, 5, ww + 2, 17, '#1b232b');
      this.sky(wx, 6, ww, 15, hour, 7);
      for (let x = wx + 15; x < wx + ww; x += 16) this.px(x, 6, 1, 15, '#1b232b');
      this.px(wx - 2, 22, ww + 4, 1, '#3d4c5a');
      // The whiteboard, with this sprint's plan.
      const bx = W - 30;
      this.px(bx - 1, 8, 15, 11, '#8a959c');
      this.px(bx, 9, 13, 9, '#e6ecef');
      this.px(bx + 1, 10, 5, 1, '#ff6a3d');
      this.px(bx + 1, 12, 8, 1, '#3a6ea5');
      this.px(bx + 1, 14, 6, 1, '#3a6ea5');
      this.px(bx + 8, 14, 3, 3, '#7ee0a1');
      this.px(0, FLOOR_Y, W, H - FLOOR_Y, '#31465a');
      for (let x = 0; x < W; x += 3) this.px(x, FLOOR_Y + 1 + (x % 2) * 3, 1, 1, '#3a5168');
      this.px(0, FLOOR_Y, W, 1, '#405a72');
    } else {
      // The tower: glass from floor to ceiling, the city far below.
      this.px(0, 0, W, FLOOR_Y, '#18202a');
      this.sky(0, 2, W, FLOOR_Y - 3, hour, 13);
      for (let x = 19; x < W; x += 22) this.px(x, 2, 1, FLOOR_Y - 3, '#141a22');
      this.px(0, 0, W, 2, '#10151c');
      this.px(0, FLOOR_Y - 1, W, 1, '#2a3440');
      this.px(0, FLOOR_Y, W, H - FLOOR_Y, '#3c4753');
      for (let x = 4; x < W; x += 22) this.px(x, FLOOR_Y + 1, 8, 1, '#4b5865');
      this.px(0, FLOOR_Y, W, 1, '#52606e');
    }

    // After the IPO: an LED ticker along the ceiling.
    if (s.corp.ipoAt) {
      this.px(0, 0, W, 3, '#0a0d12');
      for (let x = 0; x < W; x += 2) {
        const v = noise(Math.floor((x + f) / 6), 4);
        if (noise(x + f, 5) > 0.35) this.px(x, 1, 1, 1, v > 0.4 ? '#58e08a' : '#ff6b6b');
      }
    }

    // A gold star on the wall for every round raised, a frame for every company sold.
    for (let i = 0; i < Math.min(5, s.round); i++) this.sprite(6 + i * 4, s.corp.ipoAt ? 5 : 4, STAR, { Y: '#f2c94c' });
    for (let i = 0; i < Math.min(3, s.founder.exits); i++) {
      this.px(6 + i * 7, 10, 6, 5, '#c9a23a');
      this.px(7 + i * 7, 11, 4, 3, ['#7ee0a1', '#74d0e0', '#b9a6ff'][i]);
    }

    /* ---- furniture on the right: racks and a plant ---- */
    const racks = s.round >= 5 ? 3 : s.round >= 3 ? 2 : s.round >= 1 ? 1 : 0;
    const lit = infraSlots(s) > 0 ? s.infra.live.filter(Boolean).length : 0;
    let rightEdge = W - 3;
    for (let i = 0; i < racks; i++) {
      const rx = rightEdge - 8;
      this.px(rx, 15, 8, FLOOR_Y - 15, '#141920');
      this.px(rx, 15, 8, 1, '#2c3642');
      this.px(rx + 7, 15, 1, FLOOR_Y - 15, '#0c1015');
      for (let row = 0; row < 7; row++) {
        const y = 17 + row * 2;
        this.px(rx + 1, y, 5, 1, '#1e262f');
        const on = row < 2 + lit && noise(row + i * 9, Math.floor(f / 2)) > 0.3;
        if (on) this.px(rx + 1 + ((row + i) % 2), y, 1, 1, alarm ? '#ff5a5a' : '#58e08a');
        if (noise(row * 3 + i, Math.floor(f / 3)) > 0.6) this.px(rx + 4, y, 1, 1, alarm ? '#ff9a3a' : '#f2c94c');
      }
      rightEdge = rx - 2;
    }
    if (stage >= 1) {
      this.sprite(rightEdge - 5, FLOOR_Y - 6, PLANT, { G: '#4fae6a', B: '#b0623a' });
      rightEdge -= 8;
    }

    /* ---- the dark, then everything that gives light ---- */
    if (night > 0) this.px(0, 0, W, H, `rgba(4,6,18,${0.34 * night})`);
    if (stage === 0) {
      // The bulb.
      this.px(22, 0, 1, 5, '#15171b');
      this.px(19, 3, 7, 7, `rgba(255,233,168,${0.08 + 0.1 * night})`);
      this.px(20, 4, 5, 5, `rgba(255,233,168,${0.1 + 0.12 * night})`);
      this.px(21, 5, 3, 3, '#ffe9a8');
    }
    if (alarm) {
      // A beacon on the wall.
      this.px(rightEdge - 2, 4, 3, 2, blink ? '#ff5a5a' : '#7a2a2a');
      if (blink) this.px(rightEdge - 5, 2, 9, 6, 'rgba(255,60,60,0.16)');
      this.px(0, 0, W, H, `rgba(255,40,40,${blink ? 0.07 : 0.03})`);
    }
    if (coffee) this.px(0, 0, W, H, 'rgba(255,200,90,0.06)');

    /* ---- desks ---- */
    const desk = (x: number, w: number): void => {
      this.px(x, 28, w, 1, '#a8825a');
      this.px(x, 29, w, 1, '#7a5c3e');
      this.px(x + 1, 30, 1, FLOOR_Y - 30, '#5e4630');
      this.px(x + w - 2, 30, 1, FLOOR_Y - 30, '#5e4630');
    };
    const monitor = (x: number, w: number, h: number, colour: string, busy: boolean, seed: number): void => {
      const y = 27 - h - 1;
      // The glow on the wall behind it, then the screen.
      this.px(x - 1, y - 1, w + 2, h + 2, `rgba(160,220,255,${0.03 + 0.07 * night})`);
      this.px(x, y, w, h, '#0d1117');
      this.px(x + Math.floor(w / 2), 27, 1, 1, '#0d1117');
      this.px(x + Math.floor(w / 2) - 1, 27, 3, 1, '#20262e');
      // Lines of code, scrolling while their owner types.
      for (let row = 0; row < h - 2; row++) {
        const len = 1 + Math.floor(noise(seed + row + (busy ? Math.floor(f / 2) : 0), 7) * (w - 3));
        this.px(x + 1, y + 1 + row, len, 1, alarm ? '#ff6b6b' : colour);
      }
    };
    const chair = (x: number): void => {
      this.px(x, 28, 5, 1, '#2a313b');
      this.px(x + 2, 29, 1, FLOOR_Y - 30, '#1c222a');
      this.px(x, FLOOR_Y - 1, 5, 1, '#1c222a');
    };

    // Your desk: the big monitor, the duck, a mug when there is coffee.
    const you = 4;
    desk(you, 21);
    monitor(you + 2, 10, 7, '#ff8a5c', this.typing, 1);
    if (blink || !this.typing) this.px(you + 9, 25, 1, 1, '#ff6a3d');
    this.px(you + 13, 27, 5, 1, '#8b98a5');
    if (owned(s, 'duck') > 0) this.sprite(you + 1, 25 - (f % 9 === 0 ? 1 : 0), DUCK, { Y: '#f2c94c', O: '#ff9a3a' });
    if (coffee) {
      this.px(you + 18, 26, 2, 2, '#e6ecef');
      this.px(you + 18 + (f % 2), 23 + (f % 3 === 0 ? 0 : 1), 1, 1, 'rgba(255,255,255,0.55)');
    }
    chair(you + 20);
    this.sprite(you + 20, 18, this.typing && blink ? DEV_ARM_UP : DEV, { H: '#ff6a3d', S: SKIN[0], T: '#d9e4d0', A: SKIN[0], P: '#34404c', C: '#2a313b' });

    // The team, as many desks as there is room for.
    const first = you + 32;
    const step = 25;
    const room = Math.max(0, Math.floor((rightEdge - first) / step));
    s.team.slice(0, room).forEach((d, i) => {
      const x = first + i * step;
      const busy =
        d.role === 'features' || d.role === 'refactor' ? true
        : d.role === 'sprints' ? !!s.sprint
        : d.role === 'oncall' ? alarm
        : !!s.bug;
      desk(x, 16);
      monitor(x + 2, 7, 6, SHIRT[d.role], busy, d.id * 13);
      this.px(x + 10, 27, 4, 1, '#8b98a5');
      chair(x + 15);
      const pal = { H: HAIR[(d.id * 3 + d.face) % HAIR.length], S: SKIN[(d.id + d.face) % SKIN.length], T: SHIRT[d.role], A: SKIN[(d.id + d.face) % SKIN.length], P: '#34404c', C: '#2a313b', M: '#e6ecef' };
      const rows = !busy ? DEV_IDLE : (f + d.id) % 2 === 0 ? DEV_ARM_UP : DEV;
      this.sprite(x + 15, 18, rows, pal);
    });
    if (s.team.length > room && room > 0) {
      // The rest are in the next room.
      const n = Math.min(3, s.team.length - room);
      for (let i = 0; i < n; i++) this.px(rightEdge - 3 - i * 3, 30, 2, 2, '#8b98a5');
    }

    /* ---- a bug on the floor ---- */
    if (s.bug) {
      const left = Math.max(0, s.bug.expiresAt - this.game.now());
      const bx = Math.round(((left % 9400) / 9400) * (W + 8)) - 6;
      this.px(bx, FLOOR_Y + 2, 4, 2, '#ff6b81');
      this.px(bx + 1, FLOOR_Y + 1, 2, 1, '#c2283f');
      this.px(bx + (f % 2), FLOOR_Y + 4, 1, 1, '#ff6b81');
      this.px(bx + 2 + (f % 2), FLOOR_Y + 4, 1, 1, '#ff6b81');
    }

    /* ---- confetti ---- */
    if (this.particles.length) {
      for (const p of this.particles) {
        p.x += p.vx + Math.sin((p.life + p.y) / 3) * 0.3;
        p.y += p.vy;
        p.life--;
        this.px(p.x, p.y, 1, 1, p.c);
      }
      this.particles = this.particles.filter((p) => p.life > 0 && p.y < H);
    }
  }
}
