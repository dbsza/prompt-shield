import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted — factory must not reference outer variables
vi.mock('../generated/detection_engine.js', () => ({
  default: vi.fn(),
  initSync: vi.fn(),
  WasmScanner: vi.fn().mockImplementation(() => ({
    set_rules: vi.fn(),
    scan_text: vi
      .fn()
      .mockReturnValue(
        '{"detections":[],"has_critical":false,"has_high":false,"recommended_action":"allow"}',
      ),
    free: vi.fn(),
  })),
}));

vi.stubGlobal('chrome', {
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://fakeid/${path}`),
  },
});

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }),
);

// Import after mocks are set up
import { getScanner, resetScanner } from '../loader';
import { initSync, WasmScanner } from '../generated/detection_engine.js';

describe('WASM Loader', () => {
  beforeEach(() => {
    resetScanner();
    vi.clearAllMocks();
  });

  it('fetches WASM binary and calls initSync', async () => {
    const scanner = await getScanner();
    expect(scanner).toBeDefined();
    expect(fetch).toHaveBeenCalledWith('chrome-extension://fakeid/detection_engine_bg.wasm');
    expect(initSync).toHaveBeenCalledWith({ module: expect.any(ArrayBuffer) });
  });

  it('returns same instance on subsequent calls', async () => {
    const scanner1 = await getScanner();
    const scanner2 = await getScanner();
    expect(scanner1).toBe(scanner2);
    expect(initSync).toHaveBeenCalledTimes(1);
  });

  it('creates a new WasmScanner after init', async () => {
    await getScanner();
    expect(WasmScanner).toHaveBeenCalledTimes(1);
  });

  it('resets scanner correctly', async () => {
    await getScanner();
    resetScanner();
    await getScanner();
    expect(initSync).toHaveBeenCalledTimes(2);
    expect(WasmScanner).toHaveBeenCalledTimes(2);
  });

  it('scanner has expected methods', async () => {
    const scanner = await getScanner();
    expect(typeof scanner.scan_text).toBe('function');
    expect(typeof scanner.set_rules).toBe('function');
  });
});
