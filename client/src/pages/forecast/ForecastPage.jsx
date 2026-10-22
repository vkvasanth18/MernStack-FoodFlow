/**
 * ForecastPage.jsx
 * ────────────────
 * Demand Forecasting & AI Production Recommendation UI
 *
 * Features:
 *  - Product selector dropdown
 *  - Algorithm selector (SMA, WMA, ES, Linear Regression)
 *  - Period selector (7-day / 30-day)
 *  - Recharts line chart: historical demand (blue) + forecasted (orange dashed)
 *  - AI Recommendation panel with step-by-step formula explanation
 *  - Raw material feasibility checklist
 *  - Saved forecast history table
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Brain, TrendingUp, Package, AlertTriangle, CheckCircle,
  XCircle, ChevronDown, BarChart2, Clock, Lightbulb,
  PlusCircle, RefreshCw, Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  generateForecast,
  getForecasts,
  getDemandHistory,
  addDemandHistory,
} from '../../services/forecastService';
import { getProducts } from '../../services/productService';

// ── Algorithm options ───────────────────────────────────────
const ALGORITHMS = [
  {
    value: 'sma',
    label: 'Simple Moving Average',
    desc : 'Averages the last 3 data points. Best for stable demand.',
  },
  {
    value: 'wma',
    label: 'Weighted Moving Average',
    desc : 'Gives more weight to recent data. Good for trending demand.',
  },
  {
    value: 'es',
    label: 'Exponential Smoothing',
    desc : 'Smoothing factor reacts to rapid changes. Versatile choice.',
  },
  {
    value: 'lr',
    label: 'Linear Regression',
    desc : 'Fits a trend line through all data. Best for steady growth/decline.',
  },
];

// ── Risk badge component ────────────────────────────────────
const RiskBadge = ({ level }) => {
  const styles = {
    low   : 'bg-green-500/10  text-green-400  border-green-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    high  : 'bg-red-500/10   text-red-400    border-red-500/30',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[level] || styles.low}`}>
      {level?.toUpperCase()} RISK
    </span>
  );
};

// ── Add Demand Record Modal ─────────────────────────────────
const AddDemandModal = ({ products, defaultProductId, onClose, onSave }) => {
  const [form, setForm] = useState({
    product: defaultProductId || (products[0]?._id || ''),
    quantity: '',
    date: new Date().toISOString().slice(0, 10),
    source: 'manual',
    channel: 'Retail',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDemandHistory({ ...form, quantity: parseFloat(form.quantity) });
      toast.success('Demand record added!');
      onSave();
      onClose();
    } catch {
      toast.error('Failed to add demand record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add Demand Data Point</h2>
          <p className="text-slate-400 text-sm mt-1">Record a historical or actual demand observation</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Product *</label>
            <select
              required
              value={form.product}
              onChange={e => setForm({ ...form, product: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Select product…</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code || 'PRD'})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Quantity *</label>
              <input
                required type="number" min="0" step="0.01"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Source</label>
              <select
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                {['manual', 'sales', 'orders', 'import'].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Channel</label>
              <input
                type="text" placeholder="e.g. Retail"
                value={form.channel}
                onChange={e => setForm({ ...form, channel: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">
              Add Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────
export default function ForecastPage() {
  const [products, setProducts]         = useState([]);
  const [selectedProduct, setSelected]  = useState('');
  const [algorithm, setAlgorithm]       = useState('sma');
  const [periods, setPeriods]           = useState(7);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);        // latest forecast result
  const [history, setHistory]           = useState([]);          // saved forecast list
  const [showAddModal, setShowAddModal] = useState(false);

  // Load products list
  useEffect(() => {
    getProducts({ limit: 100 })
      .then(res => {
        const list = res.products || res.data?.products || [];
        setProducts(list);
        if (list.length > 0) {
          setSelected(list[0]._id);
          // Automatically run initial forecast for the first product in user's list
          generateForecast({ productId: list[0]._id, algorithm: 'sma', periods: 7 })
            .then(fRes => {
              setResult(fRes.data.forecast);
            })
            .catch(() => {});
        }
      })
      .catch(() => toast.error('Could not load products.'));
  }, []);

  // Load saved forecast history
  const loadHistory = useCallback(() => {
    getForecasts({ limit: 5, productId: selectedProduct || undefined })
      .then(res => setHistory(res.data?.forecasts || []))
      .catch(() => {});
  }, [selectedProduct]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Run forecast ──────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedProduct) { toast.error('Please select a product first.'); return; }
    setLoading(true);
    try {
      const res = await generateForecast({ productId: selectedProduct, algorithm, periods });
      setResult(res.data.forecast);
      loadHistory();
      toast.success('Forecast generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Forecast failed. Add demand history first.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle product switch ─────────────────────────────────
  const handleSelectProduct = (newProductId) => {
    setSelected(newProductId);
    if (newProductId) {
      setLoading(true);
      generateForecast({ productId: newProductId, algorithm, periods })
        .then(fRes => {
          setResult(fRes.data.forecast);
          loadHistory();
        })
        .catch(err => {
          setResult(null);
          toast.error(err.response?.data?.message || 'Could not load forecast for selected product.');
        })
        .finally(() => setLoading(false));
    } else {
      setResult(null);
    }
  };

  const selectedProductObj = products.find(p => p._id === selectedProduct);

  // ── Build chart data ──────────────────────────────────────
  const chartData = React.useMemo(() => {
    if (!result) return [];
    const historical = (result.historicalData || []).map((h, i) => ({
      label    : `H${i + 1}`,
      historical: h.quantity,
      forecast : null,
    }));
    const forecasted = (result.algorithmDetails?.forecast || []).map((f, i) => ({
      label    : `F${i + 1}`,
      historical: null,
      forecast : f,
    }));
    return [...historical, ...forecasted];
  }, [result]);

  const rec = result?.recommendation;
  const algoDetails = result?.algorithmDetails;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="text-brand-400" size={26} />
            Demand Forecasting & AI Planning
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Generate intelligent production recommendations from historical demand data
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <PlusCircle size={16} /> Add Demand Record
        </button>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Forecast Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Product */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-slate-400">Product ({products.length} in catalog)</label>
              {selectedProductObj && (
                <span className="text-[10px] text-brand-400 font-mono font-semibold">
                  {selectedProductObj.code}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={selectedProduct}
                onChange={e => handleSelectProduct(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm pr-8 focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select a product from your list…</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code || 'PRD'}) — Stock: {p.currentStock ?? 0} {p.unit || 'units'}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>
            {selectedProductObj && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  {selectedProductObj.category}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Stock: <strong className="text-emerald-400">{selectedProductObj.currentStock} {selectedProductObj.unit}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Min Buffer: <strong className="text-slate-200">{selectedProductObj.minStock} {selectedProductObj.unit}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Shelf-Life: <strong className="text-slate-200">{selectedProductObj.shelfLifeDays || 30}d</strong>
                </span>
              </div>
            )}
          </div>

          {/* Algorithm */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Algorithm</label>
            <div className="relative">
              <select
                value={algorithm}
                onChange={e => setAlgorithm(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm pr-8"
              >
                {ALGORITHMS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {ALGORITHMS.find(a => a.value === algorithm)?.desc}
            </p>
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Forecast Period</label>
            <div className="flex gap-2">
              {[7, 14, 30].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriods(p)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                    periods === p
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'border-slate-600 text-slate-300 hover:border-brand-500'
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedProduct}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            {loading
              ? <><Loader size={15} className="animate-spin" /> Generating…</>
              : <><TrendingUp size={15} /> Generate Forecast</>
            }
          </button>
        </div>
      </div>

      {/* Results section — only shown after generating */}
      {result && (
        <>
          {/* Chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              📈 Historical Demand vs Forecast
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {/* Separator line between historical and forecast */}
                  <ReferenceLine
                    x={`H${result.historicalData?.length || 0}`}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: 'Forecast →', fill: '#f59e0b', fontSize: 11 }}
                  />
                  <Line
                    type="monotone" dataKey="historical"
                    name="Historical Demand"
                    stroke="#60a5fa" strokeWidth={2}
                    dot={{ r: 3 }} connectNulls={false}
                  />
                  <Line
                    type="monotone" dataKey="forecast"
                    name="Forecast"
                    stroke="#f97316" strokeWidth={2} strokeDasharray="6 3"
                    dot={{ r: 4, fill: '#f97316' }} connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-column: Algorithm details + Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Algorithm Details */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart2 size={15} /> Algorithm Details
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-400">Algorithm Used</span>
                  <span className="text-white font-medium">{algoDetails?.algorithm}</span>
                </div>
                {algoDetails?.windowSize && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-400">Window Size</span>
                    <span className="text-white">{algoDetails.windowSize} periods</span>
                  </div>
                )}
                {algoDetails?.alpha !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-400">Alpha (α)</span>
                    <span className="text-white">{algoDetails.alpha}</span>
                  </div>
                )}
                {algoDetails?.slope !== undefined && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className="text-slate-400">Slope (m)</span>
                      <span className="text-white">{algoDetails.slope}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className="text-slate-400">Trend Direction</span>
                      <span className={`font-semibold ${
                        algoDetails.trendDirection === 'upward' ? 'text-green-400' :
                        algoDetails.trendDirection === 'downward' ? 'text-red-400' : 'text-slate-300'
                      }`}>{algoDetails.trendDirection}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-400">Total Forecast</span>
                  <span className="text-brand-400 font-bold text-base">
                    {algoDetails?.forecast?.reduce((s, v) => s + v, 0).toFixed(1)} units
                  </span>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400 leading-relaxed">
                  💡 {algoDetails?.details}
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            {rec && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Lightbulb size={15} /> AI Production Recommendation
                </h2>

                {/* Verdict banner */}
                <div className={`rounded-xl p-4 mb-4 border ${
                  rec.riskLevel === 'high'   ? 'bg-red-500/10 border-red-500/30' :
                  rec.riskLevel === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                               'bg-green-500/10 border-green-500/30'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white font-medium">{rec.verdict}</p>
                    <RiskBadge level={rec.riskLevel} />
                  </div>
                </div>

                {/* Formula steps */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Step-by-step Calculation
                  </p>
                  {rec.explanationSteps?.map((step, i) => (
                    <div key={i} className="bg-slate-900 rounded-lg px-3 py-2 text-xs text-slate-300">
                      {/* strip markdown bold for display */}
                      {step.replace(/\*\*/g, '')}
                    </div>
                  ))}
                </div>

                {/* Risk warnings */}
                {rec.riskReasons?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Warnings</p>
                    {rec.riskReasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-red-300">{r.replace(/[⚠️🚫]/g, '').trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Raw Material Feasibility */}
          {rec?.materialChecks?.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package size={15} /> Raw Material Feasibility Check
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase text-left border-b border-slate-700">
                      <th className="py-2 pr-4">Material</th>
                      <th className="py-2 pr-4 text-right">Required</th>
                      <th className="py-2 pr-4 text-right">Available</th>
                      <th className="py-2 pr-4 text-right">Shortfall</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.materialChecks.map((m, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="py-3 pr-4 text-white font-medium">{m.materialName}</td>
                        <td className="py-3 pr-4 text-right text-slate-300">{m.required} {m.unit}</td>
                        <td className="py-3 pr-4 text-right text-slate-300">{m.available} {m.unit}</td>
                        <td className="py-3 pr-4 text-right">
                          {m.sufficient
                            ? <span className="text-slate-500">—</span>
                            : <span className="text-red-400 font-semibold">{m.shortfall} {m.unit}</span>
                          }
                        </td>
                        <td className="py-3">
                          {m.sufficient
                            ? <span className="flex items-center gap-1 text-green-400"><CheckCircle size={13} /> OK</span>
                            : <span className="flex items-center gap-1 text-red-400"><XCircle size={13} /> Shortage</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent Forecast History */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock size={15} /> Recent Saved Forecasts
          </h2>
          <button onClick={loadHistory} className="text-slate-400 hover:text-white">
            <RefreshCw size={14} />
          </button>
        </div>
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No forecasts saved yet. Generate your first forecast above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase text-left border-b border-slate-700">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Algorithm</th>
                  <th className="py-2 pr-4 text-right">Period</th>
                  <th className="py-2 pr-4 text-right">Forecast Demand</th>
                  <th className="py-2 text-right">Recommend. Production</th>
                </tr>
              </thead>
              <tbody>
                {history.map(f => (
                  <tr key={f._id} className="border-b border-slate-700/50">
                    <td className="py-3 pr-4 text-white font-medium">
                      {f.product?.name || '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 capitalize">{f.algorithm}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">{f.forecastPeriod}d</td>
                    <td className="py-3 pr-4 text-right text-blue-400">
                      {f.forecastedDemand?.toFixed(1)}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-brand-400 font-semibold">{f.recommendedProduction}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Demand Modal */}
      {showAddModal && (
        <AddDemandModal
          products={products}
          defaultProductId={selectedProduct}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            if (selectedProduct) handleSelectProduct(selectedProduct);
          }}
        />
      )}
    </div>
  );
}
