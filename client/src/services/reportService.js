/**
 * reportService.js
 * ─────────────────
 * Axios calls for all report endpoints.
 *
 * For CSV exports, we trigger a browser file download
 * by creating a hidden <a> link — no special library needed.
 */
import api, { getBaseURL } from './api';

const BASE = '/reports';

// ── JSON data endpoints (for table display) ──────────────────
export const getProductionReport = (params = {}) =>
  api.get(`${BASE}/production`, { params });

export const getWasteReport = (params = {}) =>
  api.get(`${BASE}/waste`, { params });

export const getInventoryReport = (params = {}) =>
  api.get(`${BASE}/inventory`, { params });

// ── CSV download helper ───────────────────────────────────────
// Calls the export endpoint, receives the CSV text, and
// triggers a browser "Save As" download dialog.
export const downloadCSV = async (type, params = {}) => {
  const token = localStorage.getItem('token');

  // Build the full query string from params
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();

  const url = `${getBaseURL()}/reports/export/${type}${query ? '?' + query : ''}`;

  // Fetch the CSV with auth header
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Export failed');

  const blob = await response.blob();
  const link = document.createElement('a');
  link.href  = URL.createObjectURL(blob);
  link.download = `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
