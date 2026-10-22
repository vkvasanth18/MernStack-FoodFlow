import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Profile from './pages/auth/Profile';

// Dashboard Page
import Dashboard from './pages/dashboard/Dashboard';

// Product Module
import ProductList from './pages/products/ProductList';

// Raw Materials & Suppliers
import RawMaterialList from './pages/inventory/RawMaterialList';
import SupplierList from './pages/suppliers/SupplierList';

// Inventory Movements & Production Planning
import InventoryLedger from './pages/inventory/InventoryLedger';
import ProductionList from './pages/production/ProductionList';

// Waste Management
import WasteManagement from './pages/waste/WasteManagement';

// Demand Forecasting & AI Recommendations
import ForecastPage from './pages/forecast/ForecastPage';

// Alert Center
import AlertCenter from './pages/alerts/AlertCenter';

// Reports & CSV Export
import ReportsPage from './pages/reports/ReportsPage';

// User Management (Admin)
import UserManagement from './pages/users/UserManagement';

// AI Operational Insights Module
import AIInsightsPage from './pages/insights/AIInsightsPage';

// Module Placeholder for pages to be built in subsequent steps
import ModulePlaceholder from './components/common/ModulePlaceholder';

// ── Role constants ──────────────────────────────────────────────
const ADMIN                = ['admin'];
const ADMIN_PROD           = ['admin', 'production_manager'];
const ADMIN_INV            = ['admin', 'inventory_manager'];
const ALL_ROLES            = ['admin', 'production_manager', 'inventory_manager'];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0f172a',
              color: '#fff',
              fontSize: '13px',
              borderRadius: '10px',
            },
          }}
        />

        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect — goes to dashboard (role-aware content handled there) */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* ── Dashboard: accessible to all authenticated roles ── */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* ── Profile: all roles ── */}
            <Route path="/profile" element={<Profile />} />

            {/* ── Admin + Production Manager ── */}
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={ADMIN_PROD}>
                  <ProductList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/production"
              element={
                <ProtectedRoute allowedRoles={ADMIN_PROD}>
                  <ProductionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/waste"
              element={
                <ProtectedRoute allowedRoles={ADMIN_PROD}>
                  <WasteManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forecast"
              element={
                <ProtectedRoute allowedRoles={ADMIN_PROD}>
                  <ForecastPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-insights"
              element={
                <ProtectedRoute allowedRoles={ADMIN_PROD}>
                  <AIInsightsPage />
                </ProtectedRoute>
              }
            />

            {/* ── Admin + Inventory Manager ── */}
            <Route
              path="/raw-materials"
              element={
                <ProtectedRoute allowedRoles={ADMIN_INV}>
                  <RawMaterialList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={ADMIN_INV}>
                  <InventoryLedger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute allowedRoles={ADMIN_INV}>
                  <SupplierList />
                </ProtectedRoute>
              }
            />

            {/* ── All roles ── */}
            <Route
              path="/alerts"
              element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <AlertCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* ── Admin only ── */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={ADMIN}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
