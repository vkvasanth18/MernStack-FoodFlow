import mongoose from 'mongoose';

/**
 * Supplier Schema
 * Tracks ingredient and packaging vendors, contact info, and rating
 */
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide supplier contact name'],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Please provide company name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide supplier email'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide supplier phone number'],
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    materialsSupplied: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      default: 4.5,
    },
    leadTimeDays: {
      type: Number,
      default: 3,
      min: 1,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
