import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  showWarningBanner,
  removeWarningBanner,
  isBannerVisible,
} from '../warning-banner';
import type { PolicyDecision, Detection } from '../../../types';

function makeDecision(detections: Partial<Detection>[] = []): PolicyDecision {
  return {
    action: 'warn',
    detections: detections.map((d) => ({
      rule_name: 'test',
      matched_text: 'match',
      start: 0,
      end: 5,
      severity: 'medium' as const,
      action: 'warn' as const,
      ...d,
    })),
  };
}

describe('Warning Banner', () => {
  afterEach(() => {
    removeWarningBanner();
  });

  it('creates banner element in DOM', () => {
    const decision = makeDecision([{ rule_name: 'email_address' }]);
    showWarningBanner(decision, vi.fn());
    expect(isBannerVisible()).toBe(true);
  });

  it('removes banner from DOM', () => {
    showWarningBanner(makeDecision([{ rule_name: 'test' }]), vi.fn());
    expect(isBannerVisible()).toBe(true);
    removeWarningBanner();
    expect(isBannerVisible()).toBe(false);
  });

  it('replaces existing banner on show', () => {
    showWarningBanner(makeDecision([{ rule_name: 'first' }]), vi.fn());
    showWarningBanner(makeDecision([{ rule_name: 'second' }]), vi.fn());
    const banners = document.querySelectorAll('prompt-shield-banner');
    expect(banners).toHaveLength(1);
  });

  it('uses shadow DOM', () => {
    showWarningBanner(makeDecision([{ rule_name: 'test' }]), vi.fn());
    const host = document.querySelector('prompt-shield-banner');
    expect(host?.shadowRoot).toBeDefined();
  });

  it('shows detection information', () => {
    const decision = makeDecision([
      { rule_name: 'email_address', matched_text: 'user@test.com', severity: 'medium' },
    ]);
    showWarningBanner(decision, vi.fn());
    const host = document.querySelector('prompt-shield-banner');
    const shadow = host?.shadowRoot;
    expect(shadow?.textContent).toContain('email_address');
    expect(shadow?.textContent).toContain('user@test.com');
  });

  it('shows correct severity class', () => {
    const decision = makeDecision([{ severity: 'critical' }]);
    showWarningBanner(decision, vi.fn());
    const host = document.querySelector('prompt-shield-banner');
    const severity = host?.shadowRoot?.querySelector('.shield-severity');
    expect(severity?.classList.contains('severity-critical')).toBe(true);
  });

  it('calls callback with block action', () => {
    const callback = vi.fn();
    showWarningBanner(makeDecision([{ rule_name: 'test' }]), callback);
    const host = document.querySelector('prompt-shield-banner');
    const blockBtn = host?.shadowRoot?.querySelector('.btn-block') as HTMLElement;
    blockBtn?.click();
    expect(callback).toHaveBeenCalledWith('block');
  });

  it('calls callback with redact action', () => {
    const callback = vi.fn();
    showWarningBanner(makeDecision([{ rule_name: 'test' }]), callback);
    const host = document.querySelector('prompt-shield-banner');
    const redactBtn = host?.shadowRoot?.querySelector('.btn-redact') as HTMLElement;
    redactBtn?.click();
    expect(callback).toHaveBeenCalledWith('redact');
  });

  it('calls callback with allow action', () => {
    const callback = vi.fn();
    showWarningBanner(makeDecision([{ rule_name: 'test' }]), callback);
    const host = document.querySelector('prompt-shield-banner');
    const allowBtn = host?.shadowRoot?.querySelector('.btn-allow') as HTMLElement;
    allowBtn?.click();
    expect(callback).toHaveBeenCalledWith('allow');
  });

  it('removes banner after button click', () => {
    showWarningBanner(makeDecision([{ rule_name: 'test' }]), vi.fn());
    const host = document.querySelector('prompt-shield-banner');
    const blockBtn = host?.shadowRoot?.querySelector('.btn-block') as HTMLElement;
    blockBtn?.click();
    expect(isBannerVisible()).toBe(false);
  });

  it('shows max 5 detections with overflow message', () => {
    const detections = Array.from({ length: 7 }, (_, i) => ({
      rule_name: `rule_${i}`,
      matched_text: `match_${i}`,
    }));
    showWarningBanner(makeDecision(detections), vi.fn());
    const host = document.querySelector('prompt-shield-banner');
    const items = host?.shadowRoot?.querySelectorAll('.shield-detections li');
    expect(items?.length).toBe(6); // 5 + overflow message
    expect(host?.shadowRoot?.textContent).toContain('2 more');
  });
});
