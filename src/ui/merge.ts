import { SHIP } from '../core/content';
import { fmt } from '../core/num';
import type { ShipResult } from '../core/ship';
import { prefersReducedMotion } from './dom';
import { LOG_TAGS, textBar } from './messages';

/** Pixel-art star (9×9), same crisp style as the bug. */
const STAR_SVG = `<svg viewBox="0 0 9 9" aria-hidden="true"><g fill="#f2c94c">
<rect x="4" y="0" width="1" height="2"/><rect x="3" y="2" width="3" height="1"/><rect x="0" y="3" width="9" height="1"/>
<rect x="1" y="4" width="7" height="1"/><rect x="2" y="5" width="5" height="1"/><rect x="2" y="6" width="2" height="1"/>
<rect x="5" y="6" width="2" height="1"/><rect x="1" y="7" width="2" height="1"/><rect x="6" y="7" width="2" height="1"/>
<rect x="1" y="8" width="1" height="1"/><rect x="7" y="8" width="1" height="1"/></g>
<rect x="3" y="3" width="2" height="1" fill="#fff1b8"/></svg>`;

const COUNT_DELAY_MS = 250;
const COUNT_MS = 1000;
/** Accelerates toward zero, so the count drains rather than coasts. */
const ease = (t: number): number => t * t * t;

export interface MergeSplashOptions {
  /** Called when the stars appear (haptics, sound). */
  onStars?: () => void;
}

/**
 * Full-screen "git merge" splash shown after shipping: the line count ticks down
 * to zero, the merge log prints, then the star count bounces up.
 * Tap or press a key to skip to the end; again to close. Resolves when closed.
 */
export function playMergeSplash(r: ShipResult, options: MergeSplashOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const reduced = prefersReducedMotion();
    const starsAfter = r.starsBefore + r.stars;
    const branch = `release/v${r.release}`;

    const root = document.createElement('div');
    root.className = 'merge';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `Release v${r.release}.0 merged`);
    root.tabIndex = -1;
    root.innerHTML = `<div class="mwin">
      <div class="mt"><span>git merge</span><span>${branch} → main</span></div>
      <div class="mbody">
        <div class="mline"><span class="tag tag-cmd">${LOG_TAGS.cmd}</span> git merge --no-ff ${branch}</div>
        <div class="mline">Merging ${branch} into main...</div>
        <div class="mcount" data-count>${fmt(r.linesBefore)}</div>
        <div class="mlabel">lines of code</div>
        <div class="tbar mbar" data-bar></div>
        <div class="mlog" data-log></div>
        <div class="mstars" data-stars hidden>
          ${STAR_SVG}
          <div><div class="mnum" data-mnum><span data-num>${r.starsBefore}</span><span class="mplus">+${r.stars}</span></div>
          <div class="mlabel">stars · output +${Math.round(starsAfter * SHIP.bonusPerStar * 100)}%</div></div>
        </div>
        <div class="mhint" data-hint>tap to skip</div>
      </div>
    </div>`;
    document.body.appendChild(root);
    root.focus({ preventScroll: true });

    const q = (sel: string) => root.querySelector<HTMLElement>(sel)!;
    const count = q('[data-count]');
    const bar = q('[data-bar]');
    const log = q('[data-log]');
    const stars = q('[data-stars]');
    const starNum = q('[data-num]');
    const starRow = q('[data-mnum]');
    const hint = q('[data-hint]');

    const setBar = (fraction: number) => {
      const b = textBar(fraction, 22);
      bar.innerHTML = `${b.done}<span class="rest">${b.rest}</span>`;
    };
    const addLog = (text: string) => {
      const row = document.createElement('div');
      row.innerHTML = `<span class="tag tag-ok">${LOG_TAGS.ok}</span> `;
      row.append(text);
      log.appendChild(row);
    };
    const steps = [
      () => addLog(`${fmt(r.releaseLines)} lines merged`),
      () => addLog('upgrades reset'),
      () => addLog(`tagged v${r.release}.0`),
      // The star appears showing the old count…
      () => {
        stars.hidden = false;
        stars.classList.add('pop');
      },
      // …then the count jumps to the new total with a bounce.
      () => {
        starNum.textContent = String(starsAfter);
        starRow.classList.add('pop');
        options.onStars?.();
      },
    ];
    let nextStep = 0;
    const runStep = () => {
      if (nextStep < steps.length) steps[nextStep++]();
    };

    const timers: number[] = [];
    let raf = 0;
    let done = false;
    let closed = false;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      count.textContent = '0';
      setBar(0);
      while (nextStep < steps.length) runStep();
      hint.textContent = 'press any key or tap to continue';
    };

    const close = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener('keydown', onKey, true);
      root.classList.add('out');
      window.setTimeout(() => {
        root.remove();
        resolve();
      }, reduced ? 0 : 180);
    };

    const advance = () => (done ? close() : finish());
    // Capture phase, so key presses go to the splash and never reach the write-code key.
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) advance();
    };
    window.addEventListener('keydown', onKey, true);
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      advance();
    });

    setBar(1);
    if (reduced) {
      finish();
      return;
    }
    const start = performance.now() + COUNT_DELAY_MS;
    const frame = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / COUNT_MS));
      const left = 1 - ease(p);
      count.textContent = fmt(r.linesBefore.mul(left));
      setBar(left);
      if (p < 1) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const schedule = [120, 280, 440, 640, 900];
      for (const ms of schedule) timers.push(window.setTimeout(runStep, ms));
      timers.push(window.setTimeout(finish, 1500));
    };
    raf = requestAnimationFrame(frame);
  });
}
