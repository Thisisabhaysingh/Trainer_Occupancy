const AppError = require("../utils/AppError");

const validate = (schema, source = "body") => (req, _res, next) => {
  try {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error?.issues || result.error?.errors || [];
      return next(new AppError("Validation failed", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        details,
      }));
    }
    req[source] = result.data;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = validate;
