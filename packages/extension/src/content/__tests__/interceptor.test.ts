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

  describe('paste cancels pending debounce', () => {
    it('cancels pending input debounce when paste occurs', () => {
      vi.useFakeTimers();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = 'hello ';

      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      const pasteEvent = new Event('paste', { bubbles: true }) as any;
      pasteEvent.clipboardData = { getData: () => '418.523.110-53' };
      textarea.dispatchEvent(pasteEvent);

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith('hello 418.523.110-53', textarea);

      // Debounce fires — should NOT invoke callback again with stale text
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledOnce();

      document.body.removeChild(textarea);
    });

    it('allows normal debounce when no paste follows', () => {
      vi.useFakeTimers();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = 'hello';

      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith('hello', textarea);

      document.body.removeChild(textarea);
    });

    it('handles rapid paste-paste correctly', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = '';

      const paste1 = new Event('paste', { bubbles: true }) as any;
      paste1.clipboardData = { getData: () => 'first' };
      textarea.dispatchEvent(paste1);
      expect(callback).toHaveBeenCalledWith('first', textarea);

      textarea.value = 'first';
      const paste2 = new Event('paste', { bubbles: true }) as any;
      paste2.clipboardData = { getData: () => ' second' };
      textarea.dispatchEvent(paste2);
      expect(callback).toHaveBeenCalledWith('first second', textarea);

      expect(callback).toHaveBeenCalledTimes(2);
      document.body.removeChild(textarea);
    });

    it('handles type-paste-type-paste sequence', () => {
      vi.useFakeTimers();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      // Type
      textarea.value = 'a';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Paste (cancels debounce from typing)
      const paste1 = new Event('paste', { bubbles: true }) as any;
      paste1.clipboardData = { getData: () => 'PASTED1' };
      textarea.dispatchEvent(paste1);
      expect(callback).toHaveBeenCalledOnce();

      // Advance past first debounce — should not fire
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledOnce();

      // Type again
      textarea.value = 'aPASTED1b';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Paste again (cancels debounce from second typing)
      const paste2 = new Event('paste', { bubbles: true }) as any;
      paste2.clipboardData = { getData: () => 'PASTED2' };
      textarea.dispatchEvent(paste2);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('aPASTED1bPASTED2', textarea);

      // Advance past second debounce — should not fire
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(2);

      document.body.removeChild(textarea);
    });

    it('isolates debounce cancellation per element', () => {
      vi.useFakeTimers();
      const textarea1 = document.createElement('textarea');
      const textarea2 = document.createElement('textarea');
      document.body.appendChild(textarea1);
      document.body.appendChild(textarea2);

      // Type in both
      textarea1.value = 'text1';
      textarea1.dispatchEvent(new Event('input', { bubbles: true }));
      textarea2.value = 'text2';
      textarea2.dispatchEvent(new Event('input', { bubbles: true }));

      // Paste only in textarea1
      const paste = new Event('paste', { bubbles: true }) as any;
      paste.clipboardData = { getData: () => ' pasted' };
      textarea1.dispatchEvent(paste);

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith('text1 pasted', textarea1);

      // textarea2 debounce should still fire
      vi.advanceTimersByTime(300);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('text2', textarea2);

      document.body.removeChild(textarea1);
      document.body.removeChild(textarea2);
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
