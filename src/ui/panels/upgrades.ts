import { UPGRADES } from '../../core/content';
import { costOf, isUpgradeVisible, nextDoublingAt, owned, quantityToBuy, unitOutput } from '../../core/economy';
import type { Game } from '../../core/game';
import { fmt, fmtRate } from '../../core/num';
import { setText } from '../dom';
import { packageName } from '../messages';

const GROUPS = [
  { kind: 'tap', label: '# typing speed', unit: '/tap' },
  { kind: 'auto', label: '# automation', unit: '/s' },
] as const;

/** Which upgrades are showing; the panel re-renders when this changes. */
export const visibilityKey = (game: Game): string => UPGRADES.map((_, i) => (isUpgradeVisible(game.state, i) ? 1 : 0)).join('');

export function renderUpgrades(game: Game): string {
  const s = game.state;
  const now = game.now();
  const amounts = [1, 10, 'max'] as const;
  let html = `<div class="cmd"><span><span class="ps">$</span> npm install</span><div class="amounts" role="group" aria-label="Buy amount">${amounts
    .map((m) => `<button data-mult="${m}" aria-pressed="${s.settings.buyAmount === m}">${m === 'max' ? '--max' : 'x' + m}</button>`)
    .join('')}</div></div>`;
  for (const group of GROUPS) {
    html += `<div class="grp">${group.label}</div>`;
    UPGRADES.forEach((u, i) => {
      if (u.kind !== group.kind || !isUpgradeVisible(s, i)) return;
      const n = owned(s, u.id);
      html += `<div class="pkg">
        <div><span class="nm">${packageName(u.name)}</span><span class="qty">[${n}]</span></div>
        <small class="cm"># ${u.blurb.toLowerCase()}</small>
        <small>+${fmtRate(unitOutput(s, u, now))}${group.unit} each · x2 at ${nextDoublingAt(n)}</small>
        <button class="buy" data-buy="${u.id}" aria-label="Install ${u.name}"><span class="bq"></span><span class="bc"></span></button>
      </div>`;
    });
  }
  return html;
}

/** Updates prices and affordability in place, without re-rendering (so taps on buttons are never lost). */
export function refreshUpgrades(game: Game, root: HTMLElement): void {
  const s = game.state;
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
  });
}
