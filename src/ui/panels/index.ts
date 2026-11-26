import type { ChallengeId, EffectId, ForkId, IncidentKind, ProjectId, RoleId, WorkflowId } from '../../core/content';
import type { DevAction } from '../../core/dev';
import { upgradesWithForks } from '../../core/economy';
import type { Game } from '../../core/game';
import { unreadCount } from '../../core/mail';
import { manUnreadCount } from '../../core/man';
import { challengeReady } from '../../core/major';
import { nextProjects } from '../../core/ship';
import { workflowOn } from '../../core/workflows';
import type { BuyAmount, Notation, Skin, Tab } from '../../core/state';
import { mailKey, renderMail, type MailView } from './mail';
import { refreshMajor, renderMajor } from './major';
import { refreshMarket, renderMarket } from './market';
import { renderSettings, type SettingsView } from './settings';
import { refreshShip, renderShip, shipKey, type ShipView } from './ship';
import { refreshSprints, renderSprints } from './sprints';
import { refreshTeam, renderTeam, teamKey } from './team';
import { refreshTodo, renderTodo } from './todo';
import { refreshUpgrades, renderUpgrades, visibilityKey } from './upgrades';

/** How long a destructive button stays armed for its second tap. */
const ARM_MS = 4000;
const DEV_TAPS = 7;
/** How long the duck's answer stays up. */
const DUCK_MS = 4000;

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
  /** Lines per second over the last minute, scaled 0–1, for the output graph. */
  history(): number[];
  /** What the rubber duck says when tapped. */
  duck(): string;
  hapticsSupported: boolean;
  version: string;
}

/**
 * The tool pane: pkgs, sprints, todo, ship, team, mail and settings. render() rebuilds the active tab
 * (after purchases, sprint changes, tab switches, or when its structure key changes); refresh()
 * updates numbers in place every tick.
 */
export class Panels {
  private shownKey = '';
  private armed = false;
  private armTimer = 0;
  private raiseArmed = false;
  private raiseTimer = 0;
  private letGoArmed: number | null = null;
  /** A second confirm-tap action waiting in the major tab: 'major' or 'challenge:<id>'. */
  private armedAction: string | null = null;
  private actionTimer = 0;
  private project: ProjectId = 'webapp';
  private readonly mailView: MailView = { openMail: null, openMan: null };
  private duckLine = '';
  private duckTimer = 0;
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
    this.project = game.state.project;
    tabs.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('[data-tab]');
      if (!btn) return;
      this.show(btn.dataset.tab as Tab);
    });
    root.addEventListener('click', (e) => this.handleClick(e));
    // The app name field in the market tab: saved when it loses focus or on enter.
    root.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (!input.matches('[data-appname]')) return;
      input.value = this.game.renameApp(input.value);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.target as Element).matches('[data-appname]')) (e.target as HTMLInputElement).blur();
    });
  }

  show(tab: Tab): void {
    this.game.state.settings.tab = tab;
    this.tabs.querySelector(`[data-tab="${tab}"]`)?.classList.remove('new');
    this.disarm();
    this.disarmRaise();
    this.disarmAction(false);
    this.letGoArmed = null;
    this.exportText = null;
    this.importOpen = false;
    this.render();
    this.root.scrollTop = 0;
  }

  /** Shows or hides tabs according to what the player has unlocked; newly unlocked ones blink until visited. */
  syncTabs(newlyUnlocked?: Tab): void {
    const u = this.game.state.unlocked;
    const visible: Record<string, boolean> = { upgrades: true, sprints: u.sprints, todo: u.todo, ship: u.ship, team: u.team, mail: u.mail, major: u.major, market: u.market, settings: true };
    this.tabs.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
      b.hidden = !visible[b.dataset.tab!];
      if (b.dataset.tab === newlyUnlocked) b.classList.add('new');
    });
    if (!visible[this.game.state.settings.tab]) this.game.state.settings.tab = 'upgrades';
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
      : tab === 'ship' ? renderShip(this.game, this.shipView())
      : tab === 'team' ? renderTeam(this.game, this.letGoArmed)
      : tab === 'mail' ? renderMail(this.game, this.mailView)
      : tab === 'major' ? renderMajor(this.game, this.armedAction)
      : tab === 'market' ? renderMarket(this.game)
      : renderSettings(this.game, view);
    this.shownKey = this.structureKey(tab);
    this.refresh();
  }

  /** Changes when a tab needs re-rendering rather than refreshing in place. */
  private structureKey(tab: Tab): string {
    return tab === 'upgrades' ? visibilityKey(this.game)
      : tab === 'ship' ? shipKey(this.game)
      : tab === 'team' ? teamKey(this.game)
      : tab === 'mail' ? mailKey(this.game)
      : tab === 'major' ? `${this.game.state.major}|${!!this.game.state.challenge}|${this.game.state.challengesDone.length}|${challengeReady(this.game.state)}|${this.game.state.round}`
      : '';
  }

  private shipView(): ShipView {
    // The chosen next project can stop being offered (after shipping); fall back to the web app.
    if (!nextProjects(this.game.state).some((p) => p.id === this.project)) this.project = 'webapp';
    return { project: this.project, shipArmed: this.armed, raiseArmed: this.raiseArmed };
  }

  /** Bells on tabs that are waiting for the player: a fork to pick, an applicant, unread mail or man pages. */
  private syncFlags(): void {
    const s = this.game.state;
    const flag = (tab: Tab, cls: string, on: boolean) => this.tabs.querySelector(`[data-tab="${tab}"]`)?.classList.toggle(cls, on);
    flag('upgrades', 'bell', upgradesWithForks(s).length > 0);
    flag('team', 'bell', !!s.applicant && s.settings.tab !== 'team');
    flag('mail', 'bell', unreadCount(s) + manUnreadCount(s) > 0);
  }

  refresh(): void {
    const tab = this.game.state.settings.tab;
    this.syncFlags();
    if (this.structureKey(tab) !== this.shownKey) return this.render();
    if (tab === 'upgrades') refreshUpgrades(this.game, this.root, this.actions.history(), this.duckLine);
    else if (tab === 'sprints') refreshSprints(this.game, this.root);
    else if (tab === 'todo') refreshTodo(this.game, this.root);
    else if (tab === 'ship') refreshShip(this.game, this.root, this.shipView());
    else if (tab === 'team') refreshTeam(this.game, this.root);
    else if (tab === 'major') refreshMajor(this.game, this.root, this.armedAction);
    else if (tab === 'market') refreshMarket(this.game, this.root);
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
    } else if ('duck' in d) {
      this.duckLine = this.actions.duck();
      window.clearTimeout(this.duckTimer);
      this.duckTimer = window.setTimeout(() => (this.duckLine = ''), DUCK_MS);
      this.refresh();
    } else if (d.fork) {
      if (this.game.chooseFork(d.fork, d.opt as ForkId)) this.done();
    } else if ('refactor' in d) {
      if (this.game.refactor()) this.done();
    } else if (d.project) {
      this.project = d.project as ProjectId;
      this.render();
    } else if ('raise' in d) {
      if (this.raiseArmed) {
        this.disarmRaise();
        this.game.raise();
      } else {
        this.raiseArmed = true;
        this.raiseTimer = window.setTimeout(() => this.disarmRaise(), ARM_MS);
        this.refresh();
      }
    } else if ('major' in d) {
      if (this.armedAction === 'major') {
        this.disarmAction(false);
        this.game.cutMajor();
      } else this.armAction('major');
    } else if (d.challenge) {
      const key = `challenge:${d.challenge}`;
      if (this.armedAction === key) {
        this.disarmAction(false);
        if (this.game.startChallenge(d.challenge as ChallengeId)) this.done();
      } else this.armAction(key);
    } else if ('abandon' in d) {
      this.game.abandonChallenge();
    } else if (d.skill) {
      if (this.game.buySkill(d.skill)) this.done();
    } else if (d.workflow) {
      const id = d.workflow as WorkflowId;
      this.game.setWorkflow(id, !workflowOn(s, id));
      this.done();
    } else if (d.autoship) {
      this.game.setAutoShipAt(Number(d.autoship));
      this.done();
    } else if (d.buyco) {
      if (this.game.buyCompanyPerk(d.buyco)) this.done();
    } else if ('hire' in d) {
      if (this.game.hire()) this.done();
    } else if ('pass' in d) {
      if (this.game.passApplicant()) this.render();
    } else if (d.assign) {
      if (this.game.assign(Number(d.assign), d.role as RoleId)) this.done();
    } else if (d.letgo) {
      const id = Number(d.letgo);
      if (this.letGoArmed === id) {
        this.letGoArmed = null;
        this.game.letGo(id);
      } else {
        this.letGoArmed = id;
        window.setTimeout(() => {
          if (this.letGoArmed !== id) return;
          this.letGoArmed = null;
          if (s.settings.tab === 'team') this.render();
        }, ARM_MS);
      }
      this.render();
    } else if (d.mail) {
      this.mailView.openMail = this.mailView.openMail === d.mail ? null : d.mail;
      this.game.readMail(d.mail);
      this.render();
    } else if (d.answer) {
      if (this.game.answerMail(d.answer, Number(d.opt))) this.done();
    } else if (d.man) {
      this.mailView.openMan = this.mailView.openMan === d.man ? null : d.man;
      this.game.readMan(d.man);
      this.render();
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
        this.game.ship(this.shipView().project);
      } else {
        this.armed = true;
        this.armTimer = window.setTimeout(() => this.disarm(), ARM_MS);
        this.refresh();
      }
    } else if (d.toggle) {
      const key = d.toggle as 'sound' | 'haptics' | 'reduceMotion' | 'welcome' | 'screensaver';
      s.settings[key] = !s.settings[key];
      this.settingsChanged();
    } else if (d.choice) {
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
        this.syncTabs(); // "unlock tabs" sets the flags directly, without unlock events
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

  private disarm(): void {
    window.clearTimeout(this.armTimer);
    if (!this.armed) return;
    this.armed = false;
    this.refresh();
  }

  /** First tap of a two-tap action in the major tab; it disarms itself after ARM_MS. */
  private armAction(action: string): void {
    window.clearTimeout(this.actionTimer);
    this.armedAction = action;
    this.actionTimer = window.setTimeout(() => this.disarmAction(true), ARM_MS);
    this.render();
  }

  private disarmAction(rerender: boolean): void {
    window.clearTimeout(this.actionTimer);
    if (!this.armedAction) return;
    this.armedAction = null;
    if (rerender && this.game.state.settings.tab === 'major') this.render();
  }

  private disarmRaise(): void {
    window.clearTimeout(this.raiseTimer);
    if (!this.raiseArmed) return;
    this.raiseArmed = false;
    this.refresh();
  }
}
