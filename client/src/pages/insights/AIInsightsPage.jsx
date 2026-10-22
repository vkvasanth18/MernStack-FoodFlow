/**
 * AIInsightsPage.jsx
 * ──────────────────
 * AI Operational Insights Module
 *
 * Core Capabilities:
 *  1. AI risk detection for ingredient shortages, expiry bottlenecks, and overstocking.
 *  2. Plant Operational Health Score & composite risk diagnostics.
 *  3. Visual interactive charts: Runway vs Supplier Lead Time & Risk Distribution.
 *  4. Actionable recommendations: PO requisition, priority batch scheduling, alert syncing.
 *  5. Interactive What-If Scenario Simulator for demand surges & supply chain delays.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  Clock,
  TrendingDown,
  Layers,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  Truck,
  IndianRupee,
  Package,
  Calendar,
  Search,
  Filter,
  Download,
  Send,
  Zap,
  ChevronRight,
  Flame,
  Factory,
  BarChart3,
  Loader2,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  getAIInsights,
  triggerAutoMitigation,
  simulateScenario,
} from '../../services/aiInsightsService';

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (n, dec = 0) =>
  n == null ? '0' : Number(n).toLocaleString(undefined, { maximumFractionDigits: dec });

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    bg: 'bg-rose-500/10 text-rose-600 border-rose-200',
    cardBorder: 'border-rose-300/80 bg-gradient-to-r from-rose-50/40 via-white to-white',
    badge: 'bg-rose-600 text-white',
    iconColor: 'text-rose-600',
  },
  warning: {
    label: 'Warning',
    bg: 'bg-amber-500/10 text-amber-600 border-amber-200',
    cardBorder: 'border-amber-300/80 bg-gradient-to-r from-amber-50/40 via-white to-white',
    badge: 'bg-amber-500 text-white',
    iconColor: 'text-amber-500',
  },
  optimization: {
    label: 'Optimization',
    bg: 'bg-blue-500/10 text-blue-600 border-blue-200',
    cardBorder: 'border-blue-200/80 bg-gradient-to-r from-blue-50/40 via-white to-white',
    badge: 'bg-blue-600 text-white',
    iconColor: 'text-blue-500',
  },
};

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All Insights', icon: BrainCircuit },
  { key: 'SHORTAGE', label: 'Ingredient Shortages', icon: Layers },
  { key: 'EXPIRY', label: 'Expiry Bottlenecks', icon: Clock },
  { key: 'OVERSTOCK', label: 'Overstock & Capital', icon: TrendingDown },
  { key: 'WASTE', label: 'Waste Anomalies', icon: Flame },
  { key: 'SIMULATOR', label: 'What-If Simulator', icon: Sliders },
];

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingAlerts, setSyncingAlerts] = useState(false);
  const [actionDoneMap, setActionDoneMap] = useState({});

  // Simulation state
  const [simDemandSurge, setSimDemandSurge] = useState(30);
  const [simLeadTimeDelay, setSimLeadTimeDelay] = useState(3);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // PO Modal State
  const [poModalItem, setPoModalItem] = useState(null);
  const [poQuantity, setPoQuantity] = useState('');

  // ── Load AI Insights ─────────────────────────────────────────────
  const fetchInsights = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getAIInsights();
      if (res.success) {
        setData(res);
        if (isRefresh) {
          toast.success('AI Diagnostics updated with live floor data!');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load AI Insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Run Scenario Simulation ──────────────────────────────────────
  const runSimulation = useCallback(async () => {
    setSimLoading(true);
    try {
      const res = await simulateScenario({
        demandSurgePercent: simDemandSurge,
        leadTimeDelayDays: simLeadTimeDelay,
      });
      if (res.success) {
        setSimResult(res);
      }
    } catch (err) {
      toast.error('Failed to run scenario simulation');
    } finally {
      setSimLoading(false);
    }
  }, [simDemandSurge, simLeadTimeDelay]);

  // Trigger initial simulation once
  useEffect(() => {
    if (activeTab === 'SIMULATOR' && !simResult) {
      runSimulation();
    }
  }, [activeTab, simResult, runSimulation]);

  // ── Auto Sync with Alert Center ───────────────────────────────────
  const handleAutoMitigate = async () => {
    setSyncingAlerts(true);
    try {
      const res = await triggerAutoMitigation();
      toast.success(res.message || 'Alerts synchronized with Alert Center!');
    } catch (err) {
      toast.error('Failed to sync alerts');
    } finally {
      setSyncingAlerts(false);
    }
  };

  // ── Filtered Insights ────────────────────────────────────────────
  const filteredInsights = useMemo(() => {
    if (!data?.insights) return [];
    return data.insights.filter((item) => {
      const matchesTab = activeTab === 'ALL' || item.category === activeTab;
      const matchesSeverity =
        severityFilter === 'ALL' || item.severity === severityFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.itemName?.toLowerCase().includes(q) ||
        item.itemCode?.toLowerCase().includes(q) ||
        item.headline?.toLowerCase().includes(q);
      return matchesTab && matchesSeverity && matchesQuery;
    });
  }, [data, activeTab, severityFilter, searchQuery]);

  // ── CSV Export ───────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!data?.insights?.length) {
      toast.error('No insights data to export.');
      return;
    }
    const headers = [
      'Category',
      'Severity',
      'Title',
      'Item Name',
      'Item Code',
      'Headline',
      'Financial Risk (INR)',
      'Recommended Action',
    ];
    const rows = data.insights.map((i) => [
      `"${i.category}"`,
      `"${i.severity}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.itemName || ''}"`,
      `"${i.itemCode || ''}"`,
      `"${(i.headline || '').replace(/"/g, '""')}"`,
      `"${i.metrics?.estimatedFinancialRisk || 0}"`,
      `"${(i.actionRecommendation?.label || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `foodflow_ai_insights_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('AI Insights report exported!');
  };

  // ── Chart Data: Runway vs Lead Time ──────────────────────────────
  const runwayChartData = useMemo(() => {
    if (!data?.materialRunwayStats) return [];
    return data.materialRunwayStats.map((m) => ({
      name: m.name.length > 12 ? `${m.name.slice(0, 10)}…` : m.name,
      fullName: m.name,
      runway: m.daysOfRunway > 100 ? 100 : m.daysOfRunway,
      leadTime: m.leadTimeDays,
      isShortage: m.daysOfRunway <= m.leadTimeDays,
    }));
  }, [data]);

  // ── Chart Data: Risk Category Distribution ───────────────────────
  const categoryChartData = useMemo(() => {
    if (!data?.categoryCounts) return [];
    return [
      { name: 'Shortages', value: data.categoryCounts.shortages || 0, color: '#f43f5e' },
      { name: 'Expiries', value: data.categoryCounts.expiries || 0, color: '#eab308' },
      { name: 'Overstocks', value: data.categoryCounts.overstocks || 0, color: '#3b82f6' },
      { name: 'Waste Hazards', value: data.categoryCounts.wastes || 0, color: '#f97316' },
    ].filter((item) => item.value > 0);
  }, [data]);

  // ── Handle Action Click ──────────────────────────────────────────
  const handleActionClick = (insight) => {
    if (insight.actionRecommendation?.actionType?.includes('PO')) {
      setPoModalItem(insight);
      setPoQuantity(insight.actionRecommendation?.suggestedQuantity || 50);
    } else {
      setActionDoneMap((prev) => ({ ...prev, [insight.id]: true }));
      toast.success(
        `Action initiated: "${insight.actionRecommendation?.label || 'Mitigation logged'}"`
      );
    }
  };

  const handleConfirmPO = () => {
    if (!poModalItem) return;
    setActionDoneMap((prev) => ({ ...prev, [poModalItem.id]: true }));
    toast.success(
      `Purchase Requisition created for ${poQuantity} ${poModalItem.itemName}! Transmitted to supplier.`
    );
    setPoModalItem(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center animate-spin text-brand-600">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          AI Engine scanning inventory runway & expiry bottlenecks…
        </p>
        <p className="text-xs text-slate-400">Cross-referencing recipes against upcoming production batches</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const healthScore = summary.healthScore || 80;

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 p-6 rounded-3xl text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Diagnostic Engine
            </span>
            <span className="text-xs text-slate-400">
              Updated: {new Date(data?.lastAnalyzed || Date.now()).toLocaleTimeString()}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-brand-400" />
            AI Operational Insights
          </h1>
          <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Neural risk detection for ingredient shortages, expiry bottlenecks, and overstocking.
            Evaluates recipe Bills of Materials against real-time consumption velocity and supplier lead times.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600 transition active:scale-95 disabled:opacity-50"
            title="Re-run deep floor analysis"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>{refreshing ? 'Scanning…' : 'Deep Re-Scan'}</span>
          </button>

          <button
            onClick={handleAutoMitigate}
            disabled={syncingAlerts}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition active:scale-95 shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${syncingAlerts ? 'animate-bounce' : ''}`} />
            <span>{syncingAlerts ? 'Syncing…' : 'Sync to Alerts'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── KPI & Plant Health Overview Row ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Plant Health Score */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Plant Health Index
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                healthScore >= 75
                  ? 'bg-emerald-50 text-emerald-600'
                  : healthScore >= 50
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{healthScore}</span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore >= 75
                    ? 'bg-emerald-500'
                    : healthScore >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Status: <span className="font-semibold text-slate-700">{summary.riskLevelText || 'Moderate Risk'}</span>
            </p>
          </div>
        </div>

        {/* Total Financial Risk */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Capital at Risk
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              ₹{fmt(summary.totalCapitalAtRisk)}
            </p>
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 inline" />
              {summary.criticalCount || 0} Critical / {summary.warningCount || 0} Warning flags
            </p>
          </div>
        </div>

        {/* Imminent Shortages */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Shortage Bottlenecks
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              {summary.imminentStockoutsCount || 0}
            </p>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">
              Runway &lt; Supplier delivery time
            </p>
          </div>
        </div>

        {/* Perishable Hazard */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Perishable Exposure
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              ₹{fmt(summary.perishableLossExposure)}
            </p>
            <p className="text-[11px] text-orange-600 mt-1 font-medium">
              Perishables expiring in ≤ 7 days
            </p>
          </div>
        </div>

        {/* Overstock Capital */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overstocked Capital
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              ₹{fmt(summary.overstockedCapitalLocked)}
            </p>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">
              Excess inventory above max cap
            </p>
          </div>
        </div>
      </div>

      {/* ── Visual Analytics Section: Charts ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Material Runway vs Supplier Lead Time */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-600" />
                Raw Material Runway vs. Supplier Lead Time (Days)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Red bars indicate materials where remaining inventory runway is shorter than supplier delivery turnaround.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-brand-500" /> Runway Days
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-amber-400" /> Lead Time
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={runwayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [`${value} days`, name === 'runway' ? 'Inventory Runway' : 'Supplier Lead Time']}
                  labelFormatter={(name, payload) => payload?.[0]?.payload?.fullName || name}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="runway" name="runway" radius={[4, 4, 0, 0]}>
                  {runwayChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isShortage ? '#ef4444' : '#10b981'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="leadTime" name="leadTime" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Risk Breakdown by Category */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Risk Distribution by Category
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              AI classified vulnerability allocation across operations.
            </p>

            <div className="h-44 relative flex items-center justify-center">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {categoryChartData.map((entry, idx) => (
                        <Cell key={`cat-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400">No active risks detected.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {categoryChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium truncate">{item.name}</span>
                <span className="font-bold text-slate-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Tabs & Filter Toolbar ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.key === 'ALL'
                ? data?.insights?.length
                : tab.key === 'SHORTAGE'
                ? data?.categoryCounts?.shortages
                : tab.key === 'EXPIRY'
                ? data?.categoryCounts?.expiries
                : tab.key === 'OVERSTOCK'
                ? data?.categoryCounts?.overstocks
                : tab.key === 'WASTE'
                ? data?.categoryCounts?.wastes
                : null;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {count != null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Controls (for non-simulator tabs) */}
        {activeTab !== 'SIMULATOR' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search insight, ingredient or batch…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Filter className="w-3.5 h-3.5" /> Severity:
              </span>
              <div className="flex items-center gap-1">
                {['ALL', 'critical', 'warning', 'optimization'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                      severityFilter === sev
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sev === 'ALL' ? 'All' : sev}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TAB CONTENT: WHAT-IF SCENARIO SIMULATOR ───────────────── */}
      {activeTab === 'SIMULATOR' ? (
        <div className="space-y-6">
          {/* Simulator Controls Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-brand-600" />
                  Predictive Stress-Test Simulator
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulate external demand spikes and supply chain delays to identify hidden production blockers before they occur.
                </p>
              </div>
              <button
                onClick={runSimulation}
                disabled={simLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition active:scale-95 shadow-md shadow-brand-600/20 disabled:opacity-50"
              >
                {simLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recalculating…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Re-Run Simulation</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {/* Slider 1: Demand Surge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Product Demand Surge: <span className="text-brand-600 font-bold">+{simDemandSurge}%</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Simulates festive or promotional sales wave</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={simDemandSurge}
                  onChange={(e) => setSimDemandSurge(Number(e.target.value))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Baseline (0%)</span>
                  <span>+50% Surge</span>
                  <span>+100% (2x Volume)</span>
                </div>
              </div>

              {/* Slider 2: Supplier Delay */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Supplier Lead Time Delay: <span className="text-amber-600 font-bold">+{simLeadTimeDelay} days</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Simulates shipping or vendor bottlenecks</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="1"
                  value={simLeadTimeDelay}
                  onChange={(e) => setSimLeadTimeDelay(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>No Delay (0d)</span>
                  <span>+7 Days Delay</span>
                  <span>+14 Days (Critical)</span>
                </div>
              </div>
            </div>

            {/* Simulation KPI summary banner */}
            {simResult && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      simResult.bottlenecksDetected > 0
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {simResult.bottlenecksDetected > 0 ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {simResult.bottlenecksDetected > 0
                        ? `${simResult.bottlenecksDetected} Material Bottlenecks Triggered under +${simDemandSurge}% Demand`
                        : 'All Inventory Resilient under Tested Parameters'}
                    </p>
                    <p className="text-xs text-slate-300">
                      With +{simLeadTimeDelay} days supplier delay, operations will require additional safety buffer replenishment.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAutoMitigate}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition"
                >
                  Create Contingency Alerts
                </button>
              </div>
            )}
          </div>

          {/* Simulation Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Simulated Raw Material Vulnerability Matrix
              </h3>
              <span className="text-xs text-slate-400">
                Sorted by bottleneck hazard
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200/60">
                  <tr>
                    <th className="py-3 px-4">Material / Code</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Base Draw</th>
                    <th className="py-3 px-4 text-right">Simulated Draw</th>
                    <th className="py-3 px-4 text-right">Eff. Lead Time</th>
                    <th className="py-3 px-4 text-right">Sim. Runway</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Recommended Buffer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simResult?.simulationResults?.map((item) => (
                    <tr
                      key={item.materialId}
                      className={`hover:bg-slate-50/80 transition ${
                        item.isBottleneck ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.materialName}</div>
                        <div className="text-[10px] text-slate-400">{item.code} • {item.supplierName}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {item.baseDailyDraw} {item.unit}/d
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-brand-600">
                        {item.simulatedDailyDraw} {item.unit}/d
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">
                        {item.effectiveLeadTime} days <span className="text-[10px] text-amber-600">(+{simLeadTimeDelay})</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold ${
                            item.isBottleneck ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {item.simulatedRunway} days
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.isBottleneck ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Bottleneck Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Stable
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {item.suggestedContingencyBuffer} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ── TAB CONTENT: ACTIVE AI INSIGHT CARDS ─────────────────── */
        <div className="space-y-4">
          {filteredInsights.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No active operational risks detected!
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                All ingredient runways cover upcoming batch schedules and no imminent expiration bottlenecks were found.
              </p>
            </div>
          ) : (
            filteredInsights.map((insight) => {
              const sev = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.warning;
              const isActionDone = actionDoneMap[insight.id];

              return (
                <div
                  key={insight.id}
                  className={`rounded-2xl border p-5 transition hover:shadow-md ${sev.cardBorder}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Main Content */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${sev.badge}`}
                        >
                          {sev.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {insight.category}
                        </span>
                        {insight.itemCode && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {insight.itemCode}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${sev.iconColor}`} />
                        {insight.title}
                      </h3>

                      <p className="text-xs font-semibold text-slate-700 leading-snug">
                        {insight.headline}
                      </p>

                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60 text-xs text-slate-600 space-y-1">
                        <p>
                          <span className="font-semibold text-slate-800">AI Diagnosis:</span>{' '}
                          {insight.diagnosis}
                        </p>
                        {insight.impact && (
                          <p>
                            <span className="font-semibold text-rose-700">Operational Impact:</span>{' '}
                            {insight.impact}
                          </p>
                        )}
                      </div>

                      {/* Key Metrics Strip */}
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                        {insight.metrics?.daysOfRunway != null && (
                          <div>
                            <span className="text-slate-400">Runway:</span>{' '}
                            <span className="font-bold text-slate-800">
                              {insight.metrics.daysOfRunway} days
                            </span>
                          </div>
                        )}
                        {insight.metrics?.leadTimeDays != null && (
                          <div>
                            <span className="text-slate-400">Supplier Lead Time:</span>{' '}
                            <span className="font-bold text-slate-800">
                              {insight.metrics.leadTimeDays} days
                            </span>
                          </div>
                        )}
                        {insight.metrics?.daysUntilExpiry != null && (
                          <div>
                            <span className="text-slate-400">Days to Expiry:</span>{' '}
                            <span className="font-bold text-rose-600">
                              {insight.metrics.daysUntilExpiry} days
                            </span>
                          </div>
                        )}
                        {insight.metrics?.estimatedFinancialRisk != null && (
                          <div>
                            <span className="text-slate-400">Estimated Value at Risk:</span>{' '}
                            <span className="font-bold text-rose-600">
                              ₹{fmt(insight.metrics.estimatedFinancialRisk)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recommendation & Action Button */}
                    <div className="lg:w-72 shrink-0 bg-white/90 p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3 shadow-xs">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                          Recommended Mitigation
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {insight.actionRecommendation?.notes ||
                            insight.actionRecommendation?.label}
                        </p>
                      </div>

                      <button
                        onClick={() => handleActionClick(insight)}
                        disabled={isActionDone}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                          isActionDone
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                            : 'bg-slate-900 hover:bg-brand-600 text-white shadow-sm'
                        }`}
                      >
                        {isActionDone ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Action Dispatched</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>{insight.actionRecommendation?.label || 'Execute Action'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Purchase Order Requisition Modal ──────────────────────── */}
      {poModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Create Purchase Requisition
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    AI replenishment order for {poModalItem.itemName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPoModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Material:</span>
                  <span className="font-semibold text-slate-800">{poModalItem.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="font-semibold text-slate-800">
                    {poModalItem.actionRecommendation?.supplier || 'Default Supplier'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Runway Deficit:</span>
                  <span className="font-semibold text-rose-600">
                    {poModalItem.metrics?.daysOfRunway} days remaining
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Requisition Quantity ({poModalItem.itemType === 'RawMaterial' ? 'units/kg' : 'units'})
                </label>
                <input
                  type="number"
                  min="1"
                  value={poQuantity}
                  onChange={(e) => setPoQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  AI suggested: {poModalItem.actionRecommendation?.suggestedQuantity} units to recover safety buffer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPoModalItem(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPO}
                className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20"
              >
                Transmit PO Requisition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
