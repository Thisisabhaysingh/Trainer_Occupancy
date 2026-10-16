const { hasPermission } = require("../auth/permissions");

const requirePermission = (...requiredPermissions) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: "AUTHENTICATION_REQUIRED", message: "Please authenticate.", details: [] },
    });
  }

  const allowed = requiredPermissions.every((permission) => hasPermission(req.user.role, permission));
  if (!allowed) {
    return res.status(403).json({
      success: false,
      error: { code: "PERMISSION_DENIED", message: "You do not have permission to perform this action.", details: [] },
    });
  }
  return next();
};

module.exports = { requirePermission };
