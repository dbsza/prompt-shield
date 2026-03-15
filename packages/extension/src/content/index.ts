import { attachListeners, setScanCallback, sendScanMessage } from './interceptor';
import { startObserver } from './observer';
import { showWarningBanner, removeWarningBanner } from './ui/warning-banner';
import { redactText } from '../engine/policy';
import type { PolicyDecision } from '../types';

function handleScanResult(decision: PolicyDecision, element: HTMLElement): void {
  if (decision.action === 'allow') {
    removeWarningBanner();
    return;
  }

  showWarningBanner(decision, (userAction) => {
    switch (userAction) {
      case 'block':
        // Do nothing — text stays, user must manually remove
        break;
      case 'redact': {
        const currentText = getElementText(element);
        const redacted = redactText(currentText, decision.detections);
        setElementText(element, redacted);
        break;
      }
      case 'allow':
        // User chose to send anyway
        break;
    }
  });
}

function getElementText(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }
  return element.textContent || '';
}

function setElementText(element: HTMLElement, text: string): void {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.value = text;
  } else if (element.isContentEditable) {
    element.textContent = text;
  }
}

async function onScan(text: string, element: HTMLElement): Promise<void> {
  const decision = await sendScanMessage(text);
  if (decision) {
    handleScanResult(decision, element);
  }
}

// Initialize
setScanCallback(onScan);
attachListeners();
startObserver();
