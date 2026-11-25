import { fmt, type Decimal } from '../core/num';
import { prefersReducedMotion } from './dom';

const IGNORED_KEYS = new Set(['Tab', 'Shift', 'Escape', 'CapsLock', 'Meta', 'Control', 'Alt']);
const MAX_FLOATERS = 14;

/**
 * The big key: pointer presses (several fingers at once work) and any key on a
 * physical keyboard both count as a tap. Also draws the "+N" floaters.
 */
export class Keycap {
  private floaters = 0;

  constructor(
    private readonly key: HTMLButtonElement,
    private readonly wrap: HTMLElement,
    onPress: () => void,
    /** False while a dialog (like the merge splash) is open. */
    enabled: () => boolean = () => true,
  ) {
    // pointerdown rather than click: registers instantly and allows multi-finger mashing.
    key.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (enabled()) onPress();
    });
    // Keyboard activation of the focused button (Enter/Space) arrives as a click with detail 0.
    key.addEventListener('click', (e) => {
      if (e.detail === 0 && enabled()) onPress();
    });
    window.addEventListener('keydown', (e) => {
      if (!enabled() || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (IGNORED_KEYS.has(e.key) || e.key.startsWith('Arrow')) return;
      const target = e.target as Element | null;
      // Let Enter/Space activate whatever button has focus instead of double-counting.
      if (target?.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
      if (e.key === ' ') e.preventDefault();
      this.flashDown();
      onPress();
    });
  }

  /** Visual press for keyboard input, which has no :active state on the button. */
  private flashDown(): void {
    this.key.classList.add('down');
    window.setTimeout(() => this.key.classList.remove('down'), 70);
  }

  floater(lines: Decimal): void {
    if (prefersReducedMotion() || this.floaters >= MAX_FLOATERS) return;
    this.floaters++;
    const el = document.createElement('span');
    el.className = 'fl';
    el.textContent = `+${fmt(lines)}`;
    el.style.left = `${12 + Math.random() * 66}%`;
    this.wrap.appendChild(el);
    el.addEventListener('animationend', () => {
      el.remove();
      this.floaters--;
    });
  }
}
