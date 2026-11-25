import { INCIDENTS } from '../core/content';
import type { Game } from '../core/game';
import { clock } from '../core/num';
import type { Incident } from '../core/state';
import { CODE_PAIRS } from './boss';
import { esc, prefersReducedMotion, setText } from './dom';
import { barHtml, type LogKind } from './messages';

/** Pixel-art coffee mug (10×10). */
const MUG_SVG = `<svg viewBox="0 0 12 11" aria-hidden="true"><g class="steam" fill="#d9e4d0"><rect x="3" y="0" width="1" height="2"/><rect x="6" y="1" width="1" height="2"/></g>
<g fill="#f2c94c"><rect x="1" y="4" width="7" height="6"/><rect x="8" y="5" width="2" height="1"/><rect x="9" y="6" width="1" height="2"/><rect x="8" y="8" width="2" height="1"/></g>
<rect x="2" y="5" width="5" height="1" fill="#6b3b12"/><rect x="2" y="9" width="5" height="1" fill="#c99a2e"/></svg>`;

/** What prod logs while it is down. */
const OUTAGE_LOG = [
  '500 Internal Server Error  GET /api/v3/checkout',
  '  at resolve (legacy/core.js:8841:13)',
  'ECONNREFUSED 10.0.3.7:5432',
  '502 Bad Gateway  POST /api/v3/login',
  '  at async Promise.all (index 0)',
  'pagerduty: paging you (again)',
  'healthcheck failed: 0 of 12 pods ready',
  'TimeoutError: upstream timed out after 30000ms',
  '  at Monolith.summon (legacy/core.js:214:7)',
  'status page: "investigating"',
];
const OUTAGE_LOG_MS = 380;

/**
 * Draws incidents over the editor: a coffee to grab, an outage banner with a hotfix meter,
 * or a merge conflict with two sides to choose from. The game decides timing and outcome.
 */
export class IncidentView {
  private el: HTMLElement | null = null;
  private kind: Incident['kind'] | null = null;
  private flood = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly game: Game,
    /** Prints a line in the editor (the outage's error flood). */
    private readonly log: (text: string, kind: LogKind) => void,
    /** The editor's current line number, for the conflict's gutter. */
    private readonly lineNumber: () => number,
  ) {}

  /** The kind of incident on screen, if any. */
  get showing(): Incident['kind'] | null {
    return this.kind;
  }

  show(incident: Incident): void {
    this.hide();
    this.kind = incident.kind;
    if (incident.kind === 'coffee') this.showCoffee();
    else if (incident.kind === 'outage') this.showOutage();
    else this.showConflict(incident.correct);
  }

  hide(): void {
    this.el?.remove();
    this.el = null;
    this.kind = null;
    window.clearInterval(this.flood);
    this.flood = 0;
  }

  /** Keeps timers and the hotfix meter current; hides the view once the game has cleared the incident. */
  update(): void {
    const inc = this.game.state.incident;
    if (!inc || inc.kind !== this.kind) {
      if (this.el) this.hide();
      return;
    }
    const left = (inc.expiresAt - this.game.now()) / 1000;
    setText(this.el?.querySelector('[data-left]') ?? null, clock(left));
    if (inc.kind === 'outage') {
      const bar = this.el?.querySelector<HTMLElement>('[data-hotfix]');
      const html = `${barHtml(inc.taps / inc.needed, 16, false)} ${inc.taps}/${inc.needed}`;
      if (bar && bar.innerHTML !== html) bar.innerHTML = html;
    }
  }

  private showCoffee(): void {
    const btn = document.createElement('button');
    btn.className = 'mug';
    btn.setAttribute('aria-label', 'Grab the coffee');
    btn.innerHTML = MUG_SVG;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    btn.style.left = `${20 + Math.random() * Math.max(10, w - 110)}px`;
    btn.style.top = `${10 + Math.random() * Math.max(10, h - 70)}px`;
    if (!prefersReducedMotion()) btn.classList.add('bob');
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.game.catchCoffee();
      this.hide();
    });
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) this.game.catchCoffee();
    });
    this.mount(btn);
  }

  private showOutage(): void {
    const box = document.createElement('div');
    box.className = 'outage';
    box.setAttribute('role', 'alert');
    box.innerHTML = `<div class="oh"><span class="tag tag-err">[FAIL]</span> prod is down <span class="ol" data-left></span></div>
      <div>tap the key ${INCIDENTS.outage.taps} times to hotfix</div>
      <div class="tbar" data-hotfix></div>`;
    this.mount(box);
    let i = Math.floor(Math.random() * OUTAGE_LOG.length);
    this.flood = window.setInterval(() => this.log(OUTAGE_LOG[i++ % OUTAGE_LOG.length], 'err'), OUTAGE_LOG_MS);
  }

  private showConflict(correct: 0 | 1): void {
    const [good, bad] = CODE_PAIRS[Math.floor(Math.random() * CODE_PAIRS.length)];
    const sides = correct === 0 ? [good, bad] : [bad, good];
    // Drawn like the editor: conflict markers and the two candidate lines, numbered.
    const ln = this.lineNumber();
    const marker = (text: string) => `<div class="ln cfm"><span class="g"></span><span class="tx">${esc(text)}</span></div>`;
    const side = (i: 0 | 1, cls: string) => `<button class="ln cside ${cls}" data-side="${i}"><span class="g">${ln}</span><span class="tx">${esc(sides[i])}</span></button>`;
    const box = document.createElement('div');
    box.className = 'conflict';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Merge conflict: pick the side that compiles');
    box.innerHTML = `<div class="cfh"><span><span class="tag tag-warn">[warn]</span> tap the side that compiles</span><span class="ol" data-left></span></div>
      ${marker('<<<<<<< HEAD (current change)')}
      ${side(0, 'cfa')}
      ${marker('=======')}
      ${side(1, 'cfb')}
      ${marker('>>>>>>> feature/sprint (incoming change)')}`;
    box.addEventListener('pointerdown', (e) => e.stopPropagation());
    box.addEventListener('click', (e) => {
      const side = (e.target as Element).closest<HTMLButtonElement>('[data-side]');
      if (!side) return;
      this.game.chooseConflict(Number(side.dataset.side) as 0 | 1);
      this.hide();
    });
    this.mount(box);
  }

  private mount(el: HTMLElement): void {
    this.host.appendChild(el);
    this.el = el;
    this.update();
  }
}
