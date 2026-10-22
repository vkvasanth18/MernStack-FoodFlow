import express from 'express';
import {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} from '../controllers/rawMaterialController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getRawMaterials)
  .post(
    protect,
    authorize('admin', 'inventory_manager'),
    createRawMaterial
  );

router
  .route('/:id')
  .get(protect, getRawMaterialById)
  .put(
    protect,
    authorize('admin', 'inventory_manager'),
    updateRawMaterial
  )
  .delete(protect, authorize('admin'), deleteRawMaterial);

export default router;
