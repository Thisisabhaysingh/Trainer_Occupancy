const express = require("express");
const router = express.Router();
const { Job, Task, User, Project } = require("../../models");
const { auth, checkRole } = require("../../middleware/auth");

router.get("/:id", auth, checkRole(["admin", "manager"]), async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        { model: Project, as: "project", attributes: ["id", "title"] },
        { model: User, as: "owner", attributes: ["employeeCode", "name"] },
        { model: Task, as: "tasks", include: [{ model: User, as: "assignee", attributes: ["employeeCode", "name"] }] }
      ]
    });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id/tasks", auth, checkRole(["admin", "manager"]), async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { jobId: req.params.id },
      include: [{ model: User, as: "assignee", attributes: ["employeeCode", "name"] }],
      order: [["createdAt", "DESC"]]
    });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks for job:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/tasks", auth, checkRole(["admin", "manager"]), async (req, res) => {
  try {
    const { title, description, assigneeId, priority, deadline, status, submissionNotes, estimatedHours, actualHours, dependencies } = req.body;
    if (!title) return res.status(400).json({ error: "Task title is required" });

    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const task = await Task.create({
      jobId: job.id,
      title,
      description,
      assigneeId: assigneeId || null,
      priority: priority || "medium",
      deadline: deadline || null,
      status: status || "todo",
      submissionNotes: submissionNotes || null,
      estimatedHours: estimatedHours || null,
      actualHours: actualHours || null,
      dependencies: Array.isArray(dependencies) ? dependencies : [],
      createdById: req.user.employeeCode,
      updatedById: req.user.employeeCode,
    });

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", auth, checkRole(["admin", "manager"]), async (req, res) => {
  try {
    const { title, description, status, startDate, endDate, ownerId, priority, assignedToIds, estimatedHours, actualHours } = req.body;
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    await job.update({
      title: title || job.title,
      description: description || job.description,
      status: status || job.status,
      startDate: startDate || job.startDate,
      endDate: endDate || job.endDate,
      ownerId: ownerId || job.ownerId,
      priority: priority || job.priority,
      assignedToIds: Array.isArray(assignedToIds) ? assignedToIds : job.assignedToIds,
      estimatedHours: estimatedHours || job.estimatedHours,
      actualHours: actualHours || job.actualHours,
      updatedById: req.user.employeeCode,
    });

    res.json(job);
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", auth, checkRole(["admin", "manager"]), async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    await job.destroy();
    res.json({ message: "Job deleted" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
