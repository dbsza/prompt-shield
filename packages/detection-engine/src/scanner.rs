use crate::custom_rules::{compile_rules, parse_rules, scan_custom_rules};
use crate::entropy::scan_entropy;
use crate::standard_rules::{get_standard_rules, scan_standard_rules};
use crate::types::{CompiledRule, ScanResult};

pub struct Scanner {
    standard_rules: Vec<CompiledRule>,
    custom_rules: Vec<CompiledRule>,
    entropy_threshold: Option<f64>,
    entropy_window_size: Option<usize>,
}

impl Scanner {
    pub fn new() -> Self {
        Scanner {
            standard_rules: get_standard_rules(),
            custom_rules: Vec::new(),
            entropy_threshold: None,
            entropy_window_size: None,
        }
    }

    pub fn set_rules(&mut self, json: &str) -> Result<(), String> {
        let rules = parse_rules(json)?;
        self.custom_rules = compile_rules(rules)?;
        Ok(())
    }

    pub fn scan_text(&self, input: &str) -> ScanResult {
        if input.is_empty() {
            return ScanResult::empty();
        }

        let mut all_detections = Vec::new();

        // 1. Standard rules
        let standard_detections = scan_standard_rules(input, &self.standard_rules);
        all_detections.extend(standard_detections);

        // 2. Entropy scan
        let entropy_detections =
            scan_entropy(input, self.entropy_threshold, self.entropy_window_size);
        all_detections.extend(entropy_detections);

        // 3. Custom rules
        let custom_detections = scan_custom_rules(input, &self.custom_rules);
        all_detections.extend(custom_detections);

        ScanResult::new(all_detections)
    }
}

impl Default for Scanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Action;

    #[test]
    fn test_scanner_new() {
        let scanner = Scanner::new();
        assert!(!scanner.standard_rules.is_empty());
        assert!(scanner.custom_rules.is_empty());
    }

    #[test]
    fn test_scanner_empty_input() {
        let scanner = Scanner::new();
        let result = scanner.scan_text("");
        assert!(result.detections.is_empty());
        assert_eq!(result.recommended_action, Action::Allow);
    }

    #[test]
    fn test_scanner_clean_text() {
        let scanner = Scanner::new();
        let result = scanner.scan_text("Hello, how are you today?");
        assert!(result.detections.is_empty());
        assert_eq!(result.recommended_action, Action::Allow);
    }

    #[test]
    fn test_scanner_detects_email() {
        let scanner = Scanner::new();
        let result = scanner.scan_text("Send to user@example.com");
        assert!(!result.detections.is_empty());
        assert!(result
            .detections
            .iter()
            .any(|d| d.rule_name == "email_address"));
    }

    #[test]
    fn test_scanner_detects_aws_key() {
        let scanner = Scanner::new();
        let result = scanner.scan_text("AWS key: AKIAIOSFODNN7EXAMPLE");
        assert!(result.has_critical);
        assert_eq!(result.recommended_action, Action::Block);
    }

    #[test]
    fn test_scanner_set_custom_rules() {
        let mut scanner = Scanner::new();
        let json = r#"[{
            "guid": "1",
            "name": "custom_pattern",
            "regex": "INTERNAL-[0-9]+",
            "severity": "high",
            "action": "block"
        }]"#;
        scanner.set_rules(json).unwrap();
        assert_eq!(scanner.custom_rules.len(), 1);
    }

    #[test]
    fn test_scanner_custom_rules_detection() {
        let mut scanner = Scanner::new();
        let json = r#"[{
            "guid": "1",
            "name": "project_code",
            "regex": "PROJ-[A-Z]{3}-[0-9]{4}",
            "severity": "medium",
            "action": "warn"
        }]"#;
        scanner.set_rules(json).unwrap();

        let result = scanner.scan_text("Reference: PROJ-ABC-1234 in docs");
        assert!(result
            .detections
            .iter()
            .any(|d| d.rule_name == "project_code"));
    }

    #[test]
    fn test_scanner_set_rules_invalid_json() {
        let mut scanner = Scanner::new();
        let result = scanner.set_rules("invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_scanner_set_rules_invalid_regex() {
        let mut scanner = Scanner::new();
        let json = r#"[{
            "guid": "1",
            "name": "bad",
            "regex": "[invalid",
            "severity": "low",
            "action": "warn"
        }]"#;
        let result = scanner.set_rules(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_scanner_mixed_data() {
        let scanner = Scanner::new();
        let text = "Hello user@test.com, your SSN 123-45-6789 and key AKIAIOSFODNN7EXAMPLE";
        let result = scanner.scan_text(text);
        assert!(result.detections.len() >= 3);
        assert!(result.has_critical);
        assert_eq!(result.recommended_action, Action::Block);
    }

    #[test]
    fn test_scanner_pipeline_order() {
        let mut scanner = Scanner::new();
        let json = r#"[{
            "guid": "1",
            "name": "custom_marker",
            "regex": "MARKER_[0-9]+",
            "severity": "low",
            "action": "warn"
        }]"#;
        scanner.set_rules(json).unwrap();

        let text = "email: user@test.com and MARKER_123";
        let result = scanner.scan_text(text);

        // Should have detections from both standard and custom rules
        assert!(result
            .detections
            .iter()
            .any(|d| d.rule_name == "email_address"));
        assert!(result
            .detections
            .iter()
            .any(|d| d.rule_name == "custom_marker"));
    }

    #[test]
    fn test_scanner_severity_flags() {
        let scanner = Scanner::new();

        // Critical severity (AWS key)
        let result = scanner.scan_text("AKIAIOSFODNN7EXAMPLE");
        assert!(result.has_critical);

        // No critical or high
        let result = scanner.scan_text("nothing sensitive here");
        assert!(!result.has_critical);
        assert!(!result.has_high);
    }

    #[test]
    fn test_scanner_performance() {
        let scanner = Scanner::new();
        let text = "Normal text with user@example.com and some content. ".repeat(100);

        let start = std::time::Instant::now();
        let _result = scanner.scan_text(&text);
        let duration = start.elapsed();

        assert!(
            duration.as_millis() < 15,
            "Scan took {}ms, should be <15ms",
            duration.as_millis()
        );
    }

    #[test]
    fn test_scan_result_serialization() {
        let scanner = Scanner::new();
        let result = scanner.scan_text("user@example.com");
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("detections"));
        assert!(json.contains("recommended_action"));

        // Verify it can be deserialized
        let deserialized: ScanResult = serde_json::from_str(&json).unwrap();
        assert_eq!(
            deserialized.detections.len(),
            result.detections.len()
        );
    }
}
