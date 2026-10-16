// routes/departments.js
const express = require('express');
const router = express.Router();
const { Department, User, Activity } = require('../models');
const { auth, checkRole } = require('../middleware/auth');
const { Op } = require('sequelize');

// ==================== Get all departments ====================
router.get('/', auth, async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Create a new department (admin only) ====================
router.post('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { name, code, description, location, color } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }

    const existing = await Department.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Department already exists' });
    }

    const department = await Department.create({ name, code, description, location, color });
    res.status(201).json(department);
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Department details with analytics ====================
router.get('/:departmentId/details', auth, async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Get department
    const department = await Department.findByPk(departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });

    // Get employees in this department
    const employees = await User.findAll({
      where: { departmentId, role: 'employee' }
    });

    // Get activities in this department with assigned employee
    const activities = await Activity.findAll({
      where: { departmentId },
      include: [{ model: User, as: 'assignedTo', attributes: ['employeeCode', 'name', 'email'] }]
    });

    // Department summary
    const totalEmployees = employees.length;
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.status === 'completed').length;

    const totalMinutes = activities.reduce(
      (sum, a) => sum + (a.timeEntries?.reduce((s, te) => s + te.duration, 0) || 0),
      0
    );
    const totalHours = totalMinutes / 60;
    const avgHours = totalEmployees ? (totalHours / totalEmployees).toFixed(1) : 'N/A';
    const completionRate = totalActivities ? Math.round((completedActivities / totalActivities) * 100) : 0;

    // Top activity by unique employees
    const activityEmployeeMap = {};
    activities.forEach(a => {
      if (!a.title) return;
      if (!activityEmployeeMap[a.title]) activityEmployeeMap[a.title] = new Set();
      if (a.assignedTo?.employeeCode) activityEmployeeMap[a.title].add(a.assignedTo.employeeCode);
    });

    let topActivity = 'N/A';
    let maxCount = 0;
    Object.entries(activityEmployeeMap).forEach(([title, empSet]) => {
      if (empSet.size > maxCount) {
        maxCount = empSet.size;
        topActivity = title;
      }
    });

    // Employee analytics
    const employeeAnalytics = employees.map(emp => {
      const empActs = activities.filter(a => a.assignedTo && a.assignedTo.employeeCode === emp.employeeCode);
      const empTotalMinutes = empActs.reduce(
        (sum, a) => sum + (a.timeEntries?.reduce((s, te) => s + te.duration, 0) || 0),
        0
      );

      return {
        employeeCode: emp.employeeCode,
        name: emp.name,
        email: emp.email,
        totalHours: (empTotalMinutes / 60).toFixed(1),
        activities: empActs.map(act => ({
          title: act.title,
          description: act.description,
          totalMinutes: act.timeEntries?.reduce((sum, te) => sum + te.duration, 0) || 0,
          timeEntries: act.timeEntries,
          status: act.status,
          comment: act.comment
        }))
      };
    });

    res.json({
      department: {
        name: department.name,
        code: department.code,
        description: department.description,
        color: department.color,
        location: department.location,
        totalEmployees,
        totalActivities,
        completedActivities,
        totalHours: Number(totalHours.toFixed(1)),
        avgHours,
        completionRate,
        topActivity
      },
      employees: employeeAnalytics
    });

  } catch (error) {
    console.error("Error fetching department details:", error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ==================== Update department (admin only) ====================
router.put('/:departmentId', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name, code, description, location, color } = req.body;

    const department = await Department.findByPk(departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });

    // Check for name conflicts if changing name
    if (name && name !== department.name) {
      const existing = await Department.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ error: 'Department name already exists' });
      }
    }

    // Update fields
    if (name) department.name = name;
    if (code !== undefined) department.code = code;
    if (description !== undefined) department.description = description;
    if (location) department.location = location;
    if (color) department.color = color;

    await department.save();
    res.json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Delete department ====================
router.delete('/:departmentId', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await Department.findByPk(departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });

    // Check if there are employees in this department
    const employeeCount = await User.count({ where: { departmentId } });
    if (employeeCount > 0) {
      return res.status(400).json({ error: `Cannot delete department. ${employeeCount} employee(s) are assigned to this department.` });
    }

    // Delete associated activities
    await Activity.destroy({ where: { departmentId } });

    // Delete the department
    await department.destroy();

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
