import type { ChallengeId, EffectId, ForkId, ForkPolicy, IncidentKind, LanguageId, ProjectId, RoleId, WorkflowId } from '../../core/content';
import type { DevAction } from '../../core/dev';
import type { Game, UnlockTab } from '../../core/game';
import { forksPending } from '../../core/economy';
import { challengeReady } from '../../core/major';
import { nextProjects } from '../../core/ship';
import { workflowOn } from '../../core/workflows';
import type { BuyAmount, Notation, Skin, Tab } from '../../core/state';
import { esc, setText } from '../dom';
import { GROUPS, groupBadge, groupOf, groupVisible, questKey, tabBadge, tabLabel, tabState, type Badge, type Group, type Seen } from '../nav';
import { OWN_HELP_LINK, helpFor } from './help';
import { issuesKey, refreshIssues, renderIssues } from './issues';
import { mailKey, renderMail, type MailView } from './mail';
import { refreshMajor, renderMajor } from './major';
import { manKey, renderMan } from './man';
import { marketKey, refreshMarket, renderMarket } from './market';
import { renderSettings, type SettingsView } from './settings';
import {
  autoKey,
  dotfilesKey,
  refreshDotfiles,
  refreshRound,
  refreshShip,
  renderAuto,
  renderDotfiles,
  renderRound,
  renderShip,
  roundKey,
  shipKey,
  type ShipView,
} from './ship';
import { refreshSprints, renderSprints, sprintsKey } from './sprints';
import { refreshStats, renderStats, statsKey } from './stats';
import { refreshTeam, renderTeam, teamKey } from './team';
import { refreshTests, renderTests, testsKey } from './tests';
import { refreshTodo, renderTodo, todoKey } from './todo';
import { refreshTrophies, renderTrophies, trophiesKey } from './trophies';
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
  /** What the rubber duck says when tapped. */
  duck(): string;
  hapticsSupported: boolean;
  version: string;
}

const badgeClass = (b: Badge | null): string => (b ? `bd b-${b.kind}` : 'bd');

/**
 * The tool pane. The tmux bar picks one of five windows (pkgs, work, ship, co, more); the sub-tab
 * row picks a panel inside it. render() rebuilds the active panel (after purchases, tab switches, or
 * when its structure key changes); refresh() updates numbers and badges in place every tick.
 */
export class Panels {
  private shownKey = '';
  private subKey = '';
  private armed = false;
  private armTimer = 0;
  private raiseArmed = false;
  private raiseTimer = 0;
  private letGoArmed: number | null = null;
  /** A second confirm-tap action in the major panel: 'major' or 'challenge:<id>'. */
  private armedAction: string | null = null;
  private actionTimer = 0;
  private project: ProjectId = 'webapp';
  /** The stack picked for the next run (a round or a major version); null for this run's. */
  private stack: LanguageId | null = null;
  private readonly mailView: MailView = { openMail: null };
  private openMan: string | null = null;
  private duckLine = '';
  private duckTimer = 0;
  private resetArmed = false;
  private exportText: string | null = null;
  private importOpen = false;
  private importError = false;
  private versionTaps = 0;
  /** Panels with their `?` help open. */
  private readonly help = new Set<Tab>();
  /** The package whose upgrade picker is open. */
  private openFork: string | null = null;
  private allProjects = false;
  private fullChart = false;
  private hideEarned = true;
  /** The panel last shown in each window, so switching windows comes back to it. */
  private readonly lastInGroup: Partial<Record<Group, Tab>> = {};
  /** Unlocked but not visited yet: shown "new" until opened. */
  private readonly fresh = new Set<Tab>();
  private readonly seen: Seen;

  constructor(
    private readonly game: Game,
    private readonly root: HTMLElement,
    private readonly subtabs: HTMLElement,
    private readonly bar: HTMLElement,
    private readonly actions: PanelActions,
  ) {
    const s = game.state;
    this.project = s.project;
    this.seen = { quests: new Set(s.quests.map(questKey)), trophies: s.achievements.length };
    bar.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('[data-group]');
      if (btn) this.showGroup(btn.dataset.group as Group);
    });
    subtabs.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!btn) return;
      if (btn.dataset.tab) this.show(btn.dataset.tab as Tab);
      else if ('help' in btn.dataset) this.toggleHelp();
    });
    root.addEventListener('click', (e) => this.handleClick(e));
    root.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement | HTMLSelectElement;
      // The app name field in the market panel: saved when it loses focus or on enter.
      if (el.matches('[data-appname]')) el.value = this.game.renameApp(el.value);
      // A teammate's role (or letting them go) from their dropdown.
      if (el.matches('[data-role-of]')) this.roleChanged(Number(el.dataset.roleOf), el.value);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.target as Element).matches('[data-appname]')) (e.target as HTMLInputElement).blur();
    });
  }

  /** Opens a panel; the man page `page` too, when given. */
  show(tab: Tab, page?: string): void {
    const s = this.game.state;
    if (tabState(s, tab) === 'hidden') return;
    s.settings.tab = tab;
    this.lastInGroup[groupOf(tab)] = tab;
    this.fresh.delete(tab);
    if (page) this.openMan = page;
    if (tab === 'todo') this.seen.quests = new Set(s.quests.map(questKey));
    if (tab === 'trophies') this.seen.trophies = s.achievements.length;
    this.disarm();
    this.disarmRaise();
    this.disarmAction(false);
    this.letGoArmed = null;
    this.exportText = null;
    this.importOpen = false;
    this.openFork = null;
    this.render();
    this.root.scrollTop = 0;
  }

  /** Opens a window at the panel last used there (or its first open one). */
  showGroup(group: Group): void {
    const s = this.game.state;
    const tabs = GROUPS.find((g) => g.id === group)!.tabs;
    const last = this.lastInGroup[group];
    const tab = last && tabState(s, last) !== 'hidden' ? last : (tabs.find((t) => tabState(s, t) === 'open') ?? tabs[0]);
    this.show(tab);
  }

  /** Shows or hides windows by what the player has unlocked; a newly unlocked panel is marked "new" until visited. */
  syncTabs(newlyUnlocked?: UnlockTab): void {
    const s = this.game.state;
    if (newlyUnlocked) this.fresh.add(newlyUnlocked);
    this.bar.querySelectorAll<HTMLButtonElement>('[data-group]').forEach((b) => {
      const group = b.dataset.group as Group;
      b.hidden = !groupVisible(s, group);
      b.classList.toggle('new', GROUPS.find((g) => g.id === group)!.tabs.some((t) => this.fresh.has(t)));
    });
    if (tabState(s, s.settings.tab) === 'hidden') s.settings.tab = 'upgrades';
  }

  render(): void {
    const tab = this.game.state.settings.tab;
    const group = groupOf(tab);
    this.bar.querySelectorAll<HTMLButtonElement>('[data-group]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.group === group)));
    this.syncTabs();
    this.renderSubtabs();
    const help = this.help.has(tab) ? helpFor(this.game, tab) : null;
    const helpHtml = help ? `<div class="help" role="note">${help}</div>` : '';
    const g = this.game;
    const body =
      tab === 'upgrades' ? renderUpgrades(g, { openFork: this.openFork, help: this.help.has('upgrades') })
      : tab === 'sprints' ? renderSprints(g)
      : tab === 'todo' ? renderTodo(g)
      : tab === 'tests' ? renderTests(g)
      : tab === 'ship' ? renderShip(g, this.shipView())
      : tab === 'dotfiles' ? renderDotfiles(g)
      : tab === 'auto' ? renderAuto(g)
      : tab === 'major' ? renderMajor(g, this.armedAction, this.stack)
      : tab === 'round' ? renderRound(g, this.stack)
      : tab === 'team' ? renderTeam(g, this.letGoArmed)
      : tab === 'mail' ? renderMail(g, this.mailView)
      : tab === 'issues' ? renderIssues(g)
      : tab === 'market' ? renderMarket(g, this.fullChart)
      : tab === 'man' ? renderMan(g, this.openMan)
      : tab === 'trophies' ? renderTrophies(g, this.hideEarned)
      : tab === 'stats' ? renderStats(g)
      : renderSettings(g, this.settingsView());
    // A panel can say where its help goes (after its command line); otherwise it goes on top.
    this.root.innerHTML = body.includes('<!--help-->') ? body.replace('<!--help-->', helpHtml) : helpHtml + body;
    this.shownKey = this.structureKey(tab);
    this.refresh();
  }

  private settingsView(): SettingsView {
    return {
      exportText: this.exportText,
      importOpen: this.importOpen,
      importError: this.importError,
      resetArmed: this.resetArmed,
      hapticsSupported: this.actions.hapticsSupported,
      version: this.actions.version,
      save: this.actions.saveInfo(),
    };
  }

  /** The sub-tab row: rebuilt only when its buttons change, so a tap on one is never lost to a re-render. */
  private renderSubtabs(): void {
    const s = this.game.state;
    const tab = s.settings.tab;
    const tabs = GROUPS.find((g) => g.id === groupOf(tab))!.tabs.filter((t) => tabState(s, t) !== 'hidden');
    const hasHelp = helpFor(this.game, tab) !== null && !OWN_HELP_LINK.has(tab);
    const key = `${tabs.map((t) => `${t}${tabState(s, t)}${+this.fresh.has(t)}${tabLabel(s, t)}`).join(',')}|${tab}|${hasHelp}|${this.help.has(tab)}`;
    if (key === this.subKey) return;
    this.subKey = key;
    // A window with one panel and nothing to explain (pkgs keeps its `?` in the npm install line) has no row.
    this.subtabs.hidden = tabs.length < 2 && !hasHelp;
    if (this.subtabs.hidden) return void (this.subtabs.innerHTML = '');
    this.subtabs.innerHTML =
      tabs
        .map((t) => {
          const cls = [tabState(s, t) === 'locked' ? 'lk' : '', this.fresh.has(t) ? 'new' : ''].filter(Boolean).join(' ');
          return `<button role="tab" data-tab="${t}" aria-selected="${t === tab}"${cls ? ` class="${cls}"` : ''}>${esc(tabLabel(s, t))}<span class="bd" data-bd="${t}"></span></button>`;
        })
        .join('') +
      '<span class="fill"></span>' +
      (hasHelp ? `<button class="qm" data-help aria-pressed="${this.help.has(tab)}" aria-label="How this works">?</button>` : '');
  }

  private toggleHelp(): void {
    const tab = this.game.state.settings.tab;
    if (this.help.has(tab)) this.help.delete(tab);
    else this.help.add(tab);
    this.subKey = '';
    this.render();
  }

  /** Badges on the bar and the sub-tabs, updated in place. */
  private syncBadges(): void {
    for (const g of GROUPS) {
      const badges = g.tabs.map((t) => {
        const b = tabState(this.game.state, t) === 'open' ? tabBadge(this.game, t, this.seen) : null;
        const el = this.subtabs.querySelector(`[data-bd="${t}"]`);
        if (el) {
          // The release's progress shows on the bar; on its own sub-tab it only crowds the row.
          const sub = t === 'ship' && b?.kind === 'prog' ? null : b;
          setText(el, sub?.text ?? '');
          el.className = badgeClass(sub);
        }
        return b;
      });
      const el = this.bar.querySelector(`[data-group="${g.id}"] .bd`);
      if (!el) continue;
      const b = groupBadge(badges);
      setText(el, b?.text ?? '');
      el.className = badgeClass(b);
    }
  }

  /** Changes when a panel needs re-rendering rather than refreshing in place. */
  private structureKey(tab: Tab): string {
    const g = this.game;
    const s = g.state;
    switch (tab) {
      case 'upgrades':
        return visibilityKey(g);
      case 'sprints':
        return sprintsKey(g);
      case 'todo':
        return todoKey(g);
      case 'tests':
        return testsKey(g);
      case 'issues':
        return issuesKey(g);
      case 'ship':
        return shipKey(g);
      case 'dotfiles':
        return dotfilesKey(g);
      case 'auto':
        return autoKey(g);
      case 'round':
        return roundKey(g);
      case 'team':
        return teamKey(g);
      case 'mail':
        return mailKey(g);
      case 'market':
        return marketKey(g);
      case 'man':
        return manKey(g);
      case 'trophies':
        return trophiesKey(g);
      case 'stats':
        return statsKey(g);
      case 'major':
        return `${s.major}|${!!s.challenge}|${Object.values(s.challengeLevels).join(',')}|${challengeReady(s)}|${s.round}|${s.unlocked.major}|${s.stats.majors}|${s.market.acquired.length}`;
      default:
        return '';
    }
  }

  private shipView(): ShipView {
    // The chosen next project can stop being offered (after shipping); fall back to the web app.
    if (!nextProjects(this.game.state).some((p) => p.id === this.project)) this.project = 'webapp';
    return { project: this.project, shipArmed: this.armed, allProjects: this.allProjects };
  }

  refresh(): void {
    const g = this.game;
    const tab = g.state.settings.tab;
    // What arrives while its panel is open has been seen.
    if (tab === 'todo') this.seen.quests = new Set(g.state.quests.map(questKey));
    if (tab === 'trophies') this.seen.trophies = g.state.achievements.length;
    this.renderSubtabs();
    this.syncBadges();
    if (this.structureKey(tab) !== this.shownKey) return this.render();
    if (tab === 'upgrades') refreshUpgrades(g, this.root, this.duckLine);
    else if (tab === 'sprints') refreshSprints(g, this.root);
    else if (tab === 'todo') refreshTodo(g, this.root);
    else if (tab === 'tests') refreshTests(g, this.root);
    else if (tab === 'issues') refreshIssues(g, this.root);
    else if (tab === 'ship') refreshShip(g, this.root, this.shipView());
    else if (tab === 'dotfiles') refreshDotfiles(g, this.root);
    else if (tab === 'round') refreshRound(g, this.root, this.raiseArmed, this.stack);
    else if (tab === 'team') refreshTeam(g, this.root);
    else if (tab === 'major') refreshMajor(g, this.root, this.armedAction, this.stack);
    else if (tab === 'market') refreshMarket(g, this.root, this.fullChart);
    else if (tab === 'stats') refreshStats(g, this.root);
    else if (tab === 'trophies') refreshTrophies(g, this.root);
    else if (tab === 'settings') {
      const el = this.root.querySelector('[data-save-status]');
      const info = this.actions.saveInfo();
      if (el && el.textContent !== info.status) {
        el.textContent = info.status;
        el.classList.toggle('bad', !info.ok);
      }
    }
  }

  private roleChanged(id: number, value: string): void {
    if (value === 'letgo') {
      this.letGoArmed = id;
      window.setTimeout(() => {
        if (this.letGoArmed !== id) return;
        this.letGoArmed = null;
        if (this.game.state.settings.tab === 'team') this.render();
      }, ARM_MS * 2);
      this.render();
    } else if (this.game.assign(id, value as RoleId)) this.done();
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
    } else if (d.openfork) {
      this.openFork = this.openFork === d.openfork ? null : d.openfork;
      this.render();
    } else if (d.fork) {
      if (this.game.chooseFork(d.fork, d.opt as ForkId)) {
        // Several forks can stack up (buying many copies at once): the picker stays open until the last is picked.
        if (forksPending(s, d.fork) < 1) this.openFork = null;
        this.done();
      }
    } else if ('refactor' in d) {
      if (this.game.refactor()) this.done();
    } else if (d.project) {
      this.project = d.project as ProjectId;
      this.render();
    } else if ('moreprojects' in d) {
      this.allProjects = !this.allProjects;
      this.render();
    } else if (d.goto) {
      this.show(d.goto as Tab, d.page);
    } else if ('help' in d) {
      this.toggleHelp();
    } else if (d.stack) {
      this.stack = d.stack as LanguageId;
      this.render();
    } else if ('raise' in d) {
      if (this.raiseArmed) {
        this.disarmRaise();
        const stack = this.stack ?? undefined;
        this.stack = null;
        this.game.raise(stack);
      } else {
        this.raiseArmed = true;
        this.raiseTimer = window.setTimeout(() => this.disarmRaise(), ARM_MS);
        this.refresh();
      }
    } else if ('major' in d) {
      if (this.armedAction === 'major') {
        this.disarmAction(false);
        const stack = this.stack ?? undefined;
        this.stack = null;
        this.game.cutMajor(stack);
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
    } else if (d.forkpolicy) {
      this.game.setForkPolicy(d.forkpolicy as ForkPolicy);
      this.done();
    } else if (d.budget !== undefined) {
      if (this.game.setTestBudget(Number(d.budget))) this.done();
    } else if ('triage' in d) {
      if (this.game.triage()) this.done();
    } else if (d.acquire) {
      if (this.game.acquire(d.acquire)) this.done();
    } else if (d.buyco) {
      if (this.game.buyCompanyPerk(d.buyco)) this.done();
    } else if ('hire' in d) {
      if (this.game.hire()) this.done();
    } else if ('pass' in d) {
      if (this.game.passApplicant()) this.render();
    } else if (d.letgo) {
      const id = Number(d.letgo);
      this.letGoArmed = null;
      this.game.letGo(id);
      this.render();
    } else if ('keep' in d) {
      this.letGoArmed = null;
      this.render();
    } else if (d.mail) {
      this.mailView.openMail = this.mailView.openMail === d.mail ? null : d.mail;
      this.game.readMail(d.mail);
      this.render();
    } else if (d.answer) {
      if (this.game.answerMail(d.answer, Number(d.opt))) this.done();
    } else if (d.man) {
      this.openMan = this.openMan === d.man ? null : d.man;
      this.game.readMan(d.man);
      this.render();
    } else if ('fullchart' in d) {
      this.fullChart = !this.fullChart;
      this.render();
    } else if ('hideearned' in d) {
      this.hideEarned = !this.hideEarned;
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

  /** First tap of a two-tap action in the major panel; it disarms itself after ARM_MS. */
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
