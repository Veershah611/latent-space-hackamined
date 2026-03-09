/**
 * API service for SolarSight FastAPI backend
 * Endpoints: /health, /predict, /explain, /query
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  const response = await fetch(url, config);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  /** GET /health — Health check */
  async getHealth() {
    return request('/health');
  },

  /** GET /inverters — Risk overview for dashboard */
  async getInverters() {
    return request('/inverters');
  },

  /** POST /predict — Get risk score for inverter */
  async predict(inverterId, telemetry, alarmHistory = []) {
    return request('/predict', {
      method: 'POST',
      body: JSON.stringify({
        inverter_id: inverterId,
        telemetry,
        alarm_history: alarmHistory,
      }),
    });
  },

  /** POST /explain — Get GenAI narrative for prediction */
  async explain(inverterId, predictionData, parameters = null) {
    return request('/explain', {
      method: 'POST',
      body: JSON.stringify({
        inverter_id: inverterId,
        ...predictionData,
        parameters: parameters,
      }),
    });
  },

  /** POST /query — RAG-powered operator Q&A */
  async query(question, inverterId = null, riskScore = null, topFeatures = null, fleetContext = null, parameters = null) {
    return request('/query', {
      method: 'POST',
      body: JSON.stringify({
        question,
        inverter_id: inverterId,
        risk_score: riskScore,
        top_features: topFeatures,
        csv_context: fleetContext,
        parameters: parameters,
      }),
    });
  },

  /** POST /predict_csv — Batch predict from CSV file */
  async predictCSV(file) {
    const formData = new FormData();
    formData.append('file', file);

    // We cannot use the common request() wrapper because we must not set Content-Type manually
    // The browser will automatically set multipart/form-data with the correct boundary
    const response = await fetch(`${API_BASE}/predict_csv`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errObj = JSON.parse(errorText);
        errorText = errObj.detail || errorText;
      } catch (e) { }
      console.error("Predict CSV Error:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
};
