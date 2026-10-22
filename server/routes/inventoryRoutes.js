import express from 'express';
import {
  getTransactions,
  recordTransaction,
  getInventorySummary,
} from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/transactions', protect, getTransactions);
router.post(
  '/transactions',
  protect,
  authorize('admin', 'inventory_manager'),
  recordTransaction
);
router.get('/summary', protect, getInventorySummary);

export default router;
