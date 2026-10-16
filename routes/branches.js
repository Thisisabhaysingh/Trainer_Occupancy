// routes/branches.js
const express = require("express");
const router = express.Router();
const { Branch, Department, User, Activity } = require("../models");
const { auth, checkRole } = require("../middleware/auth");

// ==================== Get all branches ====================
router.get("/", auth, async (req, res) => {
  try {
    const branches = await Branch.findAll({
      include: [
        { model: User, as: "manager", attributes: ["employeeCode", "name", "email"] },
        { model: User, as: "branchUsers", attributes: ["employeeCode", "name", "email"] },
      ],
    });

    res.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== Create new branch (admin only) ====================
router.post("/", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { name, location, managerId } = req.body;

    // Check if branch already exists
    const branchExists = await Branch.findOne({ where: { name } });
    if (branchExists) {
      return res.status(400).json({ error: "Branch already exists" });
    }

    const newBranch = await Branch.create({ name, location, managerId });
    res.status(201).json(newBranch);
  } catch (error) {
    console.error("Error creating branch:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== Get branch statistics ====================
router.get("/stats", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const branches = await Branch.findAll({
      include: [
        {
          model: User,
          as: "branchUsers",
          include: [{ model: Activity, as: "activities", attributes: ["id", "status", "timeEntries"] }],
        },
      ],
    });

    const stats = branches.map((branch) => {
      const totalEmployees = branch.branchUsers.length;
      const totalActivities = branch.branchUsers.reduce(
        (total, employee) => total + employee.activities.length,
        0
      );
      const completedActivities = branch.branchUsers.reduce(
        (total, employee) =>
          total +
          employee.activities.filter((activity) => activity.status === "completed")
            .length,
        0
      );

      const completionRate = totalActivities
        ? Math.round((completedActivities / totalActivities) * 100)
        : 0;

      return {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        totalEmployees,
        totalActivities,
        completionRate,
      };
    });

    res.json(stats);
  } catch (error) {
    console.error("Error fetching branch stats:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== Get all departments ====================
router.get("/departments", auth, async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================== Create a new department (admin only) ====================
router.post("/departments", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { name, description } = req.body;

    const department = await Department.create({ name, description });
    res.status(201).json(department);
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;