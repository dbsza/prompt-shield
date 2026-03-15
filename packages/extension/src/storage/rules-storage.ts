import type { Rule, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const RULES_KEY = 'prompt_shield_rules';
const SETTINGS_KEY = 'prompt_shield_settings';

function getChromeStorage(): typeof chrome.storage.local {
  return chrome.storage.local;
}

export async function loadRules(): Promise<Rule[]> {
  return new Promise((resolve) => {
    getChromeStorage().get([RULES_KEY], (result) => {
      resolve(result[RULES_KEY] || []);
    });
  });
}

export async function saveRules(rules: Rule[]): Promise<void> {
  return new Promise((resolve) => {
    getChromeStorage().set({ [RULES_KEY]: rules }, () => {
      resolve();
    });
  });
}

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    getChromeStorage().get([SETTINGS_KEY], (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] });
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    getChromeStorage().set({ [SETTINGS_KEY]: settings }, () => {
      resolve();
    });
  });
}
