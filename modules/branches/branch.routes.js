const express = require("express");
const controller = require("./branch.controller");
const validation = require("./branch.validation");
const asyncHandler = require("../../middleware/asyncHandler");
const validate = require("../../middleware/validate");
const { auth } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/permissions");
const { BRANCH_PERMISSIONS } = require("./branch.permissions");

const router = express.Router();
router.use(auth);
router.get("/", requirePermission(BRANCH_PERMISSIONS.VIEW), asyncHandler(controller.list));
router.post("/", requirePermission(BRANCH_PERMISSIONS.MANAGE), validate(validation.createBranchSchema), asyncHandler(controller.create));
router.get("/stats", requirePermission(BRANCH_PERMISSIONS.MANAGE), asyncHandler(controller.stats));
router.get("/departments", requirePermission("department.view"), asyncHandler(controller.listDepartments));
router.post("/departments", requirePermission("department.manage"), validate(validation.legacyDepartmentSchema), asyncHandler(controller.createDepartment));

router.use((error, _req, res, next) => {
  if (!error.statusCode || res.headersSent) return next(error);
  return res.status(error.statusCode).json({ error: error.details?.[0]?.message || error.message });
});
module.exports = router;
