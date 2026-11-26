import { hl } from './hl';
import { starMultiplier } from '../core/economy';
import type { MajorResult } from '../core/major';
import { fmt, fmtMul, type Decimal } from '../core/num';
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

/** What the splash shows: the same animation celebrates a release and a major version. */
export interface SplashView {
  title: string;
  subtitle: string;
  command: string;
  intro: string;
  /** Lines that count down to zero. */
  lines: Decimal;
  /** Three log lines printed after the count. */
  logs: [string, string, string];
  before: string;
  plus: string;
  after: string;
  label: string;
  aria: string;
}

export function shipSplash(r: ShipResult): SplashView {
  const branch = `release/v${r.version}`;
  const starsAfter = r.starsBefore + r.stars;
  return {
    title: 'git merge', subtitle: `${branch} → main`, command: `git merge --no-ff ${branch}`, intro: `Merging ${branch} into main...`,
    lines: r.linesBefore, logs: [`${fmt(r.releaseLines)} lines merged`, 'upgrades reset', `tagged v${r.version}${r.bonus ? `, milestone +${fmt(r.bonus)} stars` : ''}`],
    before: fmt(r.starsBefore), plus: `+${fmt(r.stars)}`, after: fmt(starsAfter), label: `stars · output x${fmtMul(starMultiplier(starsAfter))}`, aria: `Release v${r.version} merged`,
  };
}

export function majorSplash(r: MajorResult, xpAfter: number): SplashView {
  return {
    title: 'git tag', subtitle: `v${r.version} · ${r.stack}`, command: `git tag -a v${r.version} -m "major version"`, intro: `Cutting v${r.version}, rewritten in ${r.stack}...`,
    lines: r.linesBefore, logs: [`${fmt(r.starsBanked)} stars banked`, 'stars, dotfiles and packages reset', `tagged v${r.version}`],
    before: fmt(xpAfter - r.xp), plus: `+${fmt(r.xp)}`, after: fmt(xpAfter), label: 'xp · stars from shipping grow with every point', aria: `Major version v${r.version} cut`,
  };
}

/**
 * Full-screen "git merge" splash shown after shipping (or cutting a major): the line count ticks down
 * to zero, the log prints, then the star (or XP) count bounces up.
 * Tap or press a key to skip to the end; again to close. Resolves when closed.
 */
export function playMergeSplash(v: SplashView, options: MergeSplashOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const reduced = prefersReducedMotion();

    const root = document.createElement('div');
    root.className = 'merge';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', v.aria);
    root.tabIndex = -1;
    root.innerHTML = `<div class="mwin">
      <div class="mt"><span>${v.title}</span><span>${v.subtitle}</span></div>
      <div class="mbody">
        <div class="mline"><span class="tag tag-cmd">${LOG_TAGS.cmd}</span> ${v.command}</div>
        <div class="mline">${v.intro}</div>
        <div class="mcount" data-count>${fmt(v.lines)}</div>
        <div class="mlabel">lines of code</div>
        <div class="tbar mbar" data-bar></div>
        <div class="mlog" data-log></div>
        <div class="mstars" data-stars hidden>
          ${STAR_SVG}
          <div><div class="mnum" data-mnum><span data-num>${v.before}</span><span class="mplus">${v.plus}</span></div>
          <div class="mlabel">${v.label}</div></div>
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
      row.insertAdjacentHTML('beforeend', hl(text));
      log.appendChild(row);
    };
    const steps = [
      ...v.logs.map((text) => () => addLog(text)),
      // The star appears showing the old count…
      () => {
        stars.hidden = false;
        stars.classList.add('pop');
      },
      // …then the count jumps to the new total with a bounce.
      () => {
        starNum.textContent = v.after;
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
      count.textContent = fmt(v.lines.mul(left));
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
