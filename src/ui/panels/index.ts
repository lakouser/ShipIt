import type { ChallengeId, EffectId, IncidentKind, StackId, WorkflowId } from '../../core/content';
import { workflowOn } from '../../core/workflows';
import type { DevAction } from '../../core/dev';
import type { Game } from '../../core/game';
import type { BuyAmount, KeySound, Notation, Skin, Tab } from '../../core/state';
import { renderSettings, type SettingsView } from './settings';
import { refreshMajor, renderMajor } from './major';
import { renderShip, refreshShip } from './ship';
import { renderSprints, refreshSprints } from './sprints';
import { renderTodo, refreshTodo } from './todo';
import { refreshUpgrades, renderUpgrades, visibilityKey } from './upgrades';

const ARM_MS = 4000;
const DEV_TAPS = 7;

export interface PanelActions {
  /** Click/haptic feedback for a successful action. */
  feedback(): void;
  /** Settings changed: re-apply theme, notation, motion. */
  settingsChanged(): void;
  exportSave(): string;
  importSave(text: string): boolean;
  resetSave(): void;
  restoreBackup(): void;
  saveInfo(): { status: string; ok: boolean; backup: string | null };
  copy(text: string): void;
  hapticsSupported: boolean;
  version: string;
}

/**
 * The tool pane: pkgs, sprints, todo, ship and settings. render() rebuilds the active tab
 * (after purchases, sprint changes, tab switches); refresh() updates numbers in place every tick.
 */
export class Panels {
  private shownKey = '';
  private armed = false;
  private armTimer = 0;
  /** A second confirm-tap action waiting in the major tab: 'major' or 'challenge:<id>'. */
  private armedAction: string | null = null;
  private resetArmed = false;
  private exportText: string | null = null;
  private importOpen = false;
  private importError = false;
  private versionTaps = 0;

  constructor(
    private readonly game: Game,
    private readonly root: HTMLElement,
    private readonly tabs: HTMLElement,
    private readonly actions: PanelActions,
  ) {
    tabs.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('[data-tab]');
      if (!btn) return;
      this.show(btn.dataset.tab as Tab);
    });
    root.addEventListener('click', (e) => this.handleClick(e));
  }

  show(tab: Tab): void {
    this.game.state.settings.tab = tab;
    this.tabs.querySelector(`[data-tab="${tab}"]`)?.classList.remove('new');
    this.disarm();
    this.exportText = null;
    this.importOpen = false;
    this.render();
    this.root.scrollTop = 0;
  }

  /** Shows or hides tabs according to what the player has unlocked; newly unlocked ones blink until visited. */
  syncTabs(newlyUnlocked?: Tab): void {
    const u = this.game.state.unlocked;
    const visible: Record<string, boolean> = { upgrades: true, sprints: u.sprints, todo: u.todo, ship: u.ship, major: u.major, settings: true };
    this.tabs.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
      b.hidden = !visible[b.dataset.tab!];
      if (b.dataset.tab === newlyUnlocked) b.classList.add('new');
    });
    const tab = this.game.state.settings.tab;
    if (!visible[tab]) this.game.state.settings.tab = 'upgrades';
  }

  render(): void {
    const tab = this.game.state.settings.tab;
    this.tabs.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const view: SettingsView = {
      exportText: this.exportText,
      importOpen: this.importOpen,
      importError: this.importError,
      resetArmed: this.resetArmed,
      hapticsSupported: this.actions.hapticsSupported,
      version: this.actions.version,
      save: this.actions.saveInfo(),
    };
    this.root.innerHTML =
      tab === 'upgrades' ? renderUpgrades(this.game)
      : tab === 'sprints' ? renderSprints(this.game)
      : tab === 'todo' ? renderTodo(this.game)
      : tab === 'ship' ? renderShip(this.game)
      : tab === 'major' ? renderMajor(this.game, this.armedAction)
      : renderSettings(this.game, view);
    this.shownKey = visibilityKey(this.game);
    this.refresh();
  }

  refresh(): void {
    const tab = this.game.state.settings.tab;
    if (tab === 'upgrades') {
      if (visibilityKey(this.game) !== this.shownKey) return this.render();
      refreshUpgrades(this.game, this.root);
    } else if (tab === 'sprints') refreshSprints(this.game, this.root);
    else if (tab === 'todo') refreshTodo(this.game, this.root);
    else if (tab === 'ship') refreshShip(this.game, this.root, this.armed);
    else if (tab === 'major') refreshMajor(this.game, this.root, this.armedAction);
    else if (tab === 'settings') {
      const el = this.root.querySelector('[data-save-status]');
      const info = this.actions.saveInfo();
      if (el && el.textContent !== info.status) {
        el.textContent = info.status;
        el.classList.toggle('bad', !info.ok);
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    const btn = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!btn || btn.disabled) return;
    const d = btn.dataset;
    const s = this.game.state;
    if (d.buy) {
      if (this.game.buy(d.buy)) this.done();
    } else if (d.buyperk) {
      if (this.game.buyPerk(d.buyperk)) this.done();
    } else if (d.run) {
      if (this.game.runScript(d.run as EffectId)) this.done();
    } else if (d.mult) {
      s.settings.buyAmount = (d.mult === 'max' ? 'max' : Number(d.mult)) as BuyAmount;
      this.render();
    } else if (d.start) {
      this.game.startSprint(Number(d.start));
    } else if ('ship' in d) {
      if (this.armed) {
        this.disarm();
        this.game.ship();
      } else {
        this.armed = true;
        this.armTimer = window.setTimeout(() => this.disarm(), ARM_MS);
        this.refresh();
      }
    } else if ('major' in d) {
      if (this.armedAction === 'major') {
        this.disarm();
        this.game.cutMajor();
      } else this.arm('major');
    } else if (d.challenge) {
      const key = `challenge:${d.challenge}`;
      if (this.armedAction === key) {
        this.disarm();
        if (this.game.startChallenge(d.challenge as ChallengeId)) this.done();
      } else this.arm(key);
    } else if ('abandon' in d) {
      this.game.abandonChallenge();
    } else if (d.stack) {
      if (this.game.chooseStack(d.stack as StackId)) this.done();
    } else if (d.skill) {
      if (this.game.buySkill(d.skill)) this.done();
    } else if (d.workflow) {
      const id = d.workflow as WorkflowId;
      this.game.setWorkflow(id, !workflowOn(s, id));
      this.done();
    } else if (d.autoship) {
      this.game.setAutoShipAt(Number(d.autoship));
      this.done();
    } else if (d.toggle) {
      const key = d.toggle as 'sound' | 'haptics' | 'reduceMotion' | 'welcome';
      s.settings[key] = !s.settings[key];
      this.settingsChanged();
    } else if (d.choice) {
      if (d.choice === 'keySound') s.settings.keySound = d.value as KeySound;
      if (d.choice === 'skin') s.settings.skin = d.value as Skin;
      if (d.choice === 'notation') s.settings.notation = d.value as Notation;
      this.settingsChanged();
    } else if (d.act) {
      this.settingsAction(d.act);
    } else if (d.dev) {
      if (d.dev === 'off') {
        s.settings.dev = false;
        this.render();
      } else {
        this.game.dev(d.dev as DevAction, d.kind as IncidentKind | undefined);
        this.render();
      }
    }
  }

  private settingsAction(act: string): void {
    const s = this.game.state;
    if (act === 'export') {
      this.exportText = this.actions.exportSave();
      this.importOpen = false;
    } else if (act === 'copy' && this.exportText) {
      this.actions.copy(this.exportText);
    } else if (act === 'import') {
      this.importOpen = !this.importOpen;
      this.importError = false;
      this.exportText = null;
    } else if (act === 'load') {
      const box = this.root.querySelector<HTMLTextAreaElement>('#importBox');
      this.importError = !box || !this.actions.importSave(box.value);
    } else if (act === 'restore') {
      this.actions.restoreBackup();
    } else if (act === 'reset') {
      if (this.resetArmed) {
        this.actions.resetSave();
        return;
      }
      this.resetArmed = true;
      window.setTimeout(() => {
        this.resetArmed = false;
        if (s.settings.tab === 'settings') this.render();
      }, ARM_MS);
    } else if (act === 'version') {
      // Seven taps on the version turns on developer mode, like Android's build number.
      if (++this.versionTaps >= DEV_TAPS && !s.settings.dev) s.settings.dev = true;
    }
    this.render();
  }

  private settingsChanged(): void {
    this.actions.settingsChanged();
    this.actions.feedback();
    this.render();
  }

  private done(): void {
    this.actions.feedback();
    this.render();
  }

  /** First tap of a two-tap action in the major tab; it disarms itself after ARM_MS. */
  private arm(action: string): void {
    window.clearTimeout(this.armTimer);
    this.armedAction = action;
    this.armTimer = window.setTimeout(() => this.disarm(), ARM_MS);
    this.render();
  }

  private disarm(): void {
    window.clearTimeout(this.armTimer);
    if (!this.armed && !this.armedAction) return;
    const rerender = this.armedAction !== null;
    this.armed = false;
    this.armedAction = null;
    if (rerender) this.render();
    else this.refresh();
  }
}
