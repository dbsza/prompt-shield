use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Action {
    Allow,
    Warn,
    Block,
    Redact,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub guid: String,
    pub name: String,
    pub regex: String,
    pub severity: Severity,
    pub action: Action,
}

#[derive(Debug, Clone)]
pub struct CompiledRule {
    pub guid: String,
    pub name: String,
    pub pattern: Regex,
    pub severity: Severity,
    pub action: Action,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Detection {
    pub rule_name: String,
    pub matched_text: String,
    pub start: usize,
    pub end: usize,
    pub severity: Severity,
    pub action: Action,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub detections: Vec<Detection>,
    pub has_critical: bool,
    pub has_high: bool,
    pub recommended_action: Action,
}

impl ScanResult {
    pub fn new(detections: Vec<Detection>) -> Self {
        let has_critical = detections.iter().any(|d| d.severity == Severity::Critical);
        let has_high = detections.iter().any(|d| d.severity == Severity::High);

        let recommended_action =
            detections
                .iter()
                .map(|d| &d.action)
                .fold(Action::Allow, |acc, action| match (&acc, action) {
                    (Action::Block, _) | (_, Action::Block) => Action::Block,
                    (Action::Redact, _) | (_, Action::Redact) => Action::Redact,
                    (Action::Warn, _) | (_, Action::Warn) => Action::Warn,
                    _ => Action::Allow,
                });

        ScanResult {
            detections,
            has_critical,
            has_high,
            recommended_action,
        }
    }

    pub fn empty() -> Self {
        ScanResult {
            detections: vec![],
            has_critical: false,
            has_high: false,
            recommended_action: Action::Allow,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_result_empty() {
        let result = ScanResult::empty();
        assert!(result.detections.is_empty());
        assert!(!result.has_critical);
        assert!(!result.has_high);
        assert_eq!(result.recommended_action, Action::Allow);
    }

    #[test]
    fn test_scan_result_with_block_detection() {
        let detections = vec![Detection {
            rule_name: "test".to_string(),
            matched_text: "secret".to_string(),
            start: 0,
            end: 6,
            severity: Severity::Critical,
            action: Action::Block,
        }];
        let result = ScanResult::new(detections);
        assert!(result.has_critical);
        assert_eq!(result.recommended_action, Action::Block);
    }

    #[test]
    fn test_scan_result_action_priority() {
        let detections = vec![
            Detection {
                rule_name: "warn_rule".to_string(),
                matched_text: "a".to_string(),
                start: 0,
                end: 1,
                severity: Severity::Low,
                action: Action::Warn,
            },
            Detection {
                rule_name: "redact_rule".to_string(),
                matched_text: "b".to_string(),
                start: 2,
                end: 3,
                severity: Severity::Medium,
                action: Action::Redact,
            },
        ];
        let result = ScanResult::new(detections);
        assert_eq!(result.recommended_action, Action::Redact);
    }

    #[test]
    fn test_severity_serialization() {
        let severity = Severity::Critical;
        let json = serde_json::to_string(&severity).unwrap();
        assert_eq!(json, "\"critical\"");

        let deserialized: Severity = serde_json::from_str("\"high\"").unwrap();
        assert_eq!(deserialized, Severity::High);
    }

    #[test]
    fn test_action_serialization() {
        let action = Action::Block;
        let json = serde_json::to_string(&action).unwrap();
        assert_eq!(json, "\"block\"");

        let deserialized: Action = serde_json::from_str("\"redact\"").unwrap();
        assert_eq!(deserialized, Action::Redact);
    }

    #[test]
    fn test_rule_deserialization() {
        let json = r#"{
            "guid": "abc-123",
            "name": "test_rule",
            "regex": "secret_[0-9]+",
            "severity": "high",
            "action": "block"
        }"#;
        let rule: Rule = serde_json::from_str(json).unwrap();
        assert_eq!(rule.guid, "abc-123");
        assert_eq!(rule.name, "test_rule");
        assert_eq!(rule.severity, Severity::High);
        assert_eq!(rule.action, Action::Block);
    }

    #[test]
    fn test_detection_serialization() {
        let detection = Detection {
            rule_name: "email".to_string(),
            matched_text: "test@example.com".to_string(),
            start: 10,
            end: 26,
            severity: Severity::Medium,
            action: Action::Warn,
        };
        let json = serde_json::to_string(&detection).unwrap();
        assert!(json.contains("\"rule_name\":\"email\""));
        assert!(json.contains("\"matched_text\":\"test@example.com\""));
    }
}
