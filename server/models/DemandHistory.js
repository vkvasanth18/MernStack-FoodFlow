import mongoose from 'mongoose';

/**
 * DemandHistory Schema
 * Stores historical daily/weekly sales & demand data used by forecasting models
 */
const demandHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please specify associated product'],
    },
    date: {
      type: Date,
      required: [true, 'Please specify sales record date'],
      default: Date.now,
    },
    quantitySold: {
      type: Number,
      min: [0, 'Quantity sold cannot be negative'],
      default: function () {
        return this.quantity != null ? this.quantity : 0;
      },
    },
    quantity: {
      type: Number,
      min: [0, 'Quantity cannot be negative'],
      default: function () {
        return this.quantitySold != null ? this.quantitySold : 0;
      },
    },
    quantityProduced: {
      type: Number,
      default: 0,
      min: 0,
    },
    channel: {
      type: String,
      default: 'Retail',
    },
    source: {
      type: String,
      default: 'manual',
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

demandHistorySchema.pre('save', function () {
  if (this.quantity != null && (this.quantitySold == null || this.quantitySold === 0)) {
    this.quantitySold = this.quantity;
  }
  if (this.quantitySold != null && (this.quantity == null || this.quantity === 0)) {
    this.quantity = this.quantitySold;
  }
});

// Compound index to ensure fast time-series queries per product
demandHistorySchema.index({ product: 1, date: -1 });

const DemandHistory = mongoose.model('DemandHistory', demandHistorySchema);
export default DemandHistory;
