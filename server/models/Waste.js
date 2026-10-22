import mongoose from 'mongoose';

/**
 * Waste Schema
 * Records food waste incidents, categorized root causes, and financial cost
 */
const wasteSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      required: true,
      enum: ['RawMaterial', 'Product'],
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'itemType',
    },
    wasteType: {
      type: String,
      required: [true, 'Please select waste category'],
      enum: [
        'Expired',
        'Spoilage',
        'Overproduction',
        'Damaged',
        'Processing Loss',
        'Quality Rejection',
        'Other',
      ],
      default: 'Spoilage',
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide wasted quantity'],
      min: [0.01, 'Quantity must be greater than zero'],
    },
    unit: {
      type: String,
      required: [true, 'Please provide measurement unit'],
      default: 'kg',
    },
    cost: {
      type: Number,
      required: [true, 'Please provide estimated monetary loss'],
      min: [0, 'Cost must be non-negative'],
    },
    reason: {
      type: String,
      required: [true, 'Please provide brief explanation of root cause'],
      trim: true,
    },
    productionBatch: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Waste = mongoose.model('Waste', wasteSchema);
export default Waste;
