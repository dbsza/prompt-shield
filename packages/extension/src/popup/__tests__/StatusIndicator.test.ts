import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderStatusIndicator } from '../StatusIndicator';

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn((_msg: unknown, callback: (response: unknown) => void) => {
      callback({ enabled: true, rulesCount: 5, totalDetections: 10 });
    }),
  },
});

describe('StatusIndicator', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  it('renders status container', () => {
    renderStatusIndicator(container);
    expect(container.querySelector('.status')).toBeTruthy();
    expect(container.querySelector('#status-dot')).toBeTruthy();
    expect(container.querySelector('#status-text')).toBeTruthy();
  });

  it('shows active status when enabled', () => {
    renderStatusIndicator(container);
    const dot = container.querySelector('#status-dot');
    expect(dot?.classList.contains('active')).toBe(true);
  });

  it('shows rule count and detection count', () => {
    renderStatusIndicator(container);
    const text = container.querySelector('#status-text');
    expect(text?.textContent).toContain('5 rules');
    expect(text?.textContent).toContain('10 detections');
  });

  it('shows inactive when disabled', () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (_msg: unknown, callback: (response: unknown) => void) => {
        callback({ enabled: false, rulesCount: 0, totalDetections: 0 });
      },
    );

    renderStatusIndicator(container);
    const dot = container.querySelector('#status-dot');
    expect(dot?.classList.contains('inactive')).toBe(true);
    expect(container.querySelector('#status-text')?.textContent).toBe('Disabled');
  });
});
