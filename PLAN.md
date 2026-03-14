# Prompt Shield — Implementation Plan

## Context

Browser extension (Chrome, Manifest V3) that prevents accidental leakage of sensitive data to AI tools and web services. Monorepo with Yarn Workspaces (no Turborepo).

Architecture: **detection engine in Rust compiled to WebAssembly** + **Chrome extension in TypeScript**. Local scanning, <15ms latency target.

---

## Phase 0: Monorepo Setup

### 0.1 — Root configs
- `package.json` — workspaces: `["packages/*"]`, build/test scripts via `yarn workspaces foreach`
- `.gitignore` — node_modules, dist, target, pkg, .DS_Store
- `tsconfig.base.json` — shared TS config (strict, ES2022)
- `.prettierrc`

### 0.2 — Directory structure
```
packages/
  detection-engine/   # Rust/WASM
  extension/          # Chrome Extension (TS) + Playwright E2E tests
```

---

## Phase 1: Detection Engine (Rust/WASM)

**Directory:** `packages/detection-engine/`

### 1.1 — Initialize Rust crate
- `Cargo.toml` — crate-type `["cdylib", "rlib"]`, deps: wasm-bindgen, serde, serde_json, regex, js-sys
- `package.json` — build scripts (`wasm-pack build --target web --out-dir pkg`)

### 1.2 — Data types (`src/types.rs`)
- Structs: `Rule`, `CompiledRule`, `Detection`, `ScanResult`
- Enums: `Severity` (Critical/High/Medium/Low), `Action` (Allow/Warn/Block/Redact)

### 1.3 — Standard rules (`src/standard_rules.rs`)
- **PII**: email, phone, credit card, CPF/SSN
- **Secrets**: AWS keys, JWT, private key headers, generic API keys
- Function `get_standard_rules() -> Vec<CompiledRule>` — compiles regex once
- **Tests**: positive and negative for each pattern

### 1.4 — Entropy detection (`src/entropy.rs`)
- Shannon entropy on sliding windows
- Default threshold: ~4.5 bits/char
- `scan_entropy(text, threshold, window_size) -> Vec<Detection>`
- **Tests**: random strings (hex, base64) vs normal text

### 1.5 — Custom rules (`src/custom_rules.rs`)
- `parse_rules(json) -> Result<Vec<Rule>>` — JSON validation
- `compile_rules(rules) -> Result<Vec<CompiledRule>>` — compile regex, error for invalid regex
- `scan_custom_rules(text, rules) -> Vec<Detection>`
- **Tests**: valid/invalid parse, regex match/no-match

### 1.6 — Scanner pipeline (`src/scanner.rs`)
- Struct `Scanner` with standard_rules, custom_rules, entropy config
- `new()` — loads standard rules
- `set_rules(json)` — parse + compile custom rules
- `scan_text(input) -> ScanResult` — pipeline: standard -> entropy -> custom
- **Tests**: integration with mixed data, performance test (<15ms)

### 1.7 — WASM bindings (`src/lib.rs`)
- `WasmScanner` exposed via `#[wasm_bindgen]`
- Methods: `new()`, `set_rules(json)`, `scan_text(input) -> String` (JSON)
- **Tests**: `wasm_bindgen_test`

---

## Phase 2: Browser Extension (TypeScript)

**Directory:** `packages/extension/`

### 2.1 — Package setup
- `package.json` — build deps (vite, @crxjs/vite-plugin), devDeps (vitest, @types/chrome)
- `tsconfig.json` — extends base, lib includes "webworker"
- `vite.config.ts` — Vite config with @crxjs/vite-plugin for Chrome Extension, WASM support

### 2.2 — Manifest V3 (`public/manifest.json`)
- Permissions: storage, activeTab
- Background service worker (type: module)
- Content scripts: all_urls, document_idle
- CSP: `wasm-unsafe-eval` for WASM execution
- Web accessible resources: `.wasm`

### 2.3 — Shared types (`src/types/index.ts`)
- Interfaces mirroring Rust types: Rule, Detection, ScanResult, PolicyDecision, Settings
- Message types content <-> background <-> popup

### 2.4 — WASM Loader (`src/wasm/loader.ts`)
- Loads .wasm via `chrome.runtime.getURL()`
- Singleton `getScanner()` with cache
- **Tests**: mock WASM init

### 2.5 — Policy Engine (`src/engine/policy.ts`)
- `evaluatePolicy(scanResult) -> PolicyDecision`
- Priority: block > redact > warn > allow
- `redactText(text, detections) -> string` — replaces matches with `[REDACTED]`
- **Tests**: scenarios for each action and combinations

### 2.6 — Storage Layer (`src/storage/`)
- `rules-storage.ts` — loadRules, saveRules, loadSettings, saveSettings
- Abstraction over `chrome.storage.local`
- **Tests**: mock chrome.storage

### 2.7 — Content Script — Interceptor (`src/content/`)
- `interceptor.ts` — event listeners for input, paste, submit on textarea/input/contenteditable
- `observer.ts` — MutationObserver for dynamic fields (SPAs)
- `index.ts` — entry point connecting interceptor + observer
- Debounce 300ms for input; paste immediate; submit synchronous (preventDefault)
- Communication with background via `chrome.runtime.sendMessage`
- **Tests**: mock DOM events and chrome.runtime

### 2.8 — Content Script — Warning UI (`src/content/ui/`)
- `warning-banner.ts` — banner via Shadow DOM (avoids CSS conflicts)
- Shows detections, severity, buttons: "Block", "Redact and Send", "Send Anyway"
- `styles.ts` — CSS-in-JS for shadow DOM
- **Tests**: banner creation/removal, button actions

### 2.9 — Background Service Worker (`src/background/index.ts`)
- Initializes WASM scanner on startup
- Listener `chrome.runtime.onMessage` for:
  - `SCAN_TEXT` -> scan via WASM -> policy -> respond to content script
  - `SET_RULES` / `GET_RULES` -> manage rules in storage + scanner
  - `GET_STATUS` -> status for popup
- **Tests**: mock WASM scanner, mock chrome APIs

### 2.10 — Popup UI (`src/popup/`)
- `popup.html` — HTML shell
- Vanilla TS components (no framework):
  - `RuleList.ts` — list active rules
  - `RuleEditor.ts` — add/edit/delete form with validation
  - `ImportExport.ts` — import JSON (file input) / export (download)
  - `StatusIndicator.ts` — shield status, detection count
- `index.ts` — entry point
- `styles.css` — popup styles
- **Tests**: for each component

---

## Phase 3: Integration

### 3.1 — WASM in Background Worker
- Build WASM (`wasm-pack build`)
- Copy `.wasm` + `.js` + `.d.ts` to extension dist
- Background loads WASM, creates scanner, loads saved rules

### 3.2 — End-to-end flow
1. Content script captures input
2. Sends message to background
3. Background scans via WASM
4. Policy engine evaluates result
5. Response to content script
6. Content script shows warning UI or allows/blocks

### 3.3 — Rule management flow
- Popup loads rules from background
- Edit -> background persists in storage + updates scanner
- Import/export via popup

---

## Phase 4: E2E Tests (Playwright)

**Directory:** `packages/extension/e2e/`

### 4.1 — Setup
- `packages/extension/playwright.config.ts`
- `packages/extension/e2e/fixtures/extension.ts` — custom fixture that launches Chrome with loaded extension
- `packages/extension/e2e/fixtures/test-page.html` — test page with textarea, input, contenteditable, form
- `@playwright/test` as devDependency of extension package

### 4.2 — Test cases
- `e2e/tests/detection.spec.ts` — type email -> warning; paste JWT -> block; normal text -> no warning
- `e2e/tests/popup.spec.ts` — open popup, add rule, import/export
- `e2e/tests/policy.spec.ts` — test block, warn, redact in real scenarios
- `e2e/tests/performance.spec.ts` — paste large text, measure scan time

---

## Technical Decisions

1. **Vite + @crxjs/vite-plugin** — Chrome extension build with HMR in dev
2. **Vitest** — TS test runner, Jest-compatible API
3. **Scan in background worker** — content scripts are lightweight, WASM runs only in service worker
4. **Shadow DOM for warnings** — avoids CSS conflicts with host sites
5. **No framework in popup** — vanilla TS for small bundle
6. **Regex compiled once** — `set_rules()` compiles; `scan_text()` only executes
7. **CSP `wasm-unsafe-eval`** — required for WASM in Manifest V3

## Verification
1. `cd packages/detection-engine && cargo test`
2. `cd packages/detection-engine && wasm-pack build --target web`
3. `cd packages/extension && yarn test`
4. `cd packages/extension && yarn build`
5. Chrome -> `chrome://extensions` -> Load unpacked -> `packages/extension/dist/`
6. `cd packages/extension && yarn test:e2e`
