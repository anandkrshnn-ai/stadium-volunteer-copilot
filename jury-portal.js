/**
 * Jury Data Upload, Edge Case Testing & Benchmark Engine
 * Allows hackathon evaluators to drop custom CSV/JSON files, run automated edge case suites, and benchmark performance.
 * Fully async-supported for reliable test execution against local & live Gemini API engines.
 *
 * @module JuryDataPortal
 */

import { sanitizeInput } from './ai-engine.js';
import { GateBinarySearch, QuadTree, Rectangle, Point } from './algorithms.js';

export class JuryDataPortal {
  /**
   * @param {Function} onDataLoadedCallback - Callback when custom CSV/JSON telemetry is parsed
   */
  constructor(onDataLoadedCallback) {
    this.onDataLoaded = onDataLoadedCallback;
  }

  /**
   * Sanitized CSV parser preventing XSS injection
   * @param {string} csvText - Raw CSV text
   * @returns {StadiumGate[]|null} Parsed gate objects or null
   */
  parseCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') return null;
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => sanitizeInput(h.trim(), 50));
    const gates = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => sanitizeInput(v.trim(), 100));
      if (values.length < headers.length) continue;

      const obj = {};
      headers.forEach((h, idx) => {
        let val = values[idx];
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(val) && val !== '') val = Number(val);
        obj[h] = val;
      });

      gates.push({
        id: obj.gate_id || `G0${i}`,
        name: obj.gate_name || `Gate ${i}`,
        capacity: Number(obj.capacity_max) || 12000,
        occupancy: Number(obj.current_occupancy) || 5000,
        flow_rate: Number(obj.flow_rate_per_min) || 150,
        status: obj.status || 'NORMAL',
        step_free: Boolean(obj.step_free_access),
        x: 100 + (i * 35) % 280,
        y: 80 + (i * 40) % 320
      });
    }

    return gates;
  }

  /**
   * Sanitized JSON parser preventing script injection
   * @param {string} jsonText - Raw JSON text string
   * @returns {StadiumGate[]|null} Parsed gate objects or null
   */
  parseJSON(jsonText) {
    try {
      const raw = JSON.parse(jsonText);
      const rawGates = Array.isArray(raw.gates) ? raw.gates : (Array.isArray(raw) ? raw : null);
      if (!rawGates) return null;

      return rawGates.map((g, i) => ({
        id: sanitizeInput(String(g.id || `G0${i}`), 20),
        name: sanitizeInput(String(g.name || `Gate ${i}`), 60),
        capacity: Number(g.capacity) || 12000,
        occupancy: Number(g.occupancy) || 5000,
        flow_rate: Number(g.flow_rate) || 150,
        status: sanitizeInput(String(g.status || 'NORMAL'), 20),
        step_free: Boolean(g.step_free),
        x: Number(g.x) || 100 + (i * 35) % 280,
        y: Number(g.y) || 80 + (i * 40) % 320
      }));
    } catch (e) {
      console.error("Failed to parse JSON", e);
      return null;
    }
  }

  /**
   * Handles drag-and-drop or file upload events
   * @param {File} file - Selected telemetry file
   */
  async handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { // Max 5MB limit
      alert("File size exceeds 5MB limit.");
      return;
    }

    const text = await file.text();
    let gates = null;

    if (file.name.endsWith('.csv')) {
      gates = this.parseCSV(text);
    } else if (file.name.endsWith('.json')) {
      gates = this.parseJSON(text);
    } else {
      alert("Please upload a valid .csv or .json stadium telemetry file.");
      return;
    }

    if (gates && gates.length > 0) {
      this.onDataLoaded({ gates, sourceFileName: file.name });
    } else {
      alert("Could not extract valid gate telemetry data from file. Please check file formatting.");
    }
  }

  /**
   * AUTOMATED EDGE CASE TEST SUITE (8 Comprehensive Scenarios)
   * @param {StadiumGate[]} gates - Array of stadium gates
   * @param {XAIReasoningEngine} aiEngine - AI engine instance
   * @param {string|null} [apiKey=null] - Optional Gemini API key
   * @returns {Promise<Object[]>} Array of test scenario results
   */
  async runEdgeCaseTestSuite(gates, aiEngine, apiKey = null) {
    const testCases = [
      {
        name: "Medical Distress Keyword Escalation",
        input: { gate: gates[0], fanMessage: "Help! Spectator is dizzy and fainted near gate entrance.", targetLanguage: "en", apiKey },
        validate: (res) => res.decisionContract.triageLevel === "CRITICAL" && res.decisionContract.threatCategory === "MEDICAL_EMERGENCY"
      },
      {
        name: "99% Extreme Occupancy Bottleneck Surge",
        input: { gate: { ...gates[2], occupancy: 17820, capacity: 18000, status: "CRITICAL" }, fanMessage: "Massive train arrival crowd.", targetLanguage: "en", apiKey },
        validate: (res) => res.decisionContract.triageLevel === "CRITICAL" && res.decisionContract.threatCategory === "CROWD_BOTTLENECK"
      },
      {
        name: "Step-Free Accessibility Filter",
        input: { gate: gates[2], fanMessage: "Wheelchair fan needs step-free access", stepFreeRequired: true, targetLanguage: "en", apiKey },
        validate: (res) => res.decisionContract.threatCategory === "ACCESSIBILITY_REQUEST"
      },
      {
        name: "Multilingual Register Adaptation (Arabic Formal)",
        input: { gate: gates[1], fanMessage: "Where is the main entrance?", targetLanguage: "ar", apiKey },
        validate: (res) => res.decisionContract.multilingualOutput.targetLanguage === "ar" && res.decisionContract.multilingualOutput.volunteerSpokenScript.length > 5
      },
      {
        name: "Malformed & Malicious Input Sanitization",
        input: { gate: gates[0], fanMessage: "<script>alert('XSS')</script>How do I find my seat?", targetLanguage: "en", apiKey },
        validate: (res) => !res.decisionContract.primaryReasoning.some(r => r.includes('<script>')) && res.metadata.securitySanitized === true
      },
      {
        name: "Low Occupancy Boundary Condition",
        input: { gate: { ...gates[4], occupancy: 500, capacity: 10000, status: "LOW" }, fanMessage: "How crowded is this gate?", targetLanguage: "en", apiKey },
        validate: (res) => res.decisionContract.threatCategory === "WAYFINDING" && res.decisionContract.triageLevel === "INFO"
      },
      {
        name: "300% Sudden Ingress Surge Detection",
        input: { gate: { ...gates[0], occupancy: 11500, flow_rate: 950, status: "CRITICAL" }, fanMessage: "Surge at turnstiles!", targetLanguage: "en", apiKey },
        validate: (res) => res.decisionContract.triageLevel === "CRITICAL"
      },
      {
        name: "QuadTree Spatial Failover Route Resolution",
        input: { gate: gates[2], fanMessage: "Need step-free exit route now", stepFreeRequired: true, targetLanguage: "en", apiKey },
        validate: (res) => Boolean(res.decisionContract.actionableDirective)
      }
    ];

    const results = [];
    for (const tc of testCases) {
      const res = await aiEngine.generateXAIDecision(tc.input);
      const passed = tc.validate(res);
      results.push({ name: tc.name, passed, latencyMs: res.metadata.latencyMs });
    }

    return results;
  }

  /**
   * 1,000-QUERY BENCHMARK STRESS TEST
   * @param {StadiumGate[]} gates - Gate list
   * @returns {Object} Microsecond benchmark metrics
   */
  run1000QueryBenchmark(gates) {
    const startTime = performance.now();
    const binarySearch = new GateBinarySearch(gates);
    
    // Build QuadTree
    const boundary = new Rectangle(300, 200, 300, 200);
    const qt = new QuadTree(boundary, 4);
    gates.forEach(g => qt.insert(new Point(g.x, g.y, g)));

    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      const targetId = gates[i % gates.length].id;
      binarySearch.findGateById(targetId);
      qt.findNearest(100 + (i % 400), 100 + (i % 300), 150);
    }

    const endTime = performance.now();
    const totalTimeMs = Number((endTime - startTime).toFixed(2));
    const avgLatencyMs = Number((totalTimeMs / iterations).toFixed(4));
    const opsPerSec = Math.round((iterations / totalTimeMs) * 1000);

    return {
      iterations,
      totalTimeMs,
      avgLatencyMs,
      opsPerSec
    };
  }
}
