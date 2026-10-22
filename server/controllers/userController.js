/**
 * userController.js
 * ─────────────────
 * Admin-only endpoints to manage staff accounts, 
 * change roles, and activate/deactivate users.
 */

import User from '../models/User.js';

// @route   GET /api/users
// @desc    Get all users (excluding passwords)
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/users/:id/status
// @desc    Activate or deactivate a user account
// @access  Private/Admin
export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @route   PATCH /api/users/:id/role
// @desc    Change a user's role (admin, manager, staff)
// @access  Private/Admin
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'manager', 'staff'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided.' });
    }

    // Prevent admin from changing their own role (avoids locking themselves out)
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
