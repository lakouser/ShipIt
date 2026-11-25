import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Builds entry.ts as one ES module (plus keyboard.wav) that the patched v0.3.0 bundle imports.
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
    modulePreload: false,
    rollupOptions: {
      input: { patch: fileURLToPath(new URL('./entry.ts', import.meta.url)) },
      preserveEntrySignatures: 'exports-only',
      output: { entryFileNames: 'assets/shipit-patch-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
    },
  },
});
