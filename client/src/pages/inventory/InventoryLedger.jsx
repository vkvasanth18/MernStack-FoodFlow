import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getTransactions,
  recordTransaction,
  getInventorySummary,
} from '../../services/inventoryService';
import { getRawMaterials } from '../../services/rawMaterialService';
import { getProducts } from '../../services/productService';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Layers,
  Package,
  IndianRupee,
  AlertTriangle,
  X,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const InventoryLedger = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [type, setType] = useState('All');
  const [itemType, setItemType] = useState('All');
  const [reason, setReason] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [formData, setFormData] = useState({
    itemType: 'RawMaterial',
    itemId: '',
    type: 'IN',
    quantity: '',
    reason: 'Purchase Order',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'inventory_manager';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txData, sumData] = await Promise.all([
        getTransactions({ type, itemType, reason, page, limit: 10 }),
        getInventorySummary(),
      ]);
      setTransactions(txData.transactions || []);
      setTotalPages(txData.pages || 1);
      setTotalCount(txData.total || 0);
      setSummary(sumData.summary || null);
    } catch (error) {
      toast.error('Failed to load inventory movements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemLists = async () => {
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
  }, [type, itemType, reason, page]);

  useEffect(() => {
    fetchItemLists();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      itemType: 'RawMaterial',
      itemId: rawMaterialsList[0]?._id || '',
      type: 'IN',
      quantity: '',
      reason: 'Purchase Order',
      notes: '',
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
      await recordTransaction(formData);
      toast.success('Inventory movement logged successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transaction failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const getTypeBadge = (txnType) => {
    switch (txnType) {
      case 'IN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Stock In
          </span>
        );
      case 'OUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <ArrowUpRight className="w-3 h-3 text-blue-600" /> Stock Out
          </span>
        );
      case 'WASTE_DEDUCTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Waste Write-off
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <RefreshCw className="w-3 h-3 text-amber-600" /> Adjustment
          </span>
        );
      default:
        return <span>{txnType}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Movements & FIFO Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete transaction history of warehouse receipts, production usage, and stock audits ({totalCount} entries)
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Record Movement</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Inventory Valuation
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ₹{summary.totalInventoryValue.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Raw Materials: ₹{summary.rawMaterialsValue.toLocaleString()} | Products: ₹{summary.productsValue.toLocaleString()}
              </p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Raw Ingredients Stored
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {summary.rawMaterialsCount} Items
              </p>
              <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                {summary.lowStockRawMaterials} below safety reorder level
              </p>
            </div>
            <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Near Expiry Alerts
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {summary.nearExpiryMaterials} Batches
              </p>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                Expiring within next 7 days
              </p>
            </div>
            <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Movement Type Filter */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="All">All Types (IN/OUT/ADJUST)</option>
            <option value="IN">Stock In (Receipts)</option>
            <option value="OUT">Stock Out (Usage)</option>
            <option value="ADJUSTMENT">Audit Adjustments</option>
            <option value="WASTE_DEDUCTION">Waste Write-off</option>
          </select>

          {/* Item Category Filter */}
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

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading ledger transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No transactions recorded</p>
            <p className="text-xs text-slate-500 mt-1">
              Movements will be logged automatically during production and purchasing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Item Details</th>
                  <th className="px-4 py-3.5">Quantity Change</th>
                  <th className="px-4 py-3.5">Value (₹)</th>
                  <th className="px-4 py-3.5">Reason & Batch</th>
                  <th className="px-5 py-3.5">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">{getTypeBadge(tx.type)}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {tx.itemId?.name || 'Deleted Item'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {tx.itemType} • {tx.itemId?.code || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`font-bold ${
                          tx.type === 'IN'
                            ? 'text-emerald-600'
                            : tx.type === 'OUT' || tx.type === 'WASTE_DEDUCTION'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {tx.type === 'IN' ? '+' : tx.type === 'OUT' || tx.type === 'WASTE_DEDUCTION' ? '-' : ''}
                        {tx.quantity} {tx.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      ₹{tx.totalCost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{tx.reason}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {tx.batchNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {tx.performedBy?.name || 'System Auto'}
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

      {/* Record Movement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Log Stock Movement Transaction
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
                    Item Category
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
                    <option value="RawMaterial">Raw Material (Ingredient)</option>
                    <option value="Product">Finished Product</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Movement Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let defaultReason = 'Purchase Order';
                      if (newType === 'OUT') defaultReason = 'Production Usage';
                      if (newType === 'ADJUSTMENT') defaultReason = 'Stock Audit Adjustment';
                      setFormData({ ...formData, type: newType, reason: defaultReason });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="IN">Stock In (Receive)</option>
                    <option value="OUT">Stock Out (Deduct)</option>
                    <option value="ADJUSTMENT">Audit Adjustment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Target Item *
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
                          {rm.name} ({rm.code}) — Current: {rm.currentStock} {rm.unit}
                        </option>
                      ))
                    : productsList.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.code}) — Current: {p.currentStock} {p.unit}
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Reason
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Purchase Order">Purchase Order</option>
                    <option value="Production Usage">Production Usage</option>
                    <option value="Production Output">Production Output</option>
                    <option value="Stock Audit Adjustment">Stock Audit Adjustment</option>
                    <option value="Return">Supplier Return</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Audit Reference
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="PO #4829 or Audit reason"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                />
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
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition disabled:opacity-60"
                >
                  {formLoading ? 'Posting...' : 'Post Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryLedger;
