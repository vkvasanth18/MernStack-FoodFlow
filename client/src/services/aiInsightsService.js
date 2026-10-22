/**
 * aiInsightsService.js
 * ────────────────────
 * Client API service for the AI Operational Insights Module
 */

import API from './api';

/**
 * Fetch full AI diagnostic operational scan
 */
export const getAIInsights = async () => {
  const res = await API.get('/ai-insights');
  return res.data;
};

/**
 * Trigger automated sync of AI recommendations into Alert Center
 */
export const triggerAutoMitigation = async (insightIds = []) => {
  const res = await API.post('/ai-insights/mitigate', { insightIds });
  return res.data;
};

/**
 * Run What-If Scenario simulation
 * @param {object} params - { demandSurgePercent, leadTimeDelayDays, targetProductId }
 */
export const simulateScenario = async (params) => {
  const res = await API.post('/ai-insights/simulate', params);
  return res.data;
};
