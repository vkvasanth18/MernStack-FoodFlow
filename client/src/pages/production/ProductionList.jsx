import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getProductions,
  createProduction,
  updateProduction,
  deleteProduction,
} from '../../services/productionService';
import { getProducts } from '../../services/productService';
import { getRawMaterials } from '../../services/rawMaterialService';
import {
  Factory,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Percent,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ProductionList = () => {
  const { user } = useAuth();
  const [productions, setProductions] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create Batch Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: '',
    product: '',
    plannedQuantity: 100,
    productionDate: new Date().toISOString().split('T')[0],
    materialsUsed: [],
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Complete Batch Modal
  const [completingBatch, setCompletingBatch] = useState(null);
  const [actualYield, setActualYield] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'production_manager';

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const data = await getProductions({ status, page, limit: 8 });
      setProductions(data.productions || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch (error) {
      toast.error('Failed to load production batches.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [prods, rms] = await Promise.all([
        getProducts({ limit: 100 }),
        getRawMaterials({ limit: 100 }),
      ]);
      setProductsList(prods.products || []);
      setRawMaterialsList(rms.rawMaterials || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [status, page]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      batchNumber: '',
      product: productsList[0]?._id || '',
      plannedQuantity: 100,
      productionDate: new Date().toISOString().split('T')[0],
      materialsUsed: [],
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleAddMaterialRow = () => {
    if (rawMaterialsList.length === 0) return;
    setFormData({
      ...formData,
      materialsUsed: [
        ...formData.materialsUsed,
        {
          material: rawMaterialsList[0]._id,
          quantity: 25,
          unit: rawMaterialsList[0].unit,
        },
      ],
    });
  };

  const handleRemoveMaterialRow = (index) => {
    const updated = formData.materialsUsed.filter((_, idx) => idx !== index);
    setFormData({ ...formData, materialsUsed: updated });
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...formData.materialsUsed];
    updated[index][field] = value;
    if (field === 'material') {
      const found = rawMaterialsList.find((m) => m._id === value);
      if (found) updated[index].unit = found.unit;
    }
    setFormData({ ...formData, materialsUsed: updated });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product) {
      toast.error('Please select a finished product.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await createProduction(formData);
      if (res.hasMaterialShortage) {
        toast('⚠️ Created with raw material shortage alert!', { icon: '⚠️' });
      } else {
        toast.success('Production run scheduled successfully!');
      }
      setIsCreateModalOpen(false);
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create plan.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStartBatch = async (batchId) => {
    try {
      await updateProduction(batchId, { status: 'In Progress' });
      toast.success('Batch is now In Progress!');
      fetchBatches();
    } catch (error) {
      toast.error('Failed to update status.');
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!actualYield || Number(actualYield) <= 0) {
      toast.error('Please enter valid actual yield.');
      return;
    }

    setCompleteLoading(true);
    try {
      await updateProduction(completingBatch._id, {
        status: 'Completed',
        actualQuantity: Number(actualYield),
      });
      toast.success(
        `Batch ${completingBatch.batchNumber} completed! Stock and materials updated.`
      );
      setCompletingBatch(null);
      setActualYield('');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete batch.');
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleDelete = async (batchId) => {
    if (!window.confirm('Delete this planned production batch?')) return;
    try {
      await deleteProduction(batchId);
      toast.success('Batch cancelled.');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cannot delete batch.');
    }
  };

  const getStatusBadge = (bStatus) => {
    switch (bStatus) {
      case 'Planned':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Planned
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            Cancelled
          </span>
        );
      default:
        return <span>{bStatus}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Production Planning & Batches
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manufacturing schedules, ingredient consumption, recipe execution, and actual yield efficiency ({totalCount} batches)
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Production</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
        >
          <option value="All">All Production Statuses</option>
          <option value="Planned">Planned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading production schedules...</p>
          </div>
        ) : productions.length === 0 ? (
          <div className="p-12 text-center">
            <Factory className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No production batches found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click 'Schedule Production' to create your first batch run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Batch Code & Date</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Planned vs Actual</th>
                  <th className="px-4 py-3.5">Efficiency</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Recipe Ingredients</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {productions.map((batch) => (
                  <tr key={batch._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 font-mono">
                        {batch.batchNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(batch.productionDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">
                        {batch.product?.name || 'Custom Run'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {batch.product?.category}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">
                        {batch.status === 'Completed'
                          ? `${batch.actualQuantity} / ${batch.plannedQuantity}`
                          : `Planned: ${batch.plannedQuantity}`}{' '}
                        {batch.product?.unit || 'units'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {batch.status === 'Completed' ? (
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            batch.efficiency >= 95
                              ? 'text-emerald-600'
                              : batch.efficiency >= 85
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          <Percent className="w-3 h-3" />
                          {batch.efficiency}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending yield</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(batch.status)}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-[11px] text-slate-600">
                        {batch.materialsUsed?.length > 0 ? (
                          <span>{batch.materialsUsed.length} materials allocated</span>
                        ) : (
                          <span className="text-slate-400">Standard recipe</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && batch.status === 'Planned' && (
                          <button
                            onClick={() => handleStartBatch(batch._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold transition"
                            title="Start Processing"
                          >
                            <Play className="w-3 h-3" />
                            <span>Start</span>
                          </button>
                        )}
                        {canManage && batch.status === 'In Progress' && (
                          <button
                            onClick={() => {
                              setCompletingBatch(batch);
                              setActualYield(batch.plannedQuantity);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition"
                            title="Post Yield & Complete"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete</span>
                          </button>
                        )}
                        {canManage && batch.status !== 'Completed' && (
                          <button
                            onClick={() => handleDelete(batch._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Cancel Batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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

      {/* Schedule Production Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Schedule New Production Batch
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Finished Food Product *
                </label>
                <select
                  required
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                >
                  <option value="">-- Select Product --</option>
                  {productsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code}) — Shelf Life: {p.shelfLifeDays}d
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Planned Target Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.plannedQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, plannedQuantity: e.target.value })
                    }
                    placeholder="e.g. 200"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Scheduled Production Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.productionDate}
                    onChange={(e) =>
                      setFormData({ ...formData, productionDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              {/* Recipe Ingredients Allocation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Allocate Raw Materials / Recipe
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                  >
                    + Add Ingredient
                  </button>
                </div>

                {formData.materialsUsed.length === 0 ? (
                  <p className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                    Optional: Specify required raw materials to auto-deduct upon completion and verify shortage alerts.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formData.materialsUsed.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={row.material}
                          onChange={(e) =>
                            handleMaterialChange(idx, 'material', e.target.value)
                          }
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        >
                          {rawMaterialsList.map((rm) => (
                            <option key={rm._id} value={rm._id}>
                              {rm.name} (Stock: {rm.currentStock} {rm.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={row.quantity}
                          onChange={(e) =>
                            handleMaterialChange(idx, 'quantity', e.target.value)
                          }
                          placeholder="Qty"
                          className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                        <span className="text-xs text-slate-500 w-10">{row.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Batch Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Line 2 shift A morning run"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition disabled:opacity-60"
                >
                  {formLoading ? 'Scheduling...' : 'Schedule Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Batch Modal */}
      {completingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              Complete Batch {completingBatch.batchNumber}
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1 mb-4">
              Enter the actual units finished. The system will calculate production efficiency, credit finished stock, and deduct raw materials.
            </p>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Actual Manufactured Yield ({completingBatch.product?.unit || 'units'}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={actualYield}
                  onChange={(e) => setActualYield(e.target.value)}
                  placeholder={`Planned: ${completingBatch.plannedQuantity}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none text-center"
                />
              </div>

              {actualYield && completingBatch.plannedQuantity > 0 && (
                <div className="text-center p-2 rounded-xl bg-slate-50 text-xs">
                  Estimated Efficiency:{' '}
                  <span className="font-bold text-emerald-600">
                    {((actualYield / completingBatch.plannedQuantity) * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingBatch(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-60"
                >
                  {completeLoading ? 'Posting...' : 'Finish & Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionList;
