/**
 * Copies wasm-bindgen generated JS glue and type declarations
 * from detection-engine/pkg/ into src/wasm/generated/ so they
 * can be statically imported by TypeScript and bundled by Vite.
 */
import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(__dirname, '../../detection-engine/pkg');
const target = resolve(__dirname, '../src/wasm/generated');

mkdirSync(target, { recursive: true });

const files = ['detection_engine.js', 'detection_engine.d.ts'];
for (const file of files) {
  const src = resolve(pkg, file);
  if (existsSync(src)) {
    copyFileSync(src, resolve(target, file));
    console.log(`Copied ${file}`);
  } else {
    console.warn(`Warning: ${file} not found in ${pkg}`);
  }
}
