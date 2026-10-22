import express from 'express';
import {
  getWasteRecords,
  createWasteRecord,
  getWasteAnalytics,
  deleteWasteRecord,
} from '../controllers/wasteController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getWasteRecords)
  .post(protect, createWasteRecord);

router.get('/analytics', protect, getWasteAnalytics);
router.delete('/:id', protect, authorize('admin'), deleteWasteRecord);

export default router;
