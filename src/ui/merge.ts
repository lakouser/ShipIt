import { hl } from './hl';
import { CORP, FUNDING, STACKS } from '../core/content';
import { starBonus } from '../core/economy';
import type { RaiseResult } from '../core/funding';
import type { MajorResult } from '../core/major';
import { fmt, fmtMul } from '../core/num';
import type { ShipResult } from '../core/ship';
import { esc, prefersReducedMotion } from './dom';
import { BOAT } from './icons';
import { LOG_TAGS, textBar } from './messages';

/** A 3×5 pixel font for the version banner. */
const GLYPHS: Record<string, string[]> = {
  0: ['###', '# #', '# #', '# #', '###'],
  1: [' # ', '## ', ' # ', ' # ', '###'],
  2: ['###', '  #', '###', '#  ', '###'],
  3: ['###', '  #', '###', '  #', '###'],
  4: ['# #', '# #', '###', '  #', '  #'],
  5: ['###', '#  ', '###', '  #', '###'],
  6: ['###', '#  ', '###', '# #', '###'],
  7: ['###', '  #', ' # ', ' # ', ' # '],
  8: ['###', '# #', '###', '# #', '###'],
  9: ['###', '# #', '###', '  #', '###'],
  v: ['# #', '# #', '# #', '# #', ' # '],
  '.': [' ', ' ', ' ', ' ', '#'],
};

/** Big pixel text ("v3.0") as a grid of cells. */
function banner(text: string): string {
  const glyphs = [...text].map((c) => GLYPHS[c]).filter((g) => !!g);
  let cells = '';
  let cols = 0;
  for (let row = 0; row < 5; row++) {
    cols = 0;
    glyphs.forEach((g, i) => {
      for (const c of g[row]) {
        cells += `<i${c === '#' ? ' class="on"' : ''}></i>`;
        cols++;
      }
      if (i < glyphs.length - 1) {
        cells += '<i></i>';
        cols++;
      }
    });
  }
  return `<div class="banner" style="--cols:${cols}" role="img" aria-label="${esc(text)}">${cells}</div>`;
}

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
 * to zero, the merge log prints, the version sails off, then the star count bounces up.
 * Tap or press a key to skip to the end; again to close. Resolves when closed.
 */
export function playMergeSplash(r: ShipResult, options: MergeSplashOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const reduced = prefersReducedMotion();
    const starsAfter = r.starsBefore + r.stars;
    const branch = `release/v${r.version}`;

    const root = document.createElement('div');
    root.className = 'merge';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `Release v${r.version} merged`);
    root.tabIndex = -1;
    root.innerHTML = `<div class="mwin">
      <div class="mt"><span>git merge</span><span>${branch} → main</span></div>
      <div class="mbody">
        <div class="mline"><span class="tag tag-cmd">${LOG_TAGS.cmd}</span> git merge --no-ff ${branch}</div>
        <div class="mline">Merging ${branch} into main...</div>
        <div data-drain>
          <div class="mcount" data-count>${fmt(r.linesBefore)}</div>
          <div class="mlabel">lines of code</div>
          <div class="tbar mbar" data-bar></div>
        </div>
        <div class="mship" data-shipped hidden>
          ${banner(`v${r.version}`)}
          <div class="sea" aria-hidden="true"><pre class="boat">${esc(BOAT)}</pre><div class="waves">${'~^~~^~~~^~~'.repeat(12)}</div></div>
        </div>
        <div class="mlog" data-log></div>
        <div class="mstars" data-stars hidden>
          ${STAR_SVG}
          <div><div class="mnum" data-mnum><span data-num>${fmt(r.starsBefore)}</span><span class="mplus">+${fmt(r.stars)}</span></div>
          <div class="mlabel">stars · output x${fmtMul(starBonus(starsAfter))}${r.bonus ? ` · milestone +${fmt(r.bonus)}` : ''}</div></div>
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
    const drain = q('[data-drain]');
    const shipped = q('[data-shipped]');
    // A plausible object count for the push, growing with the release.
    const objects = Math.max(3, Math.min(99999, Math.round(r.releaseLines.add(1).log10() * 617)));
    const steps = [
      () => addLog(`${fmt(r.releaseLines)} lines merged, packages reset`),
      () => addLog(`git push origin v${r.version}: writing objects 100% (${objects}/${objects})`),
      // The count gives way to the version banner and the boat sails.
      () => {
        drain.hidden = true;
        shipped.hidden = false;
        shipped.classList.add('sail');
      },
      () => addLog(`${r.shipped.name.toLowerCase()} shipped${r.next.id === r.shipped.id ? '' : `. next up: ${r.next.name.toLowerCase()}`}`),
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
      const schedule = [120, 420, 760, 1500, 2300, 2650];
      for (const ms of schedule) timers.push(window.setTimeout(runStep, ms));
      timers.push(window.setTimeout(finish, 3300));
    };
    raf = requestAnimationFrame(frame);
  });
}

/** Full-screen "wire transfer" splash after raising a round. Press a key or tap to close; resolves when closed. */
export function playRoundSplash(r: RaiseResult): Promise<void> {
  return new Promise((resolve) => {
    const reduced = prefersReducedMotion();
    const lang = STACKS.find((x) => x.id === r.stack)?.name ?? 'TypeScript';
    const root = document.createElement('div');
    root.className = 'merge';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `${r.name} round closed`);
    root.tabIndex = -1;
    const ok = (text: string) => `<div><span class="tag tag-ok">${LOG_TAGS.ok}</span> ${hl(text)}</div>`;
    root.innerHTML = `<div class="mwin">
      <div class="mt"><span>wire transfer</span><span>investors → ship-it</span></div>
      <div class="mbody">
        <div class="mline"><span class="tag tag-cmd">${LOG_TAGS.cmd}</span> sign term-sheet.pdf --round "${esc(r.name)}"</div>
        <div class="mround">${esc(r.name.toUpperCase())}</div>
        <div class="mlabel">round closed</div>
        <div class="mlog">
          ${ok(`${fmt(r.starsBefore)} stars and every dotfile traded in`)}
          ${ok(`x${FUNDING.outputPerRound} output, permanently`)}
          ${ok(`+${r.equity} equity to spend on the company`)}
          ${ok(r.round >= FUNDING.maxRounds ? `the company is public. this run is written in ${lang}` : `new packages unlocked. rewriting everything in ${lang}`)}
        </div>
        <div class="mhint">press any key or tap to continue</div>
      </div>
    </div>`;
    document.body.appendChild(root);
    root.focus({ preventScroll: true });
    let closed = false;
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
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) close();
    };
    // A short pause, so the tap or key that raised the round doesn't close the splash at once.
    window.setTimeout(() => {
      window.addEventListener('keydown', onKey, true);
      root.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        close();
      });
    }, 350);
  });
}

/** Full-screen splash after cutting a major version. Press a key or tap to close; resolves when closed. */
export function playMajorSplash(r: MajorResult, xpAfter: number): Promise<void> {
  return new Promise((resolve) => {
    const reduced = prefersReducedMotion();
    const root = document.createElement('div');
    root.className = 'merge';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `Major version v${r.version} cut`);
    root.tabIndex = -1;
    const ok = (text: string) => `<div><span class="tag tag-ok">${LOG_TAGS.ok}</span> ${hl(text)}</div>`;
    root.innerHTML = `<div class="mwin">
      <div class="mt"><span>git tag</span><span>v${esc(r.version)} · major version</span></div>
      <div class="mbody">
        <div class="mline"><span class="tag tag-cmd">${LOG_TAGS.cmd}</span> git tag -a v${esc(r.version)} -m "major version"</div>
        <div class="mround">v${esc(r.version)}</div>
        <div class="mlabel">a whole new app, the same company and users</div>
        <div class="mlog">
          ${ok(`${fmt(r.starsBanked)} stars banked`)}
          ${ok(`+${fmt(r.xp)} xp (${fmt(xpAfter)} in total): stars from shipping grow with every point`)}
          ${ok('stars, dotfiles, releases and packages start over')}
          ${ok('funding, equity, the team, skills and users stay')}
        </div>
        <div class="mhint">press any key or tap to continue</div>
      </div>
    </div>`;
    document.body.appendChild(root);
    root.focus({ preventScroll: true });
    let closed = false;
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
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) close();
    };
    window.setTimeout(() => {
      window.addEventListener('keydown', onKey, true);
      root.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        close();
      });
    }, 350);
  });
}

/** What the ending at the IPO sums up. */
export interface EndingSummary {
  /** Wall-clock seconds since the game began. */
  seconds: number;
  releases: number;
  stars: number;
  lines: string;
  users: number;
  rank: number;
  bosses: number;
  achievements: number;
  majors: number;
  app: string;
}

/** A splash that closes on a key or tap (after a short pause, so the tap that opened it doesn't close it). */
function plainSplash(label: string, html: string): Promise<void> {
  return new Promise((resolve) => {
    const reduced = prefersReducedMotion();
    const root = document.createElement('div');
    root.className = 'merge';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', label);
    root.tabIndex = -1;
    root.innerHTML = html;
    document.body.appendChild(root);
    root.focus({ preventScroll: true });
    let closed = false;
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
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) close();
    };
    window.setTimeout(() => {
      window.addEventListener('keydown', onKey, true);
      root.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        close();
      });
    }, 600);
  });
}

/** "6h 12m", "3d 4h". */
function playedFor(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/**
 * The ending, shown once when the company goes public: a summary of the whole campaign, then what the endless game
 * after it is about. Nothing is reset. Press a key or tap to close.
 */
export function playEndingSplash(e: EndingSummary): Promise<void> {
  const row = (k: string, v: string) => `<div class="erow"><span>${k}</span><b>${v}</b></div>`;
  const ok = (text: string) => `<div><span class="tag tag-ok">${LOG_TAGS.ok}</span> ${hl(text)}</div>`;
  return plainSplash(
    'The company went public',
    `<div class="mwin">
      <div class="mt"><span>nyse</span><span>${esc(e.app)} · ticker ${esc(e.app.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase() || 'SHIP')}</span></div>
      <div class="mbody">
        <div class="mline"><span class="tag tag-cmd">${LOG_TAGS.cmd}</span> ring --bell</div>
        <div class="mround">IPO</div>
        <div class="mlabel">you took ${esc(e.app)} public. that's the campaign</div>
        <div class="esum">
          ${row('played', playedFor(e.seconds))}
          ${row('releases shipped', fmt(e.releases))}
          ${row('stars earned', fmt(e.stars))}
          ${row('lines written', e.lines)}
          ${row('users', `${fmt(e.users)} · #${e.rank}`)}
          ${row('incidents beaten', fmt(e.bosses))}
          ${row('major versions', fmt(e.majors))}
          ${row('trophies', fmt(e.achievements))}
        </div>
        <div class="mlog">
          ${ok('nothing resets: the game carries on as a public company')}
          ${ok(`every ${CORP.quarterMinutes} minutes of play is a quarter: users bring in revenue, the board sets guidance`)}
          ${ok('beat it for the stock and +' + Math.round(CORP.beatBonus * 100) + '% output for good; cash buys rivals off the chart')}
        </div>
        <div class="mhint">press any key or tap to continue</div>
      </div>
    </div>`,
  );
}
