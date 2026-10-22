/**
 * ReportsPage.jsx
 * ────────────────
 * Reports & Data Export Centre
 *
 * Three tabs: Production | Waste | Inventory
 * Each tab has:
 *  - Date range filter (from / to)
 *  - Type/status filter dropdown
 *  - Summary KPI row (updates with filters)
 *  - Paginated data table
 *  - "Export CSV" download button
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, Factory, Trash2, Package,
  CalendarDays, Filter, ChevronLeft, ChevronRight,
  Loader, RefreshCw, TrendingUp, IndianRupee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProductionReport,
  getWasteReport,
  getInventoryReport,
  downloadCSV,
} from '../../services/reportService';

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n, dec = 0) =>
  n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: dec });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Status/type badge colors ──────────────────────────────────
const STATUS_COLORS = {
  Completed  : 'bg-green-100  text-green-700',
  'In Progress': 'bg-blue-100   text-blue-700',
  Planned    : 'bg-slate-100  text-slate-700',
  Cancelled  : 'bg-red-100    text-red-700',
};

const WASTE_TYPE_COLORS = {
  Spoilage       : 'bg-red-100    text-red-700',
  Overproduction : 'bg-orange-100 text-orange-700',
  'Processing Loss': 'bg-yellow-100 text-yellow-700',
  Expired        : 'bg-purple-100 text-purple-700',
  Spillage       : 'bg-blue-100   text-blue-700',
  'Quality Failure': 'bg-rose-100   text-rose-700',
  Other          : 'bg-slate-100  text-slate-700',
};

const TX_COLORS = {
  IN              : 'bg-green-100  text-green-700',
  OUT             : 'bg-red-100    text-red-700',
  ADJUST          : 'bg-blue-100   text-blue-700',
  WASTE_DEDUCTION : 'bg-orange-100 text-orange-700',
};

// ── Summary KPI card ─────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Pagination controls ───────────────────────────────────────
function Pagination({ page, pages, total, onPrev, onNext }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
      <p className="text-xs text-slate-500">
        Page {page} of {pages} ({fmt(total)} records)
      </p>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={onPrev}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs disabled:opacity-40 hover:bg-slate-50 transition">
          <ChevronLeft size={13} /> Prev
        </button>
        <button disabled={page >= pages} onClick={onNext}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs disabled:opacity-40 hover:bg-slate-50 transition">
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// TAB 1 — Production Report
// ────────────────────────────────────────────────────────────────
function ProductionReport({ globalFrom, globalTo }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage]     = useState(1);
  const [filters, setFilters] = useState({ from: globalFrom || '', to: globalTo || '', status: '' });

  useEffect(() => {
    setFilters(prev => ({ ...prev, from: globalFrom, to: globalTo }));
  }, [globalFrom, globalTo]);

  useEffect(() => {
    const handleFilter = (e) => {
      if (e.detail.key === 'status') {
        setFilters(prev => ({ ...prev, status: e.detail.value }));
      }
    };
    document.addEventListener('report-filter', handleFilter);
    return () => document.removeEventListener('report-filter', handleFilter);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductionReport({ ...filters, page, limit: 15 });
      setData(res.data);
    } catch { toast.error('Could not load production report.'); }
    finally  { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCSV('production', filters);
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed.'); }
    finally  { setExporting(false); }
  };

  const s = data?.summary || {};
  const batches = data?.batches || [];
  const pg = data?.pagination || {};

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Batches"    value={fmt(s.totalBatches)}    icon={Factory}   color="bg-blue-50 text-blue-600" />
        <SummaryCard label="Completed"        value={fmt(s.completedBatches)} icon={TrendingUp} color="bg-green-50 text-green-600" />
        <SummaryCard label="Planned Units"    value={fmt(s.totalPlanned)}    icon={FileText}  color="bg-slate-50 text-slate-600" />
        <SummaryCard label="Avg Efficiency"   value={`${fmt(s.avgEfficiency, 1)}%`} icon={TrendingUp} color="bg-brand-50 text-brand-600" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader size={24} className="animate-spin text-brand-500" /></div>
      ) : batches.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No production records match your filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Batch Code</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Planned</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-right">Efficiency</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map(b => (
                  <tr key={b._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{b.batchCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{b.product?.name || '—'}</p>
                      <p className="text-[11px] text-slate-500">{b.product?.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-600'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(b.plannedQuantity)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(b.actualQuantity) || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {b.efficiency
                        ? <span className={b.efficiency >= 95 ? 'text-green-600 font-bold' : b.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}>
                            {b.efficiency.toFixed(1)}%
                          </span>
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(b.startDate)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.createdBy?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pg.page} pages={pg.pages} total={pg.total}
            onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}

      {/* Export */}
      <div className="flex justify-end pt-2">
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          {exporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          Export Production CSV
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// TAB 2 — Waste Report
// ────────────────────────────────────────────────────────────────
function WasteReport({ globalFrom, globalTo }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState({ from: globalFrom || '', to: globalTo || '', wasteType: '', itemType: '' });

  useEffect(() => {
    setFilters(prev => ({ ...prev, from: globalFrom, to: globalTo }));
  }, [globalFrom, globalTo]);

  useEffect(() => {
    const handleFilter = (e) => {
      if (e.detail.key === 'wasteType') {
        setFilters(prev => ({ ...prev, wasteType: e.detail.value }));
      } else if (e.detail.key === 'itemType') {
        setFilters(prev => ({ ...prev, itemType: e.detail.value }));
      }
    };
    document.addEventListener('report-filter', handleFilter);
    return () => document.removeEventListener('report-filter', handleFilter);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWasteReport({ ...filters, page, limit: 15 });
      setData(res.data);
    } catch { toast.error('Could not load waste report.'); }
    finally  { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCSV('waste', filters);
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed.'); }
    finally  { setExporting(false); }
  };

  const s = data?.summary || {};
  const records = data?.records || [];
  const pg = data?.pagination || {};

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Records"    value={fmt(s.totalRecords)}                   icon={Trash2}       color="bg-red-50 text-red-600" />
        <SummaryCard label="Total Waste Qty"  value={`${fmt(s.totalQty, 1)} units`}         icon={Package}      color="bg-orange-50 text-orange-600" />
        <SummaryCard label="Total Waste Cost" value={`₹${fmt(s.totalCost, 2)}`}             icon={IndianRupee}   color="bg-rose-50 text-rose-600" />
        <SummaryCard label="Preventable"      value={`${fmt(s.preventable)} / ${fmt(s.totalRecords)}`} icon={Filter} color="bg-yellow-50 text-yellow-600" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader size={24} className="animate-spin text-brand-500" /></div>
      ) : records.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No waste records match your filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Waste Type</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3">Preventable</th>
                  <th className="px-4 py-3">Root Cause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(w => (
                  <tr key={w._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(w.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{w.itemId?.name || '—'}</p>
                      <p className="text-[11px] text-slate-500">{w.itemId?.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{w.itemType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${WASTE_TYPE_COLORS[w.wasteType] || 'bg-slate-100 text-slate-600'}`}>
                        {w.wasteType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(w.quantity, 2)} {w.unit}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">₹{fmt(w.cost, 2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${w.preventable ? 'text-orange-600' : 'text-slate-400'}`}>
                        {w.preventable ? '⚠️ Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate" title={w.rootCause}>
                      {w.rootCause || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pg.page} pages={pg.pages} total={pg.total}
            onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
      <div className="flex justify-end pt-2">
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          {exporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          Export Waste CSV
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// TAB 3 — Inventory Report
// ────────────────────────────────────────────────────────────────
function InventoryReport({ globalFrom, globalTo }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState({ from: globalFrom || '', to: globalTo || '', type: '', itemType: '' });

  useEffect(() => {
    setFilters(prev => ({ ...prev, from: globalFrom, to: globalTo }));
  }, [globalFrom, globalTo]);

  useEffect(() => {
    const handleFilter = (e) => {
      if (e.detail.key === 'type') {
        setFilters(prev => ({ ...prev, type: e.detail.value }));
      } else if (e.detail.key === 'itemType') {
        setFilters(prev => ({ ...prev, itemType: e.detail.value }));
      }
    };
    document.addEventListener('report-filter', handleFilter);
    return () => document.removeEventListener('report-filter', handleFilter);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventoryReport({ ...filters, page, limit: 15 });
      setData(res.data);
    } catch { toast.error('Could not load inventory report.'); }
    finally  { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCSV('inventory', filters);
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed.'); }
    finally  { setExporting(false); }
  };

  const s = data?.summary || {};
  const transactions = data?.transactions || [];
  const pg = data?.pagination || {};

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Transactions" value={fmt(s.totalTransactions)} icon={FileText}  color="bg-blue-50 text-blue-600" />
        <SummaryCard label="Total IN"           value={`${fmt(s.totalIn, 1)} units`}  icon={Package}  color="bg-green-50 text-green-600" />
        <SummaryCard label="Total OUT"          value={`${fmt(s.totalOut, 1)} units`} icon={Package}  color="bg-red-50 text-red-600" />
        <SummaryCard label="Net Movement"       value={`${fmt(s.netMovement, 1)} units`} icon={TrendingUp} color="bg-slate-50 text-slate-600" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader size={24} className="animate-spin text-brand-500" /></div>
      ) : transactions.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No inventory transactions match your filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Item Type</th>
                  <th className="px-4 py-3">Transaction Type</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(t => (
                  <tr key={t._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{t.itemId?.name || '—'}</p>
                      <p className="text-[11px] text-slate-500">{t.itemId?.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t.itemType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TX_COLORS[t.type] || 'bg-slate-100 text-slate-600'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(t.quantity, 2)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{t.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pg.page} pages={pg.pages} total={pg.total}
            onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
        </>
      )}
      <div className="flex justify-end pt-2">
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          {exporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          Export Inventory CSV
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MAIN PAGE — tabs + shared filter bar
// ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'production', label: 'Production',   icon: Factory  },
  { key: 'waste',      label: 'Waste',         icon: Trash2   },
  { key: 'inventory',  label: 'Inventory',     icon: Package  },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab]   = useState('production');
  const [from, setFrom]             = useState('');
  const [to, setTo]                 = useState('');

  // Each tab reads its own filters internally, but date range is shared
  // and passed down as key to force re-mount when dates change
  const dateKey = `${from}_${to}`;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-brand-400" size={26} />
          Reports & Data Export
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Filter, review, and download CSV reports for production, waste, and inventory movements
        </p>
      </div>

      {/* Shared Date Range Filter */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <CalendarDays size={16} className="text-slate-400 shrink-0" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 px-3 py-1.5 rounded-lg transition">
            <RefreshCw size={12} /> Clear Dates
          </button>
        )}
        <p className="text-xs text-slate-500 ml-auto">
          {!from && !to ? 'Showing all time data' : `Filtered: ${from || 'start'} → ${to || 'today'}`}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-slate-700 pb-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-xl border border-b-0 transition ${
                activeTab === tab.key
                  ? 'bg-white text-slate-800 border-slate-200'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content — white card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

        {/* Extra filters per tab */}
        <div className="flex flex-wrap gap-3 mb-5 pb-5 border-b border-slate-100">
          <span className="text-xs text-slate-400 self-center flex items-center gap-1">
            <Filter size={12} /> Additional Filter:
          </span>

          {activeTab === 'production' && (
            <select id="prod-status-filter"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700"
              onChange={e => {
                // This filter is read inside ProductionReport via its own state
                // We use a hidden input trick — simplest approach without prop drilling
                document.dispatchEvent(new CustomEvent('report-filter', {
                  detail: { key: 'status', value: e.target.value }
                }));
              }}>
              <option value="">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Planned">Planned</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          )}

          {activeTab === 'waste' && (
            <>
              <select onChange={e => document.dispatchEvent(new CustomEvent('report-filter', { detail: { key: 'wasteType', value: e.target.value } }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700">
                <option value="">All Waste Types</option>
                {['Spoilage','Overproduction','Processing Loss','Expired','Spillage','Quality Failure','Other'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
              <select onChange={e => document.dispatchEvent(new CustomEvent('report-filter', { detail: { key: 'itemType', value: e.target.value } }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700">
                <option value="">All Item Types</option>
                <option value="RawMaterial">Raw Material</option>
                <option value="Product">Finished Product</option>
              </select>
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              <select onChange={e => document.dispatchEvent(new CustomEvent('report-filter', { detail: { key: 'type', value: e.target.value } }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700">
                <option value="">All Transaction Types</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="ADJUST">ADJUST</option>
                <option value="WASTE_DEDUCTION">WASTE_DEDUCTION</option>
              </select>
              <select onChange={e => document.dispatchEvent(new CustomEvent('report-filter', { detail: { key: 'itemType', value: e.target.value } }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700">
                <option value="">All Item Types</option>
                <option value="RawMaterial">Raw Material</option>
                <option value="Product">Finished Product</option>
              </select>
            </>
          )}
        </div>

        {/* Active Tab Panel */}
        {activeTab === 'production' && <ProductionReport key={`prod_${dateKey}`} globalFrom={from} globalTo={to} />}
        {activeTab === 'waste'      && <WasteReport      key={`waste_${dateKey}`} globalFrom={from} globalTo={to} />}
        {activeTab === 'inventory'  && <InventoryReport  key={`inv_${dateKey}`}  globalFrom={from} globalTo={to} />}
      </div>
    </div>
  );
}
