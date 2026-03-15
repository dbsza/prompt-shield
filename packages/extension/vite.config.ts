import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import manifest from './public/manifest.json';

const WASM_PKG = resolve(__dirname, '../detection-engine/pkg');

function copyWasmPlugin() {
  return {
    name: 'copy-wasm',
    buildStart() {
      const outDir = resolve(__dirname, 'public');
      if (existsSync(resolve(WASM_PKG, 'detection_engine_bg.wasm'))) {
        copyFileSync(
          resolve(WASM_PKG, 'detection_engine_bg.wasm'),
          resolve(outDir, 'detection_engine_bg.wasm'),
        );
        copyFileSync(
          resolve(WASM_PKG, 'detection_engine.js'),
          resolve(outDir, 'detection_engine.js'),
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [copyWasmPlugin(), crx({ manifest: manifest as any })],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
