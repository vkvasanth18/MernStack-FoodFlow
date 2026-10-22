import mongoose from 'mongoose';

/**
 * Product Schema
 * Represents manufactured finished food goods
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide unique product code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select category'],
      enum: [
        'Bakery',
        'Beverages',
        'Canned Goods',
        'Dairy',
        'Snacks',
        'Sauces & Condiments',
        'Other',
      ],
      default: 'Bakery',
    },
    unit: {
      type: String,
      required: [true, 'Please provide measurement unit'],
      enum: ['units', 'kg', 'liters', 'packs', 'boxes'],
      default: 'units',
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Please provide selling price'],
      min: [0, 'Selling price must be positive'],
    },
    productionCost: {
      type: Number,
      required: [true, 'Please provide production cost'],
      min: [0, 'Production cost must be positive'],
    },
    shelfLifeDays: {
      type: Number,
      required: [true, 'Please specify shelf life in days'],
      min: [1, 'Shelf life must be at least 1 day'],
      default: 30,
    },
    minStock: {
      type: Number,
      required: [true, 'Please provide minimum safety stock level'],
      default: 50,
      min: 0,
    },
    maxStock: {
      type: Number,
      default: 1000,
      min: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    storageCondition: {
      type: String,
      enum: ['Ambient', 'Refrigerated', 'Frozen'],
      default: 'Ambient',
    },
    status: {
      type: String,
      enum: ['Active', 'Discontinued'],
      default: 'Active',
    },
    recipe: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RawMaterial',
        },
        quantity: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual property to calculate stock alert status
productSchema.virtual('stockStatus').get(function () {
  if (this.currentStock <= 0) return 'Out of Stock';
  if (this.currentStock <= this.minStock) return 'Low Stock';
  if (this.currentStock >= this.maxStock) return 'Overstocked';
  return 'Optimal';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
