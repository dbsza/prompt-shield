# Prompt Shield

A browser extension that prevents accidental leakage of sensitive data before it is sent to AI tools or web services. All analysis runs locally using a high-performance detection engine compiled to WebAssembly.

## How It Works

Prompt Shield intercepts user inputs (typing, paste, form submission) in any web page. Before content is transmitted, it is scanned by a Rust-based WebAssembly engine that detects PII, secrets, high-entropy strings, and custom patterns. If sensitive data is found, a policy engine determines the response — allow, warn, redact, or block — and the user is notified in real time.

```
Browser Extension (TypeScript)
        |
        | intercept inputs (typing / paste / submit)
        v
Input Capture Layer
        |
        v
WebAssembly Detection Engine (Rust)
        |
        +-- Standard rules (PII, secrets)
        +-- Entropy analysis
        +-- Custom user rules
        |
        v
Policy Engine
        |
        +-- allow
        +-- warn
        +-- redact
        +-- block
        |
        v
User Feedback UI
```

## Detection Capabilities

### Built-in Standard Rules

| Category | What is detected |
|---|---|
| PII | Email addresses, phone numbers (US/international) |
| PII | Credit cards (Visa, MasterCard, Amex, Discover) |
| PII | SSN (US), CPF (Brazil) |
| Secrets | AWS Access Key, AWS Secret Key |
| Secrets | JWT tokens, private keys (RSA, EC, DSA, OpenSSH) |
| Secrets | Generic API keys, GitHub tokens, Slack tokens |

### Entropy Analysis

Detects high-entropy tokens (Shannon entropy > 4.5 by default) that are likely to be secrets, even if they don't match a known pattern.

### Custom Rules

Users can define their own patterns as JSON and load them dynamically — no extension reinstall required. Regex patterns are compiled once at load time for fast repeated scanning.

```json
[
  {
    "guid": "9268a809-401a-480c-8840-48657fb3c1da",
    "name": "internal_employee_key",
    "regex": "EMP-[0-9]{6}-SEC",
    "severity": "high",
    "action": "block"
  }
]
```

Supported severity levels: `critical`, `high`, `medium`, `low`
Supported actions: `allow`, `warn`, `redact`, `block`

## Architecture

This is a Yarn monorepo with two packages:

```
packages/
  detection-engine/   # Rust crate compiled to WASM
  extension/          # Chrome extension (TypeScript, Manifest V3)
```

### `packages/detection-engine`

- **Language:** Rust
- **Output:** WebAssembly (`cdylib`) via `wasm-bindgen`
- **Key modules:**
  - `scanner.rs` — orchestrates the three-stage scan pipeline
  - `standard_rules.rs` — built-in compiled regex rules
  - `entropy.rs` — Shannon entropy calculation with sliding window
  - `custom_rules.rs` — parses and compiles user-provided JSON rules
  - `types.rs` — shared types: `Rule`, `Detection`, `ScanResult`, `Action`, `Severity`

### `packages/extension`

- **Platform:** Chrome Extension, Manifest V3
- **Language:** TypeScript, built with Vite
- **Key components:**

  | Component | Role |
  |---|---|
  | `content/interceptor.ts` | Hooks into input/paste/submit events on every page |
  | `content/observer.ts` | Watches for dynamically added input elements (MutationObserver) |
  | `content/ui/warning-banner.ts` | Injects the in-page warning UI |
  | `background/index.ts` | Service worker: initializes WASM scanner, handles messages |
  | `engine/policy.ts` | Translates scan results into a `PolicyDecision` |
  | `storage/rules-storage.ts` | Persists rules and settings to `chrome.storage` |
  | `popup/` | Extension popup: status, rule list, rule editor, import/export |
  | `wasm/loader.ts` | Loads and caches the WASM module |

## Performance Targets

| Stage | Target |
|---|---|
| Regex scan | < 1 ms |
| Entropy scan | 2–3 ms |
| Full pipeline | < 15 ms total |

Scanning runs in the background service worker and never blocks the UI thread.

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) + `wasm-pack`
- [Node.js](https://nodejs.org/) + [Yarn](https://yarnpkg.com/)

```bash
# Install wasm-pack
cargo install wasm-pack

# Install JS dependencies
yarn install
```

### Build

```bash
# Build the WASM detection engine
cd packages/detection-engine
wasm-pack build --target web --out-dir ../extension/src/wasm/generated

# Build the extension
cd packages/extension
yarn build
```

The compiled extension will be in `packages/extension/dist/`.

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `packages/extension/dist/`

### Development

```bash
cd packages/extension
yarn dev
```

## Testing

### Unit tests (Rust)

```bash
cd packages/detection-engine
cargo test
```

### Unit tests (TypeScript)

```bash
cd packages/extension
yarn test
```

### End-to-end tests (Playwright)

```bash
cd packages/extension
yarn test:e2e
```

## Custom Rules

Rules can be imported from the extension popup. Create a JSON file:

```json
[
  {
    "guid": "unique-id-here",
    "name": "my_pattern",
    "regex": "PATTERN_[A-Z]{3}",
    "severity": "high",
    "action": "block"
  }
]
```

- **action: block** — submission is prevented
- **action: redact** — sensitive portion is replaced with `[REDACTED]`
- **action: warn** — user sees a warning but can proceed
- **action: allow** — no action taken (useful for exceptions)

Rules are validated before activation and stored locally in `chrome.storage`. They can be exported and shared across machines.

## Privacy

All scanning happens locally in your browser. No text is ever sent to an external server. The extension requires only `storage` and `activeTab` permissions.

## Future Roadmap

- ~~ML-based sensitive data classification~~
- Detection of prompt injection patterns
- Context-aware detection (code vs. natural language)
- Support for additional Chromium-based browsers

### Enterprise edtion

- Enterprise policy distribution
- Integration with enterprise identity systems
- Centralized rule management and telemetry dashboard
