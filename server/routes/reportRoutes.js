/**
 * reportRoutes.js
 * ────────────────
 * All routes require authentication.
 *
 * GET /api/reports/production          → production report
 * GET /api/reports/waste               → waste report
 * GET /api/reports/inventory           → inventory movement report
 * GET /api/reports/export/production   → download CSV
 * GET /api/reports/export/waste        → download CSV
 * GET /api/reports/export/inventory    → download CSV
 */

import express from 'express';
import {
  getProductionReport,
  getWasteReport,
  getInventoryReport,
  exportProductionCSV,
  exportWasteCSV,
  exportInventoryCSV,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// JSON reports (for table display in the UI)
router.get('/production',        getProductionReport);
router.get('/waste',             getWasteReport);
router.get('/inventory',         getInventoryReport);

// CSV download routes
router.get('/export/production', exportProductionCSV);
router.get('/export/waste',      exportWasteCSV);
router.get('/export/inventory',  exportInventoryCSV);

export default router;
