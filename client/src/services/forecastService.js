/**
 * forecastService.js
 * ──────────────────
 * All API calls related to demand forecasting and AI recommendations.
 */
import api from './api';

const BASE = '/forecast';

// Generate a new forecast and get recommendation
export const generateForecast = (data) => api.post(`${BASE}/generate`, data);

// Get list of all saved forecasts (with optional filters)
export const getForecasts = (params = {}) => api.get(BASE, { params });

// Get live recommendation for a product (no save)
export const getRecommendation = (productId, params = {}) =>
  api.get(`${BASE}/recommend/${productId}`, { params });

// Get raw demand history points for a product (for charting)
export const getDemandHistory = (productId, params = {}) =>
  api.get(`${BASE}/history/${productId}`, { params });

// Add a manual demand data point
export const addDemandHistory = (data) => api.post(`${BASE}/demand-history`, data);
