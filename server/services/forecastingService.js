/**
 * forecastingService.js
 * ---------------------
 * Pure-JavaScript statistical forecasting algorithms.
 * No external dependencies — runs entirely in Node.js.
 *
 * Supported algorithms:
 *   1. Simple Moving Average (SMA)
 *   2. Weighted Moving Average (WMA)
 *   3. Exponential Smoothing (ES)
 *   4. Linear Regression (LR)
 *
 * Each function receives an array of numbers (historical demand values,
 * oldest first) and a number of periods to forecast ahead.
 * Each function returns an object: { forecast, details }
 */

// ─────────────────────────────────────────────────────────
// 1. Simple Moving Average
//    Average of the last N data points (N = window size).
//    Great for stable, non-seasonal data.
// ─────────────────────────────────────────────────────────
export function simpleMovingAverage(data, periods = 7, windowSize = 3) {
  if (data.length < windowSize) {
    throw new Error(`Need at least ${windowSize} data points for SMA.`);
  }

  const forecasted = [];
  let workingData = [...data]; // we'll append predicted values as we go

  for (let i = 0; i < periods; i++) {
    const window = workingData.slice(-windowSize);
    const avg = window.reduce((sum, v) => sum + v, 0) / windowSize;
    forecasted.push(parseFloat(avg.toFixed(2)));
    workingData.push(avg); // use prediction for next window
  }

  return {
    algorithm: 'Simple Moving Average',
    windowSize,
    forecast: forecasted,
    details: `Averages the last ${windowSize} observed values to predict the next period. ` +
             `Simple and reliable for stable demand patterns.`,
  };
}

// ─────────────────────────────────────────────────────────
// 2. Weighted Moving Average
//    Recent points get MORE weight than older ones.
//    Better than SMA when demand has a recent trend.
// ─────────────────────────────────────────────────────────
export function weightedMovingAverage(data, periods = 7, windowSize = 3) {
  if (data.length < windowSize) {
    throw new Error(`Need at least ${windowSize} data points for WMA.`);
  }

  // Weights: [1, 2, 3] for windowSize=3  (last point gets highest weight)
  const weights = Array.from({ length: windowSize }, (_, i) => i + 1);
  const weightSum = weights.reduce((s, w) => s + w, 0);

  const forecasted = [];
  let workingData = [...data];

  for (let i = 0; i < periods; i++) {
    const window = workingData.slice(-windowSize);
    const weighted = window.reduce((sum, v, idx) => sum + v * weights[idx], 0);
    const avg = weighted / weightSum;
    forecasted.push(parseFloat(avg.toFixed(2)));
    workingData.push(avg);
  }

  return {
    algorithm: 'Weighted Moving Average',
    windowSize,
    weights,
    forecast: forecasted,
    details: `Assigns heavier weights to recent data: weights are ${weights.join(', ')} ` +
             `(most recent = ${weights[weights.length - 1]}). ` +
             `Captures recent demand shifts better than simple averaging.`,
  };
}

// ─────────────────────────────────────────────────────────
// 3. Exponential Smoothing (Single / Holt's)
//    Uses a smoothing factor α (0–1). High α = reacts
//    quickly to recent changes. Low α = smooth/stable.
// ─────────────────────────────────────────────────────────
export function exponentialSmoothing(data, periods = 7, alpha = 0.3) {
  if (data.length < 1) {
    throw new Error('Need at least 1 data point for Exponential Smoothing.');
  }
  if (alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be between 0 and 1 (exclusive).');
  }

  // Initialise: first smoothed value = first actual data point
  let smoothed = data[0];

  // Run smoothing over all historical data
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }

  // Forecast: for single ES, every future period = last smoothed value
  const forecasted = Array(periods).fill(parseFloat(smoothed.toFixed(2)));

  return {
    algorithm: 'Exponential Smoothing',
    alpha,
    smoothedBaseline: parseFloat(smoothed.toFixed(2)),
    forecast: forecasted,
    details: `Uses smoothing factor α=${alpha}. Higher α reacts faster to demand changes; ` +
             `lower α produces more stable forecasts. ` +
             `Final smoothed baseline: ${smoothed.toFixed(2)} units.`,
  };
}

// ─────────────────────────────────────────────────────────
// 4. Linear Regression
//    Fits a straight-line trend y = mx + b through ALL
//    historical data and extrapolates into the future.
//    Best when demand is steadily growing or declining.
// ─────────────────────────────────────────────────────────
export function linearRegression(data, periods = 7) {
  const n = data.length;
  if (n < 2) {
    throw new Error('Need at least 2 data points for Linear Regression.');
  }

  // x values = 1, 2, 3, … n (time index)
  const xValues = Array.from({ length: n }, (_, i) => i + 1);
  const yValues = data;

  const xMean = xValues.reduce((s, v) => s + v, 0) / n;
  const yMean = yValues.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator   += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  const slope     = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Forecast for next `periods` x-values
  const forecasted = [];
  for (let i = 1; i <= periods; i++) {
    const xFuture = n + i;
    const yForecast = slope * xFuture + intercept;
    forecasted.push(parseFloat(Math.max(0, yForecast).toFixed(2))); // never negative
  }

  const trendDirection = slope > 0.5 ? 'upward' : slope < -0.5 ? 'downward' : 'flat';

  return {
    algorithm: 'Linear Regression',
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(4)),
    trendDirection,
    forecast: forecasted,
    details: `Fitted line: y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}. ` +
             `Trend is ${trendDirection} (slope=${slope.toFixed(3)} units/period). ` +
             `Best for consistently growing or declining demand.`,
  };
}

// ─────────────────────────────────────────────────────────
// Master dispatcher — pick algorithm by name
// ─────────────────────────────────────────────────────────
export function runForecast(data, algorithm = 'sma', periods = 7, options = {}) {
  switch (algorithm.toLowerCase()) {
    case 'sma':
      return simpleMovingAverage(data, periods, options.windowSize || 3);
    case 'wma':
      return weightedMovingAverage(data, periods, options.windowSize || 3);
    case 'es':
      return exponentialSmoothing(data, periods, options.alpha || 0.3);
    case 'lr':
      return linearRegression(data, periods);
    default:
      throw new Error(`Unknown algorithm "${algorithm}". Use: sma, wma, es, lr`);
  }
}
