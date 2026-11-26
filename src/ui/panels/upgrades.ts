import { DEBT, FORK_STEP, UPGRADES, type ForkDef, type UpgradeDef } from '../../core/content';
import { debtPerMinute, debtVisible, refactorCost } from '../../core/debt';
import { costOf, debtMultiplier, forkOptions, forksPending, isUpgradeVisible, nextForkAt, owned, perSecond, perTap, quantityToBuy, unitOutput } from '../../core/economy';
import type { Game } from '../../core/game';
import { fmt, fmtRate } from '../../core/num';
import { prefersReducedMotion, setHtml, setText } from '../dom';
import { hl, tint } from '../hl';
import { barHtml, forkSummary, packageName } from '../messages';
import { etaText, secondsFor } from '../nav';
import { DUCK, DUCK_BLINK } from '../workspace';

/** Automation first: past the first minutes it's where most of the output comes from. */
const GROUPS = [
  { kind: 'auto', label: '# automation', unit: '/s', hue: 'auto' },
  { kind: 'tap', label: '# typing speed', unit: '/tap', hue: 'tap' },
] as const;

/** What the panel remembers between renders. */
export interface UpgradesView {
  /** The package whose upgrade picker is open. */
  openFork: string | null;
  /** `?` is open: package blurbs show too. */
  help: boolean;
}

/** What the panel shows; it re-renders when this changes. */
export const visibilityKey = (game: Game): string =>
  UPGRADES.map((u, i) => (isUpgradeVisible(game.state, i) ? `${+(owned(game.state, u.id) > 0)}${forksPending(game.state, u.id) > 0 ? 'f' : ''}` : '-')).join('') +
  (debtVisible(game.state) ? 'd' : '') +
  (game.state.owned.duck ? 'q' : '');

/** What choosing a fork would add right now: applies it, measures, and takes it back. */
function forkGain(game: Game, u: UpgradeDef, fork: ForkDef): string {
  const s = game.state;
  const now = game.now();
  const output = () => (u.kind === 'tap' ? perTap(s, now) : perSecond(s, now));
  const before = output();
  const forks = (s.forks[u.id] ??= []);
  forks.push(fork.id);
  const after = output();
  forks.pop();
  if (forks.length === 0) delete s.forks[u.id];
  return `+${fmtRate(after.sub(before))}${u.kind === 'tap' ? '/tap' : '/s'} now`;
}

/** The two upgrades to choose between when a package reaches its next 25. */
function forkPicker(game: Game, u: UpgradeDef): string {
  const options = forkOptions(game.state, u.id);
  if (!options) return '';
  const at = ((game.state.forks[u.id]?.length ?? 0) + 1) * FORK_STEP;
  return `<div class="fork" role="group" aria-label="Pick an upgrade for ${u.name}">
    <div class="fh">${hl(`${at} installed: pick one upgrade`)}</div>
    ${options
      .map(
        (f) => `<button class="fopt" data-fork="${u.id}" data-opt="${f.id}">
      <b>--${f.id}</b> <span class="fn2">${f.name}</span>
      <small>${hl(forkSummary(f, u.kind))}</small>
      <small class="gain">${hl(forkGain(game, u, f))}</small>
    </button>`,
      )
      .join('')}
  </div>`;
}

export function renderUpgrades(game: Game, view: UpgradesView): string {
  const s = game.state;
  const now = game.now();
  const amounts = [1, 10, 'max'] as const;
  let html = `<div class="cmd"><span><span class="ps">$</span> npm install</span><div class="amounts" role="group" aria-label="Buy amount">${amounts
    .map((m) => `<button data-mult="${m}" aria-pressed="${s.settings.buyAmount === m}">${m === 'max' ? 'max' : 'x' + m}</button>`)
    .join('')}<button class="qm" data-help aria-pressed="${view.help}" aria-label="How packages work">?</button></div></div><!--help-->`;
  for (const group of GROUPS) {
    html += `<div class="grp">${group.label} ${tint(group.hue, group.unit)}</div>`;
    UPGRADES.forEach((u, i) => {
      if (u.kind !== group.kind || !isUpgradeVisible(s, i)) return;
      const n = owned(s, u.id);
      const forkReady = forksPending(s, u.id) > 0;
      const open = forkReady && view.openFork === u.id;
      html += `<div class="pkg">
        <div><span class="nm">${packageName(u.name)}</span><span class="qty">[${n}]</span>${n === 0 ? ' <span class="nw">new</span>' : ''}</div>
        ${view.help ? `<small class="cm"># ${u.blurb.toLowerCase()}</small>` : ''}
        ${
          forkReady
            ? `<button class="fready" data-openfork="${u.id}" aria-expanded="${open}">fork ready: pick an upgrade ${open ? '▾' : '▸'}</button>`
            : `<small>${hl(`+${fmtRate(unitOutput(s, u, now))}${group.unit} each`)} · <span data-eta="${u.id}"></span></small>`
        }
        <button class="buy" data-buy="${u.id}" aria-label="Install ${u.name}"><span class="bq"></span><span class="bc"></span></button>
        ${u.id === 'duck' && n > 0 ? `<div class="ducky"><button class="duckbtn" data-duck aria-label="Talk to the rubber duck"><pre aria-hidden="true">${DUCK}</pre></button><span class="quack" data-quack aria-live="polite"></span></div>` : ''}
        ${open ? forkPicker(game, u) : ''}
      </div>`;
    });
  }
  // Below the list, so the packages don't jump down when it first appears.
  if (debtVisible(s))
    html += `<div class="debt" data-debt>
      <div class="dh"><span>${tint('bug', 'tech debt')} <span class="tbar" data-debt-bar></span></span><span class="aside" data-debt-rate></span></div>
      <div class="dr"><small data-debt-note></small><button class="act refac" data-refactor><span>git refactor</span> <b data-debt-cost></b></button></div>
    </div>`;
  return html;
}

/** What the `?` in pkgs explains. */
export const upgradesHelp = (): string =>
  hl(
    `packages write code for you: typing speed adds lines to every tap, automation writes them every second. each copy costs 15% more than the last. every ${FORK_STEP} copies of a package offers a pick of two upgrades. shipping a release resets packages. tech debt builds as you write; it's free below ${DEBT.grace}%, then automation slows until you refactor.`,
  );

/**
 * Updates prices, affordability, time to afford and debt in place, without re-rendering (so taps on
 * buttons are never lost).
 */
export function refreshUpgrades(game: Game, root: HTMLElement, duckLine = ''): void {
  const s = game.state;
  const now = game.now();
  setText(root.querySelector('[data-duck] pre'), !prefersReducedMotion() && Date.now() % 5200 < 220 ? DUCK_BLINK : DUCK);
  setText(root.querySelector('[data-quack]'), duckLine ? `"${duckLine}"` : 'tap the duck');
  root.querySelector('[data-quack]')?.classList.toggle('said', !!duckLine);
  let hinted = false;
  root.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((btn) => {
    const u = UPGRADES.find((x) => x.id === btn.dataset.buy);
    if (!u) return;
    const count = quantityToBuy(s, u);
    const cost = costOf(s, u, count);
    const affordable = s.lines.gte(cost);
    btn.disabled = !affordable;
    btn.classList.toggle('ok', affordable);
    // Onboarding: until the first purchase, pulse the first thing the player can afford.
    const hint = affordable && !hinted && s.stats.purchases === 0;
    btn.classList.toggle('hint', hint);
    hinted ||= hint;
    const progress = affordable ? 100 : Math.min(100, s.lines.div(cost).toNumber() * 100);
    btn.style.setProperty('--p', `${progress.toFixed(1)}%`);
    setText(btn.firstElementChild, `x${count}`);
    setText(btn.lastElementChild, fmt(cost));
    const eta = root.querySelector(`[data-eta="${u.id}"]`);
    if (eta) {
      const wait = affordable ? null : etaText(secondsFor(game, cost.sub(s.lines)));
      setText(eta, wait ? `in ${wait}` : `fork at ${nextForkAt(owned(s, u.id))}`);
    }
  });
  if (root.querySelector('[data-debt]')) {
    const penalty = Math.round((1 - debtMultiplier(s)) * 100);
    const rate = debtPerMinute(s, now);
    setHtml(root.querySelector('[data-debt-bar]'), barHtml(s.debt / DEBT.max, 14));
    setHtml(root.querySelector('[data-debt-rate]'), hl(rate === 0 ? 'steady' : `${rate > 0 ? '+' : ''}${rate.toFixed(1)}/min`));
    setHtml(
      root.querySelector('[data-debt-note]'),
      penalty > 0 ? `automation ${tint('bug', `-${penalty}%`)} until you refactor` : hl(`free below ${DEBT.grace}%. boosts and escaped bugs add to it`),
    );
    const btn = root.querySelector<HTMLButtonElement>('[data-refactor]');
    if (btn) {
      const cost = refactorCost(s, now);
      const can = s.debt >= 1 && s.lines.gte(cost);
      btn.disabled = !can;
      btn.classList.toggle('ok', can && penalty > 0);
      setText(btn.querySelector('[data-debt-cost]'), s.debt < 1 ? 'clean' : `-${fmt(cost)}`);
    }
  }
}
