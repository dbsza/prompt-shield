# IDEA.md

## Description

Browser extension focused on **preventing accidental leakage of sensitive data before it is sent to AI tools or web services**.

The extension intercepts user inputs (typing, paste, submit) in text fields used in platforms such as AI chat tools, developer tools, and general web forms. Before the content is transmitted, it is analyzed locally by a **high-performance detection engine implemented in WebAssembly**.

The WebAssembly module acts as the **core detection engine**, scanning text for:

* Personally identifiable information (PII)
* Secrets and API keys
* High-entropy strings
* Custom enterprise patterns

If sensitive data is detected, a **policy engine** determines the action:

* Allow
* Redact
* Warn
* Block

A key feature is **custom rule support**. Users or organizations can define their own detection patterns through configuration files JSON. These patterns are dynamically loaded into the detection engine without recompiling the WebAssembly module.

Example rule configuration:

```json
[
  {
    "guid": "9268a809-401a-480c-8840-48657fb3c1da",
    "name": "internal_password_format",
    "regex": "EMP-[0-9]{6}-SEC",
    "severity": "high",
    "action": "block"
  },
  {
    "guid": "85a8141b-3521-43b0-98ba-475f1cdb9be5",
    "name": "internal_password_format",
    "regex": "EMP-[0-9]{6}-SEC",
    "severity": "high",
    "action": "warm"
  },
  {
    "guid": "76fe78e4-44c9-45c1-adad-0a8c6aa876c8",
    "name": "internal_password_format",
    "regex": "EMP-[0-9]{6}-SEC",
    "severity": "high",
    "action": "redact"
  }
]
```

The extension parses these rules and sends them to the WebAssembly engine, where regex patterns are compiled once and reused for fast scanning.

Architecture overview:

```
Browser Extension (TypeScript)
        │
        │ intercept inputs
        ▼
Input Capture Layer
(paste / typing / submit)
        │
        ▼
WebAssembly Detection Engine
        │
        ├─ PII detection
        ├─ Secret detection
        ├─ Entropy detection
        └─ Custom rule scanning
        │
        ▼
Policy Engine
        │
        ├─ allow
        ├─ warn
        ├─ redact
        └─ block
        │
        ▼
User Feedback UI
```

All analysis is executed locally to ensure:

* low latency (<15ms target)
* privacy
* no external data transmission unless explicitly configured.

---

# User Requisites

### Core Functionality

1. Detect sensitive data before it is submitted in web inputs.
2. Intercept input events including:

   * typing
   * paste
   * form submission
3. Provide immediate feedback to the user when sensitive data is detected.
4. Allow users to:

   * block submission
   * redact sensitive parts
   * override with confirmation.

### Custom Pattern Support

Users must be able to define their own detection patterns via configuration files.

Supported formats:

* JSON

Configuration must allow:

* regex patterns
* severity level
* detection name
* action (allow, warn, block)

Example JSON configuration:

```json
{
  "patterns": [
    {
      "name": "internal_api_key",
      "regex": "sk_live_[a-zA-Z0-9]{24}",
      "severity": "critical",
      "action": "block"
    }
  ]
}
```

### Enterprise Usability

The extension should support:

* importing rule files
* exporting rule sets
* updating rules without reinstalling the extension
* rule validation before activation

### User Experience

Requirements:

* detection must occur in real time
* latency must remain imperceptible
* clear warning UI when sensitive content is detected
* no unnecessary blocking of safe inputs.

---

# Tech Requirements / Stack

Testes: 

- Escreve testes unitários para todas o código e tente alcaçar 100% de corverage.
- A extensão deve conter ter testes rondando com playwriter.

Git:
- Cada arquivo, teste deve ser commitado. Use git. A origem eu adicionarei depois.
- Use yarn para o monorepo

Observação: Apenas essas instruções e a conversa será em pt-BR todo o código deve está em inglês.

## Browser Extension

Language:

* TypeScript

Platform:

* Chrome Extension (Manifest V3)
* Future support for Chromium-based browsers

Components:

* content scripts (input interception)
* background service worker
* UI popup for configuration
* rule management interface

## Detection Engine

Core engine implemented in WebAssembly.

Language recommendation:

* Rust

Responsibilities:

* scanning text inputs
* executing detection rules
* running entropy calculations
* applying regex patterns
* evaluating custom rules

The engine must support dynamic rule loading.

Example engine interface:

```
set_rules(json_rules)
scan_text(input_text)
return detection_result
```

Regex patterns should be compiled **once when rules are loaded** to ensure fast scanning.

Detection pipeline:

```
scan_standard_rules
scan_entropy
scan_user_rules
```

Performance target:

* total scan time < 15 ms

## Sensitive Data Detection Methods

Detection engine must support:

### Regex-based detection

Examples:

* API keys
* JWT tokens
* private keys
* company-specific patterns

### Entropy detection

Identify high entropy strings likely to represent secrets.

### PII detection

Detect:

* emails
* phone numbers
* credit cards
* national identifiers

### Custom rules

User-provided rules loaded dynamically from configuration files.

## Configuration System

Supported formats:

* JSON

Processing pipeline:

```
user config
    ↓
parse
    ↓
normalize rules
    ↓
send to wasm engine
    ↓
compile regex
```

Rules must be validated before activation.

## Performance Goals

Target latency per scan:

```
regex scan: <1 ms
entropy scan: 2–3 ms
rule engine: 3–5 ms
```

Total expected latency:

```
< 15 ms
```

Scanning must occur locally without blocking the UI thread.

Path structure

create a monorepo with one package for extension, project rust, etc.

## Future Extensions

Potential improvements:

* enterprise policy distribution
* telemetry dashboard
* centralized rule management
* ML-based sensitive data classification
* integration with enterprise identity systems
* detection of prompt injection patterns
* context-aware detection (code vs natural language)

---

