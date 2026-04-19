import type { ScanResult, PolicyDecision, Detection, Action } from '../types';

const ACTION_PRIORITY: Record<Action, number> = {
  block: 3,
  redact: 2,
  warn: 1,
  allow: 0,
};

export function evaluatePolicy(scanResult: ScanResult): PolicyDecision {
  if (scanResult.detections.length === 0) {
    return {
      action: 'allow',
      detections: [],
    };
  }

  const highestAction = scanResult.detections.reduce<Action>((highest, detection) => {
    return ACTION_PRIORITY[detection.action] > ACTION_PRIORITY[highest]
      ? detection.action
      : highest;
  }, 'allow');

  const decision: PolicyDecision = {
    action: highestAction,
    detections: scanResult.detections,
  };

  return decision;
}

export function applyMinimumAction(
  decision: PolicyDecision,
  minimumAction: Action,
): PolicyDecision {
  if (ACTION_PRIORITY[minimumAction] > ACTION_PRIORITY[decision.action]) {
    return { ...decision, action: minimumAction };
  }
  return decision;
}

export function redactText(text: string, detections: Detection[]): string {
  if (detections.length === 0) return text;

  // Sort detections by start position descending to replace from end to start
  const sorted = [...detections].sort((a, b) => b.start - a.start);

  let result = text;
  for (const detection of sorted) {
    const before = result.slice(0, detection.start);
    const after = result.slice(detection.end);
    result = before + '[REDACTED]' + after;
  }

  return result;
}
