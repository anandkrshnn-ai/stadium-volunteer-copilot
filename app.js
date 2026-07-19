/**
 * Main Application Orchestrator for Stadium Volunteer Copilot
 */

import { GateBinarySearch, QuadTree, Point, Rectangle, predictGateCrowdDensity } from './algorithms.js';
import { XAIReasoningEngine } from './ai-engine.js';
import { JuryDataPortal } from './jury-portal.js';

class VolunteerCopilotApp {
  constructor() {
    this.gates = [];
    this.activeVolunteers = [];
    this.currentLanguage = 'en';
    this.stepFreeMode = false;
    this.selectedGate = null;

    this.aiEngine = new XAIReasoningEngine();
    this.binarySearchEngine = new GateBinarySearch();
    this.juryPortal = new JuryDataPortal((data) => this.onJuryDataLoaded(data));

    this.init();
  }

  async init() {
    this.loadDefaultData();
    this.setupEventListeners();
    this.setupCanvas();
    this.runXAIDecision();
    this.updateHUDMetrics();
  }

  loadDefaultData() {
    this.gates = [
      { id: "G01", name: "Gate A - North Concourse", capacity: 12000, occupancy: 9840, flow_rate: 420, status: "CRITICAL", step_free: true, x: 260, y: 80 },
      { id: "G02", name: "Gate B - East Loop", capacity: 15000, occupancy: 6300, flow_rate: 180, status: "NORMAL", step_free: true, x: 440, y: 160 },
      { id: "G03", name: "Gate C - Metro Express", capacity: 18000, occupancy: 16560, flow_rate: 790, status: "CRITICAL", step_free: false, x: 460, y: 310 },
      { id: "G04", name: "Gate D - South Concourse", capacity: 14000, occupancy: 8120, flow_rate: 240, status: "ELEVATED", step_free: true, x: 320, y: 440 },
      { id: "G05", name: "Gate E - West Family Plaza", capacity: 10000, occupancy: 3200, flow_rate: 90, status: "LOW", step_free: true, x: 140, y: 380 },
      { id: "G06", name: "Gate F - VIP & Media", capacity: 5000, occupancy: 1450, flow_rate: 45, status: "NORMAL", step_free: true, x: 90, y: 240 },
      { id: "G07", name: "Gate G - Metro Overflow", capacity: 16000, occupancy: 14080, flow_rate: 610, status: "ELEVATED", step_free: false, x: 400, y: 250 },
      { id: "G08", name: "Gate H - Transit Hub", capacity: 13000, occupancy: 4160, flow_rate: 110, status: "NORMAL", step_free: true, x: 130, y: 140 }
    ];

    this.selectedGate = this.gates[2]; // Gate C
    this.binarySearchEngine.updateGates(this.gates);
  }

  setupEventListeners() {
    // Theme toggle
    const themeBtn = document.querySelector('[data-theme-toggle]');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const root = document.documentElement;
        const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', nextTheme);
        themeBtn.textContent = nextTheme === 'dark' ? '☀︎' : '☾';
      });
    }

    // Language selector
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.currentLanguage = e.target.value;
        this.runXAIDecision();
      });
    }

    // Gate Selector dropdown
    const gateSelect = document.getElementById('gate-select');
    if (gateSelect) {
      gateSelect.addEventListener('change', (e) => {
        const searchResult = this.binarySearchEngine.findGateById(e.target.value);
        if (searchResult.found) {
          this.selectedGate = searchResult.found;
          this.runXAIDecision();
          this.renderCanvas();
        }
      });
    }

    // Step-free toggle
    const stepFreeChk = document.getElementById('step-free-toggle');
    if (stepFreeChk) {
      stepFreeChk.addEventListener('change', (e) => {
        this.stepFreeMode = e.target.checked;
        this.runXAIDecision();
      });
    }

    // Trigger Surge button
    const surgeBtn = document.getElementById('btn-trigger-surge');
    if (surgeBtn) {
      surgeBtn.addEventListener('click', () => this.simulateCrowdSurge());
    }

    // Jury Upload Dropzone
    const dropZone = document.getElementById('jury-drop-zone');
    const fileInput = document.getElementById('jury-file-input');
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.juryPortal.handleFile(e.target.files[0]);
        }
      });
    }

    // Custom Fan Message Input
    const msgInput = document.getElementById('fan-msg-input');
    const analyzeBtn = document.getElementById('btn-analyze-msg');
    if (analyzeBtn && msgInput) {
      analyzeBtn.addEventListener('click', () => {
        this.runXAIDecision(msgInput.value);
      });
    }
  }

  simulateCrowdSurge() {
    // Elevate Gate C occupancy to 96%
    const gateC = this.gates.find(g => g.id === 'G03');
    if (gateC) {
      gateC.occupancy = 17280; // 96%
      gateC.status = 'CRITICAL';
      gateC.flow_rate = 850;
    }
    this.binarySearchEngine.updateGates(this.gates);
    this.runXAIDecision("Emergency Metro train arrival! Gate C is completely flooded!");
    this.renderCanvas();
    this.updateHUDMetrics();
  }

  onJuryDataLoaded({ gates, sourceFileName }) {
    this.gates = gates;
    this.selectedGate = gates[0];
    this.binarySearchEngine.updateGates(gates);

    const badge = document.getElementById('data-source-badge');
    if (badge) {
      badge.textContent = `Loaded Data: ${sourceFileName} (${gates.length} gates)`;
      badge.style.background = 'rgba(67, 122, 34, 0.25)';
      badge.style.color = '#7cc15a';
    }

    // Refresh Gate Dropdown
    const gateSelect = document.getElementById('gate-select');
    if (gateSelect) {
      gateSelect.innerHTML = gates.map(g => `<option value="${g.id}">${g.name} (${g.id})</option>`).join('');
    }

    this.runXAIDecision();
    this.renderCanvas();
    this.updateHUDMetrics();
  }

  runXAIDecision(customMsg = null) {
    if (!this.selectedGate) return;

    const fanMessage = customMsg || document.getElementById('fan-msg-input')?.value || "Where is the nearest bathroom and step-free exit?";

    const result = this.aiEngine.generateXAIDecision({
      gate: this.selectedGate,
      fanMessage,
      targetLanguage: this.currentLanguage,
      stepFreeRequired: this.stepFreeMode
    });

    // Update Decision JSON Code Box
    const codeDisplay = document.getElementById('xai-code-output');
    if (codeDisplay) {
      codeDisplay.textContent = JSON.stringify(result.decisionContract, null, 2);
    }

    // Update Volunteer Action Banner
    const actionBanner = document.getElementById('volunteer-action-banner');
    if (actionBanner) {
      actionBanner.textContent = result.decisionContract.multilingualOutput.volunteerSpokenScript;
    }

    // Update Latency HUD
    const latencyEl = document.getElementById('hud-latency-val');
    if (latencyEl) {
      latencyEl.textContent = `${result.metadata.latencyMs}ms`;
    }
  }

  updateHUDMetrics() {
    const totalCap = this.gates.reduce((acc, g) => acc + g.capacity, 0);
    const totalOcc = this.gates.reduce((acc, g) => acc + g.occupancy, 0);
    const avgRatio = ((totalOcc / totalCap) * 100).toFixed(1);

    const ratioEl = document.getElementById('hud-crowd-pressure');
    if (ratioEl) ratioEl.textContent = `${avgRatio}%`;

    // Predictive LSTM 4-min forecast for selected gate
    if (this.selectedGate) {
      const pred = predictGateCrowdDensity(this.selectedGate, 4);
      const predEl = document.getElementById('hud-predicted-val');
      if (predEl) {
        predEl.textContent = `${pred.predictedRatio}% (${pred.predictedStatus})`;
        predEl.style.color = pred.isBottleneckRisk ? '#dd80b8' : '#7cc15a';
      }
    }
  }

  setupCanvas() {
    this.canvas = document.getElementById('digital-twin-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.renderCanvas();
  }

  renderCanvas() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width = this.canvas.parentElement.clientWidth || 600;
    const h = this.canvas.height = 380;

    ctx.clearRect(0, 0, w, h);

    // Render Stadium Outer Oval Structure
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.35, h * 0.38, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(20, 26, 34, 0.8)';
    ctx.strokeStyle = 'rgba(84, 180, 184, 0.3)';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Render Field Pitch
    ctx.beginPath();
    ctx.roundRect(w / 2 - 70, h / 2 - 45, 140, 90, 8);
    ctx.fillStyle = 'rgba(67, 122, 34, 0.25)';
    ctx.strokeStyle = 'rgba(124, 193, 90, 0.5)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Draw Gate Heatmaps & Markers
    this.gates.forEach((g) => {
      const scaleX = w / 600;
      const scaleY = h / 400;
      const gx = g.x * scaleX;
      const gy = g.y * scaleY;

      const occRatio = g.occupancy / g.capacity;

      // Heatmap Glow Circle
      const heatRadius = 24 + Math.round(occRatio * 28);
      const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, heatRadius);

      if (g.status === 'CRITICAL' || occRatio >= 0.85) {
        grad.addColorStop(0, 'rgba(161, 44, 123, 0.8)');
        grad.addColorStop(1, 'rgba(161, 44, 123, 0)');
      } else if (g.status === 'ELEVATED' || occRatio >= 0.70) {
        grad.addColorStop(0, 'rgba(225, 154, 91, 0.8)');
        grad.addColorStop(1, 'rgba(225, 154, 91, 0)');
      } else {
        grad.addColorStop(0, 'rgba(67, 122, 34, 0.6)');
        grad.addColorStop(1, 'rgba(67, 122, 34, 0)');
      }

      ctx.beginPath();
      ctx.arc(gx, gy, heatRadius, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();

      // Gate Pin Dot
      ctx.beginPath();
      ctx.arc(gx, gy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = (this.selectedGate && this.selectedGate.id === g.id) ? '#ffffff' : (g.status === 'CRITICAL' ? '#dd80b8' : '#54b4b8');
      ctx.fill();

      // Gate Label
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = '#eef2f5';
      ctx.fillText(g.id, gx - 10, gy - 12);
    });
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new VolunteerCopilotApp();
});
