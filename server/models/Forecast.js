import mongoose from 'mongoose';

/**
 * Forecast Schema
 * Records generated demand forecasts and transparent, explainable production recommendations
 */
const forecastSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please specify product for forecast'],
    },
    forecastDate: {
      type: Date,
      default: Date.now,
    },
    horizonDays: {
      type: Number,
      default: 7,
    },
    forecastPeriod: {
      type: Number,
      default: 7,
    },
    expectedDemand: {
      type: Number,
      default: function () {
        return this.forecastedDemand != null ? this.forecastedDemand : 0;
      },
    },
    forecastedDemand: {
      type: Number,
      default: function () {
        return this.expectedDemand != null ? this.expectedDemand : 0;
      },
    },
    trend: {
      type: String,
      default: 'Stable',
    },
    algorithm: {
      type: String,
      default: 'sma',
    },
    algorithmUsed: {
      type: String,
      default: 'Simple Moving Average',
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
    },
    confidence: {
      type: Number,
      default: 85,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    safetyStock: {
      type: Number,
      default: 0,
    },
    recommendedProduction: {
      type: Number,
      required: [true, 'Please provide recommended production quantity'],
    },
    recommendationFactors: {
      forecastDemand: { type: Number, default: 0 },
      currentStock: { type: Number, default: 0 },
      safetyStock: { type: Number, default: 0 },
      materialAvailability: { type: String, default: 'sufficient' },
      availableRawMaterials: { type: Boolean, default: true },
      productionCapacity: { type: Number, default: 1000 },
      explanation: { type: String, default: '' },
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

forecastSchema.pre('validate', function () {
  if (this.expectedDemand == null && this.forecastedDemand != null) {
    this.expectedDemand = this.forecastedDemand;
  }
  if (this.forecastedDemand == null && this.expectedDemand != null) {
    this.forecastedDemand = this.expectedDemand;
  }
  if (this.horizonDays == null && this.forecastPeriod != null) {
    this.horizonDays = this.forecastPeriod;
  }
  if (this.forecastPeriod == null && this.horizonDays != null) {
    this.forecastPeriod = this.horizonDays;
  }
  if (this.algorithmUsed == null && this.algorithm != null) {
    this.algorithmUsed = this.algorithm;
  }
  if (this.algorithm == null && this.algorithmUsed != null) {
    this.algorithm = this.algorithmUsed;
  }
});

forecastSchema.index({ product: 1, createdAt: -1 });

const Forecast = mongoose.model('Forecast', forecastSchema);
export default Forecast;
