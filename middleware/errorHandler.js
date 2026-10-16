const AppError = require("../utils/AppError");

const notFoundHandler = (req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  return next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, {
    statusCode: 404,
    code: "ROUTE_NOT_FOUND",
  }));
};

const errorHandler = (err, req, res, _next) => {
  const statusCode = Number(err.statusCode || err.status || 500);
  const isProduction = process.env.NODE_ENV === "production";
  const message = statusCode >= 500 && !err.isOperational && isProduction
    ? "An unexpected error occurred"
    : err.message || "An unexpected error occurred";

  if (statusCode >= 500) {
    console.error(`[${err.code || "INTERNAL_ERROR"}] ${req.method} ${req.originalUrl}`, err);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message,
      details: Array.isArray(err.details) ? err.details : [],
      ...(!isProduction && err.stack ? { stack: err.stack } : {}),
    },
  });
};

module.exports = { notFoundHandler, errorHandler };
