import type { Game } from '../../core/game';
import type { BuyAmount, Tab } from '../../core/state';
import { renderShip, refreshShip } from './ship';
import { renderSprints, refreshSprints } from './sprints';
import { refreshUpgrades, renderUpgrades, visibilityKey } from './upgrades';

const ARM_MS = 4000;

/**
 * The tabbed panel: Upgrades, Sprints, Ship. render() rebuilds the active tab
 * (after purchases, sprint changes, tab switches); refresh() updates numbers in place every tick.
 */
export class Panels {
  private shownKey = '';
  private armed = false;
  private armTimer = 0;

  constructor(
    private readonly game: Game,
    private readonly root: HTMLElement,
    private readonly tabs: HTMLElement,
    private readonly onAction: () => void,
  ) {
    tabs.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('[data-tab]');
      if (!btn) return;
      this.game.state.settings.tab = btn.dataset.tab as Tab;
      this.disarm();
      this.render();
      this.root.scrollTop = 0;
    });
    root.addEventListener('click', (e) => this.handleClick(e));
  }

  render(): void {
    const tab = this.game.state.settings.tab;
    this.tabs.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    this.root.innerHTML = tab === 'upgrades' ? renderUpgrades(this.game) : tab === 'sprints' ? renderSprints(this.game) : renderShip(this.game);
    this.shownKey = visibilityKey(this.game);
    this.refresh();
  }

  refresh(): void {
    const tab = this.game.state.settings.tab;
    if (tab === 'upgrades') {
      if (visibilityKey(this.game) !== this.shownKey) return this.render();
      refreshUpgrades(this.game, this.root);
    } else if (tab === 'sprints') refreshSprints(this.game, this.root);
    else refreshShip(this.game, this.root, this.armed);
  }

  private handleClick(e: MouseEvent): void {
    const btn = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!btn || btn.disabled) return;
    const { buy, mult, start } = btn.dataset;
    if (buy) {
      if (this.game.buy(buy)) {
        this.onAction();
        this.render();
      }
    } else if (mult) {
      this.game.state.settings.buyAmount = (mult === 'max' ? 'max' : Number(mult)) as BuyAmount;
      this.render();
    } else if (start) {
      this.game.startSprint(Number(start));
    } else if ('ship' in btn.dataset) {
      if (this.armed) {
        this.disarm();
        this.game.ship();
      } else {
        this.armed = true;
        this.armTimer = window.setTimeout(() => this.disarm(), ARM_MS);
        this.refresh();
      }
    }
  }

  private disarm(): void {
    window.clearTimeout(this.armTimer);
    if (!this.armed) return;
    this.armed = false;
    this.refresh();
  }
}
