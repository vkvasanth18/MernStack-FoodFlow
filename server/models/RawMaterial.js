import mongoose from 'mongoose';

/**
 * RawMaterial Schema
 * Tracks ingredients and raw packaging materials with expiry monitoring
 */
const rawMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide material name'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide material code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please select category'],
      enum: [
        'Grains & Flours',
        'Sweeteners',
        'Dairy Ingredients',
        'Produce & Vegetables',
        'Oils & Fats',
        'Seasoning & Spices',
        'Packaging',
        'Other',
      ],
      default: 'Grains & Flours',
    },
    unit: {
      type: String,
      required: [true, 'Please specify unit of measure'],
      enum: ['kg', 'liters', 'grams', 'units'],
      default: 'kg',
    },
    currentStock: {
      type: Number,
      required: [true, 'Please enter initial or current stock'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    minStock: {
      type: Number,
      required: [true, 'Please specify reorder minimum stock level'],
      default: 25,
      min: 0,
    },
    maxStock: {
      type: Number,
      default: 500,
      min: 0,
    },
    costPerUnit: {
      type: Number,
      required: [true, 'Please specify cost per unit'],
      min: [0, 'Cost per unit must be non-negative'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: false,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please specify material batch expiry date'],
    },
    storageLocation: {
      type: String,
      default: 'Cold Storage Room 1',
      trim: true,
    },
    batchNumber: {
      type: String,
      default: function () {
        return `RM-BATCH-${Date.now().toString().slice(-6)}`;
      },
    },
    status: {
      type: String,
      enum: ['Available', 'Low Stock', 'Near Expiry', 'Expired'],
      default: 'Available',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Virtual: Dynamic Calculation of Material Health Status
 * Takes into account real-time expiry dates and minimum stock levels
 */
rawMaterialSchema.virtual('calculatedStatus').get(function () {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Expired';
  if (diffDays <= 7) return 'Near Expiry';
  if (this.currentStock <= this.minStock) return 'Low Stock';
  return 'Available';
});

rawMaterialSchema.set('toJSON', { virtuals: true });
rawMaterialSchema.set('toObject', { virtuals: true });

const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);
export default RawMaterial;
