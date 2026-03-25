// Static import of the wasm-bindgen generated glue code.
// The file at ./generated/detection_engine.js is copied from
// detection-engine/pkg/ by the Vite syncWasmGluePlugin at build time.
// This ensures:
//  1. No dynamic import() — compatible with Service Workers
//  2. The glue code is the original wasm-bindgen output (audited, not hand-copied)
//  3. Vite bundles it statically into background.js
import init, { initSync, WasmScanner } from './generated/detection_engine.js';

export type WasmScannerInstance = WasmScanner;

let scannerInstance: WasmScanner | null = null;
let initPromise: Promise<WasmScanner> | null = null;

export async function getScanner(): Promise<WasmScanner> {
  if (scannerInstance) {
    return scannerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const wasmUrl = chrome.runtime.getURL('detection_engine_bg.wasm');
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();

    // initSync uses WebAssembly.Module + WebAssembly.Instance under the hood
    // — no dynamic import() needed, safe for Service Workers
    initSync({ module: bytes });

    scannerInstance = new WasmScanner();
    return scannerInstance;
  })();

  return initPromise;
}

export function resetScanner(): void {
  scannerInstance = null;
  initPromise = null;
}
