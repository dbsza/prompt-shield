# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-25

### Added

- Rust-based WebAssembly detection engine with three-stage scan pipeline
- Built-in standard rules for PII detection (email, phone, credit card, SSN, CPF)
- Built-in standard rules for secrets detection (AWS keys, JWT, private keys, GitHub tokens, Slack tokens, generic API keys)
- Shannon entropy analysis with configurable threshold for detecting unknown secret patterns
- Custom rule support via JSON with dynamic loading and regex compilation
- Chrome extension (Manifest V3) with content script input interception
- Policy engine with four actions: allow, warn, redact, block
- Real-time input monitoring for typing, paste, and form submission events
- MutationObserver for detecting dynamically added input fields
- Shadow DOM warning banner UI for non-intrusive user notifications
- Extension popup with status indicator, detection counter, rule list, rule editor, and import/export
- Background service worker for WASM scanner initialization and message routing
- Chrome storage integration for persistent rules and settings
- 75 Rust unit tests and 68 TypeScript unit tests
- Playwright end-to-end test suite (detection, popup, policy, performance)
