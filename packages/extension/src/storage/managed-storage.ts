import type { ManagedPolicy } from '../types';

export async function loadManagedPolicy(): Promise<ManagedPolicy> {
  try {
    const result = await chrome.storage.managed.get(null);
    return result as ManagedPolicy;
  } catch {
    // managed storage unavailable (no enterprise policy configured)
    return {};
  }
}

export function onManagedPolicyChanged(
  callback: (policy: ManagedPolicy) => void,
): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'managed') return;
    loadManagedPolicy().then(callback);
  });
}

export async function isManagedEnvironment(): Promise<boolean> {
  const policy = await loadManagedPolicy();
  return Object.keys(policy).length > 0;
}
