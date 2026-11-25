import { fmt, type Decimal } from '../core/num';
import { prefersReducedMotion } from './dom';
import { LOG_TAGS } from './messages';

export interface WelcomeSummary {
  /** Lines credited for the time away. */
  away?: { lines: Decimal; seconds: number; rate: number };
  /** Daily streak bonus, if this was the first session today. */
  streak?: { count: number; lines: Decimal; script: string | null };
}

const COUNT_MS = 900;
const ease = (t: number): number => 1 - (1 - t) ** 3;

function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/**
 * "git log" splash after time away: the lines your team wrote count up from zero,
 * then the daily streak bonus. Any key or tap closes it.
 */
export function playWelcome(summary: WelcomeSummary): Promise<void> {
  return new Promise((resolve) => {
    const reduced = prefersReducedMotion();
    const total = (summary.away?.lines ?? null) as Decimal | null;
    const root = document.createElement('div');
    root.className = 'merge';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Welcome back');
    root.tabIndex = -1;
    const awayHtml = summary.away
      ? `<div class="mline"><span class="tag tag-cmd">${LOG_TAGS.cmd}</span> git log --since="${duration(summary.away.seconds)} ago" --author=team</div>
         <div class="mcount" data-count>0</div>
         <div class="mlabel">lines written while you were away (${Math.round(summary.away.rate * 100)}% speed, ${duration(summary.away.seconds)})</div>`
      : '';
    const streakHtml = summary.streak
      ? `<div class="mlog"><div><span class="tag tag-ok">${LOG_TAGS.ok}</span> day ${summary.streak.count} commit streak: +${fmt(summary.streak.lines)} lines${summary.streak.script ? `, ${summary.streak.script}` : ''}</div></div>`
      : '';
    root.innerHTML = `<div class="mwin">
      <div class="mt"><span>welcome back</span><span>~/ship-it</span></div>
      <div class="mbody">${awayHtml}${streakHtml}<div class="mhint">press any key or tap to continue</div></div>
    </div>`;
    document.body.appendChild(root);
    root.focus({ preventScroll: true });

    const count = root.querySelector<HTMLElement>('[data-count]');
    let raf = 0;
    if (count && total) {
      if (reduced) count.textContent = fmt(total);
      else {
        const start = performance.now() + 150;
        const frame = (t: number) => {
          const p = Math.min(1, Math.max(0, (t - start) / COUNT_MS));
          count.textContent = fmt(total.mul(ease(p)));
          if (p < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      }
    }

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
      root.classList.add('out');
      window.setTimeout(() => {
        root.remove();
        resolve();
      }, reduced ? 0 : 180);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      close();
    });
  });
}
