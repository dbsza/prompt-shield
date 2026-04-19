import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadManagedPolicy, isManagedEnvironment } from '../managed-storage';

const managedStorage: Record<string, unknown> = {};

const mockManagedGet = vi.fn(() => Promise.resolve({ ...managedStorage }));

vi.stubGlobal('chrome', {
  storage: {
    managed: {
      get: mockManagedGet,
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
});

describe('managed-storage', () => {
  beforeEach(() => {
    Object.keys(managedStorage).forEach((k) => delete managedStorage[k]);
    mockManagedGet.mockImplementation(() => Promise.resolve({ ...managedStorage }));
  });

  describe('loadManagedPolicy', () => {
    it('returns empty object when no managed policy is set', async () => {
      const policy = await loadManagedPolicy();
      expect(policy).toEqual({});
    });

    it('returns managed policy fields', async () => {
      managedStorage['ForceEnabled'] = true;
      managedStorage['MinimumAction'] = 'block';
      managedStorage['LockRules'] = true;

      const policy = await loadManagedPolicy();
      expect(policy.ForceEnabled).toBe(true);
      expect(policy.MinimumAction).toBe('block');
      expect(policy.LockRules).toBe(true);
    });

    it('returns ManagedRules array', async () => {
      managedStorage['ManagedRules'] = [
        { guid: 'g1', name: 'Corp Rule', regex: 'secret', severity: 'high', action: 'block' },
      ];

      const policy = await loadManagedPolicy();
      expect(policy.ManagedRules).toHaveLength(1);
      expect(policy.ManagedRules![0].name).toBe('Corp Rule');
    });

    it('returns ManagedDomains array', async () => {
      managedStorage['ManagedDomains'] = ['corp.internal', 'example.com'];

      const policy = await loadManagedPolicy();
      expect(policy.ManagedDomains).toEqual(['corp.internal', 'example.com']);
    });

    it('returns empty object when managed storage throws', async () => {
      mockManagedGet.mockImplementationOnce(() => {
        throw new Error('managed storage unavailable');
      });

      const policy = await loadManagedPolicy();
      expect(policy).toEqual({});
    });
  });

  describe('isManagedEnvironment', () => {
    it('returns false when no managed policy fields are set', async () => {
      const result = await isManagedEnvironment();
      expect(result).toBe(false);
    });

    it('returns true when at least one managed policy field is set', async () => {
      managedStorage['ForceEnabled'] = true;

      const result = await isManagedEnvironment();
      expect(result).toBe(true);
    });
  });
});
