import type { Game, GameEvent } from '../core/game';
import { D, setNotation, type Decimal } from '../core/num';
import { exportSave, importSave, SAVE_KEY, serialize } from '../core/save';
import { starsAvailable } from '../core/ship';
import type { Platform } from '../platform';
import { BugView } from './bug';
import { $ } from './dom';
import { Editor } from './editor';
import { Header } from './header';
import { IncidentView } from './incidents';
import { Keycap } from './keycap';
import { playMergeSplash } from './merge';
import { describe, scriptFile, type LogKind } from './messages';
import { Panels } from './panels';
import { createClicker } from './sound';
import { playWelcome, type WelcomeSummary } from './welcome';

declare const __APP_VERSION__: string;

const TICK_MS = 200;
const SAVE_MS = 5000;
const TYPING_MS = 700;
const SPARK_SAMPLES = 20;
const SPARK_CHARS = '▁▂▃▄▅▆▇█';
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

/** Wires the game to the screen: input, rendering, timers, dialogs and saving. */
export class App {
  private readonly editor: Editor;
  private readonly header: Header;
  private readonly panels: Panels;
  private readonly keycap: Keycap;
  private readonly bug: BugView;
  private readonly incidents: IncidentView;
  private readonly clicker = createClicker();
  private readonly counter = $('#loc');
  private charBudget = 0;
  private lastFrame = 0;
  private lastTapAt = 0;
  /** True while a splash (merge, welcome) is showing: pauses typing, bugs and incidents. */
  private dialogOpen = false;
  /** Set before a reload (import/reset) so the autosave can't overwrite the new save. */
  private frozen = false;
  private readonly spark: Decimal[] = [];
  private sparkPrev: Decimal;
  private readonly tabButtons = { sprints: $('[data-tab="sprints"]'), ship: $('[data-tab="ship"]') };

  constructor(
    private readonly game: Game,
    private readonly platform: Platform,
  ) {
    const s = game.state;
    this.sparkPrev = s.lifetime;
    this.editor = new Editor({ lines: $('#lines'), live: $('#live'), minimap: $('#mini') }, { get: () => s.editorLine, set: (n) => (s.editorLine = n) });
    this.header = new Header(game);
    this.panels = new Panels(game, $('#panel'), $('.bar'), {
      feedback: () => this.feedback(),
      settingsChanged: () => this.applySettings(),
      exportSave: () => {
        game.markExported();
        return exportSave(game.state, game.now());
      },
      importSave: (text) => this.replaceSave(text),
      resetSave: () => this.resetSave(),
      copy: (text) => void navigator.clipboard?.writeText(text).catch(() => {}),
      hapticsSupported: platform.haptics.supported,
      version: `v${__APP_VERSION__}`,
    });
    this.keycap = new Keycap($<HTMLButtonElement>('#key'), $('.keywrap'), () => this.tap(), () => !this.dialogOpen, (key) => game.typed(key));
    this.bug = new BugView($('#code'), () => game.squashBug());
    this.incidents = new IncidentView($('#code'), game);
  }

  /** Theme, motion and number format from settings. */
  applySettings(): void {
    const st = this.game.state.settings;
    const html = document.documentElement;
    html.dataset.skin = st.skin;
    html.classList.toggle('rm', st.reduceMotion);
    setNotation(st.notation);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKIN_THEME_COLOR[st.skin] ?? '#070f0c');
  }

  /** returning: the state came from a save, so credit the time away. */
  start(returning: boolean): void {
    const g = this.game;
    const s = g.state;
    this.applySettings();
    const summary: WelcomeSummary = {};
    g.on((e) => {
      if (e.type === 'offline' && !summary.away) summary.away = { lines: e.lines, seconds: e.seconds, rate: e.rate };
      if (e.type === 'checkIn' && !summary.streak) summary.streak = { count: e.checkIn.count, lines: e.checkIn.lines, script: e.checkIn.script ? scriptFile(e.checkIn.script) : null };
    });
    g.on((e) => this.onEvent(e));

    this.editor.prefill(16);
    if (returning) this.editor.log(`session restored on v${s.release}.0`, 'ok');
    else for (const [kind, text] of BOOT_LOG) this.editor.log(text, kind);
    if (returning) g.creditTimeAway((g.now() - s.savedAt) / 1000);
    g.checkIn();

    this.panels.syncTabs();
    this.panels.render();
    g.tick();

    // Only worth a splash for a returning player with something to show.
    const worthShowing = returning && (summary.away || (summary.streak && summary.streak.count > 1));
    if (worthShowing && s.settings.welcome) {
      this.dialogOpen = true;
      void playWelcome(summary).then(() => (this.dialogOpen = false));
    }

    window.setInterval(() => this.tick(), TICK_MS);
    window.setInterval(() => this.save(), SAVE_MS);
    window.setInterval(() => this.sampleSpark(), 1000);
    this.sampleSpark();
    this.platform.onHide(() => this.save());
    requestAnimationFrame((t) => this.frame(t));
  }

  private tap(): void {
    this.lastTapAt = performance.now();
    this.game.tap();
  }

  /** Key click and haptic tick, each if enabled. */
  private feedback(strong = false): void {
    const settings = this.game.state.settings;
    if (settings.sound) this.clicker.click(settings.keySound, strong);
    if (settings.haptics) strong ? this.platform.haptics.success() : this.platform.haptics.tap();
  }

  private onEvent(e: GameEvent): void {
    for (const line of describe(e)) this.editor.log(line.text, line.kind);
    const tab = this.game.state.settings.tab;
    switch (e.type) {
      case 'tap':
        this.editor.type(e.auto ? 4 : charsPerTap(e.lines));
        if (e.auto) break;
        this.keycap.floater(e.lines, e.crit);
        this.counter.classList.remove('bump');
        void this.counter.offsetWidth; // restart the bump animation
        this.counter.classList.add('bump');
        this.feedback(e.crit);
        break;
      case 'sprintStarted':
      case 'backlogRefreshed':
      case 'script':
      case 'effectEnded':
        if (tab === 'sprints') this.panels.render();
        break;
      case 'sprintEnded':
        if (tab === 'sprints') this.panels.render();
        if (e.result.ok) this.feedback(true);
        break;
      case 'achievement':
      case 'questDone':
      case 'milestoneDone':
        if (tab === 'todo') this.panels.render();
        if (e.type !== 'achievement') this.feedback(true);
        break;
      case 'perk':
        if (tab === 'ship') this.panels.render();
        break;
      case 'unlocked':
        this.panels.syncTabs(e.tab);
        break;
      case 'bugSpawned':
        this.bug.show(e.expiresAt, this.game.now());
        break;
      case 'bugEscaped':
        this.bug.hide();
        break;
      case 'bugSquashed':
        this.feedback(true);
        break;
      case 'incidentSpawned':
        this.incidents.show(e.incident);
        break;
      case 'incidentEnded':
        this.incidents.hide();
        if (e.outcome === 'caught' || e.outcome === 'fixed' || e.outcome === 'resolved') this.feedback(true);
        break;
      case 'shipped':
        this.panels.render();
        this.dialogOpen = true;
        void playMergeSplash(e.result, { onStars: () => this.feedback(true) }).then(() => {
          this.dialogOpen = false;
          this.header.bounceStars();
        });
        break;
    }
  }

  private tick(): void {
    const s = this.game.state;
    this.game.tick({ canSpawn: this.platform.isVisible() && !this.dialogOpen });
    this.panels.refresh();
    this.incidents.update();
    // tmux-style window flags: # activity (sprint running), ! bell (ready to ship)
    this.tabButtons.sprints.classList.toggle('act', !!s.sprint);
    this.tabButtons.ship.classList.toggle('bell', starsAvailable(s) >= 1);
    const d = new Date();
    $('#clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private frame(t: number): void {
    const dt = this.lastFrame ? Math.min(0.25, (t - this.lastFrame) / 1000) : 0;
    this.lastFrame = t;
    this.charBudget += dt * autoCharsPerSecond(this.game.perSecond());
    const chars = Math.floor(this.charBudget);
    if (chars > 0) {
      this.charBudget -= chars;
      this.editor.type(chars);
    }
    const s = this.game.state;
    this.header.update((s.bug ? 1 : 0) + (s.incident && s.incident.kind !== 'coffee' ? 1 : 0), t - this.lastTapAt < TYPING_MS);
    requestAnimationFrame((next) => this.frame(next));
  }

  /** Lines written per second (taps included) for the header sparkline. */
  private sampleSpark(): void {
    const now = this.game.state.lifetime;
    const delta = now.sub(this.sparkPrev);
    this.sparkPrev = now;
    this.spark.push(delta.lt(0) ? D(0) : delta);
    if (this.spark.length > SPARK_SAMPLES) this.spark.shift();
    const max = this.spark.reduce((m, v) => (v.gt(m) ? v : m), D(0));
    const top = SPARK_CHARS.length - 1;
    const padded = [...Array(SPARK_SAMPLES - this.spark.length).fill(D(0)), ...this.spark] as Decimal[];
    $('#spark').textContent = padded.map((v) => SPARK_CHARS[max.gt(0) ? Math.round(v.div(max).toNumber() * top) : 0]).join('');
  }

  private replaceSave(text: string): boolean {
    const imported = importSave(text, this.game.now());
    if (!imported) return false;
    this.frozen = true;
    void this.platform.storage.set(SAVE_KEY, serialize(imported, this.game.now())).then(() => location.reload());
    return true;
  }

  private resetSave(): void {
    this.frozen = true;
    void this.platform.storage.remove(SAVE_KEY).then(() => location.reload());
  }

  private save(): void {
    if (this.frozen) return;
    void this.platform.storage.set(SAVE_KEY, serialize(this.game.state, this.game.now()));
  }
}
