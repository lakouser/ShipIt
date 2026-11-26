import { DEBT, ROLES, UPGRADES } from '../core/content';
import { outputShares, owned, upgradesWithForks } from '../core/economy';
import type { Game } from '../core/game';
import { unreadCount } from '../core/mail';
import { starsAvailable } from '../core/ship';
import { esc, setHtml, setText } from './dom';

/** Packages that open their own file in the editor once installed; the tab line counts them as "+N". */
const PACKAGE_FILES = ['vim', 'lint', 'snip', 'ci', 'pair', 'macro', 'gen', 'llm', 'k8s', 'agents', 'neural', 'quantum', 'dyson', 'simverse', 'entropy'];

/** Short names for the top pane and the key, where the full package names don't fit. */
const SHORT: Record<string, string> = { kb: 'keyboard', mon: 'monitor', snip: 'snippets', macro: 'macros', gen: 'codegen' };
export const shortName = (id: string): string => SHORT[id] ?? id;

/** One-line faces for the desks, matching the portraits in co/team. */
const DESK_FACES = ['[^_^]', '[-_-]', '[o_o]', '[^.^]', '(O,O)', '(o.o)', '[>_<]', '(o_O)'];
/** Desks drawn in the editor, at most; the rest are counted. */
const MAX_DESKS = 4;

/** The rubber duck, eyes open and blinking. */
export const DUCK = [String.raw`  __`, String.raw`<(o )___`, String.raw` ( ._> /`, String.raw`  '---'`].join('\n');
export const DUCK_BLINK = DUCK.replace('(o )', '(- )');

const DUCK_LINES = [
  'quack.',
  'have you tried explaining it out loud?',
  'it is always DNS.',
  'that variable name is fine. ship it.',
  'the bug is in the part you are sure about.',
  'read the error message. all of it.',
  'I believe in you. quack.',
  'commit first. then be brave.',
  'it worked yesterday because yesterday was different.',
];

/** Teammates typing in the editor at once, at most. */
const MAX_GHOSTS = 4;
/** Lines shown in the bottom pane (top or ci). */
const PANE_ROWS = 3;
const between = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));

type PaneView = 'top' | 'ci';

/**
 * What the packages and the team add around the editor: tabs for the `top` and `ci` panes and a count
 * of package files, a pane under the code (where output comes from, or CI builds once the pipeline is
 * installed), a row of desks for the team, who types alongside the player, and the duck's advice.
 */
export class Workspace {
  private readonly el = {
    tabs: document.getElementById('pTabs')!,
    pane: document.getElementById('pane')!,
    paneName: document.getElementById('paneName')!,
    paneStat: document.getElementById('paneStat')!,
    paneLog: document.getElementById('paneLog')!,
    desks: document.getElementById('desks')!,
  };
  private build = between(200, 900);
  private building = false;
  private script: string[] = [];
  private readonly rows: string[] = [];
  private lastBeat = 0;
  private quack = 0;
  private view: PaneView = 'top';
  /** The pane under the code is open (tapping its tab again closes it, for more code). */
  private paneOpen = true;
  private desksOpen = true;

  constructor(private readonly game: Game) {
    this.el.tabs.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('[data-pane]');
      if (!btn) return;
      const want = btn.dataset.pane as PaneView | 'team';
      if (want === 'team') this.desksOpen = !this.desksOpen;
      else if (want === this.view) this.paneOpen = !this.paneOpen;
      else {
        this.view = want;
        this.paneOpen = true;
      }
      this.update(performance.now(), true);
    });
  }

  /** Names typing alongside: developers writing code (features, sprints, refactoring), then the packages that write it. */
  ghosts(): string[] {
    const s = this.game.state;
    const names = s.team.filter((d) => d.role === 'features' || d.role === 'sprints' || d.role === 'refactor').map((d) => d.name);
    if (owned(s, 'intern') > 0) names.push('intern');
    if (owned(s, 'pair') > 0) names.push('pair');
    if (owned(s, 'gen') > 0) names.push('codegen');
    if (owned(s, 'agents') > 0) names.push('agent-7');
    return names.slice(0, MAX_GHOSTS);
  }

  update(now: number, force = false): void {
    const s = this.game.state;
    const ci = owned(s, 'ci') > 0;
    const any = UPGRADES.some((u) => owned(s, u.id) > 0);
    if (this.view === 'ci' && !ci) this.view = 'top';
    const files = PACKAGE_FILES.filter((id) => owned(s, id) > 0).length;
    const tab = (pane: string, label: string, on: boolean) => `<button class="tab x${on ? ' on' : ''}" data-pane="${pane}" aria-pressed="${on}">${label}</button>`;
    setHtml(
      this.el.tabs,
      (any ? tab('top', 'top', this.paneOpen && this.view === 'top') : '') +
        (s.team.length ? tab('team', 'team', this.desksOpen) : '') +
        (ci ? tab('ci', `ci <span class="${this.building ? 'cm' : 'okc'}">${this.building ? '…' : 'ok'}</span>`, this.paneOpen && this.view === 'ci') : '') +
        (files > 1 ? tab('top', `+${files}`, false) : ''),
    );
    // An outage banner or a merge conflict needs the whole code area.
    const busy = s.incident?.kind === 'outage' || s.incident?.kind === 'conflict';
    this.el.pane.hidden = !any || !this.paneOpen || busy;
    this.el.pane.classList.toggle('v-top', this.view === 'top');
    this.el.desks.hidden = !s.team.length || !this.desksOpen || busy;
    if (!this.el.desks.hidden) this.renderDesks();
    if (ci && now - this.lastBeat > this.beatMs()) {
      this.lastBeat = now;
      this.beat();
    }
    if (this.el.pane.hidden) return;
    if (this.view === 'top') this.renderTop();
    else if (force) this.renderCi();
  }

  /** `top`: the packages writing the most, with their share of output. */
  private renderTop(): void {
    const s = this.game.state;
    const kind = UPGRADES.some((u) => u.kind === 'auto' && owned(s, u.id) > 0) ? 'auto' : 'tap';
    const shares = outputShares(s, kind);
    // With the desks up, one row fewer, so the code keeps some room.
    const shown = shares.slice(0, this.el.desks.hidden ? PANE_ROWS : PANE_ROWS - 1);
    setText(this.el.paneName, `1:top ${kind === 'auto' ? '/s' : '/tap'}`);
    setText(this.el.paneStat, `${shares.length} package${shares.length === 1 ? '' : 's'}${shares.length > shown.length ? ` · ${shares.length - shown.length} more below` : ''}`);
    setHtml(
      this.el.paneLog,
      shown
        .map(
          ({ upgrade, share }) =>
            `<div class="trow"><span class="tn">${esc(shortName(upgrade.id))}</span><span class="tq">x${owned(s, upgrade.id)}</span><span class="cbar ${kind}"><i style="width:${(share * 100).toFixed(1)}%"></i></span><span class="tp">${Math.round(share * 100)}%</span></div>`,
        )
        .join(''),
    );
  }

  private renderCi(): void {
    setText(this.el.paneName, owned(this.game.state, 'k8s') > 0 ? '2:ci+deploy' : '2:ci');
    setText(this.el.paneStat, `#${this.build} ${this.building ? 'running' : 'passed'}`);
    setHtml(
      this.el.paneLog,
      this.rows.map((r) => `<div class="${r.startsWith('ok') ? 'pok' : r.includes('FAIL') ? 'pbad' : r.startsWith('>') ? 'pcmd' : ''}">${esc(r)}</div>`).join(''),
    );
  }

  /** A desk per developer: face, name, role and what they're doing right now. */
  private renderDesks(): void {
    const s = this.game.state;
    const shown = s.team.length > MAX_DESKS ? s.team.slice(0, MAX_DESKS - 1) : s.team;
    const doing = (role: string): [string, string] => {
      switch (role) {
        case 'features':
          return ['typing', 'h-loc'];
        case 'sprints':
          return s.sprint ? ['sprinting', 'h-tap'] : ['standup', 'h-star'];
        case 'oncall':
          return s.incident?.kind === 'outage' || s.boss ? ['on it', 'h-bug'] : ['idle', 'cm'];
        case 'bugs':
          return s.bug ? ['squashing', 'h-bug'] : ['triage', 'cm'];
        default:
          return ['refactoring', 'h-auto'];
      }
    };
    setHtml(
      this.el.desks,
      shown
        .map((d) => {
          const [what, cls] = doing(d.role);
          return `<div class="desk"><div><span class="df2">${esc(DESK_FACES[d.face % DESK_FACES.length])}</span> <span class="nm">${esc(d.name)}</span></div><div class="cm">${esc(ROLES[d.role].label)}</div><div class="dw ${cls}">${what}</div></div>`;
        })
        .join('') + (s.team.length > shown.length ? `<div class="desk more">+${s.team.length - shown.length}<div class="cm">more in co</div></div>` : ''),
    );
  }

  /** More pipelines, faster builds. */
  private beatMs(): number {
    return Math.max(420, 1100 - owned(this.game.state, 'ci') * 12);
  }

  /** Prints the next line of the current build, writing a new build script when one finishes. */
  private beat(): void {
    const s = this.game.state;
    if (this.script.length === 0) {
      this.build++;
      const id = `#${this.build}`;
      const tests = between(120, 4800).toLocaleString('en-US');
      // Debt makes the tests flakier.
      const flaky = Math.random() < 0.12 + s.debt / 400;
      this.script = [`> build ${id} queued (main)`, `  compiling ${between(40, 900)} modules`];
      if (owned(s, 'lint') > 0) this.script.push(`  lint: fixed ${between(2, 60)} semicolons`);
      this.script.push(flaky ? `  FAIL 1 of ${tests} tests (flaky), retrying` : `  ok ${tests} tests`);
      if (flaky) this.script.push(`  ok ${tests} tests`);
      if (owned(s, 'quantum') > 0) this.script.push('  collapsing 2^64 branches: ok');
      if (owned(s, 'k8s') > 0) this.script.push(`  rolling out to ${between(3, 48)} pods`);
      this.script.push(`ok build ${id} passed in ${between(8, 95)}s`);
      this.building = true;
    }
    const line = this.script.shift()!;
    this.rows.push(line);
    if (this.rows.length > PANE_ROWS) this.rows.shift();
    if (this.script.length === 0) this.building = false;
    if (this.view === 'ci' && this.paneOpen) this.renderCi();
  }

  /** Talks to the duck: every other poke it points at something worth doing, otherwise it says something wise. */
  pokeDuck(): string {
    const s = this.game.state;
    const pokes = this.game.pokeDuck();
    const hint =
      s.boss?.phase === 'incoming'
        ? 'something big is coming. you can take it.'
        : upgradesWithForks(s).length
          ? 'a package is waiting for you to pick its upgrade. pkgs.'
          : s.debt >= DEBT.warnAt
            ? 'this codebase smells. refactor it.'
            : s.applicant && s.unlocked.team
              ? 'someone is waiting in co/team. say hello.'
              : unreadCount(s) > 0
                ? 'you have mail. I did not read it. (I read it.)'
                : starsAvailable(s) >= 1 && s.stars === 0
                  ? 'you could ship right now, you know.'
                  : null;
    return hint && pokes % 2 === 1 ? hint : DUCK_LINES[this.quack++ % DUCK_LINES.length];
  }
}
