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
import { App } from './ui/app';

async function boot(): Promise<void> {
  const platform = getPlatform();
  const now = Date.now();
  const saved = await platform.storage.get(SAVE_KEY);
  const restored = saved ? deserialize(saved, now) : null;
  const state = restored ?? newGame(now);
  // ?dev or #dev in the address turns on developer mode.
  if (/[?#&]dev\b/.test(location.search + location.hash)) state.settings.dev = true;
  const game = new Game(state);
  new App(game, platform).start(restored !== null);
  registerServiceWorker();
}

/** Offline support and "add to home screen" on real hosting. Silently skipped where unavailable. */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

void boot();
