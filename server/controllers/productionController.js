import Production from '../models/Production.js';
import Product from '../models/Product.js';
import RawMaterial from '../models/RawMaterial.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Alert from '../models/Alert.js';

/**
 * @desc    Get all production plans and batches
 * @route   GET /api/production
 * @access  Private
 */
export const getProductions = async (req, res, next) => {
  try {
    const {
      status,
      product,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (product && product !== 'All') {
      query.product = product;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Production.countDocuments(query);
    const productions = await Production.find(query)
      .populate('product', 'name code category unit currentStock sellingPrice productionCost')
      .populate('manager', 'name email role')
      .populate('materialsUsed.material', 'name code unit currentStock costPerUnit')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: productions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      productions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single production batch by ID
 * @route   GET /api/production/:id
 * @access  Private
 */
export const getProductionById = async (req, res, next) => {
  try {
    const production = await Production.findById(req.params.id)
      .populate('product')
      .populate('manager', 'name email role')
      .populate('materialsUsed.material');

    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production batch record not found.',
      });
    }

    res.status(200).json({
      success: true,
      production,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new production plan
 * @route   POST /api/production
 * @access  Private/Admin/ProductionManager
 */
export const createProduction = async (req, res, next) => {
  try {
    const {
      batchNumber,
      product: productId,
      plannedQuantity,
      materialsUsed,
      productionDate,
      productionCost,
      notes,
    } = req.body;

    const targetProduct = await Product.findById(productId);
    if (!targetProduct) {
      return res.status(404).json({
        success: false,
        message: 'Target finished product does not exist.',
      });
    }

    const batchCode =
      batchNumber ||
      `BATCH-${targetProduct.code}-${Date.now().toString().slice(-5)}`;

    // Verify raw material availability and check for shortages
    const shortages = [];
    if (Array.isArray(materialsUsed)) {
      for (const item of materialsUsed) {
        const mat = await RawMaterial.findById(item.material);
        if (mat) {
          if (mat.currentStock < item.quantity) {
            shortages.push(
              `${mat.name}: Required ${item.quantity} ${mat.unit}, Available: ${mat.currentStock} ${mat.unit}`
            );
          }
        }
      }
    }

    // If ingredients are critically short, trigger a PRODUCTION_RISK alert
    if (shortages.length > 0) {
      await Alert.create({
        title: `Production Risk: ${batchCode}`,
        message: `Insufficient raw materials for planned batch ${batchCode}: ${shortages.join(
          '; '
        )}`,
        type: 'PRODUCTION_RISK',
        severity: 'critical',
      });
    }

    const production = await Production.create({
      batchNumber: batchCode.toUpperCase(),
      product: productId,
      plannedQuantity: Number(plannedQuantity),
      actualQuantity: 0,
      materialsUsed: materialsUsed || [],
      productionDate: productionDate || Date.now(),
      productionCost: Number(productionCost || targetProduct.productionCost * plannedQuantity),
      status: 'Planned',
      manager: req.user?._id,
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Production plan created successfully.',
      hasMaterialShortage: shortages.length > 0,
      shortages,
      production,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update production plan status or record completion yield
 * @route   PUT /api/production/:id
 * @access  Private/Admin/ProductionManager
 */
export const updateProduction = async (req, res, next) => {
  try {
    const production = await Production.findById(req.params.id);

    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production plan not found.',
      });
    }

    const previousStatus = production.status;
    const newStatus = req.body.status || production.status;
    const actualQty =
      req.body.actualQuantity !== undefined
        ? Number(req.body.actualQuantity)
        : production.actualQuantity;

    // CORE AUTOMATION: When marking as 'Completed', deduct raw materials & credit finished goods
    if (newStatus === 'Completed' && previousStatus !== 'Completed') {
      if (actualQty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide valid actualQuantity yield before completing the batch.',
        });
      }

      // 1. Credit finished goods inventory
      const product = await Product.findById(production.product);
      if (product) {
        product.currentStock += actualQty;
        await product.save();

        await InventoryTransaction.create({
          itemType: 'Product',
          itemId: product._id,
          type: 'IN',
          quantity: actualQty,
          unit: product.unit,
          batchNumber: production.batchNumber,
          unitCost: product.productionCost,
          totalCost: actualQty * product.productionCost,
          reason: 'Production Output',
          performedBy: req.user?._id,
          notes: `Manufactured via Batch ${production.batchNumber}`,
        });
      }

      // 2. Deduct raw materials used from inventory
      if (Array.isArray(production.materialsUsed)) {
        for (const item of production.materialsUsed) {
          const rawMat = await RawMaterial.findById(item.material);
          if (rawMat) {
            rawMat.currentStock = Math.max(0, rawMat.currentStock - item.quantity);
            await rawMat.save();

            await InventoryTransaction.create({
              itemType: 'RawMaterial',
              itemId: rawMat._id,
              type: 'OUT',
              quantity: item.quantity,
              unit: rawMat.unit,
              batchNumber: production.batchNumber,
              unitCost: rawMat.costPerUnit,
              totalCost: item.quantity * rawMat.costPerUnit,
              reason: 'Production Usage',
              performedBy: req.user?._id,
              notes: `Consumed in Batch ${production.batchNumber}`,
            });

            // Trigger alert if stock dropped below minimum
            if (rawMat.currentStock <= rawMat.minStock) {
              await Alert.create({
                title: `Low Stock: ${rawMat.name}`,
                message: `${rawMat.name} has fallen to ${rawMat.currentStock} ${rawMat.unit} after production usage. Reorder now.`,
                type: 'LOW_STOCK',
                severity: rawMat.currentStock === 0 ? 'critical' : 'warning',
                relatedItem: rawMat._id,
                relatedItemType: 'RawMaterial',
              });
            }
          }
        }
      }

      production.completionDate = new Date();
    }

    // Update standard fields
    if (req.body.plannedQuantity !== undefined) {
      production.plannedQuantity = Number(req.body.plannedQuantity);
    }
    if (req.body.actualQuantity !== undefined) {
      production.actualQuantity = actualQty;
    }
    if (req.body.wasteQuantity !== undefined) {
      production.wasteQuantity = Number(req.body.wasteQuantity);
    }
    if (req.body.productionCost !== undefined) {
      production.productionCost = Number(req.body.productionCost);
    }
    if (req.body.notes !== undefined) {
      production.notes = req.body.notes;
    }
    production.status = newStatus;

    const updatedProduction = await production.save();

    res.status(200).json({
      success: true,
      message:
        newStatus === 'Completed'
          ? `Batch completed! Added ${actualQty} units to product stock and deducted raw materials.`
          : 'Production batch updated successfully.',
      production: updatedProduction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a planned production run
 * @route   DELETE /api/production/:id
 * @access  Private/Admin
 */
export const deleteProduction = async (req, res, next) => {
  try {
    const production = await Production.findById(req.params.id);

    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production record not found.',
      });
    }

    if (production.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed production batches with posted inventory movements.',
      });
    }

    await production.deleteOne();

    res.status(200).json({
      success: true,
      message: `Production batch '${production.batchNumber}' deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
