const express = require("express");
const controller = require("./department.controller");
const validation = require("./department.validation");
const asyncHandler = require("../../middleware/asyncHandler");
const validate = require("../../middleware/validate");
const { auth } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/permissions");
const { DEPARTMENT_PERMISSIONS } = require("./department.permissions");

const router = express.Router();
router.use(auth);
router.get("/", requirePermission(DEPARTMENT_PERMISSIONS.VIEW), asyncHandler(controller.list));
router.post("/", requirePermission(DEPARTMENT_PERMISSIONS.MANAGE), validate(validation.createDepartmentSchema), asyncHandler(controller.create));
router.get("/:departmentId/details", requirePermission(DEPARTMENT_PERMISSIONS.VIEW), validate(validation.departmentIdSchema, "params"), asyncHandler(controller.details));
router.put("/:departmentId", requirePermission(DEPARTMENT_PERMISSIONS.MANAGE), validate(validation.departmentIdSchema, "params"), validate(validation.updateDepartmentSchema), asyncHandler(controller.update));
router.delete("/:departmentId", requirePermission(DEPARTMENT_PERMISSIONS.MANAGE), validate(validation.departmentIdSchema, "params"), asyncHandler(controller.remove));

router.use((error, _req, res, next) => {
  if (!error.statusCode || res.headersSent) return next(error);
  return res.status(error.statusCode).json({ error: error.details?.[0]?.message || error.message });
});

module.exports = router;
