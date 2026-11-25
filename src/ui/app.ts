import type { Game, GameEvent } from '../core/game';
import type { Decimal } from '../core/num';
import { SAVE_KEY, serialize } from '../core/save';
import { starsAvailable } from '../core/ship';
import type { Platform } from '../platform';
import { BugView } from './bug';
import { $ } from './dom';
import { Editor } from './editor';
import { Header } from './header';
import { Keycap } from './keycap';
import { describe } from './messages';
import { Panels } from './panels';
import { createClicker } from './sound';

const TICK_MS = 200;
const SAVE_MS = 5000;

/** Characters typed per tap grow slowly with tap power, so the editor feels faster as you upgrade. */
const charsPerTap = (lines: Decimal): number => 6 + Math.min(12, Math.floor(Math.log10(lines.toNumber() + 1) * 3));
/** Automation types on its own, faster as output grows, capped so it stays readable. */
const autoCharsPerSecond = (perSecond: Decimal): number => (perSecond.gt(0) ? Math.min(30, 3 + perSecond.add(1).log10() * 9) : 0);

/** Wires the game to the screen: input, rendering, timers and saving. */
export class App {
  private readonly editor: Editor;
  private readonly header: Header;
  private readonly panels: Panels;
  private readonly keycap: Keycap;
  private readonly bug: BugView;
  private readonly clicker = createClicker();
  private readonly counter = $('#loc');
  private charBudget = 0;
  private lastFrame = 0;

  constructor(
    private readonly game: Game,
    private readonly platform: Platform,
  ) {
    const s = game.state;
    this.editor = new Editor(
      { lines: $('#lines'), live: $('#live'), minimap: $('#mini') },
      { get: () => s.editorLine, set: (n) => (s.editorLine = n) },
    );
    this.header = new Header(game);
    this.panels = new Panels(game, $('#panel'), $('.seg'), () => this.feedback());
    this.keycap = new Keycap($<HTMLButtonElement>('#key'), $('.keywrap'), () => this.tap());
    this.bug = new BugView($('#code'), () => game.squashBug());

    const sound = $<HTMLButtonElement>('#snd');
    sound.addEventListener('click', () => {
      s.settings.sound = !s.settings.sound;
      this.renderSoundToggle();
      this.feedback();
    });
  }

  /** returning: the state came from a save, so credit the time away. */
  start(returning: boolean): void {
    const s = this.game.state;
    this.game.on((e) => this.onEvent(e));
    this.editor.prefill(16);
    if (returning) {
      this.editor.log(`session restored on v${s.release}.0`);
      this.game.creditTimeAway((this.game.now() - s.savedAt) / 1000);
    } else {
      this.editor.log('tap the key, or type on your keyboard, to write code');
    }
    this.renderSoundToggle();
    this.panels.render();
    this.game.tick();

    window.setInterval(() => this.tick(), TICK_MS);
    window.setInterval(() => this.save(), SAVE_MS);
    this.platform.onHide(() => this.save());
    requestAnimationFrame((t) => this.frame(t));
  }

  private tap(): void {
    const lines = this.game.tap();
    this.editor.type(charsPerTap(lines));
    this.keycap.floater(lines);
    this.counter.classList.remove('bump');
    void this.counter.offsetWidth; // restart the bump animation
    this.counter.classList.add('bump');
    this.feedback();
  }

  /** Key click and haptic tick, each if enabled. */
  private feedback(strong = false): void {
    const settings = this.game.state.settings;
    if (settings.sound) this.clicker.click();
    if (settings.haptics) strong ? this.platform.haptics.success() : this.platform.haptics.tap();
  }

  private onEvent(e: GameEvent): void {
    const text = describe(e);
    if (text) this.editor.log(text);
    switch (e.type) {
      case 'sprintStarted':
      case 'shipped':
        this.panels.render();
        break;
      case 'sprintEnded':
        this.panels.render();
        if (e.result.ok) this.feedback(true);
        break;
      case 'achievement':
        if (this.game.state.settings.tab === 'ship') this.panels.render();
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
    }
  }

  private tick(): void {
    this.game.tick({ canSpawnBug: this.platform.isVisible() });
    this.panels.refresh();
    $('#dShip').hidden = starsAvailable(this.game.state) < 1;
    $('#dSp').hidden = !this.game.state.sprint;
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
    this.header.update(this.game.state.bug !== null);
    requestAnimationFrame((next) => this.frame(next));
  }

  private renderSoundToggle(): void {
    const on = this.game.state.settings.sound;
    $('#snd').setAttribute('aria-pressed', String(on));
    $('#sndl').textContent = on ? 'Sound on' : 'Sound off';
  }

  private save(): void {
    void this.platform.storage.set(SAVE_KEY, serialize(this.game.state, this.game.now()));
  }
}
