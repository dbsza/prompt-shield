import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getScanner, resetScanner } from '../loader';
import type { WasmModule, WasmScannerInstance } from '../loader';

function createMockModule(): WasmModule {
  const mockScanner: WasmScannerInstance = {
    set_rules: vi.fn(),
    scan_text: vi.fn().mockReturnValue('{"detections":[],"has_critical":false,"has_high":false,"recommended_action":"allow"}'),
  } as unknown as WasmScannerInstance;

  return {
    default: vi.fn().mockResolvedValue(undefined),
    WasmScanner: vi.fn().mockImplementation(() => mockScanner) as unknown as { new (): WasmScannerInstance },
  };
}

describe('WASM Loader', () => {
  beforeEach(() => {
    resetScanner();
  });

  it('initializes scanner singleton', async () => {
    const mockModule = createMockModule();
    const scanner = await getScanner(mockModule);
    expect(scanner).toBeDefined();
    expect(mockModule.default).toHaveBeenCalledTimes(1);
  });

  it('returns same instance on subsequent calls', async () => {
    const mockModule = createMockModule();
    const scanner1 = await getScanner(mockModule);
    const scanner2 = await getScanner(mockModule);
    expect(scanner1).toBe(scanner2);
    expect(mockModule.default).toHaveBeenCalledTimes(1);
  });

  it('passes wasm URL to init', async () => {
    const mockModule = createMockModule();
    await getScanner(mockModule, 'test.wasm');
    expect(mockModule.default).toHaveBeenCalledWith('test.wasm');
  });

  it('resets scanner correctly', async () => {
    const mockModule = createMockModule();
    await getScanner(mockModule);
    resetScanner();
    await getScanner(mockModule);
    expect(mockModule.default).toHaveBeenCalledTimes(2);
  });
});
