/**
 * dashboardRoutes.js
 * ──────────────────
 * GET /api/dashboard/stats  → all KPIs + chart data (protected)
 */

import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStats);

export default router;
