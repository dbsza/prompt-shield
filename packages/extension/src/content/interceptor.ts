import type { ScanTextMessage, PolicyDecision } from '../types';

type ScanCallback = (text: string, element: HTMLElement) => void;

let scanCallback: ScanCallback | null = null;
let debounceTimers: Map<HTMLElement, ReturnType<typeof setTimeout>> = new Map();
const DEBOUNCE_MS = 300;

export function setScanCallback(callback: ScanCallback): void {
  scanCallback = callback;
}

function getTextFromElement(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  if (element.isContentEditable) {
    return element.textContent || '';
  }
  return '';
}

function handleInput(event: Event): void {
  const element = event.target as HTMLElement;
  if (!element || !scanCallback) return;

  const text = getTextFromElement(element);
  if (!text.trim()) return;

  // Debounce for typing
  const existingTimer = debounceTimers.get(element);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(element);
    scanCallback!(text, element);
  }, DEBOUNCE_MS);

  debounceTimers.set(element, timer);
}

function handlePaste(event: ClipboardEvent): void {
  const element = event.target as HTMLElement;
  if (!element || !scanCallback) return;

  // For paste events, get the clipboard text directly
  const pastedText = event.clipboardData?.getData('text') || '';
  if (!pastedText.trim()) return;

  // Paste is immediate — no debounce
  const existingText = getTextFromElement(element);
  const fullText = existingText + pastedText;
  scanCallback(fullText, element);
}

function handleSubmit(event: Event): void {
  const form = event.target as HTMLFormElement;
  if (!form || !scanCallback) return;

  const textInputs = form.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(
    'textarea, input[type="text"], input:not([type])',
  );

  for (const input of textInputs) {
    const text = input.value;
    if (text.trim()) {
      scanCallback(text, input);
    }
  }
}

export function attachListeners(root: Document | ShadowRoot = document): void {
  root.addEventListener('input', handleInput, true);
  root.addEventListener('paste', handlePaste as EventListener, true);
  root.addEventListener('submit', handleSubmit, true);
}

export function detachListeners(root: Document | ShadowRoot = document): void {
  root.removeEventListener('input', handleInput, true);
  root.removeEventListener('paste', handlePaste as EventListener, true);
  root.removeEventListener('submit', handleSubmit, true);

  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}

export function sendScanMessage(text: string): Promise<PolicyDecision | null> {
  return new Promise((resolve) => {
    const message: ScanTextMessage = { type: 'SCAN_TEXT', text };
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response as PolicyDecision);
    });
  });
}
