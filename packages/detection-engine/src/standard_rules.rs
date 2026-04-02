use regex::Regex;

use crate::types::{Action, CompiledRule, Detection, Severity};

pub fn get_standard_rules() -> Vec<CompiledRule> {
    let rules_data: Vec<(&str, &str, &str, Severity, Action)> = vec![
        // PII - Email
        (
            "pii-email",
            "email_address",
            r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            Severity::Medium,
            Action::Warn,
        ),
        // PII - Phone (international formats)
        (
            "pii-phone",
            "phone_number",
            r"(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}",
            Severity::Medium,
            Action::Warn,
        ),
        // PII - Credit Card (Visa, MasterCard, Amex, Discover)
        (
            "pii-cc",
            "credit_card",
            r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b",
            Severity::Critical,
            Action::Block,
        ),
        // PII - SSN
        (
            "pii-ssn",
            "ssn",
            r"\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b",
            Severity::Critical,
            Action::Block,
        ),
        // PII - CPF (Brazilian)
        (
            "pii-cpf",
            "cpf",
            r"\b[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}\b",
            Severity::Critical,
            Action::Block,
        ),
        // Secrets - AWS Access Key
        (
            "secret-aws-key",
            "aws_access_key",
            r"\bAKIA[0-9A-Z]{16}\b",
            Severity::Critical,
            Action::Block,
        ),
        // Secrets - AWS Secret Key
        (
            "secret-aws-secret",
            "aws_secret_key",
            r"(?i)aws_secret_access_key\s*[=:]\s*[A-Za-z0-9/+=]{40}",
            Severity::Critical,
            Action::Block,
        ),
        // Secrets - JWT
        (
            "secret-jwt",
            "jwt_token",
            r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b",
            Severity::High,
            Action::Block,
        ),
        // Secrets - Private Key Header
        (
            "secret-private-key",
            "private_key",
            r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
            Severity::Critical,
            Action::Block,
        ),
        // Secrets - Generic API Key patterns
        (
            "secret-api-key",
            "api_key",
            r#"(?i)(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:"]\s*[A-Za-z0-9_\-]{20,}"#,
            Severity::High,
            Action::Warn,
        ),
        // Secrets - GitHub Token
        (
            "secret-github-token",
            "github_token",
            r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b",
            Severity::Critical,
            Action::Block,
        ),
        // Secrets - Slack Token
        (
            "secret-slack-token",
            "slack_token",
            r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b",
            Severity::High,
            Action::Block,
        ),
    ];

    rules_data
        .into_iter()
        .map(|(guid, name, pattern, severity, action)| CompiledRule {
            guid: guid.to_string(),
            name: name.to_string(),
            pattern: Regex::new(pattern).expect("Standard rule regex must be valid"),
            severity,
            action,
        })
        .collect()
}

pub fn scan_standard_rules(text: &str, rules: &[CompiledRule]) -> Vec<Detection> {
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

    fn rules() -> Vec<CompiledRule> {
        get_standard_rules()
    }

    // Email tests
    #[test]
    fn test_detect_email() {
        let detections = scan_standard_rules("contact me at user@example.com please", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "email_address"));
    }

    #[test]
    fn test_no_false_email() {
        let detections = scan_standard_rules("this is just normal text", &rules());
        assert!(!detections.iter().any(|d| d.rule_name == "email_address"));
    }

    // Phone tests
    #[test]
    fn test_detect_phone_us() {
        let detections = scan_standard_rules("call me at (555) 123-4567", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "phone_number"));
    }

    #[test]
    fn test_detect_phone_with_country_code() {
        let detections = scan_standard_rules("call +1-555-123-4567", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "phone_number"));
    }

    #[test]
    fn test_no_false_phone() {
        let detections = scan_standard_rules("version 1.2.3 is released", &rules());
        assert!(!detections.iter().any(|d| d.rule_name == "phone_number"));
    }

    // Credit card tests
    #[test]
    fn test_detect_visa() {
        let detections = scan_standard_rules("card: 4111111111111111", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "credit_card"));
    }

    #[test]
    fn test_detect_mastercard() {
        let detections = scan_standard_rules("card: 5500000000000004", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "credit_card"));
    }

    #[test]
    fn test_no_false_credit_card() {
        let detections = scan_standard_rules("order number 123456", &rules());
        assert!(!detections.iter().any(|d| d.rule_name == "credit_card"));
    }

    // SSN tests
    #[test]
    fn test_detect_ssn() {
        let detections = scan_standard_rules("SSN: 123-45-6789", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "ssn"));
    }

    #[test]
    fn test_no_false_ssn() {
        let detections = scan_standard_rules("phone 123-456-7890", &rules());
        assert!(!detections.iter().any(|d| d.rule_name == "ssn"));
    }

    // CPF tests
    #[test]
    fn test_detect_cpf() {
        let detections = scan_standard_rules("CPF: 123.456.789-01", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "cpf"));
    }

    #[test]
    fn test_no_false_cpf() {
        let detections = scan_standard_rules("IP: 192.168.1.1", &rules());
        assert!(!detections.iter().any(|d| d.rule_name == "cpf"));
    }

    // AWS key tests
    #[test]
    fn test_detect_aws_access_key() {
        let detections = scan_standard_rules("key: AKIAIOSFODNN7EXAMPLE", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "aws_access_key"));
    }

    #[test]
    fn test_detect_aws_secret_key() {
        let detections = scan_standard_rules(
            "aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            &rules(),
        );
        assert!(detections.iter().any(|d| d.rule_name == "aws_secret_key"));
    }

    #[test]
    fn test_no_false_aws_key() {
        let detections = scan_standard_rules("AKIA is a prefix but not enough", &rules());
        assert!(!detections.iter().any(|d| d.rule_name == "aws_access_key"));
    }

    // JWT tests
    #[test]
    fn test_detect_jwt() {
        let detections = scan_standard_rules(
            "token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
            &rules(),
        );
        assert!(detections.iter().any(|d| d.rule_name == "jwt_token"));
    }

    #[test]
    fn test_no_false_jwt() {
        let detections = scan_standard_rules("eyJ is just a prefix", &rules());
        assert!(!detections.iter().any(|d| d.rule_name == "jwt_token"));
    }

    // Private key tests
    #[test]
    fn test_detect_private_key() {
        let detections =
            scan_standard_rules("-----BEGIN RSA PRIVATE KEY-----\nMIIEow...", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "private_key"));
    }

    #[test]
    fn test_detect_ec_private_key() {
        let detections = scan_standard_rules("-----BEGIN EC PRIVATE KEY-----", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "private_key"));
    }

    // API key tests
    #[test]
    fn test_detect_api_key() {
        let detections = scan_standard_rules(r#"api_key: sk_live_abcdef1234567890abcd"#, &rules());
        assert!(detections.iter().any(|d| d.rule_name == "api_key"));
    }

    // GitHub token tests
    #[test]
    fn test_detect_github_token() {
        let detections =
            scan_standard_rules("token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "github_token"));
    }

    // Slack token tests
    #[test]
    fn test_detect_slack_token() {
        let detections = scan_standard_rules("token: xoxb-1234567890-abcdefghij", &rules());
        assert!(detections.iter().any(|d| d.rule_name == "slack_token"));
    }

    // Integration test
    #[test]
    fn test_multiple_detections() {
        let text = "Email: user@test.com, SSN: 123-45-6789, key: AKIAIOSFODNN7EXAMPLE";
        let detections = scan_standard_rules(text, &rules());
        assert!(detections.len() >= 3);
    }

    #[test]
    fn test_no_detections_in_clean_text() {
        let text = "This is a perfectly normal message about programming in Rust.";
        let detections = scan_standard_rules(text, &rules());
        assert!(detections.is_empty());
    }

    #[test]
    fn test_standard_rules_compile() {
        let rules = get_standard_rules();
        assert!(!rules.is_empty());
        assert!(rules.len() >= 12);
    }
}
