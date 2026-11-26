import { BOSSES, MILESTONE, TRAITS } from '../core/content';
import { language } from '../core/economy';
import type { Game, GameEvent } from '../core/game';
import { mailDef } from '../core/mail';
import { clock, D, fmt, fmtRate, setNotation, type Decimal } from '../core/num';
import { deserialize, exportSave, importSave, serialize } from '../core/save';
import { currentVersion } from '../core/ship';
import type { Platform } from '../platform';
import type { SaveStore } from '../platform/saves';
import { BossView } from './boss';
import { BugView } from './bug';
import { $, prefersReducedMotion } from './dom';
import { Editor } from './editor';
import { EventLine } from './events';
import { Fx } from './fx';
import { Header } from './header';
import { IncidentView } from './incidents';
import { Keycap } from './keycap';
import { playMajorSplash, playMergeSplash, playRoundSplash } from './merge';
import { describe, scriptFile, type LogKind } from './messages';
import { groupOf, unlockPath } from './nav';
import { Panels } from './panels';
import { Screensaver } from './screensaver';
import { ScriptsRow } from './scripts';
import { createKeySounds } from './sound';
import { playWelcome, type WelcomeSummary } from './welcome';
import { Workspace } from './workspace';

declare const __APP_VERSION__: string;

const TICK_MS = 200;
const SAVE_MS = 5000;
const TYPING_MS = 700;
/** The line count bounces no closer together than this. */
const BUMP_GAP_MS = 90;
const BUMP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }];
/** Shorter absences (a reload, a quick app switch) are credited without the welcome-back screen. */
const WELCOME_MIN_S = 120;
/** Idle time before the screensaver starts. */
const SCREENSAVER_MS = 60_000;
/** Characters per second each teammate types in the editor. */
const GHOST_CHARS_PER_SECOND = 9;
const SKIN_THEME_COLOR: Record<string, string> = { pine: '#070f0c', phosphor: '#020803', amber: '#0b0700', paper: '#f3f0e8' };

const BOOT_LOG: [LogKind, string][] = [
  ['ok', 'booting ship-it'],
  ['ok', 'mounting /dev/coffee'],
  ['ok', 'loading rubber-duck drivers'],
  ['warn', 'no tests found (that is fine)'],
  ['info', 'ready: tap the key or type anything to write code'],
];

/** Characters typed per tap grow slowly with tap power, so the editor feels faster as you upgrade. */
const charsPerTap = (lines: Decimal): number => 6 + Math.min(12, Math.floor(lines.add(1).log10() * 3));
/** Automation types on its own, faster as output grows, capped so it stays readable. */
const autoCharsPerSecond = (perSecond: Decimal): number => (perSecond.gt(0) ? Math.min(30, 3 + perSecond.add(1).log10() * 9) : 0);

/** "5m", "3h", "2d": how long ago a backup was saved. */
function ageText(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m < 60 ? `${m}m` : m < 48 * 60 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

/** Wires the game to the screen: input, rendering, timers, dialogs and saving. */
export class App {
  private readonly editor: Editor;
  private readonly header: Header;
  private readonly panels: Panels;
  private readonly keycap: Keycap;
  private readonly bug: BugView;
  private readonly incidents: IncidentView;
  private readonly boss: BossView;
  private readonly fx: Fx;
  private readonly events: EventLine;
  private readonly scripts: ScriptsRow;
  private readonly workspace: Workspace;
  private readonly saver: Screensaver;
  private readonly ide = $('.ide');
  private readonly code = $('#code');
  private readonly keys = createKeySounds();
  private ghostBudget = 0;
  private lastInputAt = performance.now();
  private readonly counter = $('#loc');
  private charBudget = 0;
  private lastFrame = 0;
  private lastTapAt = 0;
  private bumpedAt = -Infinity;
  /** True while a splash (merge, welcome) is showing: pauses typing, bugs and incidents. */
  private dialogOpen = false;
  /** Set before a reload (import/reset) so the autosave can't overwrite the new save. */
  private frozen = false;

  constructor(
    private readonly game: Game,
    private readonly platform: Platform,
    private readonly saves: SaveStore,
  ) {
    const s = game.state;
    this.editor = new Editor({ lines: $('#lines'), live: $('#live'), minimap: $('#mini') }, { get: () => s.editorLine, set: (n) => (s.editorLine = n) });
    this.header = new Header(game);
    this.panels = new Panels(game, $('#panel'), $('#subtabs'), $('.bar'), {
      feedback: () => this.feedback('click'),
      settingsChanged: () => this.applySettings(),
      exportSave: () => {
        game.markExported();
        return exportSave(game.state, game.now());
      },
      importSave: (text) => this.replaceSave(text),
      resetSave: () => this.resetSave(),
      restoreBackup: () => this.restoreBackup(),
      saveInfo: () => this.saveInfo(),
      copy: (text) => void navigator.clipboard?.writeText(text).catch(() => {}),
      hapticsSupported: platform.haptics.supported,
      version: `v${__APP_VERSION__}`,
      duck: () => this.workspace.pokeDuck(),
    });
    this.keycap = new Keycap(
      $<HTMLButtonElement>('#key'),
      $('.keywrap'),
      () => this.tap(),
      () => !this.dialogOpen,
      (key) => game.typed(key),
      () => {
        if (game.state.settings.sound) this.keys.release();
      },
    );
    this.fx = new Fx(this.ide);
    this.events = new EventLine($('#event'), game, document.getElementById('eventSay'));
    this.scripts = new ScriptsRow($('#scripts'), game, () => this.feedback('click'));
    this.bug = new BugView(this.code, () => game.squashBug(), (x, y) => this.fx.burst(this.code, x, y, 12, 'pbug'));
    this.incidents = new IncidentView(this.code, game, (text, kind) => this.editor.log(text, kind), () => s.editorLine);
    this.boss = new BossView(this.ide, game);
    this.workspace = new Workspace(game);
    this.saver = new Screensaver($('#saver'), $('#saverTag'));
    // Any input wakes the screen.
    const woke = () => {
      this.lastInputAt = performance.now();
      this.saver.stop();
    };
    window.addEventListener('pointerdown', woke, true);
    window.addEventListener('keydown', woke, true);
  }

  /** Theme, motion and number format from settings. */
  applySettings(): void {
    const st = this.game.state.settings;
    const html = document.documentElement;
    html.dataset.skin = st.skin;
    html.classList.toggle('rm', st.reduceMotion);
    setNotation(st.notation);
    if (st.sound) this.keys.preload();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKIN_THEME_COLOR[st.skin] ?? '#070f0c');
  }

  /** from: where the save came from (null for a new game); a returning player is credited the time away. */
  start(from: 'device' | 'cloud' | null): void {
    const returning = from !== null;
    const g = this.game;
    const s = g.state;
    this.applySettings();
    const summary: WelcomeSummary = {};
    g.on((e) => {
      if (e.type === 'offline' && !summary.away) summary.away = { lines: e.lines, seconds: e.seconds, rate: e.rate };
      if (e.type === 'checkIn' && !summary.streak) summary.streak = { count: e.checkIn.count, lines: e.checkIn.lines, script: e.checkIn.script ? scriptFile(e.checkIn.script) : null };
    });
    g.on((e) => this.onEvent(e));

    this.editor.setLanguage(language(s).id);
    this.editor.prefill(16);
    if (returning) this.editor.log(from === 'cloud' ? `save loaded from your claude account, v${currentVersion(s)}` : `session restored on v${currentVersion(s)}`, 'ok');
    else for (const [kind, text] of BOOT_LOG) this.editor.log(text, kind);
    this.watchSaves(returning);
    if (returning) g.creditTimeAway((g.now() - s.savedAt) / 1000);
    g.checkIn();

    this.panels.syncTabs();
    this.panels.render();
    g.tick();

    // Only worth a splash for a returning player with something to show.
    const worthShowing = returning && ((summary.away && summary.away.seconds >= WELCOME_MIN_S) || (summary.streak && summary.streak.count > 1));
    if (worthShowing && s.settings.welcome) {
      this.dialogOpen = true;
      void playWelcome(summary).then(() => (this.dialogOpen = false));
    }

    window.setInterval(() => this.tick(), TICK_MS);
    window.setInterval(() => this.save(), SAVE_MS);
    this.platform.onHide(() => {
      this.save();
      void this.saves.flush();
    });
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Bounces the line count, at most every BUMP_GAP_MS. */
  private bump(): void {
    const now = performance.now();
    if (now - this.bumpedAt < BUMP_GAP_MS || prefersReducedMotion() || typeof this.counter.animate !== 'function') return;
    this.bumpedAt = now;
    this.counter.animate(BUMP, { duration: 120, easing: 'ease-out' });
  }

  private tap(): void {
    this.lastTapAt = performance.now();
    this.game.tap();
  }

  /**
   * Key sound and haptic tick, each if enabled. tap: the big key going down (it plays its release
   * when let go); crit: a heavier press; reward: a quick run of keystrokes; click: any other button.
   */
  private feedback(kind: 'tap' | 'crit' | 'reward' | 'click'): void {
    const settings = this.game.state.settings;
    if (settings.sound) {
      if (kind === 'tap' || kind === 'crit') this.keys.press(kind === 'crit');
      else if (kind === 'reward') this.keys.run();
      else this.keys.stroke();
    }
    if (settings.haptics) kind === 'crit' || kind === 'reward' ? this.platform.haptics.success() : this.platform.haptics.tap();
  }

  private onEvent(e: GameEvent): void {
    for (const line of describe(e)) this.editor.log(line.text, line.kind);
    const tab = this.game.state.settings.tab;
    switch (e.type) {
      case 'tap':
        this.editor.type(e.auto ? 4 : charsPerTap(e.lines));
        if (e.auto) break;
        this.keycap.floater(e.lines, e.crit);
        if (e.crit) {
          this.editor.flashLive();
          this.fx.shake();
        }
        this.bump();
        this.feedback(e.crit ? 'crit' : 'tap');
        break;
      case 'sprintStarted':
      case 'backlogRefreshed':
      case 'script':
      case 'effectEnded':
        if (tab === 'sprints') this.panels.render();
        break;
      case 'sprintEnded':
        if (tab === 'sprints') this.panels.render();
        if (e.result.ok) this.feedback('reward');
        break;
      case 'achievement':
      case 'questDone':
      case 'milestoneDone':
        if (tab === 'todo') this.panels.render();
        if (e.type !== 'achievement') this.feedback('reward');
        if (e.type === 'achievement') this.events.push('star', 'achievement', `${e.achievement.name} · +1% output`);
        if (e.type === 'milestoneDone') this.events.push('star', 'milestone', `done · +${Math.round(MILESTONE.shipBonus * 100)}% stars when you ship`);
        break;
      case 'perk':
        if (tab === 'ship') this.panels.render();
        break;
      case 'unlocked': {
        this.panels.syncTabs(e.tab);
        const label = document.querySelector<HTMLElement>(`[data-group="${groupOf(e.tab)}"] .tl`);
        if (label) this.fx.scramble(label, 900);
        this.events.push('ok', 'unlocked', `new: ${unlockPath(e.tab)}`);
        break;
      }
      case 'refactored':
        this.feedback('reward');
        this.events.push('ok', 'refactored', `${Math.round(e.refactor.cleared)}% tech debt cleared`);
        break;
      case 'debtHigh':
        this.fx.shake();
        this.events.push('warn', 'tech debt', `${Math.round(e.debt)}% and climbing · refactor from pkgs`);
        break;
      case 'applicant':
        this.events.push('ok', 'applicant', `${e.dev.name} · ${TRAITS[e.dev.trait].label.toLowerCase()} · waiting in co`);
        break;
      case 'hired':
        this.feedback('reward');
        break;
      case 'mail': {
        const def = mailDef(e.item.id);
        if (def) this.events.push('ok', 'mail', `${def.subject} · ${def.from}`);
        break;
      }
      case 'bossIncoming':
        this.fx.shake();
        this.feedback('reward');
        this.boss.update();
        break;
      case 'bossEngaged':
      case 'bossStage':
        this.feedback('reward');
        this.fx.shake();
        this.boss.update();
        break;
      case 'bossIgnored':
        this.boss.update();
        break;
      case 'bossWon':
        this.boss.update();
        this.feedback('reward');
        this.fx.burst(this.code, this.code.clientWidth / 2, this.code.clientHeight / 2, 24, 'pwin');
        this.events.push('star', 'incident resolved', `${BOSSES[e.kind].name.toLowerCase()} · +${fmt(e.reward)} lines`, 4200);
        break;
      case 'bossFailed':
        this.boss.update();
        this.fx.shake();
        this.events.push('err', 'incident lost', `${BOSSES[e.kind].name.toLowerCase()} · tech debt went up`, 4200);
        break;
      case 'majorCut':
        this.save();
        void this.saves.flush();
        this.panels.syncTabs();
        this.panels.render();
        this.dialogOpen = true;
        this.feedback('reward');
        void playMajorSplash(e.result, this.game.state.xp).then(() => (this.dialogOpen = false));
        break;
      case 'reviewed':
        if (e.news.overtook.length) this.feedback('reward');
        if (tab === 'market') this.panels.render();
        break;
      case 'skill':
      case 'challengeStarted':
      case 'challengeAbandoned':
        this.panels.render();
        break;
      case 'raised':
        this.save();
        void this.saves.flush();
        this.editor.setLanguage(language(this.game.state).id);
        this.panels.syncTabs();
        this.panels.render();
        this.dialogOpen = true;
        this.feedback('reward');
        void playRoundSplash(e.result).then(() => (this.dialogOpen = false));
        break;
      case 'bugSpawned':
        this.bug.show(e.expiresAt, this.game.now());
        break;
      case 'bugEscaped':
        this.bug.hide();
        break;
      case 'bugSquashed':
        this.feedback('reward');
        break;
      case 'incidentSpawned':
        this.incidents.show(e.incident);
        break;
      case 'incidentEnded':
        this.incidents.hide();
        if (e.outcome === 'caught' || e.outcome === 'fixed' || e.outcome === 'resolved') this.feedback('reward');
        break;
      case 'shipped':
        this.save();
        void this.saves.flush();
        this.panels.render();
        // release.yml ships quietly: a log line and the star count bouncing, no splash.
        if (e.auto) {
          this.header.bounceStars();
          break;
        }
        this.dialogOpen = true;
        void playMergeSplash(e.result, { onStars: () => this.feedback('reward') }).then(() => {
          this.dialogOpen = false;
          this.header.bounceStars();
        });
        break;
    }
  }

  private tick(): void {
    const s = this.game.state;
    const now = performance.now();
    this.game.tick({ canSpawn: this.platform.isVisible() && !this.dialogOpen });
    this.panels.refresh();
    this.header.updateGoal();
    this.scripts.update();
    this.events.update();
    this.incidents.update();
    this.boss.update();
    this.workspace.update(now);
    this.editor.setGhosts(this.workspace.ghosts());
    // The editor stops taking code while a merge conflict or a boss fight has the player's attention.
    this.editor.frozen = this.incidents.showing === 'conflict' || this.boss.fighting;
    this.ide.classList.toggle('alert', s.incident?.kind === 'outage');
    this.ide.classList.toggle('bossmode', this.boss.fighting);
    const sess = $('#sess');
    const name = this.boss.fighting ? 'INCIDENT' : s.incident?.kind === 'outage' ? 'prod-down' : 'ship-it';
    if (sess.textContent !== name) sess.textContent = name;
    sess.classList.toggle('alarm', name !== 'ship-it');
    this.updateScreensaver(now);
    const d = new Date();
    $('#clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /** Starts after a minute without input (never during a boss, an incident or a dialog); any input stops it. */
  private updateScreensaver(now: number): void {
    const s = this.game.state;
    if (
      s.settings.screensaver &&
      !prefersReducedMotion() &&
      !this.dialogOpen &&
      this.platform.isVisible() &&
      !s.boss &&
      !s.incident &&
      now - this.lastInputAt > SCREENSAVER_MS
    )
      this.saver.start();
    else if (this.saver.active && (s.boss || this.dialogOpen)) this.saver.stop();
    if (this.saver.active) this.saver.setTag(`${fmtRate(this.game.perSecond())} loc/s still running · tap or press a key`);
  }

  private frame(t: number): void {
    const dt = this.lastFrame ? Math.min(0.25, (t - this.lastFrame) / 1000) : 0;
    this.lastFrame = t;
    // Teammates type alongside the player.
    this.ghostBudget += dt * GHOST_CHARS_PER_SECOND * this.workspace.ghosts().length;
    const ghostChars = Math.floor(this.ghostBudget);
    if (ghostChars > 0) {
      this.ghostBudget -= ghostChars;
      this.editor.typeGhosts(ghostChars);
    }
    this.charBudget += dt * autoCharsPerSecond(this.game.perSecond());
    const chars = Math.floor(this.charBudget);
    if (chars > 0) {
      this.charBudget -= chars;
      this.editor.type(chars);
    }
    const s = this.game.state;
    this.header.update(+!!s.bug + (s.incident && s.incident.kind !== 'coffee' ? 1 : 0) + +!!s.boss, t - this.lastTapAt < TYPING_MS);
    requestAnimationFrame((next) => this.frame(next));
  }

  private replaceSave(text: string): boolean {
    const imported = importSave(text, this.game.now());
    if (!imported) return false;
    this.switchTo(serialize(imported, this.game.now()), 'import');
    return true;
  }

  private resetSave(): void {
    this.frozen = true;
    void this.saves.clear().then(() => location.reload());
  }

  /** Restores the backup with the most progress (kept when a reset, import or other save replaced it). */
  private restoreBackup(): void {
    const backup = this.saves.backup();
    const state = backup ? deserialize(backup.text, this.game.now()) : null;
    // Re-stamped as saved now: it should win over every other copy, and earns no time-away bonus.
    if (state) this.switchTo(serialize(state, this.game.now()), 'restore');
  }

  /**
   * Makes text the save everywhere and reloads into it, once it is kept somewhere (this device or the
   * account). If it can't be kept yet, nothing is replaced and the player is told.
   */
  private switchTo(text: string, what: 'import' | 'restore'): void {
    if (this.frozen) return;
    this.frozen = true;
    if (this.saves.status().cloud === 'connecting') this.editor.log(`waiting for your claude account to keep the ${what === 'import' ? 'imported save' : 'backup'}…`, 'info');
    void this.saves.replace(text).then((kept) => {
      if (kept) return location.reload();
      this.frozen = false;
      this.editor.log(`couldn't keep the ${what === 'import' ? 'imported save' : 'backup'}: your claude account isn't answering and this view can't store saves. nothing was replaced; try again in a minute`, 'err');
    });
  }

  private save(): void {
    if (this.frozen) return;
    this.saves.save(serialize(this.game.state, this.game.now()));
  }

  /**
   * Says where the save stands (nothing can keep it, this version can't read it, the account is out
   * of reach, a backup has more progress) and switches to a better cloud save that answers late.
   */
  private watchSaves(returning: boolean): void {
    if (this.saves.status().held) {
      this.editor.log('your save is from a newer version of ship-it: reload to update. nothing is saved until then', 'warn');
      return;
    }
    const warn = () => {
      const st = this.saves.status();
      if (!st.device && st.cloud !== 'synced' && st.cloud !== 'saving' && st.cloud !== 'connecting') {
        this.editor.log("this view can't keep your save: export it from cfg before closing", 'warn');
      } else if (!returning && st.cloud === 'error') {
        this.editor.log("couldn't reach your claude account: a save there is left untouched and loads next time", 'warn');
      }
    };
    warn();
    // The account can take a while to answer (about 30 s where live updates aren't available).
    window.setTimeout(() => {
      const st = this.saves.status();
      if (st.cloud === 'connecting') this.editor.log(st.device ? 'still waiting for your claude account: saving on this device meanwhile' : "your claude account hasn't answered yet, so nothing is saved: export from cfg before closing", 'warn');
      else warn();
    }, 45_000);
    const b = this.saves.backup();
    if (b && D(b.meta.lifetime).gt(this.game.state.lifetime)) this.editor.log(`a backup with more progress is kept (${fmt(D(b.meta.lifetime))} lines): cfg → restore backup`, 'info');
    this.saves.onLateSave((text, reason) => {
      this.editor.log(
        !text ? 'this save was reset on another device, starting over'
        : reason === 'replaced' ? 'your save was replaced on another device, loading it'
        : 'found a save with more progress in your claude account, loading it',
        'info',
      );
      this.frozen = true;
      window.setTimeout(() => void this.saves.adopt(text).then(() => location.reload()), 1200);
    });
  }

  /** What the settings panel says about saving. */
  private saveInfo(): { status: string; ok: boolean; backup: string | null } {
    const st = this.saves.status();
    const ago = st.cloudSavedAt ? ` · synced ${clock(Math.max(0, (Date.now() - st.cloudSavedAt) / 1000))} ago` : '';
    const status =
      st.held ? 'not saving: your save is from a newer version, reload to update'
      : st.cloud === 'synced' || st.cloud === 'saving' ? `saving to your claude account${st.device ? ' and this device' : ''}${ago}`
      : st.cloud === 'connecting' ? 'connecting to your claude account…'
      : st.device ? (st.cloud === 'error' ? "claude account unreachable: saving on this device only" : 'saving on this device only')
      : "not saving: export your save to keep it";
    const ok = !st.held && (st.device || st.cloud === 'synced' || st.cloud === 'saving');
    const b = st.held ? null : this.saves.backup();
    const backup = b && D(b.meta.lifetime).gt(this.game.state.lifetime)  ? `${fmt(D(b.meta.lifetime))} lines · ${b.meta.savedAt ? `${ageText(Date.now() - b.meta.savedAt)} ago` : 'older'}` : null;
    return { status, ok, backup };
  }
}
