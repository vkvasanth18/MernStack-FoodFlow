import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

/**
 * ProtectedRoute
 * ──────────────
 * Props:
 *   allowedRoles   – array of role strings, e.g. ['admin', 'production_manager']
 *                    If omitted, any authenticated user is allowed.
 *   redirectOnFail – optional path to redirect to instead of showing the
 *                    "Access Restricted" page (useful for /dashboard itself).
 */
const ProtectedRoute = ({ children, allowedRoles, redirectOnFail }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // ── 1. Waiting for session to be verified ─────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // ── 2. Not logged in → go to login ───────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 3. Role check ─────────────────────────────────────────────────
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If a redirect path is explicitly provided, use it silently
    if (redirectOnFail) {
      return <Navigate to={redirectOnFail} replace />;
    }

    // Otherwise show the access-denied UI
    const roleLabel = {
      admin: 'System Admin',
      production_manager: 'Production Manager',
      inventory_manager: 'Inventory Manager',
    }[user.role] || user.role;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-600 max-w-md mb-1">
          This module is not available for your role.
        </p>
        <p className="text-slate-500 text-sm max-w-md mb-6">
          Logged in as <span className="font-semibold text-slate-700">{user.name}</span>
          {' '}({roleLabel}). Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
