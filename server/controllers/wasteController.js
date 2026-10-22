import Waste from '../models/Waste.js';
import RawMaterial from '../models/RawMaterial.js';
import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Alert from '../models/Alert.js';

/**
 * @desc    Get all food waste logs with filtering & pagination
 * @route   GET /api/waste
 * @access  Private
 */
export const getWasteRecords = async (req, res, next) => {
  try {
    const {
      wasteType,
      itemType,
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (wasteType && wasteType !== 'All') {
      query.wasteType = wasteType;
    }

    if (itemType && itemType !== 'All') {
      query.itemType = itemType;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Waste.countDocuments(query);
    const wasteLogs = await Waste.find(query)
      .populate('recordedBy', 'name email role')
      .populate('itemId', 'name code category unit costPerUnit productionCost')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: wasteLogs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      wasteLogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log a new food waste incident & auto-deduct from inventory
 * @route   POST /api/waste
 * @access  Private/Staff
 */
export const createWasteRecord = async (req, res, next) => {
  try {
    const {
      itemType,
      itemId,
      wasteType,
      quantity,
      reason,
      productionBatch,
      date,
    } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Waste quantity must be greater than zero.',
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

    // Determine unit cost and monetary waste loss
    const unitPrice = Number(item.costPerUnit || item.productionCost || 1);
    const totalWasteCost = parseFloat((qty * unitPrice).toFixed(2));

    // 1. Deduct wasted quantity from inventory stock
    item.currentStock = Math.max(0, item.currentStock - qty);
    await item.save();

    // 2. Post an inventory audit transaction for the write-off
    await InventoryTransaction.create({
      itemType,
      itemId: item._id,
      type: 'WASTE_DEDUCTION',
      quantity: qty,
      unit: item.unit,
      batchNumber: productionBatch || `WASTE-${Date.now().toString().slice(-5)}`,
      unitCost: unitPrice,
      totalCost: totalWasteCost,
      reason: wasteType === 'Expired' ? 'Expired' : 'Spoilage',
      performedBy: req.user?._id,
      notes: `Write-off: ${reason}`,
    });

    // 3. Create the waste log entry
    const waste = await Waste.create({
      itemType,
      itemId: item._id,
      wasteType: wasteType || 'Spoilage',
      quantity: qty,
      unit: item.unit,
      cost: totalWasteCost,
      reason,
      productionBatch: productionBatch || '',
      date: date || Date.now(),
      recordedBy: req.user?._id,
    });

    // 4. Trigger automated High Waste anomaly alert if monetary loss or quantity is severe
    if (totalWasteCost >= 100 || qty >= 50) {
      await Alert.create({
        title: `High Waste Incident: ${item.name}`,
        message: `High food loss reported: ${qty} ${item.unit} (${wasteType}) valued at ₹${totalWasteCost}. Root cause: ${reason}.`,
        type: 'HIGH_WASTE',
        severity: totalWasteCost >= 250 ? 'critical' : 'warning',
        relatedItem: waste._id,
        relatedItemType: 'Waste',
      });
    }

    res.status(201).json({
      success: true,
      message: `Food waste recorded (₹${totalWasteCost} loss). Deducted ${qty} ${item.unit} from stock.`,
      waste,
      updatedStock: item.currentStock,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get comprehensive waste reduction analytics and charts data
 * @route   GET /api/waste/analytics
 * @access  Private
 */
export const getWasteAnalytics = async (req, res, next) => {
  try {
    const allWaste = await Waste.find({}).populate('itemId', 'name category');

    let totalCost = 0;
    let totalQuantity = 0;
    const wasteByTypeMap = {};
    const wasteByMonthMap = {};
    const wasteByItemMap = {};

    allWaste.forEach((w) => {
      totalCost += w.cost || 0;
      totalQuantity += w.quantity || 0;

      // Group by Waste Type
      if (!wasteByTypeMap[w.wasteType]) {
        wasteByTypeMap[w.wasteType] = { name: w.wasteType, cost: 0, quantity: 0 };
      }
      wasteByTypeMap[w.wasteType].cost += w.cost || 0;
      wasteByTypeMap[w.wasteType].quantity += w.quantity || 0;

      // Group by Month (YYYY-MM)
      const monthKey = new Date(w.date).toISOString().slice(0, 7);
      if (!wasteByMonthMap[monthKey]) {
        wasteByMonthMap[monthKey] = { month: monthKey, cost: 0, quantity: 0 };
      }
      wasteByMonthMap[monthKey].cost += w.cost || 0;
      wasteByMonthMap[monthKey].quantity += w.quantity || 0;

      // Group by Item Name
      const itemName = w.itemId?.name || 'Unknown Item';
      if (!wasteByItemMap[itemName]) {
        wasteByItemMap[itemName] = { name: itemName, cost: 0, count: 0 };
      }
      wasteByItemMap[itemName].cost += w.cost || 0;
      wasteByItemMap[itemName].count += 1;
    });

    const wasteByType = Object.values(wasteByTypeMap);
    const wasteByMonth = Object.values(wasteByMonthMap).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
    const topWastedItems = Object.values(wasteByItemMap)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      analytics: {
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalQuantity: parseFloat(totalQuantity.toFixed(2)),
        totalIncidents: allWaste.length,
        wasteByType,
        wasteByMonth,
        topWastedItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete waste record (Admin only)
 * @route   DELETE /api/waste/:id
 * @access  Private/Admin
 */
export const deleteWasteRecord = async (req, res, next) => {
  try {
    const record = await Waste.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Waste record not found.',
      });
    }

    await record.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Waste record deleted.',
    });
  } catch (error) {
    next(error);
  }
};
