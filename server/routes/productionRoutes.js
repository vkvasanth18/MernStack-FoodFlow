import express from 'express';
import {
  getProductions,
  getProductionById,
  createProduction,
  updateProduction,
  deleteProduction,
} from '../controllers/productionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getProductions)
  .post(
    protect,
    authorize('admin', 'production_manager'),
    createProduction
  );

router
  .route('/:id')
  .get(protect, getProductionById)
  .put(
    protect,
    authorize('admin', 'production_manager'),
    updateProduction
  )
  .delete(protect, authorize('admin'), deleteProduction);

export default router;
