import InventoryTransaction from '../models/InventoryTransaction.js';
import RawMaterial from '../models/RawMaterial.js';
import Product from '../models/Product.js';
import Alert from '../models/Alert.js';

/**
 * @desc    Get inventory transaction history ledger
 * @route   GET /api/inventory/transactions
 * @access  Private
 */
export const getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      itemType,
      reason,
      page = 1,
      limit = 15,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (type && type !== 'All') {
      query.type = type;
    }

    if (itemType && itemType !== 'All') {
      query.itemType = itemType;
    }

    if (reason && reason !== 'All') {
      query.reason = reason;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await InventoryTransaction.countDocuments(query);
    const transactions = await InventoryTransaction.find(query)
      .populate('performedBy', 'name email role')
      .populate('itemId', 'name code unit currentStock')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record manual stock-in, stock-out, or audit adjustment
 * @route   POST /api/inventory/transactions
 * @access  Private/Admin/InventoryManager
 */
export const recordTransaction = async (req, res, next) => {
  try {
    const {
      itemType,
      itemId,
      type,
      quantity,
      unitCost,
      reason,
      notes,
      batchNumber,
      expiryDate,
    } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction quantity must be greater than zero.',
      });
    }

    const Model = itemType === 'Product' ? Product : RawMaterial;
    const item = await Model.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${itemType} not found with ID ${itemId}.`,
      });
    }

    // Apply stock delta based on transaction type
    if (type === 'IN') {
      item.currentStock += qty;
    } else if (type === 'OUT' || type === 'WASTE_DEDUCTION') {
      if (item.currentStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock on hand! Available: ${item.currentStock} ${item.unit}, Requested deduction: ${qty} ${item.unit}`,
        });
      }
      item.currentStock -= qty;
    } else if (type === 'ADJUSTMENT') {
      // In adjustment, qty is the new absolute stock count
      item.currentStock = qty;
    }

    await item.save();

    // Check for low stock alert
    if (item.currentStock <= item.minStock) {
      await Alert.create({
        title: `Low Stock: ${item.name}`,
        message: `Inventory for ${item.name} dropped to ${item.currentStock} ${item.unit} (Safety min: ${item.minStock}).`,
        type: 'LOW_STOCK',
        severity: item.currentStock === 0 ? 'critical' : 'warning',
        relatedItem: item._id,
        relatedItemType: itemType,
      });
    }

    const transaction = await InventoryTransaction.create({
      itemType,
      itemId,
      type,
      quantity: qty,
      unit: item.unit,
      batchNumber: batchNumber || item.batchNumber || `TXN-${Date.now().toString().slice(-6)}`,
      expiryDate: expiryDate || item.expiryDate,
      unitCost: Number(unitCost || item.costPerUnit || item.productionCost || 0),
      totalCost: qty * Number(unitCost || item.costPerUnit || item.productionCost || 0),
      reason: reason || 'Stock Audit Adjustment',
      notes: notes || '',
      performedBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: `Stock ${type} transaction logged successfully. New stock: ${item.currentStock} ${item.unit}`,
      transaction,
      updatedStock: item.currentStock,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory summary metrics (valuation, total items, alerts)
 * @route   GET /api/inventory/summary
 * @access  Private
 */
export const getInventorySummary = async (req, res, next) => {
  try {
    const rawMaterials = await RawMaterial.find({});
    const products = await Product.find({});

    let rawMaterialsValue = 0;
    let lowStockRawMaterials = 0;
    let nearExpiryMaterials = 0;

    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    rawMaterials.forEach((rm) => {
      rawMaterialsValue += (rm.currentStock || 0) * (rm.costPerUnit || 0);
      if (rm.currentStock <= rm.minStock) lowStockRawMaterials++;
      if (rm.expiryDate && new Date(rm.expiryDate) <= sevenDays) nearExpiryMaterials++;
    });

    let productsValue = 0;
    let lowStockProducts = 0;

    products.forEach((p) => {
      productsValue += (p.currentStock || 0) * (p.productionCost || 0);
      if (p.currentStock <= p.minStock) lowStockProducts++;
    });

    res.status(200).json({
      success: true,
      summary: {
        rawMaterialsCount: rawMaterials.length,
        rawMaterialsValue: parseFloat(rawMaterialsValue.toFixed(2)),
        lowStockRawMaterials,
        nearExpiryMaterials,
        productsCount: products.length,
        productsValue: parseFloat(productsValue.toFixed(2)),
        lowStockProducts,
        totalInventoryValue: parseFloat(
          (rawMaterialsValue + productsValue).toFixed(2)
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};
