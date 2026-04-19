import { describe, it, expect } from 'vitest';
import { evaluatePolicy, redactText, applyMinimumAction } from '../policy';
import type { ScanResult, Detection } from '../../types';

function makeDetection(overrides: Partial<Detection> = {}): Detection {
  return {
    rule_name: 'test',
    matched_text: 'match',
    start: 0,
    end: 5,
    severity: 'medium',
    action: 'warn',
    ...overrides,
  };
}

function makeScanResult(detections: Detection[]): ScanResult {
  return {
    detections,
    has_critical: detections.some((d) => d.severity === 'critical'),
    has_high: detections.some((d) => d.severity === 'high'),
    recommended_action: 'warn',
  };
}

describe('evaluatePolicy', () => {
  it('returns allow when no detections', () => {
    const result = evaluatePolicy({
      detections: [],
      has_critical: false,
      has_high: false,
      recommended_action: 'allow',
    });
    expect(result.action).toBe('allow');
    expect(result.detections).toHaveLength(0);
  });

  it('returns warn for warn-only detections', () => {
    const result = evaluatePolicy(
      makeScanResult([makeDetection({ action: 'warn' })]),
    );
    expect(result.action).toBe('warn');
  });

  it('returns block when any detection is block', () => {
    const result = evaluatePolicy(
      makeScanResult([
        makeDetection({ action: 'warn' }),
        makeDetection({ action: 'block' }),
      ]),
    );
    expect(result.action).toBe('block');
  });

  it('returns redact when highest is redact', () => {
    const result = evaluatePolicy(
      makeScanResult([
        makeDetection({ action: 'warn' }),
        makeDetection({ action: 'redact' }),
      ]),
    );
    expect(result.action).toBe('redact');
  });

  it('block takes priority over redact', () => {
    const result = evaluatePolicy(
      makeScanResult([
        makeDetection({ action: 'redact' }),
        makeDetection({ action: 'block' }),
      ]),
    );
    expect(result.action).toBe('block');
  });

  it('includes all detections in decision', () => {
    const detections = [
      makeDetection({ rule_name: 'a' }),
      makeDetection({ rule_name: 'b' }),
    ];
    const result = evaluatePolicy(makeScanResult(detections));
    expect(result.detections).toHaveLength(2);
  });
});

describe('redactText', () => {
  it('returns original text when no detections', () => {
    expect(redactText('hello world', [])).toBe('hello world');
  });

  it('redacts single detection', () => {
    const detections: Detection[] = [
      makeDetection({ start: 6, end: 22, matched_text: 'user@example.com' }),
    ];
    const result = redactText('email user@example.com here', detections);
    expect(result).toBe('email [REDACTED] here');
  });

  it('redacts multiple detections', () => {
    const detections: Detection[] = [
      makeDetection({ start: 0, end: 3, matched_text: 'aaa' }),
      makeDetection({ start: 8, end: 11, matched_text: 'bbb' }),
    ];
    const result = redactText('aaa and bbb end', detections);
    expect(result).toBe('[REDACTED] and [REDACTED] end');
  });

  it('handles overlapping positions correctly', () => {
    const detections: Detection[] = [
      makeDetection({ start: 0, end: 5, matched_text: '12345' }),
    ];
    const result = redactText('12345', detections);
    expect(result).toBe('[REDACTED]');
  });

  it('handles adjacent detections', () => {
    const detections: Detection[] = [
      makeDetection({ start: 0, end: 3, matched_text: 'abc' }),
      makeDetection({ start: 3, end: 6, matched_text: 'def' }),
    ];
    const result = redactText('abcdef', detections);
    expect(result).toBe('[REDACTED][REDACTED]');
  });
});

describe('applyMinimumAction', () => {
  it('does not change action when decision already meets minimum', () => {
    const decision = { action: 'block' as const, detections: [] };
    const result = applyMinimumAction(decision, 'warn');
    expect(result.action).toBe('block');
  });

  it('escalates action when below minimum', () => {
    const decision = { action: 'warn' as const, detections: [] };
    const result = applyMinimumAction(decision, 'block');
    expect(result.action).toBe('block');
  });

  it('escalates allow to redact when minimum is redact', () => {
    const decision = { action: 'allow' as const, detections: [] };
    const result = applyMinimumAction(decision, 'redact');
    expect(result.action).toBe('redact');
  });

  it('preserves detections when escalating', () => {
    const detections = [makeDetection({ action: 'warn' })];
    const decision = { action: 'warn' as const, detections };
    const result = applyMinimumAction(decision, 'block');
    expect(result.action).toBe('block');
    expect(result.detections).toBe(detections);
  });

  it('does not change decision when minimum matches current action', () => {
    const decision = { action: 'redact' as const, detections: [] };
    const result = applyMinimumAction(decision, 'redact');
    expect(result.action).toBe('redact');
  });
});
