import Product from '../models/Product.js';

/**
 * @desc    Get all products with filtering, search, sorting & pagination
 * @route   GET /api/products
 * @access  Private
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      status,
      stockStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Keyword Search on Name or Product Code
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    // Category Filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Status Filter (Active, Discontinued)
    if (status && status !== 'All') {
      query.status = status;
    }

    // Dynamic Stock Status Filter
    if (stockStatus && stockStatus !== 'All') {
      if (stockStatus === 'Low Stock') {
        query.$expr = { $lte: ['$currentStock', '$minStock'] };
      } else if (stockStatus === 'Out of Stock') {
        query.currentStock = { $lte: 0 };
      } else if (stockStatus === 'Optimal') {
        query.$expr = {
          $and: [
            { $gt: ['$currentStock', '$minStock'] },
            { $lt: ['$currentStock', '$maxStock'] },
          ],
        };
      } else if (stockStatus === 'Overstocked') {
        query.$expr = { $gte: ['$currentStock', '$maxStock'] };
      }
    }

    // Pagination calculations
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting order
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Private
 */
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Calculate profit margin percentage
    const profitMargin =
      product.sellingPrice > 0
        ? (
            ((product.sellingPrice - product.productionCost) /
              product.sellingPrice) *
            100
          ).toFixed(1)
        : 0;

    res.status(200).json({
      success: true,
      product,
      profitMargin: `${profitMargin}%`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new finished product
 * @route   POST /api/products
 * @access  Private/Admin/ProductionManager
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      code,
      category,
      unit,
      sellingPrice,
      productionCost,
      shelfLifeDays,
      minStock,
      maxStock,
      currentStock,
      storageCondition,
      status,
    } = req.body;

    // Check if code is already used
    const existingCode = await Product.findOne({
      code: code ? code.trim().toUpperCase() : '',
    });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Product code '${code.toUpperCase()}' is already in use.`,
      });
    }

    const product = await Product.create({
      name,
      code: code.trim().toUpperCase(),
      category,
      unit,
      sellingPrice: Number(sellingPrice),
      productionCost: Number(productionCost),
      shelfLifeDays: Number(shelfLifeDays),
      minStock: Number(minStock || 50),
      maxStock: Number(maxStock || 1000),
      currentStock: Number(currentStock || 0),
      storageCondition: storageCondition || 'Ambient',
      status: status || 'Active',
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing product
 * @route   PUT /api/products/:id
 * @access  Private/Admin/ProductionManager
 */
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // If changing code, ensure code is not already in use by another product
    if (req.body.code && req.body.code.toUpperCase() !== product.code) {
      const codeExists = await Product.findOne({
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: `Product code '${req.body.code.toUpperCase()}' is already taken.`,
        });
      }
    }

    const fieldsToUpdate = [
      'name',
      'category',
      'unit',
      'sellingPrice',
      'productionCost',
      'shelfLifeDays',
      'minStock',
      'maxStock',
      'currentStock',
      'storageCondition',
      'status',
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (req.body.code) {
      product.code = req.body.code.trim().toUpperCase();
    }

    const updatedProduct = await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: `Product '${product.name}' deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
