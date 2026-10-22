/**
 * alertRoutes.js
 * ──────────────
 * All routes require authentication (protect middleware).
 *
 * GET    /api/alerts                → list alerts (filterable)
 * GET    /api/alerts/summary        → unread badge counts
 * PATCH  /api/alerts/read-all       → mark all read
 * DELETE /api/alerts/clear-read     → delete all read alerts
 * PATCH  /api/alerts/:id/read       → mark one read
 * DELETE /api/alerts/:id            → delete one alert
 *
 * ⚠️  IMPORTANT ROUTE ORDER:
 *   "read-all" and "clear-read" must be defined BEFORE "/:id"
 *   otherwise Express would treat "read-all" as an :id parameter.
 */

import express from 'express';
import {
  getAlerts,
  getAlertSummary,
  markOneRead,
  markAllRead,
  deleteAlert,
  clearReadAlerts,
} from '../controllers/alertController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All alert routes are protected
router.use(protect);

// Fixed-path routes first (before /:id)
router.get('/',              getAlerts);
router.get('/summary',       getAlertSummary);
router.patch('/read-all',    markAllRead);
router.delete('/clear-read', clearReadAlerts);

// Dynamic :id routes last
router.patch('/:id/read',    markOneRead);
router.delete('/:id',        deleteAlert);

export default router;
