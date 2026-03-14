use regex::Regex;

use crate::types::{CompiledRule, Detection, Rule};

pub fn parse_rules(json: &str) -> Result<Vec<Rule>, String> {
    serde_json::from_str::<Vec<Rule>>(json).map_err(|e| format!("Invalid rules JSON: {}", e))
}

pub fn compile_rules(rules: Vec<Rule>) -> Result<Vec<CompiledRule>, String> {
    rules
        .into_iter()
        .map(|rule| {
            let pattern = Regex::new(&rule.regex)
                .map_err(|e| format!("Invalid regex in rule '{}': {}", rule.name, e))?;

            Ok(CompiledRule {
                guid: rule.guid,
                name: rule.name,
                pattern,
                severity: rule.severity,
                action: rule.action,
            })
        })
        .collect()
}

pub fn scan_custom_rules(text: &str, rules: &[CompiledRule]) -> Vec<Detection> {
    let mut detections = Vec::new();

    for rule in rules {
        for mat in rule.pattern.find_iter(text) {
            detections.push(Detection {
                rule_name: rule.name.clone(),
                matched_text: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
                severity: rule.severity.clone(),
                action: rule.action.clone(),
            });
        }
    }

    detections
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Action, Severity};

    #[test]
    fn test_parse_valid_rules() {
        let json = r#"[
            {
                "guid": "abc-123",
                "name": "test_pattern",
                "regex": "EMP-[0-9]{6}-SEC",
                "severity": "high",
                "action": "block"
            }
        ]"#;
        let rules = parse_rules(json).unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].name, "test_pattern");
        assert_eq!(rules[0].severity, Severity::High);
        assert_eq!(rules[0].action, Action::Block);
    }

    #[test]
    fn test_parse_multiple_rules() {
        let json = r#"[
            {
                "guid": "1",
                "name": "rule_a",
                "regex": "pattern_a",
                "severity": "low",
                "action": "warn"
            },
            {
                "guid": "2",
                "name": "rule_b",
                "regex": "pattern_b",
                "severity": "critical",
                "action": "block"
            }
        ]"#;
        let rules = parse_rules(json).unwrap();
        assert_eq!(rules.len(), 2);
    }

    #[test]
    fn test_parse_empty_array() {
        let rules = parse_rules("[]").unwrap();
        assert!(rules.is_empty());
    }

    #[test]
    fn test_parse_invalid_json() {
        let result = parse_rules("not valid json");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_missing_field() {
        let json = r#"[{"name": "test"}]"#;
        let result = parse_rules(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_invalid_severity() {
        let json = r#"[{
            "guid": "1",
            "name": "test",
            "regex": "abc",
            "severity": "ultra",
            "action": "block"
        }]"#;
        let result = parse_rules(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_compile_valid_rules() {
        let rules = vec![Rule {
            guid: "1".to_string(),
            name: "test".to_string(),
            regex: r"EMP-[0-9]{6}-SEC".to_string(),
            severity: Severity::High,
            action: Action::Block,
        }];
        let compiled = compile_rules(rules).unwrap();
        assert_eq!(compiled.len(), 1);
    }

    #[test]
    fn test_compile_invalid_regex() {
        let rules = vec![Rule {
            guid: "1".to_string(),
            name: "bad_regex".to_string(),
            regex: r"[invalid".to_string(),
            severity: Severity::Low,
            action: Action::Warn,
        }];
        let result = compile_rules(rules);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("bad_regex"));
    }

    #[test]
    fn test_scan_custom_rules_match() {
        let rules = vec![Rule {
            guid: "1".to_string(),
            name: "employee_id".to_string(),
            regex: r"EMP-[0-9]{6}-SEC".to_string(),
            severity: Severity::High,
            action: Action::Block,
        }];
        let compiled = compile_rules(rules).unwrap();
        let detections = scan_custom_rules("ID: EMP-123456-SEC found", &compiled);
        assert_eq!(detections.len(), 1);
        assert_eq!(detections[0].rule_name, "employee_id");
        assert_eq!(detections[0].matched_text, "EMP-123456-SEC");
        assert_eq!(detections[0].start, 4);
        assert_eq!(detections[0].end, 18);
    }

    #[test]
    fn test_scan_custom_rules_no_match() {
        let rules = vec![Rule {
            guid: "1".to_string(),
            name: "employee_id".to_string(),
            regex: r"EMP-[0-9]{6}-SEC".to_string(),
            severity: Severity::High,
            action: Action::Block,
        }];
        let compiled = compile_rules(rules).unwrap();
        let detections = scan_custom_rules("no matches here", &compiled);
        assert!(detections.is_empty());
    }

    #[test]
    fn test_scan_custom_rules_multiple_matches() {
        let rules = vec![Rule {
            guid: "1".to_string(),
            name: "internal_code".to_string(),
            regex: r"SEC-[0-9]{4}".to_string(),
            severity: Severity::Medium,
            action: Action::Warn,
        }];
        let compiled = compile_rules(rules).unwrap();
        let detections = scan_custom_rules("codes: SEC-1234 and SEC-5678", &compiled);
        assert_eq!(detections.len(), 2);
    }

    #[test]
    fn test_scan_empty_rules() {
        let detections = scan_custom_rules("any text", &[]);
        assert!(detections.is_empty());
    }
}
