// The font ships with the game (no network needed).
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-400-italic.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-800.css';
import './styles/main.css';

import { Game } from './core/game';
import { deserialize, SAVE_KEY } from './core/save';
import { newGame } from './core/state';
import { getPlatform } from './platform';
import { SaveStore, type Candidate } from './platform/saves';
import { App } from './ui/app';

async function boot(): Promise<void> {
  const platform = getPlatform();
  const saves = new SaveStore(platform.storage, () => platform.cloud(), {
    key: SAVE_KEY,
    waitMs: 3000,
    cloudEveryMs: 60_000,
    visible: () => platform.isVisible(),
  });
  const candidates = await saves.load();
  const now = Date.now();
  // Newest first; a save that can't be read is kept aside and the next one tried.
  let restored = null;
  let from: Candidate['source'] | null = null;
  for (const c of candidates) {
    restored = deserialize(c.text, now);
    if (restored) {
      from = c.source;
      break;
    }
    await saves.keepUnreadable(c.text);
  }
  saves.started(from ? candidates.find((c) => c.source === from)!.text : null);
  const state = restored ?? newGame(now);
  // ?dev or #dev in the address turns on developer mode.
  if (/[?#&]dev\b/.test(location.search + location.hash)) state.settings.dev = true;
  const game = new Game(state);
  new App(game, platform, saves).start(from);
  registerServiceWorker();
}

/** Offline support and "add to home screen" on real hosting. Silently skipped where unavailable. */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

void boot();
