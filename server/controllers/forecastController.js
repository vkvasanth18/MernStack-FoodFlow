/**
 * forecastController.js
 * ─────────────────────
 * Handles all API requests related to demand forecasting
 * and AI production recommendations.
 *
 * Routes (mounted at /api/forecast):
 *   POST /generate          → run forecast + save to DB
 *   GET  /                  → list saved forecasts (paginated)
 *   GET  /recommend/:id     → get production recommendation for a product
 *   GET  /history/:productId → demand history data points for a product
 */

import DemandHistory       from '../models/DemandHistory.js';
import Forecast            from '../models/Forecast.js';
import Product             from '../models/Product.js';
import { runForecast }     from '../services/forecastingService.js';
import { getRecommendation } from '../services/recommendationService.js';

// ─────────────────────────────────────────────────────────
// POST /api/forecast/generate
// Body: { productId, algorithm, periods, options }
// ─────────────────────────────────────────────────────────
export const generateForecast = async (req, res, next) => {
  try {
    const { productId, algorithm = 'sma', periods = 7, options = {} } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required.' });
    }

    // 1. Load product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // 2. Fetch demand history — newest first, up to 60 records
    const historyDocs = await DemandHistory
      .find({ product: productId })
      .sort({ date: 1 }) // oldest first so algorithms see correct time order
      .limit(60);

    if (historyDocs.length < 2) {
      // Auto-generate a realistic initial baseline if product lacks history
      const baseVal = Math.max(10, Math.round((product.minStock || 30) * 0.8));
      const autoRecords = [];
      for (let i = 14; i >= 1; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const q = Math.round(baseVal * (0.85 + Math.random() * 0.3));
        autoRecords.push({ product: productId, date: d, quantity: q, quantitySold: q, channel: 'Retail', source: 'auto' });
      }
      await DemandHistory.insertMany(autoRecords);
      const reloaded = await DemandHistory.find({ product: productId }).sort({ date: 1 });
      historyDocs.push(...reloaded);
    }

    // Extract just the quantity values (supporting both quantity and quantitySold)
    const demandValues = historyDocs.map(h => (h.quantity != null ? h.quantity : (h.quantitySold != null ? h.quantitySold : 10)));

    // 3. Run the chosen forecasting algorithm
    const result = runForecast(demandValues, algorithm, periods, options);

    // 4. Total demand = sum of all forecasted period values
    const totalForecastedDemand = result.forecast.reduce((s, v) => s + v, 0);

    // 5. Get production recommendation
    const recommendation = await getRecommendation(
      productId,
      totalForecastedDemand,
      periods
    );

    // 6. Persist the forecast to DB
    const savedForecast = await Forecast.create({
      product       : productId,
      algorithm     : result.algorithm,
      forecastPeriod: periods,
      forecastedDemand: totalForecastedDemand,
      recommendedProduction: recommendation.recommendedProduction,
      currentStock  : product.currentStock,
      safetyStock   : recommendation.safetyStock,
      confidence    : algorithm === 'lr' ? 78 : algorithm === 'es' ? 82 : 75, // rough %
      recommendationFactors: {
        forecastDemand : totalForecastedDemand,
        currentStock   : product.currentStock,
        safetyStock    : recommendation.safetyStock,
        materialAvailability: recommendation.canProduce ? 'sufficient' : 'insufficient',
        explanation    : recommendation.explanationSteps.join('\n'),
      },
      generatedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      forecast: {
        ...savedForecast.toObject(),
        algorithmDetails  : result,
        recommendation,
        historicalData    : historyDocs.map(h => ({
          date    : h.date,
          quantity: h.quantity != null ? h.quantity : (h.quantitySold != null ? h.quantitySold : 0),
          source  : h.source || 'manual',
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/forecast
// Query: ?page=1&limit=10&productId=xxx
// ─────────────────────────────────────────────────────────
export const getForecasts = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.productId) filter.product = req.query.productId;

    const [forecasts, total] = await Promise.all([
      Forecast.find(filter)
        .populate('product', 'name code unit currentStock')
        .populate('generatedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Forecast.countDocuments(filter),
    ]);

    res.json({
      success: true,
      forecasts,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/forecast/recommend/:productId
// Live recommendation without saving to DB
// ─────────────────────────────────────────────────────────
export const getRecommendationOnly = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const algorithm  = req.query.algorithm || 'sma';
    const periods    = parseInt(req.query.periods) || 7;

    const historyDocs = await DemandHistory
      .find({ product: productId })
      .sort({ date: 1 })
      .limit(60);

    if (historyDocs.length < 2) {
      return res.status(400).json({
        message: 'Not enough demand history for this product.',
      });
    }

    const demandValues = historyDocs.map(h => h.quantity);
    const result       = runForecast(demandValues, algorithm, periods);
    const totalDemand  = result.forecast.reduce((s, v) => s + v, 0);
    const recommendation = await getRecommendation(productId, totalDemand, periods);

    res.json({ success: true, algorithmDetails: result, recommendation });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/forecast/history/:productId
// Returns demand history data points for charting
// ─────────────────────────────────────────────────────────
export const getDemandHistory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 30;

    const history = await DemandHistory
      .find({ product: productId })
      .sort({ date: 1 })
      .limit(limit)
      .select('date quantity source channel');

    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/forecast/demand-history
// Add a manual demand data point
// ─────────────────────────────────────────────────────────
export const addDemandHistory = async (req, res, next) => {
  try {
    const { product, quantity, date, source = 'manual', channel, notes } = req.body;

    if (!product || quantity == null) {
      return res.status(400).json({ message: 'product and quantity are required.' });
    }

    const record = await DemandHistory.create({
      product, quantity, date: date || new Date(), source, channel, notes,
    });

    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
};
