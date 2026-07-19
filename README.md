# Stadium Volunteer Copilot

> **PromptWars Challenge 4 Submission**  
> **Vertical**: Mega-Event Stadium Operations & Venue Management  
> **Target Persona**: Frontline Stadium Volunteer (“The Underrated Frontliner” managing 90,000+ spectator crowds)

***

## 📌 Executive Summary

During mega-events like the **FIFA World Cup 2026**, stadium operations face sudden, high-density crowd surges—such as 40,000 spectators exiting a Metro hub simultaneously. Frontline volunteers (typically 18–22 years old) are placed under extreme cognitive overload, dealing with language barriers, accessibility requests, and conflicting spectator priorities.

Traditional stadium software relies on static maps or rigid `if/else` rule engines that trigger generic “Gate full” warnings without contextual reasoning.

**Volunteer Copilot** is an AI-powered real-time decision-support system built to bridge raw IoT telemetry (gate turnstiles, CCTV crowd density, BLE beacons) and frontline volunteer decision-making. Combining **live Gemini 1.5 Flash API calls (with automatic Local XAI Engine fallback)**, **\(O(\log N)\) spatial QuadTree node indexing**, **input sanitization**, and **Explainable AI (XAI)**, it delivers sub‑200 ms, tone‑adapted, multilingual directives that resolve crowd bottlenecks before they escalate into safety incidents.

***

## ⚡ How Judges Can Evaluate in 2 Minutes

1. **Open the digital twin** – View the 2.5D gate density heatmap and QuadTree spatial metrics.  
2. **Trigger an operational surge** – Click **“⚡ Simulate 40k Metro Surge”** to push Gate C to ~96% and watch XAI decision contracts update.  
3. **Run the automated edge case suite** – In the Jury Portal, click **“🧪 Run Automated Edge Case Suite”** to see 5 scenarios with live Pass/Fail badges.  
4. **Upload custom data** – Drag & drop `sample-data.csv` or `sample-data.json` (or any custom telemetry) into the Jury Upload Portal to test with your own data.  
5. **Run the performance benchmark** – Click **“⚡ Run 1,000‑Query Benchmark”** to measure real QuadTree and Binary Search throughput on your machine.

***

## 🎯 Chosen Vertical & Persona Definition

- **Vertical**: Stadium operations, crowd safety, transportation, and inclusive spectator experience.  
- **Target persona**: The **mega-event volunteer** managing stadium concourses and gates.  
- **Operational moment**: A 40,000‑person Metro exit surge at Gate C while a wheelchair spectator asks for step‑free access in Arabic, and another fan reports feeling dizzy in the turnstile queue.

***

## 🧠 Dual Gemini Engine Architecture (Live API + Offline XAI Fallback)

### Why Generative AI is Necessary (Over Rule-Based Logic)

Rule-based engines can flag a crowded gate, but they **cannot**:

1. Differentiate between a casual inquiry (“Where is the bathroom?”) vs. a disguised medical emergency (“I feel dizzy near Gate C turnstiles”).  
2. Reconcile conflicting constraints (e.g., redirecting crowd flow to Gate B while ensuring Gate B remains step‑free for wheelchair users).  
3. Generate empathetic, tone‑adapted volunteer scripts in real time across 5+ languages (English, Spanish, Arabic, French, Mandarin).

### Client-Side PWA + Live API & Fallback Mechanics

1. **Live Gemini API (`gemini-1.5-flash`)**  
   If an optional Gemini API key is entered in the UI, the app performs HTTP REST calls to  
   `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`  
   using a structured XAI JSON schema.

2. **Local XAI Engine fallback**  
   If offline or no API key is present, the app automatically executes a **Local XAI Reasoning Engine (Gemini-schema compatible)**, ensuring 100% availability for offline hackathon evaluators.

```text
[Fan query / Telemetry data / Jury upload]
          │
          ▼
[Input Security Sanitizer (sanitizeInput)]
          │
          ▼
[Spatial QuadTree Node Index (findNearest)] ──> Digital twin + spatial banner
          │
          ▼
[GenAI Decision Engine (ai-engine.js)]
   ├── If API key → live Gemini 1.5 Flash call
   └── Else       → Local XAI Engine
          │
          ▼
[JSON XAI decision contract + spoken volunteer script]
```

***

## ⚙️ Engineering & Algorithmic Rigor

To satisfy high-performance efficiency requirements, Volunteer Copilot avoids \(O(N)\) scans wherever possible:

1. **\(O(\log N)\) Binary Search (`algorithms.js`)**  
   Searches sorted gate capacity / ID indices to retrieve gate throughput in sub‑millisecond time (`findGateById`).

2. **Spatial QuadTree (`algorithms.js`)**  
   Partitions 2D stadium space into quad-nodes (`Rectangle.intersects`) to query the nearest available volunteer or step‑free exit in \(O(\log N)\) time (`findNearest`).  
   QuadTree spatial lookup results directly drive the decision engine’s route selection, dynamically injecting the resolved gate name into volunteer directives, multilingual scripts, and fallback strategies.

3. **1,000-query benchmark suite (`jury-portal.js`)**  
   In-browser stress test evaluating 1,000 QuadTree + Binary Search queries, displaying microsecond execution times and ops/sec.

***

## 🛡️ Core System Standards & Engineering Design

### 1. Code Quality & Architecture

- Modular JavaScript ESM split:  
  - [`algorithms.js`](./algorithms.js)  
  - [`ai-engine.js`](./ai-engine.js)  
  - [`jury-portal.js`](./jury-portal.js)  
  - [`app.js`](./app.js)  
- Zero framework bloat: vanilla HTML5 Canvas, modern CSS custom properties, and native Web APIs keep the repository lightweight.

### 2. Security & Data Protection

- **Strict input sanitization (`sanitizeInput`)**  
  Strips HTML tags/scripts, truncates length (max 300 chars), and escapes HTML entities (`&`, `<`, `>`, `"`, `'`, `/`) for both fan text and uploaded CSV/JSON.  
- **XSS prevention**  
  All dynamic content is rendered as text nodes, ensuring no script execution from evaluator-uploaded data.  
- **Zero hardcoded secrets**  
  API keys are never stored; the user can optionally provide a key at runtime.

### 3. Resource Efficiency & Throughput

- Uses `performance.now()` for precise microsecond algorithm timing.  
- A latency HUD monitors XAI decision-loop latency; typical observed range is ~130–165 ms end-to-end in demo scenarios.

### 4. Automated Validation & Edge-Case Suite

The **Automated Edge Case Test Suite** (with async/await and Pass/Fail badges) covers:

1. Medical distress keyword escalation (“dizzy”, “fainted”, “chest pain”).  
2. 99% extreme occupancy surge at Gate C.  
3. Step‑free accessibility enforcement for wheelchair users.  
4. Multilingual register adaptation (e.g., formal Arabic script).  
5. Malformed / malicious input sanitization (XSS payload stripping).

### 5. Accessibility & Inclusivity

- **ARIA live regions** (`aria-live="polite"`) for dynamic volunteer directives and alerts.  
- **Canvas fallback** with `aria-label`, `role="img"`, and hidden textual description for visually impaired users.  
- **WCAG-aligned UI** including a skip link, visible focus rings, and high-contrast status badges (`CRITICAL`, `ELEVATED`, `NORMAL`).

***

## 📊 Live Evaluator Jury Upload Portal

Evaluators are not limited to predefined data.

In the **Jury Data Upload Portal**, judges can:

1. Drag & drop custom `.csv` or `.json` stadium telemetry files.  
2. Click **“🧪 Run Automated Edge Case Suite”** to see 5 scenarios with live Pass/Fail results.  
3. Click **“⚡ Run 1,000‑Query Benchmark”** to measure QuadTree throughput on their own machine.

***

## 💡 Operational Assumptions

1. Stadium gates report turnstile throughput counts every 10–30 seconds.  
2. Edge nodes perform initial noise reduction before sending payload summaries.  
3. Volunteers carry PWA-capable devices that can render HTML5 Canvas and cache directives offline.

***

## 🚀 How to Run Locally

1. Clone the public repository:

```bash
git clone https://github.com/anandkrshnn-ai/stadium-volunteer-copilot.git
cd stadium-volunteer-copilot
```

2. Open `index.html` in any modern browser, or serve via a simple HTTP server:

```bash
python -m http.server 8000
```

3. Open `http://localhost:8000` in your browser:
   - Try built-in scenarios.  
   - Optionally enter a Gemini API key to enable live GenAI.  
   - Use the Jury Portal to upload your own CSV/JSON and run benchmarks.
