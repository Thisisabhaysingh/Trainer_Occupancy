const express = require("express");
const asyncHandler = require("../../middleware/asyncHandler");
const validate = require("../../middleware/validate");
const { auth } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/permissions");
const controller = require("./sso.controller");
const validation = require("./sso.validation");

const router = express.Router();

router.get("/logout", controller.logout);
router.get("/reportcard/start", controller.startReportcardLogin);
router.get(
  "/reportcard/authorize",
  auth,
  requirePermission("reportcard.view"),
  validate(validation.authorizeQuerySchema, "query"),
  asyncHandler(controller.authorizeReportcard),
);
router.post(
  "/reportcard/token",
  validate(validation.tokenBodySchema),
  asyncHandler(controller.exchangeReportcardToken),
);

module.exports = router;
