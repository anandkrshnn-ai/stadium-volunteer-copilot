/**
 * Algorithmic Engine for Stadium Volunteer Copilot
 * Implements Binary Search lookups over pre-indexed gate sorted arrays,
 * 2D Spatial QuadTree node searching, and linear ingress flow projection.
 *
 * @module Algorithms Engine
 */

/**
 * Gate object data structure representing stadium IoT telemetry.
 * @typedef {Object} StadiumGate
 * @property {string} id - Unique Gate Identifier (e.g. G01)
 * @property {string} name - Human-readable gate name
 * @property {number} capacity - Maximum crowd capacity
 * @property {number} occupancy - Current crowd occupancy count
 * @property {number} flow_rate - Turnstile flow rate in fans per minute
 * @property {string} status - Operational status (CRITICAL | ELEVATED | NORMAL | LOW)
 * @property {boolean} step_free - Step-free wheelchair accessibility flag
 * @property {number} x - 2D Map Coordinate X (pixels)
 * @property {number} y - 2D Map Coordinate Y (pixels)
 */

export class GateBinarySearch {
  /**
   * Constructs the Binary Search index engine.
   * @param {StadiumGate[]} [gates=[]] - Initial array of stadium gates
   */
  constructor(gates = []) {
    this.updateGates(gates);
  }

  /**
   * Constructs and updates pre-sorted indices for binary search operations.
   * Maintains separate sorted arrays for general occupancy and step-free occupancy.
   * Complexity: O(N log N) during initialization.
   *
   * @param {StadiumGate[]} [gates=[]] - Array of stadium gates
   */
  updateGates(gates = []) {
    if (!Array.isArray(gates)) return;

    // Index 1: Sorted by Gate ID for direct ID lookups: O(N log N)
    this.gatesById = [...gates].sort((a, b) => a.id.localeCompare(b.id));

    // Index 2: Sorted by Occupancy Ratio (all gates): O(N log N)
    this.gatesByOccupancy = [...gates].sort(
      (a, b) => (a.occupancy / a.capacity) - (b.occupancy / b.capacity)
    );

    // Index 3: Sorted by Occupancy Ratio (step-free accessible gates only): O(N log N)
    this.gatesByStepFreeOccupancy = gates
      .filter(g => g.step_free)
      .sort((a, b) => (a.occupancy / a.capacity) - (b.occupancy / b.capacity));
  }

  /**
   * Binary Search lookup by Gate ID.
   * Time Complexity: O(log N)
   * Space Complexity: O(1)
   *
   * @param {string} gateId - Target Gate ID
   * @returns {Object} Result payload containing found gate, step count, latency, and time complexity
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
   * Binary Search threshold lookup for lowest occupancy gate matching criteria.
   * Operates directly over pre-sorted target arrays to avoid post-filtering.
   * Time Complexity: O(log N) binary search for threshold cutoff + O(1) index access
   * Space Complexity: O(1)
   *
   * @param {number} [maxRatioAllowed=0.80] - Maximum occupancy ratio threshold (0.0 to 1.0)
   * @param {boolean} [stepFreeOnly=false] - Restrict search to step-free accessible gates
   * @returns {Object} Result object with selected gate candidate and execution metrics
   */
  findLowestOccupancyGate(maxRatioAllowed = 0.80, stepFreeOnly = false) {
    const startTime = performance.now();
    const targetArray = stepFreeOnly ? this.gatesByStepFreeOccupancy : this.gatesByOccupancy;

    if (!targetArray || targetArray.length === 0) {
      const fallback = this.gatesByOccupancy.length > 0 ? this.gatesByOccupancy[0] : null;
      const endTime = performance.now();
      return { bestGate: fallback, candidatesCount: 0, executionTimeMs: Number((endTime - startTime).toFixed(3)), complexity: 'O(log N)' };
    }

    // Binary search for highest index matching ratio threshold: O(log N)
    let low = 0;
    let high = targetArray.length - 1;
    let cutoffIdx = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const ratio = targetArray[mid].occupancy / targetArray[mid].capacity;

      if (ratio <= maxRatioAllowed) {
        cutoffIdx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Lowest occupancy matching gate is targetArray[0] if cutoffIdx >= 0, else fallback to lowest overall
    const resultGate = targetArray.length > 0 ? targetArray[0] : null;
    const candidatesCount = cutoffIdx >= 0 ? cutoffIdx + 1 : 0;
    const endTime = performance.now();

    return {
      bestGate: resultGate,
      candidatesCount,
      executionTimeMs: Math.max(0.01, Number((endTime - startTime).toFixed(3))),
      complexity: 'O(log N)'
    };
  }
}

// -------------------------------------------------------------
// 2. Spatial QuadTree for Spatial Range & Nearest Neighbor Searching
// -------------------------------------------------------------

/**
 * 2D Spatial Point representation.
 */
export class Point {
  /**
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} [data={}] - Associated payload object
   */
  constructor(x, y, data = {}) {
    this.x = Number(x);
    this.y = Number(y);
    this.data = data;
  }
}

/**
 * Axis-Aligned Bounding Box (AABB) for spatial partitioning.
 */
export class Rectangle {
  /**
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} w - Half-width
   * @param {number} h - Half-height
   */
  constructor(x, y, w, h) {
    this.x = Number(x);
    this.y = Number(y);
    this.w = Number(w);
    this.h = Number(h);
  }

  /**
   * Checks if a point lies within the bounding box.
   * @param {Point} point - Point to test
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
   * Checks if another bounding box intersects with this one.
   * @param {Rectangle} range - Range to test
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
 * Spatial QuadTree data structure for 2D spatial indexing.
 * Average Time Complexity: O(log N) for spatial range queries and nearest-neighbor lookups.
 */
export class QuadTree {
  /**
   * @param {Rectangle} boundary - Spatial boundary for this node
   * @param {number} [capacity=4] - Maximum point capacity before subdivision
   */
  constructor(boundary, capacity = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  /**
   * Subdivides current node into 4 quadrant children.
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
   * Inserts a point into the QuadTree.
   * Time Complexity: O(log N) average
   *
   * @param {Point} point - Point to insert
   * @returns {boolean} True if insertion succeeded
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
   * Range query returning points within bounding box.
   * Time Complexity: O(log N + K) where K is points found
   *
   * @param {Rectangle} range - Search boundary
   * @param {Point[]} [found=[]] - Accumulator
   * @returns {Point[]}
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
   * Finds nearest neighbor point within a radius.
   * Time Complexity: O(log N) average
   *
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
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
// 3. Linear Flow Rate Ingress Projection Model
// -------------------------------------------------------------

/**
 * Computes projected gate occupancy using turnstile flow rate metrics.
 * Time Complexity: O(1)
 *
 * @param {StadiumGate} gate - Target gate object
 * @param {number} [minutesAhead=4] - Forecast horizon in minutes
 * @param {number} [multiplier=1.15] - Ingress flow adjustment factor
 * @returns {Object} Flow projection metrics and bottleneck status
 */
export function predictGateCrowdDensity(gate, minutesAhead = 4, multiplier = 1.15) {
  if (!gate) return { predictedRatio: "0.0", predictedStatus: 'NORMAL', isBottleneckRisk: false };

  const currentOccupancy = Number(gate.occupancy) || 0;
  const flowRate = Number(gate.flow_rate) || 0;
  const maxCap = Number(gate.capacity) || 12000;

  // Linear ingress projection with flow multiplier: O(1)
  const projectedSurge = flowRate * minutesAhead * multiplier;
  const predictedOccupancy = Math.min(maxCap, Math.round(currentOccupancy + projectedSurge));
  const predictedRatio = predictedOccupancy / maxCap;

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
