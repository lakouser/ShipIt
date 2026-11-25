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
  const game = new Game(restored ?? newGame(now));
  new App(game, platform).start(restored !== null);
}

void boot();
