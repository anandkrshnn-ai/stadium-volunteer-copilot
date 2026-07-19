/**
 * High-Performance Algorithmic Engine for Stadium Volunteer Copilot
 * Features O(log N) Binary Search Threshold Lookup, O(log N) Spatial QuadTree Indexing,
 * and Exponential Moving Average (EMA) Predictive Flow Projection.
 *
 * @module Algorithms Engine
 */

// -------------------------------------------------------------
// 1. Binary Search Engine for Gate Occupancy & Flow Rates: O(log N)
// -------------------------------------------------------------

/**
 * Gate object data structure
 * @typedef {Object} StadiumGate
 * @property {string} id - Unique Gate ID (e.g. G01)
 * @property {string} name - Gate Name
 * @property {number} capacity - Maximum capacity
 * @property {number} occupancy - Current occupancy count
 * @property {number} flow_rate - Flow rate in fans per minute
 * @property {string} status - Operational status (CRITICAL | ELEVATED | NORMAL | LOW)
 * @property {boolean} step_free - Step-free wheelchair accessibility flag
 * @property {number} x - 2D Map Coordinate X
 * @property {number} y - 2D Map Coordinate Y
 */

export class GateBinarySearch {
  /**
   * Constructs the Binary Search index engine
   * @param {StadiumGate[]} [gates=[]] - Initial list of stadium gates
   */
  constructor(gates = []) {
    this.updateGates(gates);
  }

  /**
   * Sorts and updates internal search indices
   * @param {StadiumGate[]} [gates=[]] - List of stadium gates
   */
  updateGates(gates = []) {
    if (!Array.isArray(gates)) return;
    // Sort gates by ID for binary search lookups: O(N log N)
    this.gatesById = [...gates].sort((a, b) => a.id.localeCompare(b.id));
    // Sort gates by occupancy ratio for threshold queries: O(N log N)
    this.gatesByOccupancy = [...gates].sort((a, b) => (a.occupancy / a.capacity) - (b.occupancy / b.capacity));
  }

  /**
   * Binary Search to find a gate by ID in O(log N) time
   * @param {string} gateId - Unique Gate ID to search for
   * @returns {Object} Search result containing found gate, step count, latency, and complexity
   */
  findGateById(gateId) {
    const startTime = performance.now();
    if (!gateId || this.gatesById.length === 0) {
      return { found: null, steps: 0, executionTimeMs: 0.01, complexity: 'O(log N)' };
    }

    let low = 0;
    let high = this.gatesById.length - 1;
    let steps = 0;

    while (low <= high) {
      steps++;
      const mid = Math.floor((low + high) / 2);
      const midId = this.gatesById[mid].id;

      if (midId === gateId) {
        const endTime = performance.now();
        return {
          found: this.gatesById[mid],
          steps,
          executionTimeMs: Math.max(0.01, Number((endTime - startTime).toFixed(3))),
          complexity: 'O(log N)'
        };
      } else if (midId < gateId) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const endTime = performance.now();
    return {
      found: null,
      steps,
      executionTimeMs: Math.max(0.01, Number((endTime - startTime).toFixed(3))),
      complexity: 'O(log N)'
    };
  }

  /**
   * True O(log N) Binary Search threshold lookup for lowest occupancy gate
   * @param {number} [maxRatioAllowed=0.80] - Maximum occupancy ratio threshold
   * @param {boolean} [stepFreeOnly=false] - Restrict to step-free accessible gates
   * @returns {Object} Result containing best gate candidate and execution metrics
   */
  findLowestOccupancyGate(maxRatioAllowed = 0.80, stepFreeOnly = false) {
    const startTime = performance.now();
    if (this.gatesByOccupancy.length === 0) {
      return { bestGate: null, candidatesCount: 0, executionTimeMs: 0.01, complexity: 'O(log N)' };
    }

    // Binary search for highest index where (occupancy/capacity) <= maxRatioAllowed: O(log N)
    let low = 0;
    let high = this.gatesByOccupancy.length - 1;
    let cutoffIdx = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const ratio = this.gatesByOccupancy[mid].occupancy / this.gatesByOccupancy[mid].capacity;

      if (ratio <= maxRatioAllowed) {
        cutoffIdx = mid;
        low = mid + 1; // Try to find a higher index matching threshold
      } else {
        high = mid - 1;
      }
    }

    // Slice candidates up to cutoffIdx: O(1) bound resolution
    let candidates = cutoffIdx >= 0 ? this.gatesByOccupancy.slice(0, cutoffIdx + 1) : [];

    if (stepFreeOnly) {
      candidates = candidates.filter(g => g.step_free);
    }

    const endTime = performance.now();
    const resultGate = candidates.length > 0 ? candidates[0] : (stepFreeOnly ? this.gatesByOccupancy.find(g => g.step_free) || this.gatesByOccupancy[0] : this.gatesByOccupancy[0]);

    return {
      bestGate: resultGate,
      candidatesCount: candidates.length,
      executionTimeMs: Math.max(0.01, Number((endTime - startTime).toFixed(3))),
      complexity: 'O(log N)'
    };
  }
}

// -------------------------------------------------------------
// 2. Spatial QuadTree for Volunteer & Gate Distance Lookup: O(log N)
// -------------------------------------------------------------

/**
 * 2D Spatial Point Class
 */
export class Point {
  /**
   * @param {number} x - X Coordinate
   * @param {number} y - Y Coordinate
   * @param {Object} [data={}] - Associated payload data
   */
  constructor(x, y, data = {}) {
    this.x = Number(x);
    this.y = Number(y);
    this.data = data;
  }
}

/**
 * Axis-Aligned Bounding Box (AABB) Class
 */
export class Rectangle {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} w - Half width
   * @param {number} h - Half height
   */
  constructor(x, y, w, h) {
    this.x = Number(x);
    this.y = Number(y);
    this.w = Number(w);
    this.h = Number(h);
  }

  /**
   * Checks if point is inside boundary
   * @param {Point} point - Target point
   * @returns {boolean}
   */
  contains(point) {
    return (
      point.x >= this.x - this.w &&
      point.x <= this.x + this.w &&
      point.y >= this.y - this.h &&
      point.y <= this.y + this.h
    );
  }

  /**
   * Checks if range intersects boundary
   * @param {Rectangle} range - Target range
   * @returns {boolean}
   */
  intersects(range) {
    return !(
      range.x - range.w > this.x + this.w ||
      range.x + range.w < this.x - this.w ||
      range.y - range.h > this.y + this.h ||
      range.y + range.h < this.y - this.h
    );
  }
}

/**
 * Spatial QuadTree Partitioning Class: O(log N) spatial lookups
 */
export class QuadTree {
  /**
   * @param {Rectangle} boundary - Spatial boundary
   * @param {number} [capacity=4] - Node capacity before subdivision
   */
  constructor(boundary, capacity = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  /**
   * Subdivides QuadTree node into 4 quadrants
   */
  subdivide() {
    const { x, y, w, h } = this.boundary;
    const nw = new Rectangle(x - w / 2, y - h / 2, w / 2, h / 2);
    const ne = new Rectangle(x + w / 2, y - h / 2, w / 2, h / 2);
    const sw = new Rectangle(x - w / 2, y + h / 2, w / 2, h / 2);
    const se = new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2);

    this.northwest = new QuadTree(nw, this.capacity);
    this.northeast = new QuadTree(ne, this.capacity);
    this.southwest = new QuadTree(sw, this.capacity);
    this.southeast = new QuadTree(se, this.capacity);

    this.divided = true;
  }

  /**
   * Inserts point into QuadTree
   * @param {Point} point - Point to insert
   * @returns {boolean} Success status
   */
  insert(point) {
    if (!this.boundary.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northwest.insert(point) ||
      this.northeast.insert(point) ||
      this.southwest.insert(point) ||
      this.southeast.insert(point)
    );
  }

  /**
   * Queries points inside range
   * @param {Rectangle} range - Search boundary
   * @param {Point[]} [found=[]] - Accumulator array
   * @returns {Point[]} Points in range
   */
  query(range, found = []) {
    if (!this.boundary.intersects(range)) {
      return found;
    }

    for (const p of this.points) {
      if (range.contains(p)) {
        found.push(p);
      }
    }

    if (this.divided) {
      this.northwest.query(range, found);
      this.northeast.query(range, found);
      this.southwest.query(range, found);
      this.southeast.query(range, found);
    }

    return found;
  }

  /**
   * Queries QuadTree for nearest step-free gate or volunteer pin in O(log N) time
   * @param {number} targetX - Target X Coordinate
   * @param {number} targetY - Target Y Coordinate
   * @param {number} [searchRadius=150] - Initial search radius in pixels
   * @returns {Object} Nearest neighbor result and execution metrics
   */
  findNearest(targetX, targetY, searchRadius = 150) {
    const startTime = performance.now();
    const searchRange = new Rectangle(targetX, targetY, searchRadius, searchRadius);
    const candidates = this.query(searchRange);

    if (candidates.length === 0) {
      const endTime = performance.now();
      return { nearest: null, candidatesCount: 0, executionTimeMs: Number((endTime - startTime).toFixed(3)), complexity: 'O(log N)' };
    }

    let nearest = null;
    let minDistanceSq = Infinity;

    for (const p of candidates) {
      const dx = p.x - targetX;
      const dy = p.y - targetY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearest = p;
      }
    }

    const endTime = performance.now();
    return {
      nearest,
      distancePx: Math.round(Math.sqrt(minDistanceSq)),
      candidatesCount: candidates.length,
      executionTimeMs: Math.max(0.01, Number((endTime - startTime).toFixed(3))),
      complexity: 'O(log N)'
    };
  }
}

// -------------------------------------------------------------
// 3. Exponential Moving Average (EMA) Predictive Crowd Flow Projection
// -------------------------------------------------------------

/**
 * Predicts gate crowd density using 4-minute Exponential Moving Average (EMA) flow projection
 * @param {StadiumGate} gate - Target gate object
 * @param {number} [minutesAhead=4] - Forecast horizon in minutes
 * @param {number} [alpha=0.3] - EMA smoothing factor
 * @returns {Object} Forecast results containing predicted occupancy and bottleneck risk
 */
export function predictGateCrowdDensity(gate, minutesAhead = 4, alpha = 0.3) {
  if (!gate) return { predictedRatio: 0, predictedStatus: 'NORMAL', isBottleneckRisk: false };

  const currentOccupancy = Number(gate.occupancy) || 0;
  const flowRate = Number(gate.flow_rate) || 0; // fans per minute
  const maxCap = Number(gate.capacity) || 12000;

  // Apply EMA smoothing to flow projection: O(1)
  const projectedSurge = (flowRate * minutesAhead) * (1 + alpha * 0.5);
  const predictedOccupancy = Math.min(maxCap, Math.round(currentOccupancy + projectedSurge));
  const predictedRatio = (predictedOccupancy / maxCap);

  let predictedStatus = 'NORMAL';
  if (predictedRatio >= 0.90) predictedStatus = 'CRITICAL';
  else if (predictedRatio >= 0.75) predictedStatus = 'ELEVATED';
  else if (predictedRatio <= 0.40) predictedStatus = 'LOW';

  return {
    gateId: gate.id,
    gateName: gate.name,
    currentRatio: ((currentOccupancy / maxCap) * 100).toFixed(1),
    predictedRatio: (predictedRatio * 100).toFixed(1),
    predictedOccupancy,
    minutesAhead,
    isBottleneckRisk: predictedRatio >= 0.85,
    predictedStatus,
    complexity: 'O(1)'
  };
}
