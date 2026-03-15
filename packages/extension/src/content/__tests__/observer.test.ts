import { describe, it, expect, vi, afterEach } from 'vitest';
import { startObserver, stopObserver } from '../observer';

describe('Observer', () => {
  afterEach(() => {
    stopObserver();
  });

  it('starts mutation observer on document.body', () => {
    const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
    startObserver();
    expect(observeSpy).toHaveBeenCalledWith(document.body, {
      childList: true,
      subtree: true,
    });
    observeSpy.mockRestore();
  });

  it('does not create multiple observers', () => {
    const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
    startObserver();
    startObserver();
    expect(observeSpy).toHaveBeenCalledTimes(1);
    observeSpy.mockRestore();
  });

  it('disconnects observer on stop', () => {
    const disconnectSpy = vi.spyOn(MutationObserver.prototype, 'disconnect');
    startObserver();
    stopObserver();
    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });

  it('can restart after stop', () => {
    const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
    startObserver();
    stopObserver();
    startObserver();
    expect(observeSpy).toHaveBeenCalledTimes(2);
    observeSpy.mockRestore();
  });
});
