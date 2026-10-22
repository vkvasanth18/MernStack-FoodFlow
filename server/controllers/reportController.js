/**
 * reportController.js
 * ───────────────────
 * Generates filtered reports for Production, Waste, and Inventory.
 * Also handles CSV export for each report type.
 *
 * Routes (mounted at /api/reports):
 *   GET /production   → production report (filterable, paginated)
 *   GET /waste        → waste report (filterable, paginated)
 *   GET /inventory    → inventory movement report (filterable)
 *   GET /export/production  → download CSV of production data
 *   GET /export/waste       → download CSV of waste data
 *   GET /export/inventory   → download CSV of inventory transactions
 */

import Production          from '../models/Production.js';
import Waste               from '../models/Waste.js';
import InventoryTransaction from '../models/InventoryTransaction.js';

// ─── Tiny CSV builder (no external library needed) ───────────
/**
 * Converts an array of flat objects to a CSV string.
 * @param {string[]} headers  - Column headers
 * @param {Array}    rows     - Array of values in same order as headers
 * @returns {string} CSV content
 */
function buildCSV(headers, rows) {
  const escape = (val) => {
    const str = val == null ? '' : String(val);
    // Wrap in quotes if contains comma, newline, or quote
    return str.includes(',') || str.includes('\n') || str.includes('"')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const lines = [
    headers.join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ];
  return lines.join('\n');
}

// ─── Date filter helper ───────────────────────────────────────
function buildDateFilter(field, from, to) {
  const filter = {};
  if (from || to) {
    filter[field] = {};
    if (from) filter[field].$gte = new Date(from);
    if (to)   filter[field].$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }
  return filter;
}

// ─────────────────────────────────────────────────────────────
// GET /api/reports/production
// Query: ?from=2024-01-01&to=2024-12-31&status=Completed&page=1&limit=20
// ─────────────────────────────────────────────────────────────
export const getProductionReport = async (req, res, next) => {
  try {
    const { from, to, status, productId } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = {
      ...buildDateFilter('startDate', from, to),
    };
    if (status)    filter.status  = status;
    if (productId) filter.product = productId;

    const [batches, total] = await Promise.all([
      Production.find(filter)
        .populate('product',    'name code unit')
        .populate('createdBy',  'name')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit),
      Production.countDocuments(filter),
    ]);

    // Summary stats for the filtered set
    const allBatches = await Production.find(filter).select('actualQuantity plannedQuantity efficiency status');
    const completed  = allBatches.filter(b => b.status === 'Completed');
    const totalPlanned  = allBatches.reduce((s, b) => s + (b.plannedQuantity  || 0), 0);
    const totalActual   = completed.reduce( (s, b) => s + (b.actualQuantity   || 0), 0);
    const avgEfficiency = completed.length
      ? completed.reduce((s, b) => s + (b.efficiency || 0), 0) / completed.length
      : 0;

    res.json({
      success: true,
      summary: {
        totalBatches   : total,
        completedBatches: completed.length,
        totalPlanned,
        totalActual,
        avgEfficiency  : parseFloat(avgEfficiency.toFixed(1)),
      },
      batches,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/waste
// Query: ?from=&to=&wasteType=Spoilage&itemType=RawMaterial&page=1&limit=20
// ─────────────────────────────────────────────────────────────
export const getWasteReport = async (req, res, next) => {
  try {
    const { from, to, wasteType, itemType } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = { ...buildDateFilter('date', from, to) };
    if (wasteType) filter.wasteType = wasteType;
    if (itemType)  filter.itemType  = itemType;

    const [records, total] = await Promise.all([
      Waste.find(filter)
        .populate('itemId',     'name code unit')
        .populate('recordedBy', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Waste.countDocuments(filter),
    ]);

    // Summary
    const allWaste       = await Waste.find(filter).select('quantity cost preventable wasteType');
    const totalQty       = allWaste.reduce((s, w) => s + (w.quantity || 0), 0);
    const totalCost      = allWaste.reduce((s, w) => s + (w.cost     || 0), 0);
    const preventable    = allWaste.filter(w => w.preventable).length;

    // Group by waste type for mini breakdown
    const byType = {};
    allWaste.forEach(w => {
      byType[w.wasteType] = (byType[w.wasteType] || 0) + w.cost;
    });

    res.json({
      success: true,
      summary: {
        totalRecords : total,
        totalQty     : parseFloat(totalQty.toFixed(2)),
        totalCost    : parseFloat(totalCost.toFixed(2)),
        preventable,
        notPreventable: total - preventable,
        byType,
      },
      records,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/inventory
// Query: ?from=&to=&type=OUT&itemType=RawMaterial&page=1&limit=20
// ─────────────────────────────────────────────────────────────
export const getInventoryReport = async (req, res, next) => {
  try {
    const { from, to, type, itemType } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = { ...buildDateFilter('createdAt', from, to) };
    if (type)     filter.type     = type;
    if (itemType) filter.itemType = itemType;

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('itemId', 'name code unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryTransaction.countDocuments(filter),
    ]);

    // Count by type
    const allTx  = await InventoryTransaction.find(filter).select('type quantity');
    const inQty  = allTx.filter(t => t.type === 'IN' ).reduce((s, t) => s + t.quantity, 0);
    const outQty = allTx.filter(t => t.type === 'OUT').reduce((s, t) => s + t.quantity, 0);

    res.json({
      success: true,
      summary: {
        totalTransactions: total,
        totalIn          : parseFloat(inQty.toFixed(2)),
        totalOut         : parseFloat(outQty.toFixed(2)),
        netMovement      : parseFloat((inQty - outQty).toFixed(2)),
      },
      transactions,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/export/production
// Downloads a CSV file of production data
// ─────────────────────────────────────────────────────────────
export const exportProductionCSV = async (req, res, next) => {
  try {
    const { from, to, status, productId } = req.query;
    const filter = { ...buildDateFilter('startDate', from, to) };
    if (status)    filter.status  = status;
    if (productId) filter.product = productId;

    const batches = await Production.find(filter)
      .populate('product',   'name code unit')
      .populate('createdBy', 'name')
      .sort({ startDate: -1 })
      .limit(500); // cap at 500 rows for safety

    const headers = [
      'Batch Code', 'Product Name', 'Product Code', 'Unit',
      'Status', 'Planned Qty', 'Actual Qty', 'Efficiency (%)',
      'Start Date', 'End Date', 'Created By', 'Notes',
    ];

    const rows = batches.map(b => [
      b.batchCode,
      b.product?.name   || '',
      b.product?.code   || '',
      b.product?.unit   || '',
      b.status,
      b.plannedQuantity,
      b.actualQuantity  || '',
      b.efficiency      ? b.efficiency.toFixed(1) : '',
      b.startDate       ? new Date(b.startDate).toLocaleDateString() : '',
      b.endDate         ? new Date(b.endDate).toLocaleDateString()   : '',
      b.createdBy?.name || '',
      b.notes           || '',
    ]);

    const csv = buildCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="production_report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/export/waste
// Downloads a CSV file of waste records
// ─────────────────────────────────────────────────────────────
export const exportWasteCSV = async (req, res, next) => {
  try {
    const { from, to, wasteType, itemType } = req.query;
    const filter = { ...buildDateFilter('date', from, to) };
    if (wasteType) filter.wasteType = wasteType;
    if (itemType)  filter.itemType  = itemType;

    const records = await Waste.find(filter)
      .populate('itemId',     'name code unit')
      .populate('recordedBy', 'name')
      .sort({ date: -1 })
      .limit(500);

    const headers = [
      'Date', 'Item Name', 'Item Code', 'Item Type',
      'Waste Type', 'Quantity', 'Unit', 'Cost (₹)',
      'Root Cause', 'Preventable', 'Recorded By',
    ];

    const rows = records.map(w => [
      w.date         ? new Date(w.date).toLocaleDateString() : '',
      w.itemId?.name || '',
      w.itemId?.code || '',
      w.itemType,
      w.wasteType,
      w.quantity,
      w.unit         || w.itemId?.unit || '',
      w.cost?.toFixed(2) || '',
      w.rootCause    || '',
      w.preventable  ? 'Yes' : 'No',
      w.recordedBy?.name || '',
    ]);

    const csv = buildCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="waste_report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/reports/export/inventory
// Downloads a CSV file of inventory transactions
// ─────────────────────────────────────────────────────────────
export const exportInventoryCSV = async (req, res, next) => {
  try {
    const { from, to, type, itemType } = req.query;
    const filter = { ...buildDateFilter('createdAt', from, to) };
    if (type)     filter.type     = type;
    if (itemType) filter.itemType = itemType;

    const transactions = await InventoryTransaction.find(filter)
      .populate('itemId', 'name code unit')
      .sort({ createdAt: -1 })
      .limit(500);

    const headers = [
      'Date', 'Item Name', 'Item Code', 'Item Type',
      'Transaction Type', 'Quantity', 'Unit', 'Reason',
    ];

    const rows = transactions.map(t => [
      t.createdAt   ? new Date(t.createdAt).toLocaleDateString() : '',
      t.itemId?.name || '',
      t.itemId?.code || '',
      t.itemType,
      t.type,
      t.quantity,
      t.itemId?.unit || '',
      t.reason       || '',
    ]);

    const csv = buildCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
