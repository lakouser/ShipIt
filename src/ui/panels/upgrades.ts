import { UPGRADES } from '../../core/content';
import { costOf, isUpgradeVisible, nextDoublingAt, owned, quantityToBuy, unitOutput } from '../../core/economy';
import type { Game } from '../../core/game';
import { fmt, fmtRate } from '../../core/num';
import { setText } from '../dom';
import { icon } from '../icons';

const GROUPS = [
  { kind: 'tap', label: 'Typing speed', unit: '/ tap' },
  { kind: 'auto', label: 'Automation', unit: '/ s' },
] as const;

/** Which upgrades are showing; the panel re-renders when this changes. */
export const visibilityKey = (game: Game): string => UPGRADES.map((_, i) => (isUpgradeVisible(game.state, i) ? 1 : 0)).join('');

export function renderUpgrades(game: Game): string {
  const s = game.state;
  const now = game.now();
  const amounts = [1, 10, 'max'] as const;
  let html = `<div class="bar"><h2>Upgrades</h2><div class="mult" role="group" aria-label="Buy amount">${amounts
    .map((m) => `<button data-mult="${m}" aria-pressed="${s.settings.buyAmount === m}">${m === 'max' ? 'Max' : '×' + m}</button>`)
    .join('')}</div></div>`;
  for (const group of GROUPS) {
    html += `<div class="grp">${group.label}</div>`;
    UPGRADES.forEach((u, i) => {
      if (u.kind !== group.kind || !isUpgradeVisible(s, i)) return;
      const n = owned(s, u.id);
      html += `<div class="row">
        <span class="ic">${icon(u.icon)}</span>
        <div class="nm"><b>${u.name}<span class="own">${n}</span></b><small>${u.blurb}</small><small>+${fmtRate(unitOutput(s, u, now))} ${group.unit} each · ×2 at ${nextDoublingAt(n)}</small></div>
        <button class="buy" data-buy="${u.id}" aria-label="Buy ${u.name}"><span class="bq"></span><span class="bc"></span></button>
      </div>`;
    });
  }
  return html;
}

/** Updates prices and affordability in place, without re-rendering (so taps on buttons are never lost). */
export function refreshUpgrades(game: Game, root: HTMLElement): void {
  const s = game.state;
  root.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((btn) => {
    const u = UPGRADES.find((x) => x.id === btn.dataset.buy);
    if (!u) return;
    const count = quantityToBuy(s, u);
    const cost = costOf(s, u, count);
    const affordable = s.lines.gte(cost);
    btn.disabled = !affordable;
    btn.classList.toggle('ok', affordable);
    const progress = affordable ? 100 : Math.min(100, s.lines.div(cost).toNumber() * 100);
    btn.style.setProperty('--p', `${progress.toFixed(1)}%`);
    setText(btn.firstElementChild, `×${count}`);
    setText(btn.lastElementChild, fmt(cost));
  });
}
