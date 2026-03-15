import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setScanCallback,
  attachListeners,
  detachListeners,
  sendScanMessage,
} from '../interceptor';

// Mock chrome.runtime
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn(),
    lastError: null,
  },
});

describe('Interceptor', () => {
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
    setScanCallback(callback);
    attachListeners(document);
  });

  afterEach(() => {
    detachListeners(document);
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('input event', () => {
    it('debounces input events on textarea', () => {
      vi.useFakeTimers();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = 'hello world';

      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledWith('hello world', textarea);

      document.body.removeChild(textarea);
    });

    it('resets debounce on rapid input', () => {
      vi.useFakeTimers();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      textarea.value = 'h';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      vi.advanceTimersByTime(200);

      textarea.value = 'he';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      vi.advanceTimersByTime(200);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith('he', textarea);

      document.body.removeChild(textarea);
    });

    it('ignores empty input', () => {
      vi.useFakeTimers();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = '   ';

      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersByTime(300);

      expect(callback).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });
  });

  describe('paste event', () => {
    it('triggers immediately on paste', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = 'existing ';

      // Use Event since ClipboardEvent may not be fully available in jsdom
      const pasteEvent = new Event('paste', { bubbles: true }) as any;
      pasteEvent.clipboardData = { getData: () => 'pasted text' };

      textarea.dispatchEvent(pasteEvent);
      expect(callback).toHaveBeenCalledWith('existing pasted text', textarea);

      document.body.removeChild(textarea);
    });
  });

  describe('sendScanMessage', () => {
    it('sends SCAN_TEXT message to background', async () => {
      const mockResponse = { action: 'allow', detections: [] };
      vi.mocked(chrome.runtime.sendMessage).mockImplementation(
        (_message: unknown, callback?: (response: unknown) => void) => {
          callback?.(mockResponse);
        },
      );

      const result = await sendScanMessage('test text');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'SCAN_TEXT', text: 'test text' },
        expect.any(Function),
      );
      expect(result).toEqual(mockResponse);
    });

    it('returns null on runtime error', async () => {
      Object.defineProperty(chrome.runtime, 'lastError', {
        value: { message: 'error' },
        configurable: true,
      });

      vi.mocked(chrome.runtime.sendMessage).mockImplementation(
        (_message: unknown, callback?: (response: unknown) => void) => {
          callback?.(undefined);
        },
      );

      const result = await sendScanMessage('test');
      expect(result).toBeNull();

      Object.defineProperty(chrome.runtime, 'lastError', {
        value: null,
        configurable: true,
      });
    });
  });
});
