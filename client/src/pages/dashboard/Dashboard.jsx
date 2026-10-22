/**
 * Dashboard.jsx
 * ─────────────
 * Role-aware dashboard — renders a different view based on the logged-in user's role:
 *
 *   admin             → Full system overview (all KPIs)
 *   production_manager → Production-focused view
 *   inventory_manager  → Inventory-focused view
 *
 * All data comes from GET /api/dashboard/stats which returns role-scoped data.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import {
  Package,
  Layers,
  Factory,
  Trash2,
  Bell,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronRight,
  BarChart2,
  Loader,
  Truck,
  ShieldCheck,
  CalendarCheck,
  Zap,
  ThermometerSun,
  Archive,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Utility ───────────────────────────────────────────────────────
const fmt = (n, dec = 0) =>
  n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: dec });

// ── Shared sub-components ─────────────────────────────────────────

function KpiCard({ label, value, unit, sub, subColor = 'text-slate-500', icon: Icon, iconBg, iconColor, to }) {
  const inner = (
    <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {sub && <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>}
      {to && (
        <span className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1">
          View details <ChevronRight size={12} />
        </span>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function RiskPill({ count, label, color, to }) {
  const colors = {
    red   : 'bg-red-50    border-red-200    text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green : 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return (
    <Link to={to}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition hover:opacity-80 ${colors[color]}`}>
      <span className="text-lg font-bold">{count}</span>
      {label}
    </Link>
  );
}

function SectionCard({ title, icon: Icon, iconColor = 'text-slate-400', to, toLabel = 'View all', children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Icon size={14} className={iconColor} />
          {title}
        </h3>
        {to && <Link to={to} className="text-xs text-brand-600 hover:underline">{toLabel}</Link>}
      </div>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <Loader size={32} className="text-brand-500 animate-spin" />
      <p className="text-slate-500 text-sm">Loading dashboard data…</p>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
      <AlertTriangle size={36} className="text-yellow-500" />
      <div>
        <p className="text-slate-800 font-semibold">Could not load dashboard</p>
        <p className="text-slate-400 text-sm mt-1">
          Make sure the backend server is running and MongoDB is connected.
        </p>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm">
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

// ── Welcome Banner ────────────────────────────────────────────────

const BANNER_CONFIG = {
  admin: {
    badge: 'AI Production Optimization Active',
    tagline: 'The platform is monitoring production schedules, warehouse safety stocks, and ingredient shelf-life in real-time.',
    gradient: 'from-slate-900 via-slate-800 to-emerald-950',
  },
  production_manager: {
    badge: 'Production Operations Center',
    tagline: 'Live monitoring of production batches, efficiency metrics, waste tracking, and demand forecasts.',
    gradient: 'from-slate-900 via-emerald-950 to-teal-950',
  },
  inventory_manager: {
    badge: 'Inventory Control Center',
    tagline: 'Real-time tracking of raw material stock levels, expiry dates, FIFO movements, and supplier status.',
    gradient: 'from-slate-900 via-slate-800 to-sky-950',
  },
};

function WelcomeBanner({ user }) {
  const cfg = BANNER_CONFIG[user?.role] || BANNER_CONFIG.admin;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${cfg.gradient} p-6 sm:p-8 text-white shadow-xl`}>
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          {cfg.badge}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Welcome back, {user?.name || 'Operator'}!
        </h1>
        <p className="text-sm text-slate-300 mt-2">{cfg.tagline}</p>
      </div>
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-500/10 blur-2xl" />
      <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-emerald-400/10 blur-xl" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── ADMIN DASHBOARD ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function AdminDashboard({ data, onRefresh }) {
  const { kpis = {}, chartData = [], recentActivity = [], topProducts = [], activeBatches = [] } = data;

  return (
    <div className="space-y-6">

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Active Products" value={fmt(kpis.totalProducts)}
          sub="Catalog Live" subColor="text-blue-600"
          icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" to="/products" />
        <KpiCard label="Raw Ingredients" value={fmt(kpis.totalRawMaterials)}
          sub="Tracked (FIFO)" subColor="text-purple-600"
          icon={Layers} iconBg="bg-purple-50" iconColor="text-purple-600" to="/raw-materials" />
        <KpiCard label="Weekly Output" value={fmt(kpis.weeklyProductionUnits)} unit="units"
          sub={`${kpis.weeklyBatchCount || 0} batches`}
          icon={Factory} iconBg="bg-emerald-50" iconColor="text-emerald-600" to="/production" />
        <KpiCard label="Avg Efficiency" value={fmt(kpis.avgEfficiency, 1)} unit="%"
          sub={kpis.avgEfficiency >= 90 ? '✅ Excellent' : kpis.avgEfficiency >= 75 ? '⚠️ Good' : '❌ Needs work'}
          subColor={kpis.avgEfficiency >= 90 ? 'text-green-600' : kpis.avgEfficiency >= 75 ? 'text-yellow-600' : 'text-red-600'}
          icon={TrendingUp} iconBg="bg-teal-50" iconColor="text-teal-600" to="/production" />
        <KpiCard label="Waste This Week" value={fmt(kpis.weeklyWasteQty, 1)} unit="units"
          sub={`₹${fmt(kpis.weeklyWasteCost, 2)} cost`} subColor="text-rose-600"
          icon={Trash2} iconBg="bg-rose-50" iconColor="text-rose-600" to="/waste" />
        <KpiCard label="Unread Alerts" value={fmt(kpis.unreadAlerts)}
          sub={kpis.criticalAlerts > 0 ? `${kpis.criticalAlerts} critical` : 'None critical'}
          subColor={kpis.criticalAlerts > 0 ? 'text-red-600' : 'text-green-600'}
          icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-600" to="/alerts" />
      </div>

      {/* Risk Indicators */}
      <div className="flex flex-wrap gap-3">
        <span className="text-xs font-semibold text-slate-500 self-center uppercase tracking-wider mr-1">
          Quick Risk View:
        </span>
        <RiskPill count={kpis.lowStockCount || 0} label="Low Stock Items"
          color={kpis.lowStockCount > 0 ? 'red' : 'green'} to="/raw-materials" />
        <RiskPill count={kpis.nearExpiryCount || 0} label="Near Expiry (7d)"
          color={kpis.nearExpiryCount > 0 ? 'orange' : 'green'} to="/raw-materials" />
        <RiskPill count={kpis.unreadAlerts || 0} label="Unread Alerts"
          color={kpis.criticalAlerts > 0 ? 'red' : kpis.unreadAlerts > 0 ? 'yellow' : 'green'} to="/alerts" />
        <RiskPill count={activeBatches.length || 0} label="Active Batches" color="green" to="/production" />
      </div>

      {/* Chart */}
      <ProductionWasteChart chartData={chartData} />

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveBatchesPanel batches={activeBatches} />
        <TopProductsPanel products={topProducts} />
      </div>

      {/* Activity */}
      <RecentActivityPanel activity={recentActivity} />

      <RefreshFooter onRefresh={onRefresh} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── PRODUCTION MANAGER DASHBOARD ─────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function ProductionManagerDashboard({ data, onRefresh }) {
  const { kpis = {}, chartData = [], activeBatches = [], recentWaste = [] } = data;

  return (
    <div className="space-y-6">

      {/* 6 Production KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Today's Output" value={fmt(kpis.todayProductionUnits)} unit="units"
          sub={`${kpis.todayBatchCount || 0} batches today`} subColor="text-emerald-600"
          icon={CalendarCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" to="/production" />
        <KpiCard label="Weekly Output" value={fmt(kpis.weeklyProductionUnits)} unit="units"
          sub={`${kpis.weeklyBatchCount || 0} batches`}
          icon={Factory} iconBg="bg-teal-50" iconColor="text-teal-600" to="/production" />
        <KpiCard label="Avg Efficiency" value={fmt(kpis.avgEfficiency, 1)} unit="%"
          sub={kpis.avgEfficiency >= 90 ? '✅ Excellent' : kpis.avgEfficiency >= 75 ? '⚠️ Good' : '❌ Needs work'}
          subColor={kpis.avgEfficiency >= 90 ? 'text-green-600' : kpis.avgEfficiency >= 75 ? 'text-yellow-600' : 'text-red-600'}
          icon={Zap} iconBg="bg-yellow-50" iconColor="text-yellow-600" to="/production" />
        <KpiCard label="Active Batches" value={activeBatches.length}
          sub="Currently running" subColor="text-blue-600"
          icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" to="/production" />
        <KpiCard label="Weekly Waste" value={fmt(kpis.weeklyWasteQty, 1)} unit="units"
          sub={`${kpis.wastePercentage || 0}% of output`} subColor="text-rose-600"
          icon={Trash2} iconBg="bg-rose-50" iconColor="text-rose-600" to="/waste" />
        <KpiCard label="Alerts" value={fmt(kpis.unreadAlerts)}
          sub={kpis.criticalAlerts > 0 ? `${kpis.criticalAlerts} critical` : 'None critical'}
          subColor={kpis.criticalAlerts > 0 ? 'text-red-600' : 'text-green-600'}
          icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-600" to="/alerts" />
      </div>

      {/* Risk row */}
      <div className="flex flex-wrap gap-3">
        <span className="text-xs font-semibold text-slate-500 self-center uppercase tracking-wider mr-1">
          Production Status:
        </span>
        <RiskPill count={activeBatches.length} label="Active Batches" color="green" to="/production" />
        <RiskPill count={kpis.weeklyWasteQty || 0} label="Waste Units (wk)" color={kpis.wastePercentage > 5 ? 'orange' : 'green'} to="/waste" />
        <RiskPill count={kpis.unreadAlerts || 0} label="Unread Alerts"
          color={kpis.criticalAlerts > 0 ? 'red' : kpis.unreadAlerts > 0 ? 'yellow' : 'green'} to="/alerts" />
      </div>

      {/* Production vs Waste Chart */}
      <ProductionWasteChart chartData={chartData} />

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveBatchesPanel batches={activeBatches} />

        {/* Recent Waste Panel */}
        <SectionCard title="Recent Waste Records" icon={Trash2} iconColor="text-rose-500" to="/waste">
          {recentWaste.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No waste records this week.</p>
          ) : (
            <div className="space-y-3">
              {recentWaste.map((w, i) => (
                <div key={w._id || i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {w.itemId?.name || w.reason || 'Unspecified'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{w.reason || 'No reason'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-600">{fmt(w.quantity, 1)} units</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <RefreshFooter onRefresh={onRefresh} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── INVENTORY MANAGER DASHBOARD ──────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function InventoryManagerDashboard({ data, onRefresh }) {
  const {
    kpis = {},
    lowStockItems = [],
    nearExpiryItems = [],
    recentActivity = [],
    fifoStatus = [],
  } = data;

  return (
    <div className="space-y-6">

      {/* 6 Inventory KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Raw Materials" value={fmt(kpis.totalRawMaterials)}
          sub="Total Tracked" subColor="text-purple-600"
          icon={Layers} iconBg="bg-purple-50" iconColor="text-purple-600" to="/raw-materials" />
        <KpiCard label="Low Stock" value={fmt(kpis.lowStockCount)}
          sub={kpis.lowStockCount > 0 ? 'Action required' : 'All levels OK'}
          subColor={kpis.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}
          icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" to="/raw-materials" />
        <KpiCard label="Near Expiry" value={fmt(kpis.nearExpiryCount)}
          sub="Within 7 days"
          subColor={kpis.nearExpiryCount > 0 ? 'text-orange-600' : 'text-green-600'}
          icon={ThermometerSun} iconBg="bg-orange-50" iconColor="text-orange-600" to="/raw-materials" />
        <KpiCard label="FIFO Movements" value={fmt(fifoStatus.length)}
          sub="Recent OUT txns" subColor="text-blue-600"
          icon={Archive} iconBg="bg-blue-50" iconColor="text-blue-600" to="/inventory" />
        <KpiCard label="Total Suppliers" value={fmt(kpis.totalSuppliers)}
          sub={`${kpis.activeSuppliers || 0} active`} subColor="text-teal-600"
          icon={Truck} iconBg="bg-teal-50" iconColor="text-teal-600" to="/suppliers" />
        <KpiCard label="Alerts" value={fmt(kpis.unreadAlerts)}
          sub={kpis.criticalAlerts > 0 ? `${kpis.criticalAlerts} critical` : 'None critical'}
          subColor={kpis.criticalAlerts > 0 ? 'text-red-600' : 'text-green-600'}
          icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-600" to="/alerts" />
      </div>

      {/* Risk row */}
      <div className="flex flex-wrap gap-3">
        <span className="text-xs font-semibold text-slate-500 self-center uppercase tracking-wider mr-1">
          Inventory Status:
        </span>
        <RiskPill count={kpis.lowStockCount || 0} label="Low Stock"
          color={kpis.lowStockCount > 0 ? 'red' : 'green'} to="/raw-materials" />
        <RiskPill count={kpis.nearExpiryCount || 0} label="Near Expiry (7d)"
          color={kpis.nearExpiryCount > 0 ? 'orange' : 'green'} to="/raw-materials" />
        <RiskPill count={kpis.unreadAlerts || 0} label="Alerts"
          color={kpis.criticalAlerts > 0 ? 'red' : kpis.unreadAlerts > 0 ? 'yellow' : 'green'} to="/alerts" />
        <RiskPill count={kpis.activeSuppliers || 0} label="Active Suppliers" color="green" to="/suppliers" />
      </div>

      {/* Low Stock + Near Expiry panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Low Stock */}
        <SectionCard title="Low Stock Items" icon={AlertTriangle} iconColor="text-red-500" to="/raw-materials">
          {lowStockItems.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">All stock levels are healthy. ✅</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item) => {
                const pct = item.minStock > 0
                  ? Math.min(100, Math.round((item.currentStock / item.minStock) * 100))
                  : 50;
                return (
                  <div key={item._id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                      <span className="text-slate-500 shrink-0 ml-2">
                        {fmt(item.currentStock)} / {fmt(item.minStock)} {item.unit}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Near Expiry */}
        <SectionCard title="Near Expiry Items (7 days)" icon={ThermometerSun} iconColor="text-orange-500" to="/raw-materials" toLabel="View all materials">
          {nearExpiryItems.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No items expiring within 7 days. ✅</p>
          ) : (
            <div className="space-y-3">
              {nearExpiryItems.map((item) => {
                const daysLeft = Math.ceil(
                  (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-200">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fmt(item.currentStock)} {item.unit} remaining
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {daysLeft}d left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* FIFO + Activity panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* FIFO Recent OUT Movements */}
        <SectionCard title="Recent FIFO OUT Movements" icon={Archive} iconColor="text-blue-500" to="/inventory" toLabel="View ledger">
          {fifoStatus.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No FIFO movements recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {fifoStatus.map((tx, i) => (
                <div key={tx._id || i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">FIFO OUT</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 font-medium truncate">
                      {tx.itemId?.name || tx.itemType} — {tx.reason || 'No reason'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">{fmt(tx.quantity)} units</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard title="Recent Inventory Activity" icon={Clock} to="/inventory" toLabel="View ledger">
          {recentActivity.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No inventory movements recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((tx) => {
                const typeColors = {
                  IN             : 'bg-emerald-100 text-emerald-700',
                  OUT            : 'bg-rose-100    text-rose-700',
                  ADJUST         : 'bg-blue-100    text-blue-700',
                  WASTE_DEDUCTION: 'bg-orange-100  text-orange-700',
                };
                return (
                  <div key={tx._id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[tx.type] || 'bg-slate-100 text-slate-700'}`}>
                      {tx.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 font-medium truncate">
                        {tx.itemId?.name || tx.itemType} — {tx.reason || 'No reason'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 shrink-0">{fmt(tx.quantity)} units</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <RefreshFooter onRefresh={onRefresh} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Shared reusable panel components ─────────────────────────────
// ══════════════════════════════════════════════════════════════════

function ProductionWasteChart({ chartData }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 size={16} className="text-slate-400" />
            Weekly Production Output vs Food Waste
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Last 7 days — completed production units vs waste quantity</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Production
          </span>
          <span className="flex items-center gap-1.5 text-rose-500">
            <span className="w-3 h-3 rounded-sm bg-rose-500" /> Waste
          </span>
        </div>
      </div>

      {chartData.every(d => d.production === 0 && d.waste === 0) ? (
        <div className="h-72 flex flex-col items-center justify-center text-center text-slate-500">
          <BarChart2 size={36} className="mb-3 text-slate-300" />
          <p className="text-sm font-medium">No production or waste data for the last 7 days</p>
          <p className="text-xs mt-1">Complete production batches or log waste records to populate this chart.</p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="production" name="Production"
                stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProd)" />
              <Area type="monotone" dataKey="waste" name="Waste"
                stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorWaste)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ActiveBatchesPanel({ batches }) {
  return (
    <SectionCard title="Active Production Batches" icon={Factory} iconColor="text-emerald-500" to="/production">
      {batches.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No batches currently in progress.</p>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => (
            <div key={batch._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">{batch.batchCode}</p>
                <p className="text-xs text-slate-500 mt-0.5">{batch.product?.name || 'Unknown'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{fmt(batch.plannedQuantity)} units</p>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  In Progress
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TopProductsPanel({ products }) {
  return (
    <SectionCard title="Product Stock Levels" icon={Package} iconColor="text-blue-500" to="/products">
      {products.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No products found. Add products to get started.</p>
      ) : (
        <div className="space-y-3">
          {products.map(product => {
            const pct = product.minStock > 0
              ? Math.min(100, Math.round((product.currentStock / (product.minStock * 4)) * 100))
              : 50;
            const barColor = product.currentStock <= product.minStock ? 'bg-red-400' : 'bg-emerald-400';
            return (
              <div key={product._id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{product.name}</span>
                  <span className="text-slate-500">
                    {fmt(product.currentStock)} / min {fmt(product.minStock)} {product.unit}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function RecentActivityPanel({ activity }) {
  return (
    <SectionCard title="Recent Inventory Activity" icon={Clock} to="/inventory" toLabel="View ledger">
      {activity.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No inventory movements recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {activity.map(tx => {
            const typeColors = {
              IN             : 'bg-emerald-100 text-emerald-700',
              OUT            : 'bg-rose-100    text-rose-700',
              ADJUST         : 'bg-blue-100    text-blue-700',
              WASTE_DEDUCTION: 'bg-orange-100  text-orange-700',
            };
            return (
              <div key={tx._id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[tx.type] || 'bg-slate-100 text-slate-700'}`}>
                  {tx.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 font-medium truncate">
                    {tx.itemId?.name || tx.itemType} — {tx.reason || 'No reason'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-700 shrink-0">{fmt(tx.quantity)} units</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function RefreshFooter({ onRefresh }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition"
      >
        <RefreshCw size={12} /> Refresh Dashboard
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Main Dashboard container ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.get('/dashboard/stats');
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState onRetry={load} />;

  const role = data?.role || user?.role;

  return (
    <div className="p-6 space-y-6">
      <WelcomeBanner user={user} />

      {role === 'production_manager' && (
        <ProductionManagerDashboard data={data} onRefresh={load} />
      )}
      {role === 'inventory_manager' && (
        <InventoryManagerDashboard data={data} onRefresh={load} />
      )}
      {(role === 'admin' || !role) && (
        <AdminDashboard data={data} onRefresh={load} />
      )}
    </div>
  );
};

export default Dashboard;
