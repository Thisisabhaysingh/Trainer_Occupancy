const express = require("express");
const router = express.Router();
const { Task, User, Job, Project } = require("../../models");
const { auth, checkRole } = require("../../middleware/auth");

router.get("/assigned", auth, checkRole(["admin", "manager", "employee"]), async (req, res) => {
  try {
    const employeeCode = req.user.role === "employee" ? req.user.employeeCode : req.query.employeeCode;
    if (!employeeCode) {
      return res.status(400).json({ error: "Employee code is required" });
    }

    const tasks = await Task.findAll({
      where: { assigneeId: employeeCode },
      include: [
        {
          model: Job,
          as: "job",
          attributes: ["id", "title", "projectId"],
          include: [
            { model: Project, as: "project", attributes: ["id", "title", "status"] }
          ]
        },
        { model: User, as: "assignee", attributes: ["employeeCode", "name"] }
      ],
      order: [["deadline", "ASC"], ["createdAt", "DESC"]]
    });

    const jobs = await Job.findAll({
      where: { ownerId: employeeCode },
      include: [
        { model: Project, as: "project", attributes: ["id", "title", "status"] }
      ],
      order: [["updatedAt", "DESC"]]
    });

    const projects = await Project.findAll({
      where: { ownerId: employeeCode },
      include: [
        { model: User, as: "owner", attributes: ["employeeCode", "name"] }
      ],
      order: [["updatedAt", "DESC"]]
    });

    res.json({ tasks, jobs, projects });
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", auth, checkRole(["admin", "manager", "employee"]), async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User, as: "assignee", attributes: ["employeeCode", "name"] },
        { model: Job, as: "job", attributes: ["id", "title", "projectId"] }
      ]
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (req.user.role === "employee" && task.assigneeId !== req.user.employeeCode) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", auth, checkRole(["admin", "manager", "employee"]), async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (req.user.role === "employee" && task.assigneeId !== req.user.employeeCode) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updateData = {};
    const editableFields = ["title", "description", "assigneeId", "priority", "deadline", "status", "submissionNotes"];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    updateData.updatedById = req.user.employeeCode;
    if (updateData.status === "completed") {
      updateData.completedAt = new Date();
    }

    await task.update(updateData);
    res.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", auth, checkRole(["admin", "manager"]), async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    await task.destroy();
    res.json({ message: "Task deleted" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
