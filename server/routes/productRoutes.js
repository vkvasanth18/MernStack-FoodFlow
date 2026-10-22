import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductRecipe,
  updateProductRecipe,
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getProducts)
  .post(protect, authorize('admin', 'production_manager'), createProduct);

router
  .route('/:id/recipe')
  .get(protect, getProductRecipe)
  .put(protect, authorize('admin', 'production_manager'), updateProductRecipe);

router
  .route('/:id')
  .get(protect, getProductById)
  .put(
    protect,
    authorize('admin', 'production_manager', 'inventory_manager'),
    updateProduct
  )
  .delete(protect, authorize('admin'), deleteProduct);

export default router;
