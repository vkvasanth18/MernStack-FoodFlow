import Supplier from '../models/Supplier.js';
import RawMaterial from '../models/RawMaterial.js';

/**
 * @desc    Get all suppliers with search and status filter
 * @route   GET /api/suppliers
 * @access  Private
 */
export const getSuppliers = async (req, res, next) => {
  try {
    const { search, status, sortBy = 'companyName', sortOrder = 'asc' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const suppliers = await Supplier.find(query).sort(sort);

    res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    // Also fetch raw materials provided by this supplier
    const materials = await RawMaterial.find({ supplier: req.params.id }).select(
      'name code currentStock unit expiryDate'
    );

    res.status(200).json({
      success: true,
      supplier,
      materialsSuppliedList: materials,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new supplier
 * @route   POST /api/suppliers
 * @access  Private/Admin/InventoryManager
 */
export const createSupplier = async (req, res, next) => {
  try {
    const {
      name,
      companyName,
      email,
      phone,
      address,
      materialsSupplied,
      rating,
      leadTimeDays,
      status,
    } = req.body;

    const materialsArray = Array.isArray(materialsSupplied)
      ? materialsSupplied
      : materialsSupplied
      ? materialsSupplied.split(',').map((m) => m.trim())
      : [];

    const supplier = await Supplier.create({
      name,
      companyName,
      email,
      phone,
      address: address || '',
      materialsSupplied: materialsArray,
      rating: rating ? Number(rating) : 4.5,
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 3,
      status: status || 'Active',
    });

    res.status(201).json({
      success: true,
      message: 'Supplier registered successfully.',
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private/Admin/InventoryManager
 */
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    const fields = [
      'name',
      'companyName',
      'email',
      'phone',
      'address',
      'rating',
      'leadTimeDays',
      'status',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        supplier[field] = req.body[field];
      }
    });

    if (req.body.materialsSupplied !== undefined) {
      supplier.materialsSupplied = Array.isArray(req.body.materialsSupplied)
        ? req.body.materialsSupplied
        : req.body.materialsSupplied.split(',').map((m) => m.trim());
    }

    const updatedSupplier = await supplier.save();

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully.',
      supplier: updatedSupplier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private/Admin
 */
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    await supplier.deleteOne();

    res.status(200).json({
      success: true,
      message: `Supplier '${supplier.companyName}' removed successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
