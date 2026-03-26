import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleScanResult } from '../index';
import type { PolicyDecision } from '../../types';

vi.mock('../ui/warning-banner', () => ({
  showWarningBanner: vi.fn(),
  removeWarningBanner: vi.fn(),
}));

vi.mock('./interceptor', () => ({}));
vi.mock('../observer', () => ({ startObserver: vi.fn() }));
vi.mock('../interceptor', () => ({
  setScanCallback: vi.fn(),
  attachListeners: vi.fn(),
  sendScanMessage: vi.fn(),
}));

vi.stubGlobal('chrome', {
  runtime: { sendMessage: vi.fn(), lastError: null },
});

import { showWarningBanner, removeWarningBanner } from '../ui/warning-banner';

function makeDecision(action: PolicyDecision['action'] = 'warn'): PolicyDecision {
  return {
    action,
    detections: [
      {
        rule_name: 'cpf',
        matched_text: '418.523.110-53',
        start: 0,
        end: 14,
        severity: 'high',
        action,
      },
    ],
  };
}

function makeTextarea(value = 'sensitive text'): HTMLTextAreaElement {
  const el = document.createElement('textarea');
  el.value = value;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('handleScanResult — block action', () => {
  it('replaces element text with [BLOCKED]', () => {
    const textarea = makeTextarea('My CPF is 418.523.110-53');
    const callback = vi.mocked(showWarningBanner).mockImplementation((_d, cb) => cb('block'));

    handleScanResult(makeDecision('block'), textarea);

    expect(textarea.value).toBe('[BLOCKED]');
    void callback;
  });

  it('replaces any prior content with [BLOCKED], not appends', () => {
    const textarea = makeTextarea('CPF: 418.523.110-53 and more text');
    vi.mocked(showWarningBanner).mockImplementation((_d, cb) => cb('block'));

    handleScanResult(makeDecision('block'), textarea);

    expect(textarea.value).toBe('[BLOCKED]');
    expect(textarea.value).not.toContain('CPF:');
  });
});

describe('handleScanResult — allow action', () => {
  it('removes the banner without modifying the element', () => {
    const textarea = makeTextarea('normal text');

    handleScanResult({ action: 'allow', detections: [] }, textarea);

    expect(removeWarningBanner).toHaveBeenCalled();
    expect(showWarningBanner).not.toHaveBeenCalled();
    expect(textarea.value).toBe('normal text');
  });
});

describe('handleScanResult — redact action', () => {
  it('replaces matched text with [REDACTED]', () => {
    const text = '418.523.110-53';
    const textarea = makeTextarea(text);
    vi.mocked(showWarningBanner).mockImplementation((_d, cb) => cb('redact'));

    handleScanResult(makeDecision('warn'), textarea);

    expect(textarea.value).toBe('[REDACTED]');
    expect(textarea.value).not.toContain('418.523.110-53');
  });

  it('leaves element unchanged when user clicks send anyway', () => {
    const textarea = makeTextarea('418.523.110-53');
    vi.mocked(showWarningBanner).mockImplementation((_d, cb) => cb('allow'));

    handleScanResult(makeDecision('warn'), textarea);

    expect(textarea.value).toBe('418.523.110-53');
  });
});
