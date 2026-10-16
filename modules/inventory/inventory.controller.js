const service = require("./inventory.service");
const db = require("./inventory.repository");
const { hasPermission } = require("../../auth/permissions");
const { Op, QueryTypes } = require("sequelize");
const { User, Branch, Department } = require("../../models");
const AppError = require("../../utils/AppError");

const categories = async (_req, res) => res.json(await service.listCategories());
const createCategory = async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const name = String(req.body.name || "").trim();
  if (!code || !name) return res.status(400).json({ success: false, error: { code: "INVALID_CATEGORY", message: "Category code and name are required.", details: [] } });
  const existing = await db.InventoryCategory.findOne({ where: { code } });
  if (existing) return res.status(409).json({ success: false, error: { code: "CATEGORY_EXISTS", message: `Category code ${code} already exists.`, details: [] } });
  const category = await db.InventoryCategory.create({ code, name, parentId: req.body.parentId || null, isActive: req.body.isActive !== false });
  return res.status(201).json(category);
};
const updateCategory = async (req, res) => { const row = await db.InventoryCategory.findByPk(req.params.id); if (!row) return res.status(404).json({ error: "Category not found" }); return res.json(await row.update(req.body)); };
const employeeBranchId = (req) => {
  if (req.user.role !== "employee") return null;
  if (!req.user.branchId) throw new AppError("Your employee account is not assigned to a branch.", { statusCode: 409, code: "EMPLOYEE_BRANCH_REQUIRED" });
  return Number(req.user.branchId);
};
const scopedBranchId = (req) => employeeBranchId(req) || req.params.branchId || req.query.branchId;
const items = async (req, res) => res.json(await service.listItems({ ...req.query, ...(employeeBranchId(req) ? { branchId: employeeBranchId(req) } : {}) }));
const item = async (req, res) => res.json(await db.InventoryItem.findByPk(req.params.id));
const stock = async (req, res) => res.json(await service.listStock(scopedBranchId(req)));
const summary = async (req, res) => {
  const branchId = employeeBranchId(req);
  return res.json(await db.InventoryStock.findAll({ where: branchId ? { branchId } : {}, attributes: ["branchId", [db.InventoryStock.sequelize.fn("SUM", db.InventoryStock.sequelize.col("availableQuantity")), "availableQuantity"]], group: ["branchId"] }));
};
const controlOverviewAccess = async (req, res) => {
  const isAdministrator = ["admin", "inventory_admin"].includes(req.user.role);
  const [vicePresidentAssignment, inventoryHeadAssignments] = isAdministrator ? [null, []] : await Promise.all([
    db.InventoryResponsibility.findOne({ where: { responsibilityType: "DEPARTMENT_VP", employeeCode: req.user.employeeCode, isActive: true }, attributes: ["id", "departmentId"] }),
    db.InventoryResponsibility.findAll({ where: { responsibilityType: "INVENTORY_HEAD", employeeCode: req.user.employeeCode, isActive: true }, attributes: ["id", "categoryId"] }),
  ]);
  return res.json({
    canViewControlOverview: isAdministrator || Boolean(vicePresidentAssignment),
    isDepartmentVicePresident: Boolean(vicePresidentAssignment),
    departmentId: vicePresidentAssignment?.departmentId || null,
    isInventoryHead: inventoryHeadAssignments.length > 0,
    canManageProcurement: isAdministrator || inventoryHeadAssignments.length > 0 || hasPermission(req.user.role, "inventory.manage_orders"),
    inventoryCategoryIds: inventoryHeadAssignments.map((assignment) => assignment.categoryId).filter(Boolean),
  });
};
const adminOverview = async (req, res) => {
  const isAdministrator = ["admin", "inventory_admin"].includes(req.user.role);
  const [vicePresidentAssignment, inventoryHeadAssignments] = isAdministrator ? [null, []] : await Promise.all([
    db.InventoryResponsibility.findOne({ where: { responsibilityType: "DEPARTMENT_VP", employeeCode: req.user.employeeCode, isActive: true }, attributes: ["id", "departmentId"] }),
    db.InventoryResponsibility.findAll({ where: { responsibilityType: "INVENTORY_HEAD", employeeCode: req.user.employeeCode, isActive: true, categoryId: { [Op.not]: null } }, attributes: ["id", "categoryId"] }),
  ]);
  if (!isAdministrator && !vicePresidentAssignment && !inventoryHeadAssignments.length) {
    throw new AppError("Inventory Control Overview is available only to administrators and configured inventory approvers.", {
      statusCode: 403,
      code: "INVENTORY_CONTROL_OVERVIEW_FORBIDDEN",
    });
  }
  const numberFilter = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : null;
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  const from = validDate(req.query.from) || defaultFrom.toISOString().slice(0, 10);
  const to = validDate(req.query.to) || today.toISOString().slice(0, 10);
  const branchId = numberFilter(req.query.branchId);
  const departmentId = vicePresidentAssignment
    ? Number(vicePresidentAssignment.departmentId)
    : numberFilter(req.query.departmentId);
  const assignedCategoryIds = inventoryHeadAssignments.map((assignment) => Number(assignment.categoryId));
  const categoryId = numberFilter(req.query.categoryId);
  if (assignedCategoryIds.length && categoryId && !assignedCategoryIds.includes(categoryId)) {
    throw new AppError("This category is outside your Inventory Head assignment.", { statusCode: 403, code: "INVENTORY_CATEGORY_SCOPE_FORBIDDEN" });
  }
  const replacements = { from, to, branchId, departmentId, categoryId, categoryScopeDisabled: assignedCategoryIds.length ? 0 : 1, categoryIds: assignedCategoryIds.length ? assignedCategoryIds : [0] };
  const requestWhere = `
    r.createdAt >= :from
    AND r.createdAt < DATE_ADD(:to, INTERVAL 1 DAY)
    AND (:branchId IS NULL OR r.branchId = :branchId)
    AND (:departmentId IS NULL OR r.departmentId = :departmentId)
    AND (:categoryId IS NULL OR r.categoryId = :categoryId)
    AND (:categoryScopeDisabled = 1 OR r.categoryId IN (:categoryIds))`;
  const stockWhere = `
    (:branchId IS NULL OR s.branchId = :branchId)
    AND (:categoryId IS NULL OR i.categoryId = :categoryId)
    AND (:categoryScopeDisabled = 1 OR i.categoryId IN (:categoryIds))`;
  const query = (sql) => db.InventoryRequest.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  const [requestMetricsRows, stockMetricsRows, dailyActivity, statusBreakdown, branchRequests, branchStock, categoryRequests, categoryStock, departmentBreakdown, recentRequests] = await Promise.all([
    query(`SELECT COUNT(*) totalRequests,
      SUM(r.requestStatus IN ('UNDER_APPROVAL','VP_APPROVAL_REQUIRED','INVENTORY_HEAD_APPROVAL_REQUIRED')) pendingRequests,
      SUM(r.requestStatus IN ('APPROVED','ALLOCATED','FULFILLED')) approvedRequests,
      SUM(r.requestStatus = 'REJECTED') rejectedRequests,
      SUM(r.requiredFrom > CURDATE() AND r.requestStatus NOT IN ('REJECTED','CANCELLED')) upcomingRequests,
      SUM(r.expectedReturnDate < CURDATE() AND r.requestStatus NOT IN ('FULFILLED','REJECTED','CANCELLED')) overdueReturns,
      COALESCE(SUM(r.estimatedValue),0) estimatedValue
      FROM inventory_requests r WHERE ${requestWhere}`),
    query(`SELECT COUNT(DISTINCT s.inventoryItemId) stockedItems,
      COALESCE(SUM(s.availableQuantity),0) availableQuantity,
      COALESCE(SUM(s.reservedQuantity),0) reservedQuantity,
      COALESCE(SUM(s.allocatedQuantity),0) allocatedQuantity,
      COALESCE(SUM(s.damagedQuantity),0) damagedQuantity,
      COALESCE(SUM(s.inTransitQuantity),0) inTransitQuantity
      FROM inventory_stock s JOIN inventory_items i ON i.id=s.inventoryItemId WHERE ${stockWhere}`),
    query(`SELECT DATE(r.createdAt) date, COUNT(*) requests,
      SUM(r.requestStatus IN ('APPROVED','ALLOCATED','FULFILLED')) approved,
      SUM(r.requestStatus='REJECTED') rejected
      FROM inventory_requests r WHERE ${requestWhere} GROUP BY DATE(r.createdAt) ORDER BY date`),
    query(`SELECT r.requestStatus status, COUNT(*) count FROM inventory_requests r WHERE ${requestWhere} GROUP BY r.requestStatus ORDER BY count DESC`),
    query(`SELECT r.branchId id, COALESCE(b.name, CONCAT('Branch ',r.branchId)) name, COUNT(*) requests
      FROM inventory_requests r LEFT JOIN Branches b ON b.id=r.branchId WHERE ${requestWhere}
      GROUP BY r.branchId,b.name ORDER BY requests DESC`),
    query(`SELECT s.branchId id, COALESCE(b.name, CONCAT('Branch ',s.branchId)) name,
      COALESCE(SUM(s.availableQuantity),0) available, COUNT(DISTINCT s.inventoryItemId) items
      FROM inventory_stock s JOIN inventory_items i ON i.id=s.inventoryItemId LEFT JOIN Branches b ON b.id=s.branchId
      WHERE ${stockWhere} GROUP BY s.branchId,b.name ORDER BY available DESC`),
    query(`SELECT r.categoryId id, COALESCE(c.name, CONCAT('Category ',r.categoryId)) name, COUNT(*) requests
      FROM inventory_requests r LEFT JOIN inventory_categories c ON c.id=r.categoryId WHERE ${requestWhere}
      GROUP BY r.categoryId,c.name ORDER BY requests DESC`),
    query(`SELECT i.categoryId id, COALESCE(c.name, CONCAT('Category ',i.categoryId)) name,
      COALESCE(SUM(s.availableQuantity),0) available, COUNT(DISTINCT s.inventoryItemId) items
      FROM inventory_stock s JOIN inventory_items i ON i.id=s.inventoryItemId LEFT JOIN inventory_categories c ON c.id=i.categoryId
      WHERE ${stockWhere} GROUP BY i.categoryId,c.name ORDER BY available DESC`),
    query(`SELECT r.departmentId id, COALESCE(d.name, 'Unassigned') name, COUNT(*) requests
      FROM inventory_requests r LEFT JOIN departments d ON d.id=r.departmentId WHERE ${requestWhere}
      GROUP BY r.departmentId,d.name ORDER BY requests DESC`),
    query(`SELECT r.id,r.requestManifest,r.requesterEmployeeCode,u.name requesterName,r.branchId,b.name branchName,
      r.departmentId,d.name departmentName,r.categoryId,c.name categoryName,r.requestStatus,r.priority,r.estimatedValue,r.createdAt
      FROM inventory_requests r
      LEFT JOIN users u ON u.employeeCode=r.requesterEmployeeCode
      LEFT JOIN Branches b ON b.id=r.branchId LEFT JOIN departments d ON d.id=r.departmentId
      LEFT JOIN inventory_categories c ON c.id=r.categoryId
      WHERE ${requestWhere} ORDER BY r.createdAt DESC LIMIT 12`),
  ]);

  const merge = (left, right) => [...new Map([...left, ...right].map((row) => [String(row.id), row])).values()].map((row) => ({
    id: row.id,
    name: row.name,
    requests: Number(left.find((item) => String(item.id) === String(row.id))?.requests || 0),
    available: Number(right.find((item) => String(item.id) === String(row.id))?.available || 0),
    items: Number(right.find((item) => String(item.id) === String(row.id))?.items || 0),
  }));
  return res.json({
    filters: { from, to, branchId, departmentId, categoryId, assignedCategoryIds },
    metrics: { ...requestMetricsRows[0], ...stockMetricsRows[0] },
    dailyActivity,
    statusBreakdown,
    branchBreakdown: merge(branchRequests, branchStock),
    categoryBreakdown: merge(categoryRequests, categoryStock),
    departmentBreakdown,
    recentRequests,
  });
};
const createRequest = async (req, res) => {
  const request = await service.createRequest(req.user, req.body);
  try {
    const [branch, department, category] = await Promise.all([
      Branch.findByPk(request.branchId),
      Department.findByPk(request.departmentId),
      db.InventoryCategory.findByPk(request.categoryId),
    ]);
    const centralResult = await require("../../integrations/centralInventory/centralInventory.adapter").centralInventoryAdapter.submitInventoryRequest({
      sourceRequestId: request.requestManifest,
      requestManifest: request.requestManifest,
      requesterEmployeeCode: request.requesterEmployeeCode,
      requesterName: req.user.name,
      branchId: request.branchId,
      branchName: branch?.name || null,
      departmentId: request.departmentId,
      departmentName: department?.name || null,
      categoryId: request.categoryId,
      categoryName: category?.name || null,
      purpose: request.purpose,
      priority: request.priority,
      requiredFrom: request.requiredFrom,
      expectedReturnDate: request.expectedReturnDate,
      requestStatus: request.requestStatus,
      procurementStatus: request.procurementStatus,
      allocationStatus: request.allocationStatus,
      submittedAt: request.createdAt,
      items: (request.items || []).map((item) => ({
        requestedItemName: item.requestedItemName,
        itemType: item.itemType,
        quantity: item.quantity,
        unit: item.unit,
        sku: item.sku || null,
        estimatedPrice: item.estimatedPrice,
      })),
    });
    return res.status(201).json({ ...request.toJSON(), centralSync: { synced: true, requestId: centralResult.request?.id } });
  } catch (error) {
    console.error("MIS inventory request central sync failed:", request.requestManifest, error.message);
    return res.status(201).json({ ...request.toJSON(), centralSync: { synced: false, message: "Saved in MIS; Omnix synchronization is pending." } });
  }
};
const mine = async (req, res) => res.json(await service.myRequests(req.user));
const request = async (req, res) => res.json(await service.requestById(req.params.id, req.user, hasPermission(req.user.role, "inventory.approve")));
const cancel = async (req, res) => { const row = await service.requestById(req.params.id, req.user, false); return res.json(await row.update({ requestStatus: "CANCELLED" })); };
const resubmit = async (req, res) => { const row = await service.requestById(req.params.id, req.user, false); return res.json(await row.update({ ...req.body, requestStatus: "UNDER_APPROVAL" })); };
const canApproveAny = (user) => ["admin", "inventory_admin"].includes(user.role);
const pendingApprovals = async (req, res) => {
  let requestIds = [];
  const assignedApprovals = !canApproveAny(req.user) ? await db.InventoryApproval.findAll({
    where: { status: "PENDING", approverEmployeeCode: req.user.employeeCode },
    attributes: ["requestId"],
  }) : [];
  if (assignedApprovals.length) {
    requestIds = [...new Set(assignedApprovals.map((approval) => approval.requestId))];
  } else if (req.user.role === "employee") {
    const ownRequests = await db.InventoryRequest.findAll({
      where: { requesterEmployeeCode: req.user.employeeCode },
      attributes: ["id"],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    requestIds = ownRequests.map((request) => request.id);
  } else {
    const activeApprovals = await db.InventoryApproval.findAll({
      where: {
        status: "PENDING",
        ...(!canApproveAny(req.user) ? { approverEmployeeCode: req.user.employeeCode } : {}),
      },
      attributes: ["requestId"],
    });
    requestIds = [...new Set(activeApprovals.map((approval) => approval.requestId))];
  }
  if (!requestIds.length) return res.json([]);

  const approvals = await db.InventoryApproval.findAll({
    where: { requestId: { [Op.in]: requestIds } },
    include: [{
      model: db.InventoryRequest,
      as: "request",
      required: false,
      include: [
        { model: db.InventoryRequestItem, as: "items", include: [{ model: db.InventoryItem, as: "catalogItem", required: false }] },
        { model: db.InventoryCategory, as: "category", required: false },
      ],
    }],
    order: [["createdAt", "DESC"]],
  });

  const requests = approvals.map((approval) => approval.request).filter(Boolean);
  const employeeCodes = [...new Set(requests.map((request) => request.requesterEmployeeCode).filter(Boolean))];
  const branchIds = [...new Set(requests.map((request) => request.branchId).filter(Boolean))];
  const departmentIds = [...new Set(requests.map((request) => request.departmentId).filter(Boolean))];
  const [employees, branches, departments] = await Promise.all([
    employeeCodes.length ? User.findAll({ where: { employeeCode: employeeCodes }, attributes: ["employeeCode", "name", "email"] }) : [],
    branchIds.length ? Branch.findAll({ where: { id: branchIds }, attributes: ["id", "name"] }) : [],
    departmentIds.length ? Department.findAll({ where: { id: departmentIds }, attributes: ["id", "name"] }) : [],
  ]);
  const employeeMap = new Map(employees.map((employee) => [employee.employeeCode, employee.toJSON()]));
  const branchMap = new Map(branches.map((branch) => [String(branch.id), branch.toJSON()]));
  const departmentMap = new Map(departments.map((department) => [String(department.id), department.toJSON()]));

  return res.json(approvals.map((approval) => {
    const value = approval.toJSON();
    if (value.request) {
      value.request.requester = employeeMap.get(value.request.requesterEmployeeCode) || null;
      value.request.branch = branchMap.get(String(value.request.branchId)) || null;
      value.request.department = departmentMap.get(String(value.request.departmentId)) || null;
    }
    return value;
  }));
};
const approve = async (req, res) => res.json(await service.decideRequest(req.params.id, req.user, true, req.body.reason, canApproveAny(req.user)));
const reject = async (req, res) => res.json(await service.decideRequest(req.params.id, req.user, false, req.body.reason, canApproveAny(req.user)));
const batchApprove = async (req, res) => {
  const requestIds = [...new Set((req.body.requestIds || []).map(Number).filter(Number.isInteger))];
  if (!requestIds.length) return res.status(400).json({ error: "Select at least one request" });
  if (requestIds.length > 200) return res.status(400).json({ error: "A maximum of 200 requests can be approved in one batch" });
  const results = [];
  for (const requestId of requestIds) {
    try {
      const request = await service.decideRequest(requestId, req.user, true, req.body.reason, canApproveAny(req.user));
      results.push({ requestId, success: true, requestStatus: request.requestStatus });
    } catch (error) {
      results.push({ requestId, success: false, code: error.code || "APPROVAL_FAILED", message: error.message });
    }
  }
  return res.json({
    total: results.length,
    approved: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  });
};
const approvalHistory = async (req, res) => res.json(await db.InventoryApproval.findAll({ where: { requestId: req.params.id }, order: [["level", "ASC"]] }));
const assignedInventoryCategoryIds = async (user) => {
  if (canApproveAny(user) || hasPermission(user.role, "inventory.manage_orders")) return null;
  const assignments = await db.InventoryResponsibility.findAll({ where: { responsibilityType: "INVENTORY_HEAD", employeeCode: user.employeeCode, isActive: true }, attributes: ["categoryId"] });
  return assignments.map((assignment) => assignment.categoryId).filter(Boolean);
};
const groups = async (req, res) => {
  const categoryIds = await assignedInventoryCategoryIds(req.user);
  return res.json(await db.InventoryRequestGroup.findAll({ where: categoryIds ? { categoryId: categoryIds } : {}, order: [["createdAt", "DESC"]] }));
};
const group = async (req, res) => {
  const categoryIds = await assignedInventoryCategoryIds(req.user);
  const row = await db.InventoryRequestGroup.findOne({ where: { id: req.params.id, ...(categoryIds ? { categoryId: categoryIds } : {}) } });
  return row ? res.json(row) : res.status(404).json({ error: "Request group not found" });
};
const vendors = async (_req, res) => res.json(await db.Vendor.findAll({ order: [["name", "ASC"]] }));
const createVendor = async (req, res) => res.status(201).json(await db.Vendor.create(req.body));
const updateVendor = async (req, res) => { const row = await db.Vendor.findByPk(req.params.id); return row ? res.json(await row.update(req.body)) : res.status(404).json({ error: "Vendor not found" }); };
const suggestions = async (req, res) => res.json(await service.vendorSuggestions(req.query));
const vendorHistory = async (req, res) => res.json(await db.VendorItemHistory.findAll({ where: { inventoryItemId: req.query.itemId }, order: [["orderDate", "DESC"]] }));
const createOrder = async (req, res) => {
  const categoryIds = await assignedInventoryCategoryIds(req.user);
  if (categoryIds) {
    const group = await db.InventoryRequestGroup.findOne({ where: { id: req.body.requestGroupId, categoryId: categoryIds } });
    if (!group) return res.status(403).json({ error: "This procurement group is outside your assigned inventory categories" });
  }
  return res.status(201).json(await service.createOrder(req.user, req.body));
};
const orders = async (req, res) => {
  const categoryIds = await assignedInventoryCategoryIds(req.user);
  const scopedGroupIds = categoryIds ? (await db.InventoryRequestGroup.findAll({ where: { categoryId: categoryIds }, attributes: ["id"] })).map((group) => group.id) : null;
  return res.json(await db.PurchaseOrder.findAll({ where: scopedGroupIds ? { requestGroupId: scopedGroupIds } : {}, order: [["createdAt", "DESC"]] }));
};
const scopedOrder = async (id, user) => {
  const categoryIds = await assignedInventoryCategoryIds(user);
  const row = await db.PurchaseOrder.findByPk(id);
  if (!row || !categoryIds) return row;
  const group = await db.InventoryRequestGroup.findOne({ where: { id: row.requestGroupId, categoryId: categoryIds }, attributes: ["id"] });
  return group ? row : null;
};
const order = async (req, res) => {
  const row = await scopedOrder(req.params.id, req.user);
  return row ? res.json(row) : res.status(404).json({ error: "Order not found" });
};
const orderStatus = async (req, res) => {
  const row = await scopedOrder(req.params.id, req.user);
  return row ? res.json(await service.updateOrderStatus(row.id, req.body.status)) : res.status(404).json({ error: "Order not found" });
};
const receiveOrder = async (req, res) => res.json(await service.receiveOrder(req.params.id, req.user));
const allocate = async (req, res) => res.status(201).json(await service.allocate(req.user, req.body));
const myAllocations = async (req, res) => res.json(await db.InventoryAllocation.findAll({ where: { allocatedToEmployeeCode: req.user.employeeCode }, include: [{ model: db.InventoryItem, as: "item", required: false }], order: [["createdAt", "DESC"]] }));
const receiveAllocation = async (req, res) => res.json(await service.receiveAllocation(req.params.id, req.user));
const createReturn = async (req, res) => res.status(201).json(await service.createReturn(req.user, req.body));
const pendingReturns = async (_req, res) => res.json(await db.InventoryReturn.findAll({ where: { status: "PENDING" } }));
const inspectReturn = async (req, res) => res.json(await service.inspectReturn(req.params.id, req.user, req.body));
const settings = async (_req, res) => res.json(await db.InventorySetting.findAll({ order: [["settingKey", "ASC"]] }));
const approverOptions = async (_req, res) => res.json(await User.findAll({ attributes: ["employeeCode", "name", "role", "branchId", "departmentId"], order: [["name", "ASC"], ["employeeCode", "ASC"]] }));
const responsibilities = async (_req, res) => res.json(await db.InventoryResponsibility.findAll({ where: { isActive: true }, order: [["responsibilityType", "ASC"], ["departmentId", "ASC"], ["categoryId", "ASC"]] }));
const findSavedEmployee = async (employeeCode) => {
  const normalizedCode = String(employeeCode || "").trim();
  if (!normalizedCode) return null;
  return User.findOne({ where: { employeeCode: normalizedCode } });
};
const saveResponsibility = async (req, res) => {
  const employee = await findSavedEmployee(req.body.employeeCode);
  if (!employee) return res.status(400).json({ error: "Please select an employee saved in the database" });
  if (["CATEGORY_VP", "INVENTORY_HEAD"].includes(req.body.responsibilityType) && Array.isArray(req.body.categoryIds)) {
    const categoryIds = [...new Set(req.body.categoryIds.map(Number).filter(Number.isInteger))];
    if (!categoryIds.length) return res.status(400).json({ error: "Select at least one inventory category" });
    const categories = await db.InventoryCategory.findAll({ where: { id: categoryIds, isActive: true }, attributes: ["id"] });
    if (categories.length !== categoryIds.length) return res.status(400).json({ error: "One or more selected categories are invalid" });

    const rows = await db.transaction(async (transaction) => {
      if (req.body.replaceEmployeeCategories !== false) {
        await db.InventoryResponsibility.update(
          { isActive: false },
          { where: { responsibilityType: req.body.responsibilityType, employeeCode: employee.employeeCode, isActive: true, categoryId: { [Op.notIn]: categoryIds } }, transaction },
        );
      }
      const saved = [];
      for (const categoryId of categoryIds) {
        let row = await db.InventoryResponsibility.findOne({ where: { responsibilityType: req.body.responsibilityType, categoryId }, transaction });
        if (row) row = await row.update({ employeeCode: employee.employeeCode, departmentId: null, isActive: true }, { transaction });
        else row = await db.InventoryResponsibility.create({ responsibilityType: req.body.responsibilityType, employeeCode: employee.employeeCode, departmentId: null, categoryId, isActive: true }, { transaction });
        saved.push(row);
      }
      return saved;
    });
    return res.json(rows);
  }
  const where = { responsibilityType: req.body.responsibilityType, departmentId: req.body.departmentId || null, categoryId: null };
  let row = await db.InventoryResponsibility.findOne({ where });
  if (row) row = await row.update({ employeeCode: employee.employeeCode, isActive: req.body.isActive !== false });
  else row = await db.InventoryResponsibility.create({ ...where, employeeCode: employee.employeeCode, isActive: req.body.isActive !== false });
  return res.json(row);
};
const deleteResponsibility = async (req, res) => {
  const row = await db.InventoryResponsibility.findByPk(req.params.id);
  if (!row || !row.isActive) return res.status(404).json({ error: "Approval assignment not found" });
  await row.update({ isActive: false });
  return res.json({ message: "Approval assignment deleted" });
};
const branchApprovers = async (_req, res) => res.json(await db.InventoryBranchApprover.findAll({ where: { isActive: true }, order: [["branchId", "ASC"]] }));
const saveBranchApprover = async (req, res) => {
  const branchId = Number(req.body.branchId);
  if (!branchId || !req.body.employeeCode) return res.status(400).json({ error: "Branch and employee code are required" });
  const employee = await findSavedEmployee(req.body.employeeCode);
  if (!employee) return res.status(400).json({ error: "Please select an employee saved in the database" });
  const [row] = await db.InventoryBranchApprover.findOrCreate({
    where: { branchId },
    defaults: { employeeCode: employee.employeeCode, isActive: true },
  });
  if (row.employeeCode !== employee.employeeCode || !row.isActive) await row.update({ employeeCode: employee.employeeCode, isActive: true });
  return res.json(row);
};
const deleteBranchApprover = async (req, res) => {
  const row = await db.InventoryBranchApprover.findByPk(req.params.id);
  if (!row || !row.isActive) return res.status(404).json({ error: "Branch approver assignment not found" });
  await row.update({ isActive: false });
  return res.json({ message: "Branch approver assignment deleted" });
};
const transfers = async (_req, res) => res.json(await db.InventoryTransfer.findAll({ order: [["createdAt", "DESC"]] }));
const createTransfer = async (req, res) => res.status(201).json(await db.InventoryTransfer.create({ ...req.body, transferManifest: `TRF-${Date.now()}`, createdBy: req.user.employeeCode }));
const updateTransfer = async (req, res) => { const row = await db.InventoryTransfer.findByPk(req.params.id); if (!row) return res.status(404).json({ error: "Transfer not found" }); return res.json(await row.update({ ...req.body, ...(req.body.status === "DISPATCHED" ? { dispatchedAt: new Date() } : {}), ...(req.body.status === "DELIVERED" ? { deliveredAt: new Date() } : {}) })); };
const shipments = async (_req, res) => res.json(await db.InventoryShipment.findAll({ order: [["createdAt", "DESC"]] }));
const createShipment = async (req, res) => res.status(201).json(await db.InventoryShipment.create({ ...req.body, shipmentManifest: `SHP-${Date.now()}`, createdBy: req.user.employeeCode }));
const updateShipment = async (req, res) => { const row = await db.InventoryShipment.findByPk(req.params.id); if (!row) return res.status(404).json({ error: "Shipment not found" }); return res.json(await row.update({ ...req.body, ...(req.body.status === "DELIVERED" ? { deliveredAt: new Date() } : {}) })); };

module.exports = { categories, createCategory, updateCategory, items, item, stock, summary, controlOverviewAccess, adminOverview, createRequest, mine, request, cancel, resubmit, pendingApprovals, approve, reject, batchApprove, approvalHistory, groups, group, vendors, createVendor, updateVendor, suggestions, vendorHistory, createOrder, orders, order, orderStatus, receiveOrder, allocate, myAllocations, receiveAllocation, createReturn, pendingReturns, inspectReturn, settings, approverOptions, responsibilities, saveResponsibility, deleteResponsibility, branchApprovers, saveBranchApprover, deleteBranchApprover, transfers, createTransfer, updateTransfer, shipments, createShipment, updateShipment };
