export interface WasmScannerInstance {
  new (): WasmScannerInstance;
  set_rules(json: string): void;
  scan_text(input: string): string;
}

export interface WasmModule {
  default: (input?: RequestInfo | URL | BufferSource) => Promise<void>;
  WasmScanner: { new (): WasmScannerInstance };
}

let scannerInstance: WasmScannerInstance | null = null;
let initPromise: Promise<WasmScannerInstance> | null = null;

export async function initWasm(wasmModule: WasmModule, wasmUrl?: string): Promise<void> {
  if (wasmUrl) {
    await wasmModule.default(wasmUrl);
  } else {
    await wasmModule.default();
  }
}

export async function getScanner(wasmModule: WasmModule, wasmUrl?: string): Promise<WasmScannerInstance> {
  if (scannerInstance) {
    return scannerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    await initWasm(wasmModule, wasmUrl);
    scannerInstance = new wasmModule.WasmScanner();
    return scannerInstance;
  })();

  return initPromise;
}

export function resetScanner(): void {
  scannerInstance = null;
  initPromise = null;
}
