/**
 * dashboardController.js
 * ──────────────────────
 * Serves role-aware dashboard data:
 *
 *   GET /api/dashboard/stats
 *     → admin / full data (original)
 *     → production_manager / production-focused data
 *     → inventory_manager  / inventory-focused data
 */

import Product              from '../models/Product.js';
import RawMaterial          from '../models/RawMaterial.js';
import Production           from '../models/Production.js';
import Waste                from '../models/Waste.js';
import Alert                from '../models/Alert.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Supplier             from '../models/Supplier.js';

// ── Shared helpers ─────────────────────────────────────────────────────────

const weekAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Build last-7-day production vs waste chart data */
const buildProductionChart = async () => {
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayLabel = dayStart.toLocaleDateString('en-US', { weekday: 'short' });

    const [dayProd, dayWaste] = await Promise.all([
      Production.aggregate([
        { $match: { status: 'Completed', updatedAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$actualQuantity' } } },
      ]),
      Waste.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]),
    ]);

    chartData.push({
      day: dayLabel,
      production: dayProd[0]?.total || 0,
      waste: dayWaste[0]?.total || 0,
    });
  }
  return chartData;
};

// ── Admin dashboard (full data) ────────────────────────────────────────────

const getAdminStats = async () => {
  const now       = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const start     = weekAgo();

  const [
    totalProducts,
    totalRawMaterials,
    unreadAlerts,
    criticalAlerts,
    lowStockCount,
    nearExpiryCount,
  ] = await Promise.all([
    Product.countDocuments({ status: { $ne: 'Discontinued' } }),
    RawMaterial.countDocuments(),
    Alert.countDocuments({ isRead: false }),
    Alert.countDocuments({ isRead: false, severity: 'critical' }),
    RawMaterial.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } }),
    RawMaterial.countDocuments({ expiryDate: { $lte: sevenDays, $gte: now } }),
  ]);

  const [weeklyProduction, weeklyWaste] = await Promise.all([
    Production.aggregate([
      { $match: { status: 'Completed', updatedAt: { $gte: start } } },
      {
        $group: {
          _id: null,
          totalActual:   { $sum: '$actualQuantity' },
          totalPlanned:  { $sum: '$plannedQuantity' },
          batchCount:    { $sum: 1 },
          avgEfficiency: { $avg: '$efficiency' },
        },
      },
    ]),
    Waste.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' }, totalCost: { $sum: '$cost' } } },
    ]),
  ]);

  const prod  = weeklyProduction[0] || { totalActual: 0, totalPlanned: 0, batchCount: 0, avgEfficiency: 0 };
  const waste = weeklyWaste[0]       || { totalQty: 0, totalCost: 0 };

  const [chartData, recentActivity, topProducts, activeBatches] = await Promise.all([
    buildProductionChart(),
    InventoryTransaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('itemId', 'name code')
      .select('type quantity itemType reason createdAt'),
    Product.find({ status: { $ne: 'Discontinued' } })
      .sort({ currentStock: -1 })
      .limit(5)
      .select('name code currentStock minStock unit stockStatus'),
    Production.find({ status: 'In Progress' })
      .populate('product', 'name code')
      .select('batchCode product plannedQuantity startDate')
      .limit(5),
  ]);

  return {
    role: 'admin',
    kpis: {
      totalProducts,
      totalRawMaterials,
      unreadAlerts,
      criticalAlerts,
      lowStockCount,
      nearExpiryCount,
      weeklyProductionUnits: prod.totalActual,
      weeklyBatchCount:      prod.batchCount,
      avgEfficiency:         parseFloat((prod.avgEfficiency || 0).toFixed(1)),
      weeklyWasteQty:        parseFloat(waste.totalQty.toFixed(2)),
      weeklyWasteCost:       parseFloat(waste.totalCost.toFixed(2)),
      wastePercentage:       prod.totalActual > 0
        ? parseFloat(((waste.totalQty / prod.totalActual) * 100).toFixed(1))
        : 0,
    },
    chartData,
    recentActivity,
    topProducts,
    activeBatches,
  };
};

// ── Production Manager dashboard ───────────────────────────────────────────

const getProductionManagerStats = async () => {
  const now       = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const start     = weekAgo();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const [
    unreadAlerts,
    criticalAlerts,
    weeklyProduction,
    weeklyWaste,
    todayProduction,
    forecastAlerts,
  ] = await Promise.all([
    Alert.countDocuments({ isRead: false }),
    Alert.countDocuments({ isRead: false, severity: 'critical' }),
    Production.aggregate([
      { $match: { status: 'Completed', updatedAt: { $gte: start } } },
      {
        $group: {
          _id: null,
          totalActual:   { $sum: '$actualQuantity' },
          totalPlanned:  { $sum: '$plannedQuantity' },
          batchCount:    { $sum: 1 },
          avgEfficiency: { $avg: '$efficiency' },
        },
      },
    ]),
    Waste.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' }, totalCost: { $sum: '$cost' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { status: 'Completed', updatedAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$actualQuantity' }, batches: { $sum: 1 } } },
    ]),
    Alert.countDocuments({ isRead: false, category: 'production' }).catch(() => 0),
  ]);

  const prod  = weeklyProduction[0] || { totalActual: 0, totalPlanned: 0, batchCount: 0, avgEfficiency: 0 };
  const waste = weeklyWaste[0]       || { totalQty: 0, totalCost: 0, count: 0 };
  const today = todayProduction[0]   || { total: 0, batches: 0 };

  const [chartData, activeBatches, recentWaste] = await Promise.all([
    buildProductionChart(),
    Production.find({ status: 'In Progress' })
      .populate('product', 'name code')
      .select('batchCode product plannedQuantity startDate efficiency')
      .limit(8),
    Waste.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('itemId', 'name')
      .select('reason quantity cost createdAt itemId itemType'),
  ]);

  return {
    role: 'production_manager',
    kpis: {
      todayProductionUnits:  today.total,
      todayBatchCount:       today.batches,
      weeklyProductionUnits: prod.totalActual,
      weeklyBatchCount:      prod.batchCount,
      avgEfficiency:         parseFloat((prod.avgEfficiency || 0).toFixed(1)),
      weeklyWasteQty:        parseFloat(waste.totalQty.toFixed(2)),
      weeklyWasteCost:       parseFloat(waste.totalCost.toFixed(2)),
      wasteCount:            waste.count,
      wastePercentage:       prod.totalActual > 0
        ? parseFloat(((waste.totalQty / prod.totalActual) * 100).toFixed(1))
        : 0,
      unreadAlerts,
      criticalAlerts,
    },
    chartData,
    activeBatches,
    recentWaste,
  };
};

// ── Inventory Manager dashboard ────────────────────────────────────────────

const getInventoryManagerStats = async () => {
  const now       = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalRawMaterials,
    lowStockCount,
    nearExpiryCount,
    unreadAlerts,
    criticalAlerts,
    totalSuppliers,
    activeSuppliers,
  ] = await Promise.all([
    RawMaterial.countDocuments(),
    RawMaterial.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } }),
    RawMaterial.countDocuments({ expiryDate: { $lte: sevenDays, $gte: now } }),
    Alert.countDocuments({ isRead: false }),
    Alert.countDocuments({ isRead: false, severity: 'critical' }),
    Supplier.countDocuments().catch(() => 0),
    Supplier.countDocuments({ status: 'Active' }).catch(() => 0),
  ]);

  const [lowStockItems, nearExpiryItems, recentActivity, fifoStatus] = await Promise.all([
    RawMaterial.find({ $expr: { $lte: ['$currentStock', '$minStock'] } })
      .sort({ currentStock: 1 })
      .limit(6)
      .select('name currentStock minStock unit category'),
    RawMaterial.find({ expiryDate: { $lte: sevenDays, $gte: now } })
      .sort({ expiryDate: 1 })
      .limit(6)
      .select('name expiryDate currentStock unit'),
    InventoryTransaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('itemId', 'name code')
      .select('type quantity itemType reason createdAt'),
    InventoryTransaction.find({ type: 'OUT' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('itemId', 'name')
      .select('type quantity itemType reason createdAt'),
  ]);

  return {
    role: 'inventory_manager',
    kpis: {
      totalRawMaterials,
      lowStockCount,
      nearExpiryCount,
      unreadAlerts,
      criticalAlerts,
      totalSuppliers,
      activeSuppliers,
    },
    lowStockItems,
    nearExpiryItems,
    recentActivity,
    fifoStatus,
  };
};

// ── Route handler ──────────────────────────────────────────────────────────

export const getDashboardStats = async (req, res, next) => {
  try {
    const role = req.user?.role;

    let data;
    if (role === 'production_manager') {
      data = await getProductionManagerStats();
    } else if (role === 'inventory_manager') {
      data = await getInventoryManagerStats();
    } else {
      // admin (or any unrecognized role) → full dashboard
      data = await getAdminStats();
    }

    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};
