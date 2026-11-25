import { DEBT } from '../core/content';
import { owned, upgradesWithForks } from '../core/economy';
import type { Game } from '../core/game';
import { unreadCount } from '../core/mail';
import { starsAvailable } from '../core/ship';
import { esc, setHtml, setText } from './dom';

/** Packages that open their own file in the editor's tab line once installed. */
const PACKAGE_TABS: readonly [string, string][] = [
  ['vim', '.vimrc'],
  ['lint', '.eslintrc'],
  ['snip', 'snippets'],
  ['ci', 'ci.yml'],
  ['pair', 'pair.md'],
  ['macro', 'macros'],
  ['gen', 'codegen'],
  ['llm', 'model.bin'],
  ['k8s', 'deploy.yaml'],
  ['agents', 'agents.json'],
  ['neural', 'cortex'],
  ['quantum', 'qubits'],
  ['dyson', 'star.cfg'],
  ['simverse', 'universe'],
  ['entropy', 'time.rev'],
];

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
/** Lines shown in the CI pane. */
const PANE_ROWS = 3;
const between = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));

/**
 * What the packages and the team add around the editor: a tab per installed package, a CI pane that
 * runs builds once the CI pipeline is installed, who types alongside the player, and the duck's advice.
 */
export class Workspace {
  private readonly el = {
    tabs: document.getElementById('xTabs')!,
    pane: document.getElementById('pane')!,
    paneName: document.getElementById('paneName')!,
    paneStat: document.getElementById('paneStat')!,
    paneLog: document.getElementById('paneLog')!,
  };
  private build = between(200, 900);
  private script: string[] = [];
  private readonly rows: string[] = [];
  private lastBeat = 0;
  private quack = 0;

  constructor(private readonly game: Game) {}

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

  update(now: number): void {
    const s = this.game.state;
    setHtml(
      this.el.tabs,
      PACKAGE_TABS.filter(([id]) => owned(s, id) > 0)
        .map(([, file]) => `<span class="tab x">${esc(file)}</span>`)
        .join(''),
    );
    const ci = owned(s, 'ci') > 0;
    this.el.pane.hidden = !ci;
    if (ci && now - this.lastBeat > this.beatMs()) {
      this.lastBeat = now;
      this.beat();
    }
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
      setText(this.el.paneStat, `${id} running`);
    }
    const line = this.script.shift()!;
    this.rows.push(line);
    if (this.rows.length > PANE_ROWS) this.rows.shift();
    if (this.script.length === 0) setText(this.el.paneStat, `#${this.build} passed`);
    setHtml(
      this.el.paneLog,
      this.rows.map((r) => `<div class="${r.startsWith('ok') ? 'pok' : r.includes('FAIL') ? 'pbad' : r.startsWith('>') ? 'pcmd' : ''}">${esc(r)}</div>`).join(''),
    );
    setText(this.el.paneName, owned(s, 'k8s') > 0 ? '1:ci+deploy' : '1:ci');
  }

  /** Talks to the duck: every other poke it points at something worth doing, otherwise it says something wise. */
  pokeDuck(): string {
    const s = this.game.state;
    const pokes = this.game.pokeDuck();
    const hint =
      s.boss?.phase === 'incoming'
        ? 'something big is coming. you can take it.'
        : upgradesWithForks(s).length
          ? 'a package is waiting for you to pick its upgrade. 0:pkgs.'
          : s.debt >= DEBT.warnAt
            ? 'this codebase smells. refactor it.'
            : s.applicant && s.unlocked.team
              ? 'someone is waiting in 4:team. say hello.'
              : unreadCount(s) > 0
                ? 'you have mail. I did not read it. (I read it.)'
                : starsAvailable(s) >= 1 && s.stars === 0
                  ? 'you could ship right now, you know.'
                  : null;
    return hint && pokes % 2 === 1 ? hint : DUCK_LINES[this.quack++ % DUCK_LINES.length];
  }
}
