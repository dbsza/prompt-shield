use crate::types::{Action, Detection, Severity};
use std::collections::HashMap;

const DEFAULT_THRESHOLD: f64 = 4.5;
const DEFAULT_WINDOW_SIZE: usize = 20;

fn shannon_entropy(data: &str) -> f64 {
    if data.is_empty() {
        return 0.0;
    }

    let mut freq: HashMap<char, usize> = HashMap::new();
    let len = data.len() as f64;

    for ch in data.chars() {
        *freq.entry(ch).or_insert(0) += 1;
    }

    freq.values().fold(0.0, |entropy, &count| {
        let p = count as f64 / len;
        entropy - p * p.log2()
    })
}

pub fn scan_entropy(
    text: &str,
    threshold: Option<f64>,
    window_size: Option<usize>,
) -> Vec<Detection> {
    let threshold = threshold.unwrap_or(DEFAULT_THRESHOLD);
    let window = window_size.unwrap_or(DEFAULT_WINDOW_SIZE);
    let mut detections = Vec::new();

    if text.len() < window {
        let entropy = shannon_entropy(text);
        if entropy > threshold {
            detections.push(Detection {
                rule_name: "high_entropy".to_string(),
                matched_text: text.to_string(),
                start: 0,
                end: text.len(),
                severity: Severity::Medium,
                action: Action::Warn,
            });
        }
        return detections;
    }

    // Split text into words/tokens and check each one
    let tokens: Vec<(usize, &str)> = extract_tokens(text);

    for (start, token) in tokens {
        if token.len() >= window {
            let entropy = shannon_entropy(token);
            if entropy > threshold {
                detections.push(Detection {
                    rule_name: "high_entropy".to_string(),
                    matched_text: token.to_string(),
                    start,
                    end: start + token.len(),
                    severity: Severity::Medium,
                    action: Action::Warn,
                });
            }
        }
    }

    detections
}

fn extract_tokens(text: &str) -> Vec<(usize, &str)> {
    let mut tokens = Vec::new();
    let mut start = None;

    for (i, ch) in text.char_indices() {
        if ch.is_whitespace() || ch == ',' || ch == ';' {
            if let Some(s) = start {
                tokens.push((s, &text[s..i]));
                start = None;
            }
        } else if start.is_none() {
            start = Some(i);
        }
    }

    if let Some(s) = start {
        tokens.push((s, &text[s..]));
    }

    tokens
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shannon_entropy_empty() {
        assert_eq!(shannon_entropy(""), 0.0);
    }

    #[test]
    fn test_shannon_entropy_single_char() {
        assert_eq!(shannon_entropy("aaaa"), 0.0);
    }

    #[test]
    fn test_shannon_entropy_uniform() {
        // "ab" repeated — 2 unique chars with equal distribution = 1.0 bit
        let entropy = shannon_entropy("abababab");
        assert!((entropy - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_high_entropy_hex_string() {
        // Random-looking hex string should have high entropy
        let hex = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
        let entropy = shannon_entropy(hex);
        assert!(entropy > 3.5, "Hex string entropy: {}", entropy);
    }

    #[test]
    fn test_low_entropy_normal_text() {
        let text = "hello world this is normal";
        let entropy = shannon_entropy(text);
        assert!(entropy < 4.0, "Normal text entropy: {}", entropy);
    }

    #[test]
    fn test_scan_entropy_detects_high_entropy() {
        // Base64-like random string
        let text = "here is a secret: aB3kF9mZ2xR7wQ1pL8nY4vT6cH0jD5eG";
        let detections = scan_entropy(text, Some(4.0), Some(15));
        assert!(!detections.is_empty(), "Should detect high entropy token");
        assert!(detections.iter().all(|d| d.rule_name == "high_entropy"));
    }

    #[test]
    fn test_scan_entropy_ignores_normal_text() {
        let text = "This is a normal sentence about programming in Rust.";
        let detections = scan_entropy(text, None, None);
        assert!(
            detections.is_empty(),
            "Should not detect entropy in normal text, got: {:?}",
            detections
        );
    }

    #[test]
    fn test_scan_entropy_custom_threshold() {
        let text = "token: abcdef123456789012345";
        // Very low threshold should trigger
        let detections_low = scan_entropy(text, Some(2.0), Some(10));
        assert!(!detections_low.is_empty());

        // Very high threshold should not trigger
        let detections_high = scan_entropy(text, Some(6.0), Some(10));
        assert!(detections_high.is_empty());
    }

    #[test]
    fn test_scan_entropy_short_text() {
        let text = "abc";
        let detections = scan_entropy(text, Some(0.5), Some(20));
        // Text shorter than window, should still be checked
        assert!(!detections.is_empty());
    }

    #[test]
    fn test_extract_tokens() {
        let tokens = extract_tokens("hello world foo");
        assert_eq!(tokens.len(), 3);
        assert_eq!(tokens[0].1, "hello");
        assert_eq!(tokens[1].1, "world");
        assert_eq!(tokens[2].1, "foo");
    }

    #[test]
    fn test_extract_tokens_with_delimiters() {
        let tokens = extract_tokens("key=value, other;stuff");
        assert_eq!(tokens.len(), 3);
    }
}
