import type {
  ExtensionMessage,
  ScanResult,
  Rule,
  ExtensionStatus,
  PolicyDecision,
} from '../types';
import { evaluatePolicy } from '../engine/policy';
import { loadRules, saveRules, loadSettings } from '../storage/rules-storage';
import type { WasmScannerInstance } from '../wasm/loader';
import { getScanner } from '../wasm/loader';

let scanner: WasmScannerInstance | null = null;
let totalDetections = 0;
let currentRules: Rule[] = [];

async function initializeScanner(): Promise<void> {
  try {
    scanner = await getScanner();

    // Load saved rules
    currentRules = await loadRules();
    if (currentRules.length > 0) {
      scanner.set_rules(JSON.stringify(currentRules));
    }

    console.log('[Prompt Shield] Scanner initialized successfully');
  } catch (error) {
    console.error('[Prompt Shield] Failed to initialize WASM scanner:', error);
  }
}

function scanText(text: string): PolicyDecision {
  if (!scanner) {
    return { action: 'allow', detections: [] };
  }

  const resultJson = scanner.scan_text(text);
  const scanResult: ScanResult = JSON.parse(resultJson);
  const decision = evaluatePolicy(scanResult);

  totalDetections += decision.detections.length;
  return decision;
}

function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): boolean {
  switch (message.type) {
    case 'SCAN_TEXT': {
      const decision = scanText(message.text);
      sendResponse(decision);
      return false;
    }

    case 'SET_RULES': {
      const rules = message.rules;
      currentRules = rules;
      saveRules(rules);

      if (scanner) {
        try {
          scanner.set_rules(JSON.stringify(rules));
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: String(error) });
        }
      } else {
        sendResponse({ success: false, error: 'Scanner not initialized' });
      }
      return false;
    }

    case 'GET_RULES': {
      sendResponse({ rules: currentRules });
      return false;
    }

    case 'GET_STATUS': {
      const settings = loadSettings();
      settings.then((s) => {
        const status: ExtensionStatus = {
          enabled: s.enabled,
          rulesCount: currentRules.length,
          totalDetections,
        };
        sendResponse(status);
      });
      return true; // async response
    }

    default:
      return false;
  }
}

// Initialize on service worker startup
initializeScanner();

// Listen for messages
chrome.runtime.onMessage.addListener(handleMessage);
