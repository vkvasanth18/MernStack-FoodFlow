import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getSuppliers)
  .post(
    protect,
    authorize('admin', 'inventory_manager'),
    createSupplier
  );

router
  .route('/:id')
  .get(protect, getSupplierById)
  .put(
    protect,
    authorize('admin', 'inventory_manager'),
    updateSupplier
  )
  .delete(protect, authorize('admin'), deleteSupplier);

export default router;
