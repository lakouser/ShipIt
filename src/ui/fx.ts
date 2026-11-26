import { prefersReducedMotion } from './dom';

const PARTICLES = ['*', '+', '.', 'x', "'", '*', '+'];
const SCRAMBLE = '!<>-_\\/[]{}=+*^?#%&';

/** Juice: screen shake, particle bursts and scrambled text. All of it skipped with reduced motion. */
export class Fx {
  constructor(private readonly ide: HTMLElement) {}

  shake(): void {
    if (prefersReducedMotion()) return;
    this.ide.classList.remove('shake');
    void this.ide.offsetWidth; // restart the animation
    this.ide.classList.add('shake');
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

  /** Reveals an element's text left to right out of random characters. */
  scramble(el: HTMLElement, ms = 700): void {
    const text = el.textContent ?? '';
    if (prefersReducedMotion() || !text) return;
    const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / ms);
      const shown = Math.floor(t * text.length);
      let out = text.slice(0, shown);
      for (let i = shown; i < text.length; i++) out += text[i] === ' ' ? ' ' : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
      el.textContent = out;
      if (t < 1) window.setTimeout(step, 45);
      else el.textContent = text;
    };
    step();
  }
}
