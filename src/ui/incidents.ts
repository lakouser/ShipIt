import { INCIDENTS } from '../core/content';
import type { Game } from '../core/game';
import { clock } from '../core/num';
import type { Incident } from '../core/state';
import { esc, prefersReducedMotion, setText } from './dom';
import { barHtml } from './messages';

/** Pixel-art coffee mug (10×10). */
const MUG_SVG = `<svg viewBox="0 0 12 11" aria-hidden="true"><g class="steam" fill="#d9e4d0"><rect x="3" y="0" width="1" height="2"/><rect x="6" y="1" width="1" height="2"/></g>
<g fill="#f2c94c"><rect x="1" y="4" width="7" height="6"/><rect x="8" y="5" width="2" height="1"/><rect x="9" y="6" width="1" height="2"/><rect x="8" y="8" width="2" height="1"/></g>
<rect x="2" y="5" width="5" height="1" fill="#6b3b12"/><rect x="2" y="9" width="5" height="1" fill="#c99a2e"/></svg>`;

/** Two versions of one line: one compiles, one has a classic mistake. */
const CONFLICTS: [string, string][] = [
  ["const user = await fetchUser(id);", "const user = await fetchUser(id;"],
  ["if (cache.size > 0) { flush(); }", "if (cache.size > 0) { flush(); "],
  ["return items.map((x) => x.id);", "return items.map((x) => x.id;"],
  ["export default function App() {}", "export defualt function App() {}"],
  ["const total = price * qty;", "cosnt total = price * qty;"],
  ["import { Ticket } from './types';", "import { Ticket } from './types;"],
  ["for (let i = 0; i < n; i++) {}", "for (let i = 0; i < n; i++ {}"],
  ["const ok = a === b;", "const ok = a === = b;"],
];

/**
 * Draws incidents over the editor: a coffee to grab, an outage banner with a hotfix meter,
 * or a merge conflict with two sides to choose from. The game decides timing and outcome.
 */
export class IncidentView {
  private el: HTMLElement | null = null;
  private kind: Incident['kind'] | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly game: Game,
  ) {}

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
  }

  private showConflict(correct: 0 | 1): void {
    const [good, bad] = CONFLICTS[Math.floor(Math.random() * CONFLICTS.length)];
    const sides = correct === 0 ? [good, bad] : [bad, good];
    const box = document.createElement('div');
    box.className = 'conflict';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Merge conflict: pick the side that compiles');
    box.innerHTML = `<div class="oh"><span class="tag tag-warn">[warn]</span> merge conflict <span class="ol" data-left></span></div>
      <div class="cm">&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</div>
      <button class="side" data-side="0">${esc(sides[0])}</button>
      <div class="cm">=======</div>
      <button class="side" data-side="1">${esc(sides[1])}</button>
      <div class="cm">&gt;&gt;&gt;&gt;&gt;&gt;&gt; feature/sprint</div>
      <div class="dim">pick the side that compiles</div>`;
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
