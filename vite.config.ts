import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the same build works on any host, in a subfolder
  // (GitHub Pages, itch.io) and later inside a Capacitor or Tauri shell.
  base: './',
  build: { target: 'es2022' },
});
