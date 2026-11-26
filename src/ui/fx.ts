import { prefersReducedMotion } from './dom';

const PARTICLES = ['*', '+', '.', 'x', "'", '*', '+'];
const SCRAMBLE = '!<>-_\\/[]{}=+*^?#%&';
/** Shakes no closer together than this. */
const SHAKE_GAP_MS = 350;
/** Holds each offset until the next (step-end per keyframe, as the old CSS animation did). */
const SHAKE: Keyframe[] = [
  { transform: 'translateX(8px)', easing: 'step-end' },
  { transform: 'translateX(-8px)', easing: 'step-end' },
  { transform: 'translateY(4px)', easing: 'step-end' },
  { transform: 'translateX(4px)', easing: 'step-end' },
  { transform: 'none' },
];

/** Juice: screen shake, particle bursts and scrambled text. All of it skipped with reduced motion. */
export class Fx {
  /** Elements being scrambled: their real text, and which run owns them (a newer run takes over). */
  private readonly scrambling = new WeakMap<HTMLElement, { text: string; run: number }>();
  private runs = 0;
  private shookAt = -Infinity;

  constructor(private readonly ide: HTMLElement) {}

  /** Shakes the editor; crits while mashing would otherwise restart it many times a second. */
  shake(): void {
    const now = performance.now();
    if (prefersReducedMotion() || now - this.shookAt < SHAKE_GAP_MS || typeof this.ide.animate !== 'function') return;
    this.shookAt = now;
    this.ide.animate(SHAKE, { duration: 200 });
  }

  /** Characters flying out from (x, y) in `host`, snapped to a coarse grid so they look like text. */
  burst(host: HTMLElement, x: number, y: number, count = 10, cls = ''): void {
    if (prefersReducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = `ptc ${cls}`;
      p.textContent = PARTICLES[Math.floor(Math.random() * PARTICLES.length)];
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 24 + Math.random() * 40;
      p.style.setProperty('--dx', `${Math.round((Math.cos(angle) * dist) / 8) * 8}px`);
      p.style.setProperty('--dy', `${Math.round((Math.sin(angle) * dist) / 10) * 10}px`);
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      host.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
      window.setTimeout(() => p.remove(), 1200);
    }
  }

  /**
   * Reveals an element's text left to right out of random characters. Scrambling it again mid-way
   * (two panels in one window unlocking together) restarts from the real text, never the garbage.
   */
  scramble(el: HTMLElement, ms = 700): void {
    const text = this.scrambling.get(el)?.text ?? el.textContent ?? '';
    if (prefersReducedMotion() || !text) return;
    const run = ++this.runs;
    this.scrambling.set(el, { text, run });
    const start = performance.now();
    const step = () => {
      if (this.scrambling.get(el)?.run !== run) return;
      const t = Math.min(1, (performance.now() - start) / ms);
      const shown = Math.floor(t * text.length);
      let out = text.slice(0, shown);
      for (let i = shown; i < text.length; i++) out += text[i] === ' ' ? ' ' : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
      el.textContent = out;
      if (t < 1) window.setTimeout(step, 45);
      else {
        el.textContent = text;
        this.scrambling.delete(el);
      }
    };
    step();
  }
}
