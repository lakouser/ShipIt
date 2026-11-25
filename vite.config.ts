import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Relative asset paths, so the same build works on any host, in a subfolder
  // (GitHub Pages, itch.io) and later inside a Capacitor or Tauri shell.
  base: './',
  build: { target: 'es2022' },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
