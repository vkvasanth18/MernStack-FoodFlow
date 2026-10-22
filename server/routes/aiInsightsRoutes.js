/**
 * aiInsightsRoutes.js
 * ───────────────────
 * Routes for the AI Operational Insights Engine
 *
 * GET  /api/ai-insights           → Run deep diagnostic scan & risk index
 * POST /api/ai-insights/mitigate  → Auto-sync alerts with Alert Center
 * POST /api/ai-insights/simulate  → What-If Scenario simulation
 */

import express from 'express';
import {
  getAIInsights,
  triggerAutoMitigation,
  simulateScenario,
} from '../controllers/aiInsightsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require authentication for all insights endpoints
router.use(protect);

router.get('/', getAIInsights);
router.post('/mitigate', triggerAutoMitigation);
router.post('/simulate', simulateScenario);

export default router;
