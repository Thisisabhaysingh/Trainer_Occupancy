const express = require("express");
const controller = require("./auth.controller");
const validation = require("./auth.validation");
const asyncHandler = require("../../middleware/asyncHandler");
const validate = require("../../middleware/validate");
const { auth } = require("../../middleware/auth");

const router = express.Router();

router.post("/login", validate(validation.loginSchema), asyncHandler(controller.login));
router.post("/forgot-password/request-otp", validate(validation.emailSchema), asyncHandler(controller.requestPasswordReset));
router.post("/forgot-password/reset", validate(validation.resetPasswordSchema), asyncHandler(controller.resetPassword));
router.post("/logout", controller.logout);
router.get("/me", auth, asyncHandler(controller.me));
router.post("/change-password", auth, validate(validation.changePasswordSchema), asyncHandler(controller.changePassword));

// Keep the established auth error payload while the rest of the application is
// migrated to the standard API error envelope.
router.use((error, _req, res, next) => {
  if (!error.statusCode || res.headersSent) return next(error);
  const validationMessage = error.details?.[0]?.message;
  return res.status(error.statusCode).json({
    error: validationMessage || error.message,
    ...(process.env.NODE_ENV !== "production" && error.statusCode >= 500 ? { details: error.message } : {}),
  });
});

module.exports = router;
