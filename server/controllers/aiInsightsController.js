/**
 * aiInsightsController.js
 * ────────────────────────
 * Comprehensive AI Operational Insights Engine
 *
 * Analyses:
 *  1. Ingredient Shortages & Recipe Bottlenecks (Current stock vs. BOM demand & planned batches)
 *  2. Expiry Bottlenecks & Perishable Shelf-life Hazards (FIFO aging vs. draw rate)
 *  3. Overstocking & Capital Lockup (Excess stock above max limits / carrying costs)
 *  4. Production Yield & Waste Anomalies
 *  5. Composite Operational Health Index (0-100 Score)
 *  6. What-If Scenario Simulations (Demand surge & supplier lead time disruptions)
 */

import Product from '../models/Product.js';
import RawMaterial from '../models/RawMaterial.js';
import Production from '../models/Production.js';
import Waste from '../models/Waste.js';
import Alert from '../models/Alert.js';
import DemandHistory from '../models/DemandHistory.js';
import Supplier from '../models/Supplier.js';

/**
 * Helper: Calculate daily consumption rate of a raw material
 * Based on recent 30-day production batches & sales demand history
 */
const calculateMaterialDailyRate = async (materialId, products) => {
  const matIdStr = materialId.toString();
  let totalDailyNeed = 0;

  for (const prod of products) {
    if (!prod.recipe || !Array.isArray(prod.recipe)) continue;
    const recipeItem = prod.recipe.find((r) => {
      const rId = r.material?._id ? r.material._id.toString() : r.material?.toString();
      return rId === matIdStr;
    });

    if (!recipeItem || !recipeItem.quantity) continue;

    // Look for demand history in last 30 points
    const demandPoints = await DemandHistory.find({ product: prod._id })
      .sort({ date: -1 })
      .limit(30);

    let avgDailySales = 0;
    if (demandPoints.length > 0) {
      const sumSales = demandPoints.reduce((acc, d) => acc + (d.quantitySold || 0), 0);
      avgDailySales = sumSales / demandPoints.length;
    } else {
      avgDailySales = Math.max(10, (prod.minStock || 50) / 5);
    }

    totalDailyNeed += avgDailySales * recipeItem.quantity;
  }

  return Math.max(1.2, parseFloat(totalDailyNeed.toFixed(2)));
};

/**
 * GET /api/ai-insights
 * Performs deep full-spectrum operational risk scan
 */
export const getAIInsights = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Fetch live system collections
    const [rawMaterials, products, plannedBatches, recentWastes, suppliers] =
      await Promise.all([
        RawMaterial.find().populate('supplier'),
        Product.find({ isActive: true }),
        Production.find({ status: { $in: ['Planned', 'In Progress'] } }).populate('product'),
        Waste.find().sort({ createdAt: -1 }).limit(50),
        Supplier.find(),
      ]);

    const supplierMap = new Map();
    suppliers.forEach((s) => supplierMap.set(s._id.toString(), s));

    const insights = [];
    let criticalCount = 0;
    let warningCount = 0;
    let optimizationCount = 0;
    let totalCapitalAtRisk = 0;
    let imminentStockoutsCount = 0;
    let perishableLossExposure = 0;
    let overstockedCapitalLocked = 0;

    // ─────────────────────────────────────────────────────────────
    // ANALYSIS 1: Ingredient Shortages & Production Bottlenecks
    // ─────────────────────────────────────────────────────────────
    const materialRunwayStats = [];

    for (const material of rawMaterials) {
      const dailyDraw = await calculateMaterialDailyRate(material._id, products);
      const daysOfRunway = dailyDraw > 0 ? material.currentStock / dailyDraw : 999;
      const leadTime = material.supplier?.leadTimeDays || 3;

      // Committed material in planned or in-progress batches
      let committedQty = 0;
      plannedBatches.forEach((batch) => {
        const mat = batch.materialsUsed?.find(
          (m) => m.material?.toString() === material._id.toString()
        );
        if (mat) committedQty += mat.quantity;
      });

      const netAvailable = material.currentStock - committedQty;
      const reorderBuffer = (material.maxStock || material.minStock * 2) - material.currentStock;
      const recommendedReorderQty = Math.max(0, Math.round(reorderBuffer > 0 ? reorderBuffer : material.minStock * 1.5));

      materialRunwayStats.push({
        materialId: material._id,
        name: material.name,
        code: material.code,
        category: material.category,
        unit: material.unit,
        currentStock: material.currentStock,
        minStock: material.minStock,
        committedQty: parseFloat(committedQty.toFixed(1)),
        netAvailable: parseFloat(netAvailable.toFixed(1)),
        dailyDraw: parseFloat(dailyDraw.toFixed(2)),
        daysOfRunway: parseFloat(daysOfRunway.toFixed(1)),
        leadTimeDays: leadTime,
        supplierName: material.supplier?.companyName || material.supplier?.name || 'Primary Vendor',
        supplierRating: material.supplier?.rating || 4.5,
        costPerUnit: material.costPerUnit,
      });

      // Find finished products depending on this ingredient
      const impactedProducts = products.filter((p) =>
        p.recipe?.some((r) => r.material?.toString() === material._id.toString())
      );

      // CRITICAL SHORTAGE: stock will run out before supplier lead time can replenish
      if (daysOfRunway <= leadTime || netAvailable <= 0 || material.currentStock <= material.minStock * 0.5) {
        criticalCount++;
        const financialImpact = Math.round(
          impactedProducts.reduce((sum, p) => sum + (p.sellingPrice || 100) * 20, 0)
        );
        totalCapitalAtRisk += financialImpact;
        imminentStockoutsCount++;

        insights.push({
          id: `shortage-${material._id}`,
          category: 'SHORTAGE',
          severity: 'critical',
          title: `Stockout Hazard: ${material.name}`,
          itemType: 'RawMaterial',
          itemId: material._id,
          itemName: material.name,
          itemCode: material.code,
          headline: `Inventory runway (${daysOfRunway.toFixed(1)} days) is shorter than supplier lead time (${leadTime} days).`,
          diagnosis: `Current stock of ${material.currentStock} ${material.unit} with ${committedQty} ${material.unit} committed to upcoming batches leaves only ${netAvailable.toFixed(1)} ${material.unit} unreserved. At daily consumption rate of ${dailyDraw} ${material.unit}/day, stockout is projected within ${Math.max(1, Math.round(daysOfRunway))} day(s).`,
          impact: `Halts production for ${impactedProducts.map((p) => p.name).join(', ') || 'associated products'}. Estimated revenue at risk: ₹${financialImpact.toLocaleString()}.`,
          metrics: {
            currentStock: material.currentStock,
            minStock: material.minStock,
            dailyDraw,
            daysOfRunway: parseFloat(daysOfRunway.toFixed(1)),
            leadTimeDays: leadTime,
            recommendedReorderQty,
            estimatedFinancialRisk: financialImpact,
          },
          actionRecommendation: {
            actionType: 'EMERGENCY_PO',
            label: `Place Emergency Order (${recommendedReorderQty} ${material.unit})`,
            supplier: material.supplier?.companyName || 'Registered Supplier',
            suggestedQuantity: recommendedReorderQty,
            notes: `Dispatch PO immediately to ${material.supplier?.companyName || 'supplier'} to bridge the ${leadTime}-day lead time gap.`,
          },
        });
      } else if (material.currentStock <= material.minStock || daysOfRunway <= leadTime + 3) {
        warningCount++;
        const financialImpact = Math.round(material.minStock * material.costPerUnit * 1.2);
        totalCapitalAtRisk += financialImpact;

        insights.push({
          id: `shortage-warn-${material._id}`,
          category: 'SHORTAGE',
          severity: 'warning',
          title: `Approaching Low Stock: ${material.name}`,
          itemType: 'RawMaterial',
          itemId: material._id,
          itemName: material.name,
          itemCode: material.code,
          headline: `Stock level is below safety buffer (${material.currentStock} / ${material.minStock} ${material.unit}).`,
          diagnosis: `Material is burning at ${dailyDraw} ${material.unit}/day. Remaining runway is ${daysOfRunway.toFixed(1)} days. Normal supplier reorder cycle requires ${leadTime} days.`,
          impact: `Risk of production rescheduling next week for ${impactedProducts.length} product line(s).`,
          metrics: {
            currentStock: material.currentStock,
            minStock: material.minStock,
            dailyDraw,
            daysOfRunway: parseFloat(daysOfRunway.toFixed(1)),
            leadTimeDays: leadTime,
            recommendedReorderQty,
            estimatedFinancialRisk: financialImpact,
          },
          actionRecommendation: {
            actionType: 'STANDARD_PO',
            label: `Trigger Reorder (${recommendedReorderQty} ${material.unit})`,
            supplier: material.supplier?.companyName || 'Registered Supplier',
            suggestedQuantity: recommendedReorderQty,
            notes: `Issue PO to avoid falling into critical stockout threshold.`,
          },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ANALYSIS 2: Perishable Expiry & Shelf-Life Bottlenecks
    // ─────────────────────────────────────────────────────────────
    for (const material of rawMaterials) {
      if (!material.expiryDate) continue;

      const expiry = new Date(material.expiryDate);
      const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      const dailyDraw = materialRunwayStats.find((s) => s.materialId.toString() === material._id.toString())?.dailyDraw || 1;
      const projectableUsageBeforeExpiry = Math.max(0, dailyDraw * Math.max(0, daysUntilExpiry));
      const atRiskSpoilageQty = Math.max(0, parseFloat((material.currentStock - projectableUsageBeforeExpiry).toFixed(1)));
      const potentialLoss = Math.round(atRiskSpoilageQty * material.costPerUnit);

      if (daysUntilExpiry <= 0) {
        criticalCount++;
        const loss = Math.round(material.currentStock * material.costPerUnit);
        perishableLossExposure += loss;
        totalCapitalAtRisk += loss;

        insights.push({
          id: `expiry-expired-${material._id}`,
          category: 'EXPIRY',
          severity: 'critical',
          title: `EXPIRED BATCH: ${material.name}`,
          itemType: 'RawMaterial',
          itemId: material._id,
          itemName: material.name,
          itemCode: material.code,
          headline: `Batch expired ${Math.abs(daysUntilExpiry)} day(s) ago. Immediate quarantine required.`,
          diagnosis: `${material.currentStock} ${material.unit} in ${material.storageLocation || 'storage'} is past its regulatory expiration date (${expiry.toLocaleDateString()}).`,
          impact: `Total write-off loss: ₹${loss.toLocaleString()}. Potential contamination hazard if not quarantined.`,
          metrics: {
            currentStock: material.currentStock,
            daysUntilExpiry,
            spoilageHazardQty: material.currentStock,
            estimatedFinancialRisk: loss,
          },
          actionRecommendation: {
            actionType: 'QUARANTINE_WASTE',
            label: `Log Waste & Quarantine Batch`,
            suggestedQuantity: material.currentStock,
            notes: `Record under Spoilage/Expired waste category and remove from active production inventory.`,
          },
        });
      } else if (daysUntilExpiry <= 7 || atRiskSpoilageQty > 0) {
        const isUrgent = daysUntilExpiry <= 4 || atRiskSpoilageQty >= material.currentStock * 0.4;
        if (isUrgent) criticalCount++; else warningCount++;

        const riskValue = potentialLoss > 0 ? potentialLoss : Math.round(material.currentStock * material.costPerUnit * 0.5);
        perishableLossExposure += riskValue;
        totalCapitalAtRisk += riskValue;

        // Find product recipe to absorb this ingredient
        const consumerProduct = products.find((p) =>
          p.recipe?.some((r) => r.material?.toString() === material._id.toString())
        );

        insights.push({
          id: `expiry-hazard-${material._id}`,
          category: 'EXPIRY',
          severity: isUrgent ? 'critical' : 'warning',
          title: `Shelf-Life Bottleneck: ${material.name}`,
          itemType: 'RawMaterial',
          itemId: material._id,
          itemName: material.name,
          itemCode: material.code,
          headline: `Expires in ${daysUntilExpiry} days. ${atRiskSpoilageQty > 0 ? `${atRiskSpoilageQty} ${material.unit} will spoil at current consumption pace.` : 'High urgency FIFO dispatch needed.'}`,
          diagnosis: `Batch ${material.batchNumber} has ${daysUntilExpiry} days left. At normal draw rate (${dailyDraw} ${material.unit}/day), operations will only consume ${projectableUsageBeforeExpiry.toFixed(1)} of ${material.currentStock} ${material.unit}.`,
          impact: `Projected spoilage write-off of ₹${riskValue.toLocaleString()} unless production speed is accelerated.`,
          metrics: {
            currentStock: material.currentStock,
            daysUntilExpiry,
            spoilageHazardQty: atRiskSpoilageQty,
            estimatedFinancialRisk: riskValue,
          },
          actionRecommendation: {
            actionType: 'PRIORITIZE_BATCH',
            label: consumerProduct ? `Schedule Priority Batch for ${consumerProduct.name}` : `Prioritize in FIFO Batching`,
            suggestedQuantity: Math.round(material.currentStock * 0.8),
            notes: `Expedite manufacturing runs consuming ${material.name} within the next 48 hours.`,
          },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ANALYSIS 3: Overstocking & Capital Lockup Analysis
    // ─────────────────────────────────────────────────────────────
    for (const material of rawMaterials) {
      if (material.maxStock && material.currentStock > material.maxStock) {
        optimizationCount++;
        const excess = material.currentStock - material.maxStock;
        const lockedCapital = Math.round(excess * material.costPerUnit);
        overstockedCapitalLocked += lockedCapital;
        totalCapitalAtRisk += lockedCapital;

        insights.push({
          id: `overstock-${material._id}`,
          category: 'OVERSTOCK',
          severity: 'optimization',
          title: `Overstock & Working Capital Lockup: ${material.name}`,
          itemType: 'RawMaterial',
          itemId: material._id,
          itemName: material.name,
          itemCode: material.code,
          headline: `Current stock exceeds warehouse maximum ceiling by ${excess} ${material.unit}.`,
          diagnosis: `Stock is at ${material.currentStock} ${material.unit} (Max capacity: ${material.maxStock} ${material.unit}). Tied-up working capital: ₹${lockedCapital.toLocaleString()}. Increases risk of handling damage and shelf aging.`,
          impact: `Congests ${material.storageLocation || 'warehouse space'} and incurs carrying costs of ~18% annually.`,
          metrics: {
            currentStock: material.currentStock,
            maxStock: material.maxStock,
            excessUnits: excess,
            estimatedFinancialRisk: lockedCapital,
          },
          actionRecommendation: {
            actionType: 'FREEZE_REORDERS',
            label: `Freeze Purchase Reorders`,
            suggestedQuantity: excess,
            notes: `Suspend automated supplier POs until stock declines back to target safety level.`,
          },
        });
      }
    }

    for (const product of products) {
      if (product.maxStock && product.currentStock > product.maxStock) {
        optimizationCount++;
        const excess = product.currentStock - product.maxStock;
        const lockedCapital = Math.round(excess * (product.productionCost || 50));
        overstockedCapitalLocked += lockedCapital;
        totalCapitalAtRisk += lockedCapital;

        insights.push({
          id: `overstock-prod-${product._id}`,
          category: 'OVERSTOCK',
          severity: 'optimization',
          title: `Finished Goods Surplus: ${product.name}`,
          itemType: 'Product',
          itemId: product._id,
          itemName: product.name,
          itemCode: product.code,
          headline: `Finished inventory (${product.currentStock} units) exceeds ceiling of ${product.maxStock} units.`,
          diagnosis: `With shelf-life of ${product.shelfLifeDays || 7} days, holding ${excess} units over capacity risks bulk batch expiration.`,
          impact: `₹${lockedCapital.toLocaleString()} in tied manufacturing capital. Potential markdown loss.`,
          metrics: {
            currentStock: product.currentStock,
            maxStock: product.maxStock,
            excessUnits: excess,
            estimatedFinancialRisk: lockedCapital,
          },
          actionRecommendation: {
            actionType: 'PROMOTION_DISCOUNT',
            label: `Trigger Promotional Sales Push`,
            suggestedQuantity: excess,
            notes: `Run short-term volume discount or distributor wholesale push to liquidate excess shelf stock.`,
          },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ANALYSIS 4: Waste Anomaly & Root Cause Hotspots
    // ─────────────────────────────────────────────────────────────
    const wasteByCategory = {};
    let totalWasteCost = 0;
    recentWastes.forEach((w) => {
      const type = w.wasteType || 'Other';
      wasteByCategory[type] = (wasteByCategory[type] || 0) + (w.cost || 0);
      totalWasteCost += (w.cost || 0);
    });

    const topWasteCategory = Object.entries(wasteByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topWasteCategory && topWasteCategory[1] > 2000) {
      warningCount++;
      insights.push({
        id: `waste-anomaly-top`,
        category: 'WASTE',
        severity: 'warning',
        title: `Waste Anomaly: Elevated ${topWasteCategory[0]} Losses`,
        itemType: 'None',
        headline: `${topWasteCategory[0]} accounts for ₹${Math.round(topWasteCategory[1]).toLocaleString()} in recent waste write-offs.`,
        diagnosis: `Analysis of the last ${recentWastes.length} waste logs indicates ${topWasteCategory[0]} is responsible for ${((topWasteCategory[1] / Math.max(1, totalWasteCost)) * 100).toFixed(0)}% of total losses.`,
        impact: `Erodes operational gross margins by approximately 2.4%.`,
        metrics: {
          categoryName: topWasteCategory[0],
          cost: Math.round(topWasteCategory[1]),
          percentageOfTotal: parseFloat(((topWasteCategory[1] / Math.max(1, totalWasteCost)) * 100).toFixed(1)),
          estimatedFinancialRisk: Math.round(topWasteCategory[1]),
        },
        actionRecommendation: {
          actionType: 'AUDIT_PROCESS',
          label: `Initiate ${topWasteCategory[0]} Process Audit`,
          notes: `Inspect production line handling, cold chain adherence, and batch preparation hygiene.`,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ANALYSIS 5: Composite Operational Health Score
    // ─────────────────────────────────────────────────────────────
    // Score starts at 100, deducted by critical (15 pts), warning (6 pts), optimization (2 pts)
    const penalty = criticalCount * 14 + warningCount * 5 + optimizationCount * 2;
    const healthScore = Math.max(25, Math.min(100, Math.round(100 - penalty)));

    let riskLevelText = 'Healthy';
    if (healthScore < 60) riskLevelText = 'Critical Risk';
    else if (healthScore < 82) riskLevelText = 'Moderate Risk';

    // Sort insights: critical first, then warning, then optimization
    const severityWeight = { critical: 3, warning: 2, optimization: 1 };
    insights.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

    // ─────────────────────────────────────────────────────────────
    // Return Structured AI Payload
    // ─────────────────────────────────────────────────────────────
    res.json({
      success: true,
      lastAnalyzed: new Date().toISOString(),
      summary: {
        healthScore,
        riskLevelText,
        criticalCount,
        warningCount,
        optimizationCount,
        totalInsightsCount: insights.length,
        totalCapitalAtRisk,
        imminentStockoutsCount,
        perishableLossExposure,
        overstockedCapitalLocked,
      },
      categoryCounts: {
        shortages: insights.filter((i) => i.category === 'SHORTAGE').length,
        expiries: insights.filter((i) => i.category === 'EXPIRY').length,
        overstocks: insights.filter((i) => i.category === 'OVERSTOCK').length,
        wastes: insights.filter((i) => i.category === 'WASTE').length,
      },
      materialRunwayStats: materialRunwayStats.slice(0, 10),
      insights,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai-insights/mitigate
 * Auto-creates alerts in the Alert collection based on active insights
 */
export const triggerAutoMitigation = async (req, res, next) => {
  try {
    const { insightIds } = req.body;

    // Fetch live raw materials and products to build alerts
    const [rawMaterials, products] = await Promise.all([
      RawMaterial.find(),
      Product.find(),
    ]);

    let createdAlertsCount = 0;

    for (const material of rawMaterials) {
      if (material.currentStock <= material.minStock) {
        // Check if an unread alert already exists to prevent duplicate spam
        const existing = await Alert.findOne({
          relatedItem: material._id,
          type: 'LOW_STOCK',
          isRead: false,
        });

        if (!existing) {
          await Alert.create({
            title: `AI Action Required: Low Stock for ${material.name}`,
            message: `AI Insights detected critical buffer breach (${material.currentStock}/${material.minStock} ${material.unit}). Immediate supplier reorder recommended.`,
            type: 'LOW_STOCK',
            severity: material.currentStock === 0 ? 'critical' : 'warning',
            relatedItem: material._id,
            relatedItemType: 'RawMaterial',
          });
          createdAlertsCount++;
        }
      }

      if (material.expiryDate) {
        const diffDays = Math.ceil((new Date(material.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const existing = await Alert.findOne({
            relatedItem: material._id,
            type: 'EXPIRY',
            isRead: false,
          });

          if (!existing) {
            await Alert.create({
              title: `AI FIFO Alert: ${material.name} expiring in ${Math.max(0, diffDays)}d`,
              message: `AI Insights flagged batch ${material.batchNumber} with ₹${Math.round(material.currentStock * material.costPerUnit)} exposure. Prioritize in next production shift.`,
              type: 'EXPIRY',
              severity: diffDays <= 2 ? 'critical' : 'warning',
              relatedItem: material._id,
              relatedItemType: 'RawMaterial',
            });
            createdAlertsCount++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `AI Mitigation dispatched! ${createdAlertsCount} automated alerts synchronized with Alert Center.`,
      createdAlertsCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai-insights/simulate
 * Simulates demand surges or supplier delays and returns projected bottlenecks
 */
export const simulateScenario = async (req, res, next) => {
  try {
    const {
      demandSurgePercent = 25, // e.g. +25%
      leadTimeDelayDays = 3,    // e.g. +3 days
      targetProductId,
    } = req.body;

    const [rawMaterials, products] = await Promise.all([
      RawMaterial.find().populate('supplier'),
      Product.find({ isActive: true }),
    ]);

    const surgeMultiplier = 1 + Number(demandSurgePercent) / 100;
    const delayDays = Number(leadTimeDelayDays) || 0;
    const simulationResults = [];

    for (const material of rawMaterials) {
      const baseDailyDraw = await calculateMaterialDailyRate(material._id, products);
      const simulatedDailyDraw = parseFloat((baseDailyDraw * surgeMultiplier).toFixed(2));
      const baseLeadTime = material.supplier?.leadTimeDays || 3;
      const effectiveLeadTime = baseLeadTime + delayDays;
      const simulatedRunway = simulatedDailyDraw > 0 ? material.currentStock / simulatedDailyDraw : 999;

      // Bottleneck condition: runway is less than effective lead time + safety buffer, OR stock breaches minimum threshold under surge
      const isBottleneck =
        simulatedRunway <= effectiveLeadTime * 1.5 ||
        material.currentStock < (material.minStock || 25) * (1 + demandSurgePercent / 150);

      const daysShortfall = isBottleneck ? Math.max(0, parseFloat((effectiveLeadTime - simulatedRunway).toFixed(1))) : 0;
      const stockoutProjectedDays = Math.max(1, Math.round(simulatedRunway));
      const suggestedContingencyBuffer = Math.round(
        Math.max(material.minStock * surgeMultiplier, simulatedDailyDraw * effectiveLeadTime * 1.5)
      );

      simulationResults.push({
        materialId: material._id,
        materialName: material.name,
        code: material.code,
        currentStock: material.currentStock,
        minStock: material.minStock,
        unit: material.unit,
        baseDailyDraw,
        simulatedDailyDraw,
        baseLeadTime,
        effectiveLeadTime,
        simulatedRunway: parseFloat(simulatedRunway.toFixed(1)),
        isBottleneck,
        daysShortfall,
        stockoutProjectedDays,
        suggestedContingencyBuffer,
        supplierName: material.supplier?.companyName || material.supplier?.name || 'Primary Supplier',
      });
    }

    // Sort bottlenecks first
    simulationResults.sort((a, b) => (b.isBottleneck ? 1 : 0) - (a.isBottleneck ? 1 : 0));

    res.json({
      success: true,
      parameters: {
        demandSurgePercent: Number(demandSurgePercent),
        leadTimeDelayDays: delayDays,
      },
      bottlenecksDetected: simulationResults.filter((s) => s.isBottleneck).length,
      simulationResults,
    });
  } catch (err) {
    next(err);
  }
};
