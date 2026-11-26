// The font ships with the game (no network needed).
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-400-italic.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-800.css';
import './styles/main.css';

import { Game } from './core/game';
import { deserialize, isNewerSave, SAVE_KEY } from './core/save';
import { newGame } from './core/state';
import { getPlatform } from './platform';
import { SaveStore, type Candidate } from './platform/saves';
import { App } from './ui/app';
import { watchFit } from './ui/fit';

async function boot(): Promise<void> {
  const platform = getPlatform();
  const saves = new SaveStore(platform.storage, () => platform.cloud(), {
    key: SAVE_KEY,
    waitMs: 3000,
    cloudEveryMs: 60_000,
    visible: () => platform.isVisible(),
  });
  // Where this device keeps nothing, the game waits for the account save before starting: say so.
  const note = window.setTimeout(() => bootNote('connecting to your claude account…'), 1200);
  const candidates = await saves.load();
  window.clearTimeout(note);
  document.getElementById('bootNote')?.remove();
  const now = Date.now();
  // Best first; a save that can't be read is kept aside and the next one tried.
  let restored = null;
  let from: Candidate | null = null;
  for (const c of candidates) {
    restored = deserialize(c.text, now);
    if (restored) {
      from = c;
      break;
    }
    if (isNewerSave(c.text)) {
      // Made by a newer version of the game (this one is out of date): play nothing over it.
      saves.hold();
      break;
    }
    await saves.keepUnreadable(c.text);
  }
  saves.started(from?.text ?? null);
  const state = restored ?? newGame(now);
  // ?dev or #dev in the address turns on developer mode.
  if (/[?#&]dev\b/.test(location.search + location.hash)) state.settings.dev = true;
  const game = new Game(state);
  new App(game, platform, saves).start(from?.source ?? null);
  registerServiceWorker();
}

/** A line in the editor before the game has started. */
function bootNote(text: string): void {
  const live = document.getElementById('live');
  if (!live || document.getElementById('bootNote')) return;
  const row = document.createElement('div');
  row.className = 'ln sys';
  row.id = 'bootNote';
  row.innerHTML = '<span class="g"></span><span class="tx"><span class="tag tag-info">[info]</span> </span>';
  row.lastElementChild!.append(text);
  live.before(row);
}

/** Offline support and "add to home screen" on real hosting. Silently skipped where unavailable. */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Size the layout to the room it really has before anything is drawn, the boot note included.
watchFit(document.querySelector<HTMLElement>('.app')!);
void boot();
