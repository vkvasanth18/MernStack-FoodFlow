/**
 * alertController.js
 * ──────────────────
 * Handles all API requests for the Alert / Notification Center.
 *
 * Routes (mounted at /api/alerts):
 *   GET    /                 → list alerts (with filters & pagination)
 *   GET    /summary          → unread counts by type (for navbar badge)
 *   PATCH  /:id/read         → mark one alert as read
 *   PATCH  /read-all         → mark ALL unread alerts as read
 *   DELETE /:id              → delete a single alert
 *   DELETE /clear-read       → bulk-delete all read alerts
 */

import Alert from '../models/Alert.js';

// ─────────────────────────────────────────────────────────
// GET /api/alerts
// Query params: ?type=LOW_STOCK&severity=critical&isRead=false&page=1&limit=20
// ─────────────────────────────────────────────────────────
export const getAlerts = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const skip   = (page - 1) * limit;

    // Build filter object from query parameters
    const filter = {};
    if (req.query.type)     filter.type     = req.query.type;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1 })     // newest first
        .skip(skip)
        .limit(limit),
      Alert.countDocuments(filter),
    ]);

    res.json({
      success: true,
      alerts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        unread: await Alert.countDocuments({ isRead: false }),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/alerts/summary
// Returns unread counts grouped by type — used by the Navbar badge
// ─────────────────────────────────────────────────────────
export const getAlertSummary = async (req, res, next) => {
  try {
    // MongoDB aggregation: group unread alerts by type
    const grouped = await Alert.aggregate([
      { $match: { isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Also group by severity
    const bySeverity = await Alert.aggregate([
      { $match: { isRead: false } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const totalUnread = await Alert.countDocuments({ isRead: false });
    const totalAll    = await Alert.countDocuments();

    // Convert array → object for easy frontend consumption
    const byType = {};
    grouped.forEach(g => { byType[g._id] = g.count; });

    const bySeverityObj = {};
    bySeverity.forEach(g => { bySeverityObj[g._id] = g.count; });

    res.json({
      success: true,
      totalUnread,
      totalAll,
      byType,
      bySeverity: bySeverityObj,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/alerts/:id/read
// Mark one specific alert as read
// ─────────────────────────────────────────────────────────
export const markOneRead = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    res.json({ success: true, alert });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/alerts/read-all
// Mark ALL unread alerts as read at once
// ─────────────────────────────────────────────────────────
export const markAllRead = async (req, res, next) => {
  try {
    const result = await Alert.updateMany(
      { isRead: false },
      { $set: { isRead: true } }
    );
    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} alerts as read.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/alerts/:id
// Delete a single alert by ID
// ─────────────────────────────────────────────────────────
export const deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found.' });
    res.json({ success: true, message: 'Alert deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/alerts/clear-read
// Bulk delete all alerts that have already been read
// ─────────────────────────────────────────────────────────
export const clearReadAlerts = async (req, res, next) => {
  try {
    const result = await Alert.deleteMany({ isRead: true });
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} read alerts.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
