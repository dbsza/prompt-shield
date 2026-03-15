import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadRules, saveRules, loadSettings, saveSettings } from '../rules-storage';
import type { Rule, Settings } from '../../types';

// Mock chrome.storage.local
const storage: Record<string, unknown> = {};

const mockChromeStorage = {
  get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      if (storage[key] !== undefined) {
        result[key] = storage[key];
      }
    }
    callback(result);
  }),
  set: vi.fn((items: Record<string, unknown>, callback: () => void) => {
    Object.assign(storage, items);
    callback();
  }),
};

vi.stubGlobal('chrome', {
  storage: {
    local: mockChromeStorage,
  },
});

describe('Rules Storage', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.clearAllMocks();
  });

  describe('loadRules', () => {
    it('returns empty array when no rules saved', async () => {
      const rules = await loadRules();
      expect(rules).toEqual([]);
    });

    it('returns saved rules', async () => {
      const testRules: Rule[] = [
        {
          guid: '1',
          name: 'test',
          regex: 'abc',
          severity: 'high',
          action: 'block',
        },
      ];
      storage['prompt_shield_rules'] = testRules;

      const rules = await loadRules();
      expect(rules).toEqual(testRules);
    });
  });

  describe('saveRules', () => {
    it('saves rules to storage', async () => {
      const testRules: Rule[] = [
        {
          guid: '1',
          name: 'test',
          regex: 'abc',
          severity: 'high',
          action: 'block',
        },
      ];
      await saveRules(testRules);
      expect(storage['prompt_shield_rules']).toEqual(testRules);
    });
  });

  describe('loadSettings', () => {
    it('returns default settings when none saved', async () => {
      const settings = await loadSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.showNotifications).toBe(true);
      expect(settings.entropyThreshold).toBe(4.5);
      expect(settings.debounceMs).toBe(300);
    });

    it('merges saved settings with defaults', async () => {
      storage['prompt_shield_settings'] = { enabled: false };
      const settings = await loadSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.showNotifications).toBe(true);
    });
  });

  describe('saveSettings', () => {
    it('saves settings to storage', async () => {
      const settings: Settings = {
        enabled: false,
        showNotifications: true,
        entropyThreshold: 5.0,
        debounceMs: 500,
      };
      await saveSettings(settings);
      expect(storage['prompt_shield_settings']).toEqual(settings);
    });
  });
});
