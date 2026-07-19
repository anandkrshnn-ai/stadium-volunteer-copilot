/**
 * Jury Data Upload & Evaluation Portal
 * Allows hackathon evaluators to drop custom CSV or JSON files to test live functionality.
 */

export class JuryDataPortal {
  constructor(onDataLoadedCallback) {
    this.onDataLoaded = onDataLoadedCallback;
  }

  /**
   * Parses CSV text into gate object array
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => h.trim());
    const gates = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
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
   * Reads JSON text and validates structure
   */
  parseJSON(jsonText) {
    try {
      const data = JSON.parse(jsonText);
      if (Array.isArray(data.gates)) {
        return data.gates;
      } else if (Array.isArray(data)) {
        return data;
      }
      return null;
    } catch (e) {
      console.error("Failed to parse JSON", e);
      return null;
    }
  }

  /**
   * Process dropped or selected File object
   */
  async handleFile(file) {
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
      alert("Could not extract gate telemetry data from file. Please check file format.");
    }
  }
}
