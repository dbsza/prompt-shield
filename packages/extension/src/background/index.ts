import type {
  ExtensionMessage,
  ScanResult,
  Rule,
  ExtensionStatus,
  PolicyDecision,
  ManagedPolicy,
} from '../types';
import { evaluatePolicy, applyMinimumAction } from '../engine/policy';
import { loadRules, saveRules, loadSettings, saveSettings, saveAllowedDomains } from '../storage/rules-storage';
import { loadManagedPolicy, onManagedPolicyChanged } from '../storage/managed-storage';
import { isDomainAllowed } from '../utils/domain-match';
import type { WasmScannerInstance } from '../wasm/loader';
import { getScanner } from '../wasm/loader';

let scanner: WasmScannerInstance | null = null;
let totalDetections = 0;
let currentRules: Rule[] = [];
let managedPolicy: ManagedPolicy = {};

function effectiveRules(): Rule[] {
  const managed = managedPolicy.ManagedRules ?? [];
  // Merge: managed rules precede user rules; deduplicate by guid
  const userRulesFiltered = currentRules.filter(
    (ur) => !managed.some((mr) => mr.guid === ur.guid),
  );
  return [...managed, ...userRulesFiltered];
}

function effectiveDomains(userDomains: string[]): string[] {
  const managed = managedPolicy.ManagedDomains ?? [];
  const combined = [...managed, ...userDomains];
  return [...new Set(combined)];
}

async function applyManagedSettings(): Promise<void> {
  if (
    managedPolicy.EntropyThreshold !== undefined ||
    managedPolicy.ShowNotifications !== undefined
  ) {
    const settings = await loadSettings();
    if (managedPolicy.EntropyThreshold !== undefined) {
      settings.entropyThreshold = managedPolicy.EntropyThreshold;
    }
    if (managedPolicy.ShowNotifications !== undefined) {
      settings.showNotifications = managedPolicy.ShowNotifications;
    }
    await saveSettings(settings);
  }
}

async function initializeScanner(): Promise<void> {
  try {
    scanner = await getScanner();

    managedPolicy = await loadManagedPolicy();
    await applyManagedSettings();

    // Load saved user rules and merge with managed rules
    currentRules = await loadRules();
    const allRules = effectiveRules();
    if (allRules.length > 0) {
      scanner.set_rules(JSON.stringify(allRules));
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
  let decision = evaluatePolicy(scanResult);

  if (managedPolicy.MinimumAction) {
    decision = applyMinimumAction(decision, managedPolicy.MinimumAction);
  }

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
      if (managedPolicy.LockRules) {
        sendResponse({ success: false, error: 'Rules are locked by administrator policy' });
        return false;
      }
      const rules = message.rules;
      currentRules = rules;
      saveRules(rules);

      if (scanner) {
        try {
          scanner.set_rules(JSON.stringify(effectiveRules()));
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
      loadSettings().then(async (s) => {
        const isManaged = Object.keys(managedPolicy).length > 0;
        const status: ExtensionStatus = {
          enabled: managedPolicy.ForceEnabled ? true : s.enabled,
          rulesCount: currentRules.length,
          totalDetections,
          allowedDomains: s.allowedDomains,
          managed: isManaged,
          managedRules: managedPolicy.ManagedRules ?? [],
          managedRulesCount: managedPolicy.ManagedRules?.length ?? 0,
          managedDomains: managedPolicy.ManagedDomains ?? [],
          lockDomains: managedPolicy.LockDomains ?? false,
          lockRules: managedPolicy.LockRules ?? false,
          forceEnabled: managedPolicy.ForceEnabled ?? false,
        };
        sendResponse(status);
      });
      return true; // async response
    }

    case 'CHECK_DOMAIN': {
      loadSettings().then((s) => {
        const domains = effectiveDomains(s.allowedDomains);
        sendResponse({ allowed: isDomainAllowed(message.hostname, domains) });
      });
      return true; // async response
    }

    case 'SET_DOMAINS': {
      if (managedPolicy.LockDomains) {
        sendResponse({ success: false, error: 'Domains are locked by administrator policy' });
        return false;
      }
      saveAllowedDomains(message.domains).then(() => {
        sendResponse({ success: true });
      });
      return true; // async response
    }

    default:
      return false;
  }
}

// Re-apply when enterprise policy changes at runtime
onManagedPolicyChanged(async (newPolicy) => {
  managedPolicy = newPolicy;
  await applyManagedSettings();
  if (scanner) {
    const allRules = effectiveRules();
    scanner.set_rules(JSON.stringify(allRules));
  }
  console.log('[Prompt Shield] Managed policy updated');
});

// Initialize on service worker startup
initializeScanner();

// Listen for messages
chrome.runtime.onMessage.addListener(handleMessage);
