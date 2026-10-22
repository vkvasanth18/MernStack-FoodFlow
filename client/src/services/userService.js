/**
 * userService.js
 * ──────────────
 * API calls for admin user management.
 */

import api from './api';

export const getUsers = () => api.get('/users');

export const updateUserStatus = (id, isActive) =>
  api.patch(`/users/${id}/status`, { isActive });

export const updateUserRole = (id, role) =>
  api.patch(`/users/${id}/role`, { role });
