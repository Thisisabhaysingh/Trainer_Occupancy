const crypto = require("crypto");
const express = require("express");
const { User, Branch, Department, SchoolCatalog } = require("../../models");
const asyncHandler = require("../../middleware/asyncHandler");

const router = express.Router();

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const requireSyncKey = (req, res, next) => {
  const configuredKey = String(process.env.REPORTCARD_SYNC_API_KEY || process.env.REPORTCARD_SSO_CLIENT_SECRET || "");
  const suppliedKey = String(req.get("x-reportcard-sync-key") || "");
  if (!configuredKey) return res.status(503).json({ error: "Report Card data sync is not configured" });
  if (!safeEqual(configuredKey, suppliedKey)) return res.status(401).json({ error: "Invalid sync credentials" });
  next();
};

router.get("/snapshot", requireSyncKey, asyncHandler(async (_req, res) => {
  const [branches, schools, users] = await Promise.all([
    Branch.findAll({ attributes: ["id", "name", "location", "updatedAt"], order: [["id", "ASC"]], raw: true }),
    SchoolCatalog.findAll({ attributes: ["id", "name", "updatedAt"], order: [["id", "ASC"]], raw: true }),
    User.findAll({
      where: { role: ["admin", "manager", "teamlead", "employee"] },
      attributes: ["employeeCode", "name", "email", "role", "branchId", "departmentId", "updatedAt"],
      include: [
        { model: Branch, as: "branch", attributes: ["name"], required: false },
        { model: Department, as: "department", attributes: ["name"], required: false },
      ],
      order: [["employeeCode", "ASC"]],
    }),
  ]);

  res.json({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "mis",
    branches,
    schools,
    users: users.map((user) => ({
      employeeCode: user.employeeCode,
      name: user.name,
      email: user.email,
      role: user.role,
      reportcardRole: user.role === "teamlead" || user.role === "employee" ? "trainer" : user.role,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null,
      updatedAt: user.updatedAt,
    })),
  });
}));

module.exports = router;
