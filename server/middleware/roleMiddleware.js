/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to routes based on user role(s)
 * @param  {...string} allowedRoles - e.g. 'admin', 'production_manager', 'inventory_manager'
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to perform this action. Required: [${allowedRoles.join(
          ', '
        )}]`,
      });
    }

    next();
  };
};
