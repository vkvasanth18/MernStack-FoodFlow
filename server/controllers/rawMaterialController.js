import RawMaterial from '../models/RawMaterial.js';
import Alert from '../models/Alert.js';

/**
 * Helper to generate system alerts for low stock and near expiry
 */
const triggerMaterialAlerts = async (material) => {
  try {
    const now = new Date();
    const expiry = new Date(material.expiryDate);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    // 1. Expiry Alert
    if (diffDays <= 0) {
      await Alert.create({
        title: `EXPIRED: ${material.name}`,
        message: `Batch ${material.batchNumber} of ${material.name} expired on ${expiry.toLocaleDateString()}. Quarantine immediately.`,
        type: 'EXPIRY',
        severity: 'critical',
        relatedItem: material._id,
        relatedItemType: 'RawMaterial',
      });
    } else if (diffDays <= 7) {
      await Alert.create({
        title: `Near Expiry: ${material.name}`,
        message: `${material.name} (Batch ${material.batchNumber}) will expire in ${diffDays} day(s). Prioritize in production schedule.`,
        type: 'EXPIRY',
        severity: 'warning',
        relatedItem: material._id,
        relatedItemType: 'RawMaterial',
      });
    }

    // 2. Low Stock Alert
    if (material.currentStock <= material.minStock) {
      await Alert.create({
        title: `Low Stock: ${material.name}`,
        message: `Current stock (${material.currentStock} ${material.unit}) is below safety threshold (${material.minStock} ${material.unit}). Reorder from supplier.`,
        type: 'LOW_STOCK',
        severity: material.currentStock === 0 ? 'critical' : 'warning',
        relatedItem: material._id,
        relatedItemType: 'RawMaterial',
      });
    }
  } catch (err) {
    console.error('Failed to trigger automated alert:', err.message);
  }
};

/**
 * @desc    Get all raw materials with search, category, status & expiry filters
 * @route   GET /api/raw-materials
 * @access  Private
 */
export const getRawMaterials = async (req, res, next) => {
  try {
    const {
      search,
      category,
      condition,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { storageLocation: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (condition && condition !== 'All') {
      if (condition === 'Low Stock') {
        query.$expr = { $lte: ['$currentStock', '$minStock'] };
      } else if (condition === 'Near Expiry') {
        query.expiryDate = { $gte: now, $lte: sevenDaysFromNow };
      } else if (condition === 'Expired') {
        query.expiryDate = { $lt: now };
      } else if (condition === 'Available') {
        query.$and = [
          { currentStock: { $gt: 0 } },
          { expiryDate: { $gt: sevenDaysFromNow } },
        ];
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await RawMaterial.countDocuments(query);
    const rawMaterials = await RawMaterial.find(query)
      .populate('supplier', 'name companyName email phone')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: rawMaterials.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      rawMaterials,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single raw material by ID
 * @route   GET /api/raw-materials/:id
 * @access  Private
 */
export const getRawMaterialById = async (req, res, next) => {
  try {
    const material = await RawMaterial.findById(req.params.id).populate(
      'supplier',
      'name companyName email phone'
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found.',
      });
    }

    res.status(200).json({
      success: true,
      material,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new raw material
 * @route   POST /api/raw-materials
 * @access  Private/Admin/InventoryManager
 */
export const createRawMaterial = async (req, res, next) => {
  try {
    const {
      name,
      code,
      category,
      unit,
      currentStock,
      minStock,
      maxStock,
      costPerUnit,
      supplier,
      expiryDate,
      storageLocation,
      batchNumber,
    } = req.body;

    const existingCode = await RawMaterial.findOne({
      code: code ? code.trim().toUpperCase() : '',
    });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Material code '${code.toUpperCase()}' is already in use.`,
      });
    }

    const material = await RawMaterial.create({
      name,
      code: code.trim().toUpperCase(),
      category,
      unit,
      currentStock: Number(currentStock || 0),
      minStock: Number(minStock || 25),
      maxStock: Number(maxStock || 500),
      costPerUnit: Number(costPerUnit || 0),
      supplier: supplier || null,
      expiryDate,
      storageLocation: storageLocation || 'Warehouse A',
      batchNumber:
        batchNumber || `RM-BATCH-${Date.now().toString().slice(-6)}`,
    });

    // Check and trigger alerts in the background if stock is low or near expiry
    await triggerMaterialAlerts(material);

    res.status(201).json({
      success: true,
      message: 'Raw material added successfully.',
      material,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update raw material
 * @route   PUT /api/raw-materials/:id
 * @access  Private/Admin/InventoryManager
 */
export const updateRawMaterial = async (req, res, next) => {
  try {
    const material = await RawMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found.',
      });
    }

    if (req.body.code && req.body.code.toUpperCase() !== material.code) {
      const codeExists = await RawMaterial.findOne({
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: `Material code '${req.body.code.toUpperCase()}' is already taken.`,
        });
      }
    }

    const fields = [
      'name',
      'category',
      'unit',
      'currentStock',
      'minStock',
      'maxStock',
      'costPerUnit',
      'supplier',
      'expiryDate',
      'storageLocation',
      'batchNumber',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        material[field] = req.body[field];
      }
    });

    if (req.body.code) {
      material.code = req.body.code.trim().toUpperCase();
    }

    const updated = await material.save();
    await triggerMaterialAlerts(updated);

    res.status(200).json({
      success: true,
      message: 'Raw material updated successfully.',
      material: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete raw material
 * @route   DELETE /api/raw-materials/:id
 * @access  Private/Admin
 */
export const deleteRawMaterial = async (req, res, next) => {
  try {
    const material = await RawMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found.',
      });
    }

    await material.deleteOne();

    res.status(200).json({
      success: true,
      message: `Raw material '${material.name}' deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
