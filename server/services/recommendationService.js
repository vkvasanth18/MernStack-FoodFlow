/**
 * recommendationService.js
 * ────────────────────────
 * Calculates how much of a product to produce next, and WHY.
 *
 * Formula:
 *   Recommended Production = Forecast Demand − Current Stock + Safety Stock
 *   (never below 0 — no negative production)
 *
 * Also checks whether you have enough raw materials to cover the batch.
 */

import Product     from '../models/Product.js';
import RawMaterial from '../models/RawMaterial.js';

/**
 * getRecommendation(productId, forecastedDemand, forecastPeriodDays)
 * ──────────────────────────────────────────────────────────────────
 * @param {string} productId           - MongoDB ObjectId of the product
 * @param {number} forecastedDemand    - total units forecast over the period
 * @param {number} forecastPeriodDays  - 7 or 30 (affects safety stock phrasing)
 * @returns {object} recommendation report with explanation
 */
export async function getRecommendation(productId, forecastedDemand, forecastPeriodDays = 7) {
  // ── 1. Load product ──────────────────────────────────────────────────────
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found.');

  const currentStock  = product.currentStock  || 0;
  const minStock      = product.minStock      || 0;

  // Safety stock = product's configured minStock (the buffer management sets)
  const safetyStock   = minStock;

  // ── 2. Core formula ──────────────────────────────────────────────────────
  const rawRecommended = forecastedDemand - currentStock + safetyStock;
  const recommended    = Math.max(0, Math.round(rawRecommended));

  // ── 3. Build step-by-step explanation (beginner-friendly) ────────────────
  const explanationSteps = [
    `📊 Forecasted demand for next ${forecastPeriodDays} days: **${forecastedDemand.toFixed(1)} units**`,
    `📦 Current stock on hand: **${currentStock} units**`,
    `🛡️ Safety stock buffer (min stock): **${safetyStock} units**`,
    `🧮 Calculation: ${forecastedDemand.toFixed(1)} − ${currentStock} + ${safetyStock} = **${rawRecommended.toFixed(1)}**`,
    recommended > 0
      ? `✅ Recommended production: **${recommended} units** to meet demand + buffer`
      : `✅ No production needed — current stock (${currentStock}) already covers forecast (${forecastedDemand.toFixed(1)}) + safety stock (${safetyStock})`,
  ];

  // ── 4. Risk assessment ────────────────────────────────────────────────────
  let riskLevel = 'low';
  const riskReasons = [];

  if (currentStock < safetyStock) {
    riskLevel = 'high';
    riskReasons.push(`⚠️ Stock (${currentStock}) is BELOW safety stock (${safetyStock}) — stockout risk!`);
  } else if (currentStock < forecastedDemand * 0.5) {
    riskLevel = 'medium';
    riskReasons.push(`⚠️ Stock covers less than 50% of forecasted demand.`);
  }

  if (recommended > product.maxStock - currentStock) {
    riskReasons.push(`⚠️ Recommended batch may push stock above maximum (${product.maxStock} units).`);
    if (riskLevel === 'low') riskLevel = 'medium';
  }

  // ── 5. Raw material availability check ───────────────────────────────────
  const materialChecks = [];
  let canProduce = true;

  if (product.recipe && product.recipe.length > 0 && recommended > 0) {
    for (const item of product.recipe) {
      const material = await RawMaterial.findById(item.material);
      if (!material) continue;

      const required = item.quantity * recommended;
      const available = material.currentStock;
      const sufficient = available >= required;

      if (!sufficient) canProduce = false;

      materialChecks.push({
        materialName : material.name,
        unit         : material.unit,
        required     : parseFloat(required.toFixed(2)),
        available    : parseFloat(available.toFixed(2)),
        sufficient,
        shortfall    : sufficient ? 0 : parseFloat((required - available).toFixed(2)),
      });
    }

    if (!canProduce) {
      riskLevel = 'high';
      const shortfalls = materialChecks
        .filter(m => !m.sufficient)
        .map(m => `${m.materialName} (need ${m.required}${m.unit}, have ${m.available}${m.unit})`);
      riskReasons.push(`🚫 Insufficient raw materials: ${shortfalls.join('; ')}`);
    }
  }

  // ── 6. Human-readable verdict ─────────────────────────────────────────────
  let verdict;
  if (recommended === 0) {
    verdict = `No production needed for ${product.name} in the next ${forecastPeriodDays} days.`;
  } else if (!canProduce) {
    verdict = `${recommended} units of ${product.name} are recommended, but raw material shortages must be resolved first.`;
  } else {
    verdict = `Produce ${recommended} units of ${product.name} to meet the ${forecastPeriodDays}-day demand forecast.`;
  }

  return {
    product: {
      _id          : product._id,
      name         : product.name,
      code         : product.code,
      currentStock,
      minStock,
      maxStock     : product.maxStock,
    },
    forecastedDemand   : parseFloat(forecastedDemand.toFixed(2)),
    safetyStock,
    recommendedProduction: recommended,
    canProduce,
    riskLevel,
    riskReasons,
    materialChecks,
    explanationSteps,
    verdict,
    generatedAt: new Date().toISOString(),
  };
}
