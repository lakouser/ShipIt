import { TESTS } from '../../core/content';
import { coverage, coverageAt } from '../../core/coverage';
import type { Game } from '../../core/game';
import { mods } from '../../core/mods';
import { fmt } from '../../core/num';
import { setHtml } from '../dom';
import { hl, tint } from '../hl';
import { cssBar, setBar } from './ship';

const pct = (x: number): string => `${Math.round(x * 100)}%`;

/** work/tests: the test budget, this release's coverage and what it does. */
export function renderTests(game: Game): string {
  const s = game.state;
  const chips = TESTS.budgets
    .map((b) => `<button class="chip2" data-budget="${b}" aria-pressed="${s.testBudget === b}">${s.testBudget === b ? '(•)' : '( )'} ${pct(b)}${b > 0 ? ` <small>→ ${pct(coverageAt(s, b))}</small>` : ''}</button>`)
    .join('');
  return `<div class="cmd"><span><span class="ps">$</span> npm test -- --coverage</span></div><!--help-->
    <div class="pr">
      <div class="prh">
        <div class="prt"><h3 data-cov-title></h3></div>
        ${cssBar('data-cov-bar', 'loc')}
        <div class="chk"><span>this release</span><b data-cov-lines></b></div>
        <div class="chk"><span>review</span><b data-cov-review></b></div>
        <div class="chk"><span>escaping bugs caught</span><b data-cov-bugs></b></div>
        <div class="chk"><span>tech debt</span><b data-cov-debt></b></div>
      </div>
    </div>
    <div class="row2"><span class="lbl">test budget</span>${chips}</div>
    <p class="caveat">${hl(`# that share of the code you write goes to tests: it doesn't count toward stars or spending. coverage counts the whole release, so a budget set late only covers what's written after.${mods(s).coverageMul > 1 ? ` your stack counts coverage x${mods(s).coverageMul}.` : ''}`)}</p>`;
}

export const testsKey = (game: Game): string => `${game.state.testBudget}|${game.state.stack}`;

export const testsHelp = (): string =>
  hl(
    `tests catch bugs before they escape (the chance is the coverage), slow tech debt (up to ${pct(TESTS.debtCut)} slower) and lift the release's review (up to +${TESTS.reviewBonus}★), which brings more users, the chart, issues and, after the ipo, revenue. coverage is the share of this release's code written as tests, times ${TESTS.leverage}. it starts again with every release.`,
  );

export function refreshTests(game: Game, root: HTMLElement): void {
  const s = game.state;
  const cov = coverage(s);
  setHtml(root.querySelector('[data-cov-title]'), `coverage ${tint('loc', pct(cov))}`);
  setBar(root.querySelector('[data-cov-bar]'), cov);
  setHtml(root.querySelector('[data-cov-lines]'), `${tint('loc', fmt(s.tests))} of tests · ${fmt(s.written.sub(s.tests))} of code`);
  setHtml(root.querySelector('[data-cov-review]'), cov > 0 ? `${tint('star', `+${(TESTS.reviewBonus * cov).toFixed(2)}★`)} when it ships` : '<span class="cm">no bonus</span>');
  setHtml(root.querySelector('[data-cov-bugs]'), `${pct(cov)} <span class="cm">· ${fmt(s.stats.testsCaught)} caught in all</span>`);
  setHtml(root.querySelector('[data-cov-debt]'), cov > 0 ? `builds ${pct(TESTS.debtCut * cov)} slower` : '<span class="cm">no change</span>');
}
