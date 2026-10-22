/**
 * alertService.js
 * ────────────────
 * Axios API calls for the Alert / Notification Center.
 */
import api from './api';

const BASE = '/alerts';

// Get paginated/filtered list of alerts
export const getAlerts = (params = {}) => api.get(BASE, { params });

// Get unread count summary for navbar badge
export const getAlertSummary = () => api.get(`${BASE}/summary`);

// Mark one alert as read
export const markOneRead = (id) => api.patch(`${BASE}/${id}/read`);

// Mark ALL unread alerts as read
export const markAllRead = () => api.patch(`${BASE}/read-all`);

// Delete a single alert
export const deleteAlert = (id) => api.delete(`${BASE}/${id}`);

// Delete all already-read alerts
export const clearReadAlerts = () => api.delete(`${BASE}/clear-read`);
