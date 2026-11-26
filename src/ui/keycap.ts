import { fmt, type Decimal } from '../core/num';
import { prefersReducedMotion } from './dom';

const IGNORED_KEYS = new Set(['Tab', 'Shift', 'Escape', 'CapsLock', 'Meta', 'Control', 'Alt']);
/** Floaters on screen at once; a new one reuses the oldest. */
const MAX_FLOATERS = 10;
const FLOAT_MS = 800;
const FLOAT_UP: Keyframe[] = [
  { transform: 'translateY(0)', opacity: 1 },
  { transform: 'translateY(-40px)', opacity: 0 },
];

/**
 * The big key: pointer presses (several fingers at once work) and any key on a
 * physical keyboard both count as a tap, and letting go is reported too (for the
 * key's release sound). Also draws the "+N" floaters.
 */
export class Keycap {
  /** Made once and reused: creating and dropping an element per tap churned memory while mashing. */
  private readonly pool: { el: HTMLSpanElement; anim: Animation | null }[] = [];
  private next = 0;

  constructor(
    private readonly key: HTMLButtonElement,
    private readonly wrap: HTMLElement,
    onPress: () => void,
    /** False while a dialog (like the merge splash) is open. */
    enabled: () => boolean = () => true,
    /** Each printable key typed on a physical keyboard (for secrets). */
    onType: (key: string) => void = () => {},
    /** A finger or key that pressed the key lets go. */
    onRelease: () => void = () => {},
  ) {
    const pointers = new Set<number>();
    const keys = new Set<string>();
    // pointerdown rather than click: registers instantly and allows multi-finger mashing.
    key.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!enabled()) return;
      pointers.add(e.pointerId);
      onPress();
    });
    // On window, so letting go after sliding off the key still counts.
    const up = (e: PointerEvent) => {
      if (pointers.delete(e.pointerId)) onRelease();
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keyup', (e) => {
      if (keys.delete(e.code)) onRelease();
    });
    window.addEventListener('blur', () => {
      pointers.clear();
      keys.clear();
    });
    // Keyboard activation of the focused button (Enter/Space) arrives as a click with detail 0.
    key.addEventListener('click', (e) => {
      if (e.detail !== 0 || !enabled()) return;
      onPress();
      window.setTimeout(onRelease, 80);
    });
    window.addEventListener('keydown', (e) => {
      if (!enabled() || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (IGNORED_KEYS.has(e.key) || e.key.startsWith('Arrow')) return;
      const target = e.target as Element | null;
      // Typing into a text field (the app name, an imported save) or a dropdown (a role) is not writing code.
      if (target?.closest('input, textarea, select')) return;
      // Let Enter/Space activate whatever button has focus instead of double-counting.
      if (target?.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
      if (e.key === ' ') e.preventDefault();
      onType(e.key);
      this.flashDown();
      keys.add(e.code);
      onPress();
    });
  }

  /** Visual press for keyboard input, which has no :active state on the button. */
  private flashDown(): void {
    this.key.classList.add('down');
    window.setTimeout(() => this.key.classList.remove('down'), 70);
  }

  floater(lines: Decimal, crit = false): void {
    if (prefersReducedMotion()) return;
    if (this.pool.length < MAX_FLOATERS) {
      const el = document.createElement('span');
      el.setAttribute('aria-hidden', 'true');
      this.wrap.appendChild(el);
      this.pool.push({ el, anim: null });
    }
    const f = this.pool[this.next++ % this.pool.length];
    if (typeof f.el.animate !== 'function') return;
    f.anim?.cancel();
    f.el.className = crit ? 'fl crit' : 'fl';
    f.el.textContent = crit ? `CRIT +${fmt(lines)}` : `+${fmt(lines)}`;
    f.el.style.left = `${12 + Math.random() * 66}%`;
    f.anim = f.el.animate(FLOAT_UP, { duration: FLOAT_MS, easing: 'ease-out', fill: 'forwards' });
  }
}
