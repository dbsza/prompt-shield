mod custom_rules;
mod entropy;
mod scanner;
mod standard_rules;
pub mod types;

use scanner::Scanner;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmScanner {
    scanner: Scanner,
}

#[wasm_bindgen]
impl WasmScanner {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        WasmScanner {
            scanner: Scanner::new(),
        }
    }

    #[wasm_bindgen]
    pub fn set_rules(&mut self, json: &str) -> Result<(), JsValue> {
        self.scanner
            .set_rules(json)
            .map_err(|e| JsValue::from_str(&e))
    }

    #[wasm_bindgen]
    pub fn scan_text(&self, input: &str) -> String {
        let result = self.scanner.scan_text(input);
        serde_json::to_string(&result).unwrap_or_else(|_| {
            r#"{"detections":[],"has_critical":false,"has_high":false,"recommended_action":"allow"}"#
                .to_string()
        })
    }
}

impl Default for WasmScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ScanResult;

    #[test]
    fn test_wasm_scanner_new() {
        let scanner = WasmScanner::new();
        let result_json = scanner.scan_text("hello world");
        let result: ScanResult = serde_json::from_str(&result_json).unwrap();
        assert!(result.detections.is_empty());
    }

    #[test]
    fn test_wasm_scanner_scan_email() {
        let scanner = WasmScanner::new();
        let result_json = scanner.scan_text("contact user@example.com");
        let result: ScanResult = serde_json::from_str(&result_json).unwrap();
        assert!(!result.detections.is_empty());
        assert!(result
            .detections
            .iter()
            .any(|d| d.rule_name == "email_address"));
    }

    #[test]
    fn test_wasm_scanner_set_rules() {
        let mut scanner = WasmScanner::new();
        let json = r#"[{
            "guid": "1",
            "name": "custom",
            "regex": "SECRET_[0-9]+",
            "severity": "high",
            "action": "block"
        }]"#;
        scanner.set_rules(json).unwrap();

        let result_json = scanner.scan_text("code: SECRET_42");
        let result: ScanResult = serde_json::from_str(&result_json).unwrap();
        assert!(result.detections.iter().any(|d| d.rule_name == "custom"));
    }

    #[test]
    fn test_wasm_scanner_set_rules_invalid() {
        // Test via inner Scanner since JsValue::from_str panics outside WASM
        let mut scanner = Scanner::new();
        let result = scanner.set_rules("bad json");
        assert!(result.is_err());
    }

    #[test]
    fn test_wasm_scanner_returns_valid_json() {
        let scanner = WasmScanner::new();
        let result_json = scanner.scan_text("SSN: 123-45-6789");
        // Must be valid JSON
        let parsed: serde_json::Value = serde_json::from_str(&result_json).unwrap();
        assert!(parsed.get("detections").is_some());
        assert!(parsed.get("has_critical").is_some());
        assert!(parsed.get("recommended_action").is_some());
    }

    #[test]
    fn test_wasm_scanner_empty_input() {
        let scanner = WasmScanner::new();
        let result_json = scanner.scan_text("");
        let result: ScanResult = serde_json::from_str(&result_json).unwrap();
        assert!(result.detections.is_empty());
    }
}
