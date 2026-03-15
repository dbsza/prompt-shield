# Prompt Shield — Development Report

This report is auto-incremented with every development session.

---

## Session 1 — Initial Implementation (2026-03-15)

### Summary

Full project scaffolding and implementation of all four phases: monorepo setup, Rust/WASM detection engine, Chrome extension in TypeScript, WASM-extension integration, and Playwright E2E test suite.

### Commits

| Hash | Description |
|------|-------------|
| `31f4fb7` | Initial commit with project idea document |
| `11e5f9a` | Setup monorepo root configs |
| `a0a5e1f` | Add Rust/WASM detection engine |
| `7ce91b0` | Add Chrome extension with full source and unit tests |
| `494ff5d` | Add Playwright E2E test suite |
| `d4ca434` | Integrate WASM build with extension build pipeline |

### Phase 0: Monorepo Setup

- Yarn 4.1.0 workspaces with `nodeLinker: node-modules`
- Shared `tsconfig.base.json` (strict, ES2022, bundler module resolution)
- `.prettierrc`, `.gitignore` configured

### Phase 1: Detection Engine (Rust/WASM)

**Directory:** `packages/detection-engine/`

#### Modules

| File | Purpose |
|------|---------|
| `src/types.rs` | Core types: `Rule`, `CompiledRule`, `Detection`, `ScanResult`, `Severity`, `Action` |
| `src/standard_rules.rs` | 12 built-in detection rules (PII + secrets) |
| `src/entropy.rs` | Shannon entropy on sliding windows (default threshold 4.5 bits/char) |
| `src/custom_rules.rs` | JSON parsing, regex compilation, custom rule scanning |
| `src/scanner.rs` | Pipeline orchestrator: standard -> entropy -> custom |
| `src/lib.rs` | `WasmScanner` exposed via `#[wasm_bindgen]` |

#### Standard Rules

| Category | Rules |
|----------|-------|
| PII | email, phone, credit card (Visa/MC/Amex/Discover), SSN, CPF |
| Secrets | AWS access key, AWS secret key, JWT, private key headers, generic API keys, GitHub tokens, Slack tokens |

#### Test Results

- **75 unit tests passing** (`cargo test`)
- Performance test confirms scan < 15ms
- WASM build successful (`wasm-pack build --target web`)

### Phase 2: Chrome Extension (TypeScript)

**Directory:** `packages/extension/`

#### Architecture

```
content script (interceptor + observer + warning UI)
    |
    | chrome.runtime.sendMessage
    v
background service worker (WASM scanner + policy engine)
    |
    | chrome.storage.local
    v
popup UI (rule management + status)
```

#### Components

| Component | Files | Description |
|-----------|-------|-------------|
| Types | `src/types/index.ts` | Interfaces mirroring Rust types + message types |
| WASM Loader | `src/wasm/loader.ts` | Singleton scanner initialization |
| Policy Engine | `src/engine/policy.ts` | `evaluatePolicy()`, `redactText()`, action priority: block > redact > warn > allow |
| Storage | `src/storage/rules-storage.ts` | CRUD for rules and settings via `chrome.storage.local` |
| Interceptor | `src/content/interceptor.ts` | Input (debounce 300ms), paste (immediate), submit event handling |
| Observer | `src/content/observer.ts` | `MutationObserver` for dynamically added input fields |
| Warning Banner | `src/content/ui/warning-banner.ts` | Shadow DOM banner with severity display, block/redact/allow buttons |
| Banner Styles | `src/content/ui/styles.ts` | CSS-in-JS, dark theme, slide-in animation |
| Content Entry | `src/content/index.ts` | Wires interceptor + observer + banner |
| Background | `src/background/index.ts` | Service worker: WASM init, message routing, rule persistence |
| Popup | `src/popup/` | `RuleList`, `RuleEditor`, `ImportExport`, `StatusIndicator` (vanilla TS) |

#### Manifest V3 Configuration

- Permissions: `storage`, `activeTab`
- CSP: `wasm-unsafe-eval` for WASM execution
- Content scripts: `<all_urls>`, `document_idle`
- Web accessible resources: `*.wasm`

#### Test Results

- **68 unit tests passing** (`vitest run` with jsdom environment)
- Tests cover: policy engine, WASM loader, storage, interceptor, observer, warning banner, all popup components

### Phase 3: Integration

- Vite plugin (`copy-wasm`) copies `.wasm` and `.js` from `detection-engine/pkg` to `extension/public` at build start
- Root build script: WASM first (`wasm-pack build`), then extension (`vite build`)
- Scripts: `yarn build`, `yarn build:wasm`, `yarn build:ext`

### Phase 4: E2E Tests (Playwright)

**Directory:** `packages/extension/e2e/`

| Spec File | Test Cases |
|-----------|------------|
| `detection.spec.ts` | Email warning, JWT detection, clean text no-warning, input field detection |
| `popup.spec.ts` | Status display, empty rules, add rule, validation, cancel editing |
| `policy.spec.ts` | Block action, warn with send-anyway, redact action |
| `performance.spec.ts` | Large text scan timing, rapid input handling |

Custom fixture launches Chrome with the extension loaded via `--load-extension`.

### Test Summary

| Suite | Count | Status |
|-------|-------|--------|
| Rust unit tests | 75 | All passing |
| TypeScript unit tests | 68 | All passing |
| Playwright E2E specs | 4 files (14 cases) | Ready to run |
| **Total** | **143+ tests** | |

### Technical Decisions

1. **Yarn 4.1.0 + node-modules linker** — PnP caused issues with `@crxjs/vite-plugin`, switched to node-modules
2. **Vitest + jsdom** — Required jsdom for DOM-dependent tests (content scripts, popup components)
3. **Shadow DOM** — Warning banner uses Shadow DOM to avoid CSS conflicts with host pages
4. **`crypto.randomUUID`** — Used for generating rule GUIDs; tests mock it without overriding the entire crypto global
5. **Debounce strategy** — 300ms for typing input, immediate for paste, synchronous for form submit

### Issues Encountered & Resolved

| Issue | Resolution |
|-------|-----------|
| Git repo root was `~` (home directory) | Reinitialized git in project directory |
| PnP incompatible with `@crxjs/vite-plugin` | Added `.yarnrc.yml` with `nodeLinker: node-modules` |
| `JsValue::from_str` panics outside WASM | Test uses inner `Scanner` directly for error cases |
| `document is not defined` in tests | Added `environment: 'jsdom'` to vitest config |
| `ClipboardEvent` not in jsdom | Used `Event` with manually set `clipboardData` property |
| `vi.stubGlobal('crypto')` broke jsdom | Switched to patching `crypto.randomUUID` directly with restore in `afterEach` |
| API key regex test failing | Test input format didn't match regex pattern; fixed to use `key: value` format |

---
