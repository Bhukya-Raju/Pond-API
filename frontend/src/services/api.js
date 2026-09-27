const getDefaultUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    const port = window.location.port;
    if (port === '5173' || port === '4173') {
      return `http://${host}:8000`;
    }
    if (['3293', '4293', '6293', '7293'].includes(port)) {
      return `http://${host}:5293`;
    }
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
};

const DEFAULT_BACKEND_URL = getDefaultUrl();

class ApiService {
  constructor() {
    this.baseUrl = localStorage.getItem('hydropond_api_url') || DEFAULT_BACKEND_URL;
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
    localStorage.setItem('hydropond_api_url', this.baseUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async checkHealth() {
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      const latency = Math.round(performance.now() - start);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { ok: true, latency, data };
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      return { ok: false, latency, error: err.message };
    }
  }

  async getSamples() {
    const res = await fetch(`${this.baseUrl}/samples`);
    if (!res.ok) throw new Error('Failed to fetch sample datasets');
    return await res.json();
  }

  async getSampleGeoJSON(filename) {
    const res = await fetch(`${this.baseUrl}/samples/${filename}/geojson`);
    if (!res.ok) throw new Error('Failed to fetch sample GeoJSON contours');
    return await res.json();
  }

  async analyzeContourFile({ file, gridSize = 180, sampleSpacingM = 10.0, rainfallMm = 1000, runoffCoeff = 0.35, polygonGeoJSON = null }) {
    const formData = new FormData();
    formData.append('file', file);
    if (polygonGeoJSON) {
      formData.append('polygon_geojson', JSON.stringify(polygonGeoJSON));
    }

    const queryParams = new URLSearchParams({
      grid_size: gridSize.toString(),
      sample_spacing_m: sampleSpacingM.toString(),
      rainfall_mm: rainfallMm.toString(),
      runoff_coefficient: runoffCoeff.toString(),
    });

    const start = performance.now();
    const res = await fetch(`${this.baseUrl}/analyzeContour?${queryParams.toString()}`, {
      method: 'POST',
      body: formData,
    });

    const latency = Math.round(performance.now() - start);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(errData.detail || `Server error (${res.status})`);
    }

    const data = await res.json();
    data._clientLatencyMs = latency;
    return data;
  }

  async analyzeLandArea({ polygon, rainfallMm = 1000, runoffCoeff = 0.35, gridSize = 180, sampleSpacingM = 10.0 }) {
    const start = performance.now();
    const res = await fetch(`${this.baseUrl}/analyzeArea`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        polygon,
        rainfall_mm: rainfallMm,
        runoff_coefficient: runoffCoeff,
        grid_size: gridSize,
        sample_spacing_m: sampleSpacingM,
      }),
    });

    const latency = Math.round(performance.now() - start);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Land area analysis failed' }));
      throw new Error(errData.detail || `Server error (${res.status})`);
    }

    const data = await res.json();
    data._clientLatencyMs = latency;
    return data;
  }

  async recalculateVolume({ catchmentAreaM2, rainfallMm, runoffCoeff, pondDepthM = 3.0 }) {
    const res = await fetch(`${this.baseUrl}/calculateVolume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        catchment_area_m2: catchmentAreaM2,
        rainfall_mm: rainfallMm,
        runoff_coefficient: runoffCoeff,
        pond_depth_m: pondDepthM,
      }),
    });

    if (!res.ok) throw new Error('Volume calculation failed');
    return await res.json();
  }
}

export const api = new ApiService();
