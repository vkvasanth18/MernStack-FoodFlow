import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getWasteRecords,
  createWasteRecord,
  getWasteAnalytics,
  deleteWasteRecord,
} from '../../services/wasteService';
import { getRawMaterials } from '../../services/rawMaterialService';
import { getProducts } from '../../services/productService';
import {
  Trash2,
  Plus,
  IndianRupee,
  Scale,
  AlertTriangle,
  Calendar,
  X,
  TrendingDown,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const wasteCategories = [
  'All',
  'Expired',
  'Spoilage',
  'Overproduction',
  'Damaged',
  'Processing Loss',
  'Quality Rejection',
  'Other',
];

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const WasteManagement = () => {
  const { user } = useAuth();
  const [wasteLogs, setWasteLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [wasteType, setWasteType] = useState('All');
  const [itemType, setItemType] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [formData, setFormData] = useState({
    itemType: 'RawMaterial',
    itemId: '',
    wasteType: 'Spoilage',
    quantity: '',
    reason: '',
    productionBatch: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [formLoading, setFormLoading] = useState(false);

  const canDelete = user?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, analyticsData] = await Promise.all([
        getWasteRecords({ wasteType, itemType, page, limit: 8 }),
        getWasteAnalytics(),
      ]);
      setWasteLogs(logsData.wasteLogs || []);
      setTotalPages(logsData.pages || 1);
      setTotalCount(logsData.total || 0);
      setAnalytics(analyticsData.analytics || null);
    } catch (error) {
      toast.error('Failed to load waste analytics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const [rms, prods] = await Promise.all([
        getRawMaterials({ limit: 100 }),
        getProducts({ limit: 100 }),
      ]);
      setRawMaterialsList(rms.rawMaterials || []);
      setProductsList(prods.products || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [wasteType, itemType, page]);

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      itemType: 'RawMaterial',
      itemId: rawMaterialsList[0]?._id || '',
      wasteType: 'Spoilage',
      quantity: '',
      reason: '',
      productionBatch: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemId) {
      toast.error('Please select an item.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await createWasteRecord(formData);
      toast.success(res.message || 'Waste incident logged successfully.');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to log waste.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this waste audit log?')) return;
    try {
      await deleteWasteRecord(id);
      toast.success('Log deleted.');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete record.');
    }
  };

  const getWasteTypeBadge = (wType) => {
    let colorClasses = 'bg-slate-100 text-slate-700';
    if (wType === 'Expired') colorClasses = 'bg-rose-100 text-rose-700 border border-rose-200';
    if (wType === 'Spoilage') colorClasses = 'bg-amber-100 text-amber-700 border border-amber-200';
    if (wType === 'Overproduction') colorClasses = 'bg-blue-100 text-blue-700 border border-blue-200';
    if (wType === 'Quality Rejection') colorClasses = 'bg-purple-100 text-purple-700 border border-purple-200';

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colorClasses}`}>
        {wType}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Food Waste Management & Cost Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Root-cause breakdown, financial loss accounting, and waste reduction analytics ({totalCount} logs)
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Food Waste</span>
        </button>
      </div>

      {/* Analytics KPI Row */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Financial Loss
              </p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                ₹{analytics.totalCost.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Direct raw ingredient & goods loss</p>
            </div>
            <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Wasted Mass / Units
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analytics.totalQuantity.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                Target: &lt;3% of production volume
              </p>
            </div>
            <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Logged Incidents
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analytics.totalIncidents} Recorded
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Filtered across all plant facilities</p>
            </div>
            <div className="w-11 h-11 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Analytics Chart Row */}
      {analytics?.wasteByType?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Financial Waste by Root Cause Category */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Monetary Waste Loss by Root Cause (₹)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Cost of spoiled, expired, or rejected food items
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.wasteByType}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="cost" fill="#ef4444" radius={[6, 6, 0, 0]}>
                    {analytics.wasteByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Wasted Items Ranking */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">
                Highest Financial Loss Items
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Ingredients and finished products requiring urgent formulation or storage improvements
              </p>
              <div className="space-y-3">
                {analytics.topWastedItems?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{item.count} incident(s)</span>
                      <span className="font-bold text-rose-600">₹{item.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={wasteType}
            onChange={(e) => {
              setWasteType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
          >
            {wasteCategories.map((c) => (
              <option key={c} value={c}>
                Root Cause: {c}
              </option>
            ))}
          </select>

          <select
            value={itemType}
            onChange={(e) => {
              setItemType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="All">All Item Types</option>
            <option value="RawMaterial">Raw Materials</option>
            <option value="Product">Finished Products</option>
          </select>
        </div>
      </div>

      {/* Waste Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading waste incident records...</p>
          </div>
        ) : wasteLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No waste incidents recorded</p>
            <p className="text-xs text-slate-500 mt-1">Excellent job! Zero waste loss reported.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Wasted Item</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Quantity Lost</th>
                  <th className="px-4 py-3.5">Financial Cost</th>
                  <th className="px-4 py-3.5">Root Cause Reason</th>
                  <th className="px-4 py-3.5">Batch</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {wasteLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {log.itemId?.name || 'Deleted Item'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.itemType} • {log.itemId?.code || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">{getWasteTypeBadge(log.wasteType)}</td>
                    <td className="px-4 py-3.5 font-bold text-rose-600">
                      -{log.quantity} {log.unit}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      ₹{log.cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 max-w-xs truncate">
                      {log.reason}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[10px]">
                      {log.productionBatch || 'Warehouse'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(log._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Waste Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Record Food Waste / Spoilage Incident
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Item Type
                  </label>
                  <select
                    value={formData.itemType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({
                        ...formData,
                        itemType: newType,
                        itemId:
                          newType === 'RawMaterial'
                            ? rawMaterialsList[0]?._id || ''
                            : productsList[0]?._id || '',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="RawMaterial">Raw Ingredient</option>
                    <option value="Product">Finished Product</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Root Cause Category *
                  </label>
                  <select
                    value={formData.wasteType}
                    onChange={(e) =>
                      setFormData({ ...formData, wasteType: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    {wasteCategories
                      .filter((c) => c !== 'All')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Item *
                </label>
                <select
                  required
                  value={formData.itemId}
                  onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                >
                  <option value="">-- Choose Item --</option>
                  {formData.itemType === 'RawMaterial'
                    ? rawMaterialsList.map((rm) => (
                        <option key={rm._id} value={rm._id}>
                          {rm.name} ({rm.code}) — On Hand: {rm.currentStock} {rm.unit}
                        </option>
                      ))
                    : productsList.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.code}) — On Hand: {p.currentStock} {p.unit}
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Wasted Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="e.g. 15.5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Loss
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Batch Code (Optional)
                </label>
                <input
                  type="text"
                  value={formData.productionBatch}
                  onChange={(e) =>
                    setFormData({ ...formData, productionBatch: e.target.value })
                  }
                  placeholder="e.g. BATCH-BREAD-01 or leave blank"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Root Cause Explanation *
                </label>
                <textarea
                  required
                  rows="2"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Cold storage temperature spike overnight caused premature curdling."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition disabled:opacity-60"
                >
                  {formLoading ? 'Recording...' : 'Record Waste Loss'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasteManagement;
