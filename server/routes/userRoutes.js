/**
 * userRoutes.js
 * ─────────────
 * Routes for user management.
 * All endpoints here are protected and require the 'admin' role.
 */

import express from 'express';
import {
  getUsers,
  updateUserStatus,
  updateUserRole,
  transferAdminRole,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth and admin-only middleware to all routes in this file
router.use(protect);
router.use(authorize('admin'));

router.get('/', getUsers);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/role', updateUserRole);
router.post('/transfer-admin', transferAdminRole);

export default router;
