const { centralInventoryAdapter } = require("./centralInventory.adapter");
const { centralInventoryStatus, getCentralInventoryConfig } = require("./centralInventory.config");
const { normalizeCentralInventoryImages } = require("./centralInventory.images");
const AppError = require("../../utils/AppError");

const status = async (_req, res) => res.json(centralInventoryStatus());
const employeeBranchId = (req) => {
  if (req.user.role !== "employee") return null;
  if (!req.user.branchId) throw new AppError("Your employee account is not assigned to a branch.", { statusCode: 409, code: "EMPLOYEE_BRANCH_REQUIRED" });
  return Number(req.user.branchId);
};
const serial = async (req, res) => {
  if (employeeBranchId(req)) throw new AppError("Employees can browse inventory through their assigned branch only.", { statusCode: 403, code: "BRANCH_SCOPE_REQUIRED" });
  return res.json(normalizeCentralInventoryImages(await centralInventoryAdapter.getSerial(req.params.serial)));
};
const serials = async (req, res) => {
  const localBranchId = employeeBranchId(req);
  return res.json(normalizeCentralInventoryImages(localBranchId
    ? await centralInventoryAdapter.branchInventory({ localBranchId, status: req.query.status, search: req.query.search })
    : await centralInventoryAdapter.listSerials(req.query)));
};
const branches = async (req, res) => {
  const localBranchId = employeeBranchId(req);
  const payload = await centralInventoryAdapter.listBranches();
  if (!localBranchId) return res.json(payload);
  const mappedBranchId = Number(getCentralInventoryConfig().branchMap[String(localBranchId)]);
  const rows = Array.isArray(payload) ? payload : payload?.items || payload?.branches || [];
  return res.json(rows.filter((branch) => Number(branch.id ?? branch.branchId) === mappedBranchId));
};
const branchInventory = async (req, res) => res.json(normalizeCentralInventoryImages(await centralInventoryAdapter.branchInventory({
  localBranchId: employeeBranchId(req) || req.query.branchId,
  status: req.query.status,
  search: req.query.search,
})));
const available = async (req, res) => res.json(normalizeCentralInventoryImages(await centralInventoryAdapter.available({
  sku: req.query.sku,
  localBranchId: employeeBranchId(req) || req.query.branchId,
})));
const kits = async (req, res) => res.json(await centralInventoryAdapter.listKits({
  search: req.query.search,
  status: req.query.status || "active",
}));
const kit = async (req, res) => res.json(await centralInventoryAdapter.getKit(req.params.id));
const allocate = async (req, res) => res.status(201).json(await centralInventoryAdapter.allocate(req.body));
const requestReturn = async (req, res) => res.status(201).json(await centralInventoryAdapter.requestReturn(req.body));
const transfer = async (req, res) => res.status(201).json(await centralInventoryAdapter.transfer(req.body));
const requestMissing = async (req, res) => res.status(201).json(await centralInventoryAdapter.requestMissingInventory(req.body));
const requestProcurement = async (req, res) => res.status(201).json(await centralInventoryAdapter.requestProcurement(req.body));
const approveProcurement = async (req, res) => res.json(await centralInventoryAdapter.approveProcurement(req.body));
const orderProcurement = async (req, res) => res.json(await centralInventoryAdapter.orderProcurement(req.body));
const updateShipment = async (req, res) => res.json(await centralInventoryAdapter.updateShipmentState(req.body));
const completeProcurement = async (req, res) => res.json(await centralInventoryAdapter.completeProcurement(req.body));
const analytics = async (req, res) => res.json(await centralInventoryAdapter.branchAnalytics(req.query.branchId));
const branchUsageAnalytics = async (_req, res) => res.json(await centralInventoryAdapter.branchUsageAnalytics());
const consumedAnalytics = async (req, res) => res.json(await centralInventoryAdapter.consumedAnalytics({
  localBranchId: req.query.branchId,
  limit: req.query.limit,
}));
const damagedAnalytics = async (req, res) => res.json(await centralInventoryAdapter.damagedAnalytics({
  localBranchId: req.query.branchId,
}));

module.exports = {
  status, serial, serials, branches, branchInventory, available, kits, kit, allocate, requestReturn, transfer,
  requestMissing, requestProcurement, approveProcurement, orderProcurement,
  updateShipment, completeProcurement, analytics, branchUsageAnalytics,
  consumedAnalytics, damagedAnalytics,
};
