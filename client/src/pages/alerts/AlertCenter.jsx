/**
 * AlertCenter.jsx
 * ───────────────
 * Full Alert & Notification Center page.
 *
 * Features:
 *  - Summary KPI row: total unread, critical, warnings, info
 *  - Filter tabs: All | Unread | LOW_STOCK | EXPIRY | HIGH_WASTE | PRODUCTION_RISK | OVERSTOCK
 *  - Severity filter dropdown
 *  - Alert cards with icon, badge, age, mark-read, delete actions
 *  - "Mark All Read" and "Clear Read Alerts" bulk actions
 *  - Auto-refresh every 60 seconds
 *  - Empty state illustration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, BellOff, AlertTriangle, AlertCircle, Info,
  Trash2, CheckCheck, RefreshCw, Package, Clock,
  Flame, TrendingDown, ShieldAlert, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAlerts,
  getAlertSummary,
  markOneRead,
  markAllRead,
  deleteAlert,
  clearReadAlerts,
} from '../../services/alertService';

// ── Config: alert type display metadata ─────────────────
const TYPE_META = {
  LOW_STOCK       : { label: 'Low Stock',       icon: Package,      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  EXPIRY          : { label: 'Expiry',           icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  HIGH_WASTE      : { label: 'High Waste',       icon: Flame,        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    },
  PRODUCTION_RISK : { label: 'Production Risk',  icon: ShieldAlert,  color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  OVERSTOCK       : { label: 'Overstock',        icon: TrendingDown, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
};

const SEVERITY_META = {
  critical : { label: 'Critical', color: 'text-red-400',    badgeBg: 'bg-red-500/20    border-red-500/50'    },
  warning  : { label: 'Warning',  color: 'text-yellow-400', badgeBg: 'bg-yellow-500/20 border-yellow-500/50' },
  info     : { label: 'Info',     color: 'text-blue-400',   badgeBg: 'bg-blue-500/20   border-blue-500/50'   },
};

// ── Helper: human-readable time ago ─────────────────────
function timeAgo(dateStr) {
  const now   = Date.now();
  const then  = new Date(dateStr).getTime();
  const diff  = Math.floor((now - then) / 1000); // seconds

  if (diff < 60)      return `${diff}s ago`;
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Tab options ──────────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',              label: 'All'             },
  { key: 'unread',           label: 'Unread'          },
  { key: 'LOW_STOCK',        label: 'Low Stock'       },
  { key: 'EXPIRY',           label: 'Expiry'          },
  { key: 'HIGH_WASTE',       label: 'High Waste'      },
  { key: 'PRODUCTION_RISK',  label: 'Production Risk' },
  { key: 'OVERSTOCK',        label: 'Overstock'       },
];

// ── Single alert card ────────────────────────────────────
function AlertCard({ alert, onMarkRead, onDelete }) {
  const meta     = TYPE_META[alert.type]     || TYPE_META.LOW_STOCK;
  const sevMeta  = SEVERITY_META[alert.severity] || SEVERITY_META.warning;
  const Icon     = meta.icon;

  return (
    <div
      className={`relative flex gap-4 rounded-xl border p-4 transition-all ${
        alert.isRead
          ? 'bg-slate-800/50 border-slate-700/50 opacity-70'
          : `${meta.bg} ${meta.border} border`
      }`}
    >
      {/* Unread indicator dot */}
      {!alert.isRead && (
        <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse" />
      )}

      {/* Type icon */}
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
        <Icon size={18} className={meta.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-white font-semibold text-sm">{alert.title}</span>
          {/* Severity badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sevMeta.badgeBg} ${sevMeta.color}`}>
            {sevMeta.label}
          </span>
          {/* Type badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${meta.bg} border ${meta.border} ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">{alert.message}</p>
        <p className="text-slate-500 text-xs mt-2">{timeAgo(alert.createdAt)}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 shrink-0">
        {!alert.isRead && (
          <button
            onClick={() => onMarkRead(alert._id)}
            title="Mark as read"
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-green-500/20 border border-slate-600 hover:border-green-500/50 flex items-center justify-center transition"
          >
            <CheckCheck size={14} className="text-slate-400 hover:text-green-400" />
          </button>
        )}
        <button
          onClick={() => onDelete(alert._id)}
          title="Delete alert"
          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-500/20 border border-slate-600 hover:border-red-500/50 flex items-center justify-center transition"
        >
          <Trash2 size={13} className="text-slate-400 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function AlertCenter() {
  const [alerts, setAlerts]         = useState([]);
  const [summary, setSummary]       = useState({});
  const [activeTab, setActiveTab]   = useState('all');
  const [severity, setSeverity]     = useState('');
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});

  // Build API params from active tab + severity filter
  const buildParams = useCallback(() => {
    const params = { page, limit: 15 };
    if (activeTab === 'unread') {
      params.isRead = false;
    } else if (activeTab !== 'all') {
      params.type = activeTab;
    }
    if (severity) params.severity = severity;
    return params;
  }, [activeTab, severity, page]);

  // Fetch alerts + summary
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertRes, summaryRes] = await Promise.all([
        getAlerts(buildParams()),
        getAlertSummary(),
      ]);
      setAlerts(alertRes.data.alerts || []);
      setPagination(alertRes.data.pagination || {});
      setSummary(summaryRes.data || {});
    } catch {
      toast.error('Could not load alerts.');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Reset to page 1 when tab/filter changes
  useEffect(() => { setPage(1); }, [activeTab, severity]);

  // ── Actions ────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await markOneRead(id);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      setSummary(prev => ({ ...prev, totalUnread: Math.max(0, (prev.totalUnread || 1) - 1) }));
    } catch {
      toast.error('Could not mark alert as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id);
      setAlerts(prev => prev.filter(a => a._id !== id));
      toast.success('Alert deleted.');
    } catch {
      toast.error('Could not delete alert.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await markAllRead();
      toast.success(res.data.message);
      loadData();
    } catch {
      toast.error('Could not mark all as read.');
    }
  };

  const handleClearRead = async () => {
    if (!window.confirm('Delete all read alerts? This cannot be undone.')) return;
    try {
      const res = await clearReadAlerts();
      toast.success(res.data.message);
      loadData();
    } catch {
      toast.error('Could not clear read alerts.');
    }
  };

  const unread    = summary.totalUnread || 0;
  const critical  = summary.bySeverity?.critical || 0;
  const warnings  = summary.bySeverity?.warning  || 0;
  const infoCount = summary.bySeverity?.info      || 0;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="text-brand-400" size={26} />
            Alert Center
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {unread}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            System-generated warnings for stock, expiry, waste, and production risks
          </p>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-600 text-green-400 hover:bg-green-500/10 text-sm transition"
            >
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
          <button
            onClick={handleClearRead}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-600/50 text-red-400 hover:bg-red-500/10 text-sm transition"
          >
            <Trash2 size={14} /> Clear Read
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Unread',   value: unread,    icon: Bell,          color: 'text-brand-400', bg: 'bg-brand-500/10'  },
          { label: 'Critical', value: critical,  icon: AlertTriangle, color: 'text-red-400',   bg: 'bg-red-500/10'    },
          { label: 'Warnings', value: warnings,  icon: AlertCircle,   color: 'text-yellow-400',bg: 'bg-yellow-500/10' },
          { label: 'Info',     value: infoCount, icon: Info,          color: 'text-blue-400',  bg: 'bg-blue-500/10'   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-slate-700 rounded-xl p-4 flex items-center gap-3`}>
            <Icon size={20} className={color} />
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Type tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
              {/* Show unread badge count per type */}
              {tab.key !== 'all' && tab.key !== 'unread' && summary.byType?.[tab.key]
                ? <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                    {summary.byType[tab.key]}
                  </span>
                : null
              }
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <select
          value={severity}
          onChange={e => setSeverity(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="text-brand-400 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
            <BellOff size={28} className="text-slate-500" />
          </div>
          <h3 className="text-white font-semibold mb-1">No alerts found</h3>
          <p className="text-slate-500 text-sm max-w-xs">
            {activeTab === 'unread'
              ? 'Great news — you\'re all caught up! No unread alerts.'
              : 'No alerts match your current filters. Try a different tab.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <AlertCard
              key={alert._id}
              alert={alert}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
