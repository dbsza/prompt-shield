import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluatePolicy, redactText } from '../../engine/policy';
import type { ScanResult, PolicyDecision, Detection } from '../../types';

// Test the policy engine as used by background
// (Background itself requires chrome APIs, so we test the core logic)

describe('Background - Policy Integration', () => {
  it('evaluates scan result and returns policy decision', () => {
    const scanResult: ScanResult = {
      detections: [
        {
          rule_name: 'email_address',
          matched_text: 'user@test.com',
          start: 0,
          end: 13,
          severity: 'medium',
          action: 'warn',
        },
      ],
      has_critical: false,
      has_high: false,
      recommended_action: 'warn',
    };

    const decision = evaluatePolicy(scanResult);
    expect(decision.action).toBe('warn');
    expect(decision.detections).toHaveLength(1);
  });

  it('blocks on critical detections', () => {
    const scanResult: ScanResult = {
      detections: [
        {
          rule_name: 'aws_access_key',
          matched_text: 'AKIAIOSFODNN7EXAMPLE',
          start: 0,
          end: 20,
          severity: 'critical',
          action: 'block',
        },
      ],
      has_critical: true,
      has_high: false,
      recommended_action: 'block',
    };

    const decision = evaluatePolicy(scanResult);
    expect(decision.action).toBe('block');
  });

  it('handles empty scan result', () => {
    const scanResult: ScanResult = {
      detections: [],
      has_critical: false,
      has_high: false,
      recommended_action: 'allow',
    };

    const decision = evaluatePolicy(scanResult);
    expect(decision.action).toBe('allow');
    expect(decision.detections).toHaveLength(0);
  });

  it('redacts text based on detections', () => {
    const text = 'My email is user@test.com and SSN is 123-45-6789';
    const detections: Detection[] = [
      {
        rule_name: 'email',
        matched_text: 'user@test.com',
        start: 12,
        end: 25,
        severity: 'medium',
        action: 'redact',
      },
      {
        rule_name: 'ssn',
        matched_text: '123-45-6789',
        start: 37,
        end: 48,
        severity: 'critical',
        action: 'redact',
      },
    ];

    const redacted = redactText(text, detections);
    expect(redacted).toBe('My email is [REDACTED] and SSN is [REDACTED]');
    expect(redacted).not.toContain('user@test.com');
    expect(redacted).not.toContain('123-45-6789');
  });

  it('handles mixed actions with correct priority', () => {
    const scanResult: ScanResult = {
      detections: [
        {
          rule_name: 'email',
          matched_text: 'user@test.com',
          start: 0,
          end: 13,
          severity: 'medium',
          action: 'warn',
        },
        {
          rule_name: 'ssn',
          matched_text: '123-45-6789',
          start: 20,
          end: 31,
          severity: 'critical',
          action: 'block',
        },
      ],
      has_critical: true,
      has_high: false,
      recommended_action: 'block',
    };

    const decision = evaluatePolicy(scanResult);
    expect(decision.action).toBe('block');
    expect(decision.detections).toHaveLength(2);
  });
});
