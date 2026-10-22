/**
 * forecastRoutes.js
 * ─────────────────
 * All routes are protected (require login).
 *
 * POST   /api/forecast/generate           → run forecast, save & return
 * GET    /api/forecast                    → list saved forecasts
 * GET    /api/forecast/recommend/:id      → live recommendation (no save)
 * GET    /api/forecast/history/:productId → raw demand history points
 * POST   /api/forecast/demand-history     → add a demand data point
 */

import express from 'express';
import {
  generateForecast,
  getForecasts,
  getRecommendationOnly,
  getDemandHistory,
  addDemandHistory,
} from '../controllers/forecastController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All forecast routes require authentication
router.use(protect);

router.post('/generate',         generateForecast);
router.get('/',                  getForecasts);
router.get('/recommend/:productId', getRecommendationOnly);
router.get('/history/:productId',   getDemandHistory);
router.post('/demand-history',    addDemandHistory);

export default router;
