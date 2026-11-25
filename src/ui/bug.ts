import { fmt, type Decimal } from '../core/num';
import { prefersReducedMotion } from './dom';
import { BUG_SVG } from './icons';

/** Draws the bug crawling across the editor. The game decides when it appears and expires. */
export class BugView {
  private el: HTMLButtonElement | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly squash: () => Decimal | null,
    /** Where the bug was squashed, relative to the host (for a particle burst). */
    private readonly onSplat: (x: number, y: number) => void = () => {},
  ) {}

  show(expiresAt: number, now: number): void {
    this.hide();
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    const bug = document.createElement('button');
    bug.className = 'bug';
    bug.setAttribute('aria-label', 'Squash the bug');
    bug.innerHTML = BUG_SVG;
    bug.style.top = `${8 + Math.random() * Math.max(8, height - 60)}px`;
    bug.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onSquash(bug);
    });
    bug.addEventListener('click', (e) => {
      if (e.detail === 0) this.onSquash(bug); // keyboard activation
    });
    this.host.appendChild(bug);
    this.el = bug;

    if (prefersReducedMotion()) {
      bug.style.transform = `translateX(${Math.random() * Math.max(10, width - 70)}px)`;
    } else {
      bug.style.transitionDuration = `${Math.max(1000, expiresAt - now)}ms`;
      // Two frames so the starting position is painted before the transition begins.
      requestAnimationFrame(() => requestAnimationFrame(() => (bug.style.transform = `translateX(${width + 10}px)`)));
    }
  }

  hide(): void {
    this.el?.remove();
    this.el = null;
  }

  private onSquash(bug: HTMLButtonElement): void {
    const reward = this.squash();
    if (!reward) return;
    const bugBox = bug.getBoundingClientRect();
    const hostBox = this.host.getBoundingClientRect();
    const splat = document.createElement('span');
    splat.className = 'splat';
    splat.textContent = `+${fmt(reward)}`;
    splat.style.left = `${Math.max(4, Math.min(hostBox.width - 90, bugBox.left - hostBox.left))}px`;
    splat.style.top = `${bugBox.top - hostBox.top}px`;
    this.host.appendChild(splat);
    window.setTimeout(() => splat.remove(), 1000);
    this.onSplat(bugBox.left - hostBox.left + bugBox.width / 2, bugBox.top - hostBox.top + bugBox.height / 2);
    this.hide();
  }
}
