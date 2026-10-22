import mongoose from 'mongoose';

/**
 * Alert Schema
 * Manages operational warnings for low stock, expiry, excessive waste, and bottlenecks
 */
const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Alert description is required'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'LOW_STOCK',
        'EXPIRY',
        'OVERSTOCK',
        'HIGH_WASTE',
        'PRODUCTION_RISK',
      ],
      default: 'LOW_STOCK',
    },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    relatedItemType: {
      type: String,
      enum: ['Product', 'RawMaterial', 'Production', 'Waste', 'None'],
      default: 'None',
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ isRead: 1, createdAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
