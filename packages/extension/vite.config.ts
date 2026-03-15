import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, cpSync, renameSync, rmSync } from 'fs';

const WASM_PKG = resolve(__dirname, '../detection-engine/pkg');

function copyAssetsPlugin() {
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

      // Copy WASM files
      if (existsSync(resolve(WASM_PKG, 'detection_engine_bg.wasm'))) {
        copyFileSync(
          resolve(WASM_PKG, 'detection_engine_bg.wasm'),
          resolve(dist, 'detection_engine_bg.wasm'),
        );
        copyFileSync(
          resolve(WASM_PKG, 'detection_engine.js'),
          resolve(dist, 'detection_engine.js'),
        );
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

export default defineConfig({
  base: './',
  plugins: [copyAssetsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
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
