const express = require("express");
const asyncHandler = require("../../middleware/asyncHandler");
const { auth } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/permissions");
const controller = require("./centralInventory.controller");
const { getCentralInventoryConfig } = require("./centralInventory.config");
const AppError = require("../../utils/AppError");

const router = express.Router();
router.use(auth);
const requireWritesEnabled = (_req, _res, next) => {
  if (getCentralInventoryConfig().readOnly) {
    return next(new AppError("Central Inventory mutations are disabled while MIS is in read-only development mode.", {
      statusCode: 423,
      code: "CENTRAL_INVENTORY_READ_ONLY",
    }));
  }
  return next();
};

router.get("/status", requirePermission("inventory.view"), asyncHandler(controller.status));
router.get("/serial/:serial", requirePermission("inventory.view"), asyncHandler(controller.serial));
router.get("/serials", requirePermission("inventory.view"), asyncHandler(controller.serials));
router.get("/branches", requirePermission("inventory.view"), asyncHandler(controller.branches));
router.get("/branch-inventory", requirePermission("inventory.view"), asyncHandler(controller.branchInventory));
router.get("/available", requirePermission("inventory.view"), asyncHandler(controller.available));
router.get("/kits", requirePermission("inventory.view"), asyncHandler(controller.kits));
router.get("/kits/:id", requirePermission("inventory.view"), asyncHandler(controller.kit));
router.get("/analytics/branches", requirePermission("inventory.manage_stock"), asyncHandler(controller.branchUsageAnalytics));
router.get("/analytics/consumed", requirePermission("inventory.manage_stock"), asyncHandler(controller.consumedAnalytics));
router.get("/analytics/damaged", requirePermission("inventory.manage_stock"), asyncHandler(controller.damagedAnalytics));
router.get("/analytics/health", requirePermission("inventory.manage_stock"), asyncHandler(controller.analytics));
router.post("/allocate", requirePermission("inventory.allocate"), requireWritesEnabled, asyncHandler(controller.allocate));
router.post("/return/request", requirePermission("inventory.request"), requireWritesEnabled, asyncHandler(controller.requestReturn));
router.post("/transfer", requirePermission("inventory.manage_stock"), requireWritesEnabled, asyncHandler(controller.transfer));
router.post("/missing/request", requirePermission("inventory.request"), requireWritesEnabled, asyncHandler(controller.requestMissing));
router.post("/procurement/request", requirePermission("inventory.manage_orders"), requireWritesEnabled, asyncHandler(controller.requestProcurement));
router.post("/procurement/approve", requirePermission("inventory.manage_orders"), requireWritesEnabled, asyncHandler(controller.approveProcurement));
router.post("/procurement/order", requirePermission("inventory.manage_orders"), requireWritesEnabled, asyncHandler(controller.orderProcurement));
router.post("/procurement/shipment-state", requirePermission("inventory.manage_orders"), requireWritesEnabled, asyncHandler(controller.updateShipment));
router.post("/procurement/complete", requirePermission("inventory.receive_orders"), requireWritesEnabled, asyncHandler(controller.completeProcurement));

module.exports = router;
