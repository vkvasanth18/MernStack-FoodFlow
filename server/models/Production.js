import mongoose from 'mongoose';

/**
 * Production Schema
 * Tracks planned vs actual food production runs, recipes, and efficiency metrics
 */
const productionSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: [true, 'Please provide batch number'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please specify the finished product to manufacture'],
    },
    plannedQuantity: {
      type: Number,
      required: [true, 'Please specify planned production quantity'],
      min: [1, 'Planned quantity must be at least 1'],
    },
    actualQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Actual quantity cannot be negative'],
    },
    materialsUsed: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RawMaterial',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0.01,
        },
        unit: {
          type: String,
          default: 'kg',
        },
      },
    ],
    productionDate: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
    },
    productionCost: {
      type: Number,
      default: 0,
    },
    wasteQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Planned',
    },
    efficiency: {
      type: Number,
      default: 0, // Calculated: (actualQuantity / plannedQuantity) * 100
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save Hook: Calculate production efficiency automatically
 */
productionSchema.pre('save', function (next) {
  if (this.plannedQuantity > 0 && this.actualQuantity > 0) {
    this.efficiency = parseFloat(
      ((this.actualQuantity / this.plannedQuantity) * 100).toFixed(2)
    );
  } else {
    this.efficiency = 0;
  }
  next();
});

const Production = mongoose.model('Production', productionSchema);
export default Production;
