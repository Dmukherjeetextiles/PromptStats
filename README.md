# PromptStats v2

> **Privacy-first prompt analytics & sustainability tracker**
> for ChatGPT · Gemini · Claude · Google AI Studio

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Installation](#installation)
3. [Architecture Overview](#architecture-overview)
4. [Sustainability Math](#sustainability-math)
5. [Privacy Safeguards (GDPR / CNIL)](#privacy-safeguards)
6. [Testing](#testing)
7. [Supabase Setup](#supabase-setup)
8. [GA4 Setup](#ga4-setup)
9. [Contributing](#contributing)

---

## Directory Structure

```
promptstats/
├── manifest.json
├── background.js
├── package.json
│
├── src/content/
│   ├── index.js                    ← Content script entry point
│   │
│   ├── adapters/                   ← Site-specific DOM adapters
│   │   ├── base-adapter.js
│   │   ├── chatgpt-adapter.js
│   │   ├── gemini-adapter.js
│   │   ├── claude-adapter.js
│   │   └── aistudio-adapter.js
│   │
│   ├── engines/                    ← Core computation
│   │   ├── token-estimator.js
│   │   ├── environment-engine.js
│   │   ├── pii-detector.js
│   │   └── frequency-engine.js
│   │
│   ├── services/                   ← External integrations (off by default)
│   │   ├── supabase.js
│   │   └── ga4.js
│   │
│   ├── capture/                    ← Input interception
│   │   ├── prompt-capture.js
│   │   └── file-capture.js
│   │
│   ├── ui/
│   │   └── dashboard.js            ← Shadow DOM draggable widget
│   │
│   └── utils/
│       ├── dom.js
│       ├── time.js
│       ├── crypto.js
│       └── observer.js
│
├── tests/
│   ├── token-estimator.test.js
│   ├── pii-detector.test.js
│   └── environment-engine.test.js
│
├── e2e/
│   ├── playwright.config.js
│   ├── mock-page/index.html
│   └── tests/mock-llm.spec.js
│
├── schema/
│   ├── supabase.sql
│   └── ga4-events.md
│
└── assets/
    └── logo128.png
```

---

## Installation

```bash
# 1. Clone / download this repository
git clone https://github.com/Dmukherjeetextiles/PromptStats.git
cd PromptStats

# 2. Install dev dependencies (for testing only — no runtime deps)
npm install

# 3. Load the extension in Chrome
#    chrome://extensions/ → Enable Developer Mode → Load unpacked → select this folder
```

---

## Architecture Overview

### Site Adapter Pattern

Each LLM platform uses a subtly different DOM structure. Rather than
brittle string checks (`button.innerText.includes("send")`), each platform
has a dedicated adapter class that inherits from `BaseAdapter`:

```
BaseAdapter
  ├── ChatGPTAdapter   → #prompt-textarea, button[data-testid="send-button"]
  ├── GeminiAdapter    → rich-textarea div[contenteditable], button[aria-label="Send message"]
  ├── ClaudeAdapter    → div.ProseMirror, button[aria-label="Send Message"]
  └── AIStudioAdapter  → ms-prompt-input textarea, Ctrl+Enter to submit
```

When the DOM changes (e.g., a site redesign), only the relevant adapter
file needs updating.

### State Management

Data flows through `chrome.storage.local`, not `window.postMessage`:

```
prompt-capture.js  →  chrome.storage.local  ←  dashboard.js
                            (lastPrompt, stats)
```

`chrome.storage.onChanged` fires in the dashboard whenever a new prompt
is processed — the UI updates in real time without any polling.

### Shadow DOM Dashboard

The dashboard is mounted as:

```
<div id="promptstats-host">
  #shadow-root (open)
    ← all dashboard HTML and CSS are scoped here
```

This guarantees the host site's CSS rules cannot leak in and break the UI.
The widget is draggable by mouse or keyboard (arrow keys on the header).
Position is persisted in `chrome.storage.local`.

---

## Sustainability Math

All coefficients are derived from published research and updated annually.

### Energy

**Source:** Luccioni et al. (2023) — *"Power Hungry Processing: Watts Driving the
Cost of AI Deployment?"* (NeurIPS 2023, Table 2)

- Median measured energy across GPT-class generative models: **~0.001 Wh / token**
- This is a conservative upper-bound estimate for consumer-facing APIs.

```
energy_Wh = tokens × 0.001
```

### CO₂

**Source:** IEA *World Energy Outlook 2023* — Global average grid carbon intensity

- Average grid: **233 gCO₂eq / kWh** (IEA, Fig 3.3)
- Data-centre PUE adjustment: ×1.0 (already implicit in Luccioni energy figures)

```
co2_gCO2eq = tokens × 0.001 Wh × 0.233 gCO₂/Wh
           = tokens × 0.000233
```

### Water

**Source:** Li et al. (2023) — *"Making AI Less Thirsty"* (arXiv:2304.03271, §3.1)

- Estimate: ~0.5 L per 100 ChatGPT conversations (~2 000 tokens each)
- Normalises to: **0.5 L / (100 × 2000 tokens) ≈ 0.0009 mL / token**

```
water_mL = tokens × 0.0009
```

### Equivalences

To make numbers tangible, `EnvironmentEngine.equivalences()` converts:

| Metric | Real-world comparison |
|--------|-----------------------|
| CO₂    | Metres driven by an average EU petrol car (175 gCO₂/km) |
| Water  | Number of water droplets (~0.05 mL each) |

### Accuracy Note

These are **approximations**. Real energy consumption varies by:
model size, inference hardware (A100 vs H100), batch size, geographic
grid mix, and data-centre efficiency. The figures represent a
reasonable median for a typical GPT-4-class API call in 2023–2024.

---

## Privacy Safeguards

### What is NEVER sent anywhere

| Data                     | Supabase | GA4 |
|--------------------------|----------|-----|
| Raw prompt text          | ✗ (null) | ✗   |
| Matched PII values       | ✗        | ✗   |
| User email / name        | ✗        | ✗   |
| IP address               | ✗        | ✗ † |
| Browsing history         | ✗        | ✗   |

† GA4 Measurement Protocol endpoint does **not** capture the sender's IP,
unlike the standard gtag.js snippet.

### What is stored by default

| Data          | Where            | Notes |
|---------------|------------------|-------|
| Token count   | Supabase + local | Aggregate metric only |
| CO₂/energy/water | Supabase + local | Derived from tokens |
| PII **types** | Supabase + local | e.g. `["email"]` — no raw text |
| `prompt_hash` | Supabase + local | SHA-256 hex — one-way, irreversible |
| Session ID    | Local only       | Random UUID, reset on install |

### Opt-in only

Both Supabase and GA4 sync are **disabled by default**. The user must
explicitly enable them in the settings panel (⚙ button on the dashboard).

Storing raw prompt text requires a second, separate opt-in toggle
("Store raw prompts ⚠").

### GDPR / CNIL compliance

- **Art. 5(1)(c) — Data minimisation:** only token counts and hashed
  fingerprints are stored by default.
- **Art. 25 — Privacy by design:** PII detector runs locally; raw values
  are discarded after pattern matching.
- **Art. 5(1)(e) — Storage limitation:** the `purge_old_prompts()` SQL
  function deletes rows older than 90 days.
- **CNIL analytics exemption:** GA4 is configured to avoid IP capture and
  uses anonymous session IDs, satisfying CNIL's conditions for cookie-free,
  consent-free audience measurement.

---

## Testing

```bash
# Unit tests (Jest)
npm test

# With coverage report
npm test -- --coverage

# Watch mode during development
npm run test:watch

# E2E tests (Playwright)
# Terminal 1 — serve mock page
npm run mock-server

# Terminal 2 — run Playwright
npm run e2e
```

### Coverage targets

| Module                  | Statements | Branches |
|-------------------------|-----------|----------|
| `token-estimator.js`    | ≥ 90 %    | ≥ 85 %   |
| `pii-detector.js`       | ≥ 95 %    | ≥ 90 %   |
| `environment-engine.js` | 100 %     | 100 %    |

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `schema/supabase.sql` in **SQL Editor**
3. Copy your project URL and `anon` publishable key into
   `src/content/services/supabase.js`
4. Enable Supabase in the extension settings panel

The schema enforces Row Level Security:
- Anonymous (extension) key: **insert only**
- Authenticated key (your dashboard): read access

---

## GA4 Setup

See `schema/ga4-events.md` for full configuration steps and CNIL
compliance notes.

---

## References

- Luccioni, A. S. et al. (2023). *Power Hungry Processing.* NeurIPS 2023.
  https://arxiv.org/abs/2311.16863
- Li, P. et al. (2023). *Making AI Less Thirsty.* arXiv:2304.03271.
  https://arxiv.org/abs/2304.03271
- IEA (2023). *World Energy Outlook 2023.*
  https://www.iea.org/reports/world-energy-outlook-2023
- CNIL (2023). *Exempted analytics solutions.*
  https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-website-or-application
- GDPR Art. 5, 25 — EU Regulation 2016/679
