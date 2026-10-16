const { Op } = require("sequelize");
const AppError = require("../../utils/AppError");
const db = require("./inventory.repository");
const { queueInventoryEvents } = require("./inventory.notification.service");

const manifest = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const datedRequestManifest = (requestId, date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `REQ-${part("year")}${part("month")}${part("day")}-${String(requestId).padStart(4, "0")}`;
};
const normalizeItemKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/s$/, "");
const listCategories = () => db.InventoryCategory.findAll({ where: { isActive: true }, order: [["name", "ASC"]] });
const listItems = (query = {}) => db.InventoryItem.findAll({ where: { isActive: true, ...(query.itemType ? { itemType: query.itemType } : {}), ...(query.categoryId ? { categoryId: query.categoryId } : {}) }, include: [{ model: db.InventoryCategory, as: "category" }, { model: db.InventoryStock, as: "stock", required: Boolean(query.branchId), ...(query.branchId ? { where: { branchId: query.branchId } } : {}) }] });
const listStock = (branchId) => db.InventoryStock.findAll({ where: branchId ? { branchId } : {} });

const groupRequestItem = async (request, item, transaction) => {
  const rootBranch = await db.InventorySetting.findByPk("HQ_BRANCH_ID", { transaction });
  const rootBranchId = Number(rootBranch?.settingValue || 1);
  let group = await db.InventoryRequestGroup.findOne({
    where: {
      normalizedItemKey: item.normalizedItemKey,
      categoryId: request.categoryId,
      groupingScope: "ROOT",
      groupStatus: "OPEN",
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!group) group = await db.InventoryRequestGroup.create({
    groupManifest: manifest("GRP"),
    normalizedItemKey: item.normalizedItemKey,
    inventoryItemId: item.inventoryItemId,
    categoryId: request.categoryId,
    branchId: rootBranchId,
    groupingScope: "ROOT",
    requiredDateWindow: request.requiredFrom,
  }, { transaction });
  await db.InventoryRequestGroupMember.create({ groupId: group.id, requestId: request.id, requestItemId: item.id, quantity: item.quantity }, { transaction });
  group.totalRequestedQuantity = Number(group.totalRequestedQuantity) + Number(item.quantity); group.requestCount += 1; await group.save({ transaction });
};
const createRequest = (user, input) => db.transaction(async (transaction) => {
  if (!Array.isArray(input.items) || !input.items.length) throw new AppError("At least one item is required", { statusCode: 400, code: "VALIDATION_ERROR" });
  const branchId = ["employee", "senior_manager"].includes(user.role) ? user.branchId : (input.branchId || user.branchId);
  const departmentId = ["employee", "senior_manager"].includes(user.role) ? user.departmentId : (input.departmentId || user.departmentId);
  if (!branchId) throw new AppError("A requesting branch is required", { statusCode: 400, code: "BRANCH_REQUIRED" });
  if (!departmentId) throw new AppError("Your employee account is not assigned to a department", { statusCode: 409, code: "DEPARTMENT_REQUIRED" });
  const request = await db.InventoryRequest.create({ ...input, items: undefined, requestManifest: manifest("TMP"), requesterEmployeeCode: user.employeeCode, departmentId, branchId, requestStatus: "UNDER_APPROVAL" }, { transaction });
  request.requestManifest = datedRequestManifest(request.id, request.createdAt);
  await request.save({ transaction });
  for (const raw of input.items) {
    await db.InventoryRequestItem.create({ ...raw, requestId: request.id, normalizedItemKey: normalizeItemKey(raw.inventoryItemId || raw.requestedItemName) }, { transaction });
  }
  const branchApprover = await db.InventoryBranchApprover.findOne({ where: { branchId: request.branchId, isActive: true }, transaction });
  if (!branchApprover) throw new AppError("No inventory approver is configured for the requesting branch", { statusCode: 409, code: "BRANCH_APPROVER_NOT_CONFIGURED" });
  await db.InventoryApproval.create({ requestId: request.id, level: 1, approverEmployeeCode: branchApprover.employeeCode, status: "PENDING" }, { transaction });
  await queueInventoryEvents(transaction, [
    { employeeCode: branchApprover.employeeCode, type: "notification", title: "Inventory request awaiting branch approval", body: `${request.requestManifest} needs your review as the Local Branch Inventory Person.`, requestId: request.id, requestManifest: request.requestManifest, stage: "BRANCH_APPROVAL_REQUIRED", route: "/inventory/approvals" },
    { employeeCode: request.requesterEmployeeCode, type: "message", title: "Inventory request submitted", body: `${request.requestManifest} was sent to your Local Branch Inventory Person.`, requestId: request.id, requestManifest: request.requestManifest, stage: "UNDER_APPROVAL" },
  ]);
  return db.InventoryRequest.findByPk(request.id, { include: [{ model: db.InventoryRequestItem, as: "items" }], transaction });
});
const myRequests = (user) => db.InventoryRequest.findAll({ where: { requesterEmployeeCode: user.employeeCode }, include: [{ model: db.InventoryRequestItem, as: "items" }, { model: db.InventoryApproval, as: "approvals" }], order: [["createdAt", "DESC"]] });
const requestById = async (id, user, canManage) => { const request = await db.InventoryRequest.findByPk(id, { include: [{ model: db.InventoryRequestItem, as: "items" }, { model: db.InventoryApproval, as: "approvals" }] }); if (!request || (!canManage && request.requesterEmployeeCode !== user.employeeCode)) throw new AppError("Inventory request not found", { statusCode: 404 }); return request; };
const decideRequest = (id, user, approved, reason, canApproveAny = false) => db.transaction(async (transaction) => {
  const request = await db.InventoryRequest.findByPk(id, { include: [{ model: db.InventoryRequestItem, as: "items" }], transaction, lock: transaction.LOCK.UPDATE });
  if (!request) throw new AppError("Inventory request not found", { statusCode: 404 });
  const approval = await db.InventoryApproval.findOne({ where: { requestId: id, status: "PENDING" }, transaction, lock: transaction.LOCK.UPDATE });
  if (!approval) throw new AppError("No pending approval", { statusCode: 409 });
  if (!canApproveAny && approval.approverEmployeeCode !== user.employeeCode) throw new AppError("This request is assigned to another approver", { statusCode: 403, code: "APPROVAL_NOT_ASSIGNED" });
  await approval.update({ status: approved ? "APPROVED" : "REJECTED", reason, actedAt: new Date() }, { transaction });
  if (!approved) {
    await request.update({ requestStatus: "REJECTED" }, { transaction });
    await queueInventoryEvents(transaction, [
      { employeeCode: request.requesterEmployeeCode, type: "notification", title: "Inventory request rejected", body: `${request.requestManifest} was rejected${reason ? `: ${reason}` : "."}`, requestId: request.id, requestManifest: request.requestManifest, stage: "REJECTED" },
    ]);
    return request;
  }

  if (approval.level === 1) {
    const vicePresident = await db.InventoryResponsibility.findOne({
      where: { responsibilityType: "CATEGORY_VP", categoryId: request.categoryId, isActive: true },
      transaction,
    });
    if (!vicePresident) throw new AppError("No Category Vice President is configured for this inventory category", { statusCode: 409, code: "CATEGORY_VP_NOT_CONFIGURED" });
    await db.InventoryApproval.create({ requestId: request.id, level: 2, approverEmployeeCode: vicePresident.employeeCode, status: "PENDING" }, { transaction });
    await request.update({ requestStatus: "VP_APPROVAL_REQUIRED" }, { transaction });
    await queueInventoryEvents(transaction, [
      { employeeCode: vicePresident.employeeCode, type: "notification", title: "Inventory request awaiting category VP approval", body: `${request.requestManifest} passed branch review and needs your approval for its inventory category.`, requestId: request.id, requestManifest: request.requestManifest, stage: "CATEGORY_VP_APPROVAL_REQUIRED", route: "/inventory/approvals" },
      { employeeCode: request.requesterEmployeeCode, type: "message", title: "Branch inventory approval completed", body: `${request.requestManifest} is now awaiting the Vice President assigned to its inventory category.`, requestId: request.id, requestManifest: request.requestManifest, stage: "CATEGORY_VP_APPROVAL_REQUIRED" },
    ]);
    return request;
  }

  if (approval.level === 2) {
    const inventoryHead = await db.InventoryResponsibility.findOne({
      where: {
        responsibilityType: "INVENTORY_HEAD",
        isActive: true,
        categoryId: request.categoryId,
      },
      transaction,
    });
    if (!inventoryHead) throw new AppError("No Inventory Head is configured for this category", { statusCode: 409, code: "INVENTORY_HEAD_NOT_CONFIGURED" });
    await db.InventoryApproval.create({ requestId: request.id, level: 3, approverEmployeeCode: inventoryHead.employeeCode, status: "PENDING" }, { transaction });
    await request.update({ requestStatus: "INVENTORY_HEAD_APPROVAL_REQUIRED" }, { transaction });
    await queueInventoryEvents(transaction, [
      { employeeCode: inventoryHead.employeeCode, type: "notification", title: "Inventory request awaiting final approval", body: `${request.requestManifest} passed VP review and needs Inventory Head approval.`, requestId: request.id, requestManifest: request.requestManifest, stage: "INVENTORY_HEAD_APPROVAL_REQUIRED", route: "/inventory/approvals" },
      { employeeCode: request.requesterEmployeeCode, type: "message", title: "Vice President approval completed", body: `${request.requestManifest} is now awaiting final Inventory Head approval.`, requestId: request.id, requestManifest: request.requestManifest, stage: "INVENTORY_HEAD_APPROVAL_REQUIRED" },
    ]);
    return request;
  }

  if (approval.level === 3) {
    const stockRows = [];
    let localStockAvailable = true;
    for (const item of request.items) {
      if (!item.inventoryItemId) { localStockAvailable = false; break; }
      const stock = await db.InventoryStock.findOne({ where: { inventoryItemId: item.inventoryItemId, branchId: request.branchId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!stock || Number(stock.availableQuantity) < Number(item.quantity)) { localStockAvailable = false; break; }
      stockRows.push({ item, stock });
    }
    if (localStockAvailable) {
      for (const { item, stock } of stockRows) {
        stock.availableQuantity = Number(stock.availableQuantity) - Number(item.quantity);
        stock.allocatedQuantity = Number(stock.allocatedQuantity) + Number(item.quantity);
        await stock.save({ transaction });
        await db.InventoryAllocation.create({ requestId: request.id, requestItemId: item.id, inventoryItemId: item.inventoryItemId, allocatedToEmployeeCode: request.requesterEmployeeCode, branchId: request.branchId, quantity: item.quantity, status: "AWAITING_RECEIPT", allocatedBy: user.employeeCode, allocatedAt: new Date() }, { transaction });
      }
      await request.update({ requestStatus: "ALLOCATED", procurementStatus: "NOT_REQUIRED", allocationStatus: "AWAITING_RECEIPT" }, { transaction });
      await queueInventoryEvents(transaction, [
        { employeeCode: request.requesterEmployeeCode, type: "notification", title: "Inventory allocated from local stock", body: `${request.requestManifest} was approved and assigned from your branch inventory. Please confirm receipt.`, requestId: request.id, requestManifest: request.requestManifest, stage: "ALLOCATED" },
      ]);
    } else {
      for (const item of request.items) await groupRequestItem(request, item, transaction);
      await request.update({ requestStatus: "APPROVED", procurementStatus: "GROUPED_FOR_PROCUREMENT", allocationStatus: "PENDING" }, { transaction });
      await queueInventoryEvents(transaction, [
        { employeeCode: request.requesterEmployeeCode, type: "message", title: "Inventory request approved for procurement", body: `${request.requestManifest} was approved and added to consolidated procurement because local stock is unavailable.`, requestId: request.id, requestManifest: request.requestManifest, stage: "GROUPED_FOR_PROCUREMENT" },
        { employeeCode: user.employeeCode, type: "notification", title: "Request added to procurement grouping", body: `${request.requestManifest} is grouped at root level for consolidated purchasing.`, requestId: request.id, requestManifest: request.requestManifest, stage: "GROUPED_FOR_PROCUREMENT", route: "/inventory/manager" },
      ]);
    }
    return request;
  }

  throw new AppError("Unsupported approval level", { statusCode: 409, code: "INVALID_APPROVAL_LEVEL" });
});
const vendorSuggestions = async ({ itemId, branchId }) => { const rows = await db.VendorItemHistory.findAll({ where: { ...(itemId ? { inventoryItemId: itemId } : {}), ...(branchId ? { branchId } : {}) }, include: [{ model: db.Vendor, as: "vendor", where: { isActive: true } }], order: [["orderDate", "DESC"]] }); const seen = new Set(); return rows.filter((row) => !seen.has(row.vendorId) && seen.add(row.vendorId)).map((row) => ({ vendorId: row.vendorId, vendorName: row.vendor.name, lastUsedAt: row.orderDate, lastUnitPrice: row.unitPrice, reason: "Previously used vendor for this item" })); };
const createOrder = (user, input) => db.transaction(async (transaction) => {
  const items = input.items || [];
  if (!items.length) throw new AppError("At least one order item is required", { statusCode: 400 });
  const requestGroup = input.requestGroupId ? await db.InventoryRequestGroup.findByPk(input.requestGroupId, { transaction, lock: transaction.LOCK.UPDATE }) : null;
  if (input.requestGroupId && !requestGroup) throw new AppError("Procurement group not found", { statusCode: 404 });
  if (requestGroup && requestGroup.groupStatus !== "OPEN") throw new AppError("A purchase order has already been placed for this procurement group", { statusCode: 409, code: "GROUP_ALREADY_ORDERED" });
  const order = await db.PurchaseOrder.create({ ...input, items: undefined, orderManifest: manifest("PO"), createdBy: user.employeeCode }, { transaction });
  await db.PurchaseOrderItem.bulkCreate(items.map((item) => ({ ...item, purchaseOrderId: order.id })), { transaction });
  if (requestGroup) await requestGroup.update({ groupStatus: "ORDERED" }, { transaction });
  return db.PurchaseOrder.findByPk(order.id, { include: [{ model: db.PurchaseOrderItem, as: "items" }], transaction });
});
const updateOrderStatus = async (id, status) => { const order = await db.PurchaseOrder.findByPk(id); if (!order) throw new AppError("Order not found", { statusCode: 404 }); await order.update({ status, ...(status === "COMPLETED" ? { receivedAt: new Date() } : {}) }); return order; };
const receiveOrder = (id, user) => db.transaction(async (transaction) => { const order = await db.PurchaseOrder.findByPk(id, { include: [{ model: db.PurchaseOrderItem, as: "items" }], transaction, lock: transaction.LOCK.UPDATE }); if (!order) throw new AppError("Order not found", { statusCode: 404 }); for (const item of order.items) { const [stock] = await db.InventoryStock.findOrCreate({ where: { inventoryItemId: item.inventoryItemId, branchId: order.branchId }, defaults: {}, transaction }); stock.availableQuantity = Number(stock.availableQuantity) + Number(item.quantity); await stock.save({ transaction }); await item.update({ receivedQuantity: item.quantity }, { transaction }); } await order.update({ status: "COMPLETED", receivedAt: new Date() }, { transaction }); return order; });
const allocate = (user, input) => db.transaction(async (transaction) => { const stock = await db.InventoryStock.findOne({ where: { inventoryItemId: input.inventoryItemId, branchId: input.branchId }, transaction, lock: transaction.LOCK.UPDATE }); if (!stock || Number(stock.availableQuantity) < Number(input.quantity)) throw new AppError("Insufficient available stock", { statusCode: 409 }); stock.availableQuantity = Number(stock.availableQuantity) - Number(input.quantity); stock.allocatedQuantity = Number(stock.allocatedQuantity) + Number(input.quantity); await stock.save({ transaction }); const allocation = await db.InventoryAllocation.create({ ...input, allocatedBy: user.employeeCode, allocatedAt: new Date() }, { transaction }); await db.InventoryRequest.update({ allocationStatus: "ALLOCATED", requestStatus: "FULFILLED" }, { where: { id: input.requestId }, transaction }); return allocation; });
const createReturn = (user, input) => db.InventoryReturn.create({ ...input, requestedBy: user.employeeCode });
const receiveAllocation = async (id, user) => { const allocation = await db.InventoryAllocation.findByPk(id); if (!allocation || allocation.allocatedToEmployeeCode !== user.employeeCode) throw new AppError("Allocation not found", { statusCode: 404 }); const item = allocation.inventoryItemId ? await db.InventoryItem.findByPk(allocation.inventoryItemId) : null; await allocation.update({ status: item?.isReturnable ? "RETURN_REQUIRED" : "RECEIVED" }); await db.InventoryRequest.update({ requestStatus: "FULFILLED", allocationStatus: item?.isReturnable ? "RETURN_REQUIRED" : "RECEIVED" }, { where: { id: allocation.requestId } }); return allocation; };
const inspectReturn = (id, user, input) => db.transaction(async (transaction) => { const record = await db.InventoryReturn.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE }); if (!record) throw new AppError("Return not found", { statusCode: 404 }); const allocation = await db.InventoryAllocation.findByPk(record.allocationId, { transaction }); if (allocation && ["good", "damaged", "consumed", "lost"].includes(input.condition)) { const stock = await db.InventoryStock.findOne({ where: { inventoryItemId: allocation.inventoryItemId, branchId: allocation.branchId }, transaction, lock: transaction.LOCK.UPDATE }); if (stock) { stock.allocatedQuantity = Math.max(0, Number(stock.allocatedQuantity) - Number(allocation.quantity)); if (input.condition === "good") stock.availableQuantity = Number(stock.availableQuantity) + Number(allocation.quantity); if (input.condition === "damaged") stock.damagedQuantity = Number(stock.damagedQuantity) + Number(allocation.quantity); await stock.save({ transaction }); } await allocation.update({ status: input.condition.toUpperCase() }, { transaction }); } await record.update({ ...input, status: input.status || "INSPECTED", inspectedBy: user.employeeCode, inspectedAt: new Date() }, { transaction }); return record; });

module.exports = { normalizeItemKey, listCategories, listItems, listStock, createRequest, myRequests, requestById, decideRequest, vendorSuggestions, createOrder, updateOrderStatus, receiveOrder, allocate, receiveAllocation, createReturn, inspectReturn };
