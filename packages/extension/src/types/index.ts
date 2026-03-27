export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Action = 'allow' | 'warn' | 'block' | 'redact';

export interface Rule {
  guid: string;
  name: string;
  regex: string;
  severity: Severity;
  action: Action;
}

export interface Detection {
  rule_name: string;
  matched_text: string;
  start: number;
  end: number;
  severity: Severity;
  action: Action;
}

export interface ScanResult {
  detections: Detection[];
  has_critical: boolean;
  has_high: boolean;
  recommended_action: Action;
}

export interface PolicyDecision {
  action: Action;
  detections: Detection[];
  redactedText?: string;
}

export interface Settings {
  enabled: boolean;
  showNotifications: boolean;
  entropyThreshold: number;
  debounceMs: number;
  allowedDomains: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  showNotifications: true,
  entropyThreshold: 4.5,
  debounceMs: 300,
  allowedDomains: [],
};

// Message types
export type MessageType =
  | 'SCAN_TEXT'
  | 'SET_RULES'
  | 'GET_RULES'
  | 'GET_STATUS'
  | 'SCAN_RESULT'
  | 'RULES_UPDATED'
  | 'CHECK_DOMAIN'
  | 'SET_DOMAINS';

export interface ScanTextMessage {
  type: 'SCAN_TEXT';
  text: string;
  tabId?: number;
}

export interface SetRulesMessage {
  type: 'SET_RULES';
  rules: Rule[];
}

export interface GetRulesMessage {
  type: 'GET_RULES';
}

export interface GetStatusMessage {
  type: 'GET_STATUS';
}

export interface ScanResultMessage {
  type: 'SCAN_RESULT';
  decision: PolicyDecision;
}

export interface RulesUpdatedMessage {
  type: 'RULES_UPDATED';
  rules: Rule[];
}

export interface CheckDomainMessage {
  type: 'CHECK_DOMAIN';
  hostname: string;
}

export interface SetDomainsMessage {
  type: 'SET_DOMAINS';
  domains: string[];
}

export type ExtensionMessage =
  | ScanTextMessage
  | SetRulesMessage
  | GetRulesMessage
  | GetStatusMessage
  | ScanResultMessage
  | RulesUpdatedMessage
  | CheckDomainMessage
  | SetDomainsMessage;

export interface ExtensionStatus {
  enabled: boolean;
  rulesCount: number;
  totalDetections: number;
  allowedDomains: string[];
}
