import mongoose from 'mongoose';

/**
 * InventoryTransaction Schema
 * Complete audit ledger for FIFO stock movements, purchases, and write-offs
 */
const inventoryTransactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      required: true,
      enum: ['IN', 'OUT', 'ADJUSTMENT', 'WASTE_DEDUCTION'],
    },
    quantity: {
      type: Number,
      required: [true, 'Transaction quantity is required'],
    },
    unit: {
      type: String,
      default: 'kg',
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
    unitCost: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'Purchase Order',
        'Production Usage',
        'Production Output',
        'Spoilage',
        'Expired',
        'Stock Audit Adjustment',
        'Return',
        'Other',
      ],
      default: 'Stock Audit Adjustment',
    },
    performedBy: {
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

const InventoryTransaction = mongoose.model(
  'InventoryTransaction',
  inventoryTransactionSchema
);
export default InventoryTransaction;
