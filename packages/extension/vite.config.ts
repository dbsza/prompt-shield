import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, cpSync, rmSync } from 'fs';

const WASM_PKG = resolve(__dirname, '../detection-engine/pkg');

function syncWasmGluePlugin() {
  return {
    name: 'sync-wasm-glue',
    buildStart() {
      const target = resolve(__dirname, 'src/wasm/generated');
      mkdirSync(target, { recursive: true });

      const files = ['detection_engine.js', 'detection_engine.d.ts'];
      for (const file of files) {
        const src = resolve(WASM_PKG, file);
        if (existsSync(src)) {
          copyFileSync(src, resolve(target, file));
        }
      }
    },
  };
}

function copyDistAssetsPlugin() {
  return {
    name: 'copy-extension-assets',
    writeBundle() {
      const dist = resolve(__dirname, 'dist');

      // Move popup.html from nested path to dist root
      const nestedPopup = resolve(dist, 'src/popup/popup.html');
      if (existsSync(nestedPopup)) {
        copyFileSync(nestedPopup, resolve(dist, 'popup.html'));
        rmSync(resolve(dist, 'src'), { recursive: true, force: true });
      }

      // Copy manifest.json
      copyFileSync(resolve(__dirname, 'public/manifest.json'), resolve(dist, 'manifest.json'));

      // Copy WASM binary only (JS glue is bundled by Vite)
      const wasmBin = resolve(WASM_PKG, 'detection_engine_bg.wasm');
      if (existsSync(wasmBin)) {
        copyFileSync(wasmBin, resolve(dist, 'detection_engine_bg.wasm'));
      }

      // Copy icons
      const iconsDir = resolve(__dirname, 'public/icons');
      if (existsSync(iconsDir)) {
        const distIcons = resolve(dist, 'icons');
        mkdirSync(distIcons, { recursive: true });
        cpSync(iconsDir, distIcons, { recursive: true });
      }
    },
  };
}

// Main build: background (ES module) + popup (HTML entry)
export default defineConfig({
  base: './',
  plugins: [syncWasmGluePlugin(), copyDistAssetsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
