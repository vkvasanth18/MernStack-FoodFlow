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
// @desc    Change a user's role (admin, production_manager, inventory_manager)
// @access  Private/Admin
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    
    const validRoles = ['admin', 'production_manager', 'inventory_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role provided. Valid roles: ${validRoles.join(', ')}`,
      });
    }

    // Prevent admin from changing their own role (avoids locking themselves out)
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role directly. Use the transfer-admin procedure.' });
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

// @route   POST /api/users/transfer-admin
// @desc    Securely transfer the primary administrator role to another verified user
// @access  Private/Admin
export const transferAdminRole = async (req, res, next) => {
  try {
    const { targetEmail, newRoleForCurrentAdmin = 'production_manager' } = req.body;

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the email address of the target user.',
      });
    }

    if (!['production_manager', 'inventory_manager'].includes(newRoleForCurrentAdmin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role for demoted admin. Must be production_manager or inventory_manager.',
      });
    }

    const currentAdminId = req.user._id;

    // Find the target user
    const targetUser = await User.findOne({ email: targetEmail.trim().toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `Target user with email '${targetEmail}' does not exist.`,
      });
    }

    if (!targetUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer admin role to an inactive user account.',
      });
    }

    if (targetUser._id.toString() === currentAdminId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You already hold the Administrator role.',
      });
    }

    // Perform atomic role transfer
    targetUser.role = 'admin';
    await targetUser.save();

    const currentAdmin = await User.findById(currentAdminId);
    if (currentAdmin) {
      currentAdmin.role = newRoleForCurrentAdmin;
      await currentAdmin.save();
    }

    res.status(200).json({
      success: true,
      message: `Administrator ownership successfully transferred to ${targetUser.name} (${targetUser.email}). Your role is now ${newRoleForCurrentAdmin}.`,
      newAdmin: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      previousAdmin: {
        id: currentAdmin?._id,
        name: currentAdmin?.name,
        email: currentAdmin?.email,
        role: currentAdmin?.role,
      },
    });
  } catch (err) {
    next(err);
  }
};
