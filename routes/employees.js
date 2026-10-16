// routes/employee.js
const express = require('express');
const router = express.Router();
const { User, Department, Branch, Employee, Activity, Workday } = require('../models');
const { auth, checkRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sendWelcomeEmail, sendProfileUpdateEmail } = require('../services/emailService');

const DEFAULT_NEW_USER_PASSWORD = 'password123';

// Helper function to ensure timeEntries is always an array
const getTimeEntries = (activity) => {
  if (!activity.timeEntries) return [];
  if (Array.isArray(activity.timeEntries)) return activity.timeEntries;
  if (typeof activity.timeEntries === 'string') {
    try {
      return JSON.parse(activity.timeEntries);
    } catch (e) {
      return [];
    }
  }
  return [];
};

// ==================== Get users list ====================
router.get('/', auth, checkRole(['manager', 'admin','employee']), async (req, res) => {
  const startTime = Date.now();
  try {
    let whereClause = {};
    
    if (req.user.role === 'admin') {
      // Admin sees all employees, teamleads, and managers
      whereClause = { role: { [Op.in]: ['employee', 'teamlead', 'manager'] } };
    } else if (req.user.role === 'manager') {
      // Manager filtering based on managerType
      if (req.user.managerType === 'branch') {
        // Branch manager sees all employees in their branch, regardless of department
        whereClause = {
          role: { [Op.in]: ['employee', 'teamlead'] },
          branchId: req.user.branchId
        };
      } else {
        // Department manager sees only employees in their department
        whereClause = {
          role: { [Op.in]: ['employee', 'teamlead'] },
          departmentId: req.user.departmentId
        };
      }
    } else {
      // Employee role - only see employees
      whereClause = { role: 'employee' };
    }

    const employees = await User.findAll({
      where: whereClause,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'location'], required: false },
        { model: Branch, as: 'branch', attributes: ['id', 'name'], required: false }
      ],
      attributes: { exclude: ['password'] }
    });

    // Get all employee codes for batch activity query
    const employeeCodes = employees.map(emp => emp.employeeCode);
    
    // Batch fetch all activities for these employees in ONE query
    const allActivities = await Activity.findAll({
      where: { assignedToId: { [Op.in]: employeeCodes } },
      attributes: ['assignedToId', 'timeEntries']
    });
    
    // Aggregate hours per employee in memory
    const hoursByEmployee = {};
    employeeCodes.forEach(code => hoursByEmployee[code] = 0);
    
    allActivities.forEach(activity => {
      const entries = getTimeEntries(activity);
      const durationSum = entries.reduce((s, te) => s + (te.duration || 0), 0);
      hoursByEmployee[activity.assignedToId] = (hoursByEmployee[activity.assignedToId] || 0) + durationSum;
    });
    
    // Map to response format
    const employeesWithHours = employees.map(emp => ({
      ...emp.toJSON(),
      totalHours: ((hoursByEmployee[emp.employeeCode] || 0) / 60).toFixed(1)
    }));

    res.json(employeesWithHours);
    console.log(`⏱️  /api/employees: ${Date.now() - startTime}ms - ${employeesWithHours.length} employees, ${allActivities.length} activities`);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Create new employee, teamlead, or manager ====================
router.post('/', auth, checkRole(['manager', 'admin', 'teamlead']), async (req, res) => {
  try {
    const { employeeCode, name, email, password, departmentId, branchId, role, managerType, teamLeadId } = req.body;

    if (!['employee', 'manager', 'teamlead'].includes(role)) {
      return res.status(400).json({ error: 'Role must be employee, teamlead, or manager' });
    }

    if (teamLeadId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can assign employees to a team lead' });
    }

    if (teamLeadId && role !== 'employee') {
      return res.status(400).json({ error: 'Only employees may be assigned to a team lead' });
    }
    if (!employeeCode) return res.status(400).json({ error: 'Employee code is required' });
    if (!departmentId) return res.status(400).json({ error: 'Department is required' });
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    // Validate managerType for manager role
    if (role === 'manager') {
      if (!managerType || !['branch', 'department'].includes(managerType)) {
        return res.status(400).json({ error: 'Manager type must be either "branch" or "department"' });
      }
      if (managerType === 'branch' && !branchId) {
        return res.status(400).json({ error: 'Branch manager must have a branch assigned' });
      }
    }

    // Check if manager has permission to create this user
    if (req.user.role === 'manager') {
      if (req.user.managerType === 'branch') {
        // Branch manager can only create employees in their branch
        if (branchId !== req.user.branchId) {
          return res.status(403).json({ error: 'You can only create employees in your branch' });
        }
      } else {
        // Department manager can only create employees in their department
        if (departmentId !== req.user.departmentId) {
          return res.status(403).json({ error: 'You can only create employees in your department' });
        }
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const existingCode = await User.findByPk(employeeCode);
    if (existingCode) return res.status(400).json({ error: 'Employee code already exists' });

    const initialPassword = DEFAULT_NEW_USER_PASSWORD;
    const userData = { employeeCode, name, email: normalizedEmail, password: initialPassword, role, departmentId };
    if (branchId) {
      userData.branchId = branchId;
    }
    if (role === 'manager' && managerType) {
      userData.managerType = managerType;
    }
    if (teamLeadId) {
      const leadUser = await User.findOne({ where: { employeeCode: teamLeadId, role: 'teamlead' } });
      if (!leadUser) {
        return res.status(400).json({ error: 'Invalid team lead assignment' });
      }
      if (String(leadUser.departmentId) !== String(departmentId)) {
        return res.status(400).json({ error: 'Team lead must belong to the same department as the assigned employee' });
      }
      userData.teamLeadId = teamLeadId;
    }

    const user = await User.create(userData);

    try {
      const [department, branch] = await Promise.all([
        departmentId ? Department.findByPk(departmentId) : null,
        branchId ? Branch.findByPk(branchId) : null,
      ]);
      await sendWelcomeEmail({
        user,
        department,
        branch,
        defaultPassword: initialPassword,
      });
    } catch (mailError) {
      console.error('Welcome email failed:', mailError);
    }

    const createdUser = await User.findByPk(user.employeeCode, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'location'], required: false },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'location'], required: false }
      ],
      attributes: { exclude: ['password'] }
    });

    res.status(201).json(createdUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Get employee performance ====================
router.get('/performance', auth, checkRole(['manager', 'admin']), async (req, res) => {
  try {
    const employees = await User.findAll({
      where: { role: 'employee' },
      include: [{ model: Activity, as: 'activities', attributes: ['status', 'timeEntries'] }]
    });

    const performance = employees.map(emp => {
      const completedActivities = emp.activities.filter(a => a.status === 'completed').length;
      const totalHours = emp.activities.reduce(
        (sum, a) => {
          const entries = getTimeEntries(a);
          return sum + entries.reduce((s, te) => s + (te.duration || 0), 0);
        },
        0
      ) / 60;

      return {
        employeeCode: emp.employeeCode,
        name: emp.name,
        completedActivities,
        totalHours
      };
    });

    res.json(performance);
  } catch (error) {
    console.error("Error fetching performance:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Employee analytics ====================
router.get('/analytics', auth, checkRole(['employee']), async (req, res) => {
  try {
    const employee = await User.findByPk(req.user.employeeCode, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }]
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const activities = await Activity.findAll({ where: { assignedToId: req.user.employeeCode } });
    const activityStats = activities.map(act => ({
      title: act.title,
      description: act.description,
      totalMinutes: getTimeEntries(act).reduce((sum, te) => sum + (te.duration || 0), 0),
      timeEntries: act.timeEntries,
      status: act.status,
      comment: act.comment
    }));

    // Calculate today's hours separately
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayActivities = activities.filter(activity => {
      const entries = getTimeEntries(activity);
      return entries.some(te => {
        const entryDate = new Date(te.date);
        return entryDate >= today && entryDate < tomorrow;
      });
    });

    const totalMinutes = activityStats.reduce((sum, a) => sum + a.totalMinutes, 0);
    const totalHours = totalMinutes / 60;
    
    // Calculate today's work hours
    const todayMinutes = todayActivities.reduce((sum, activity) => {
      const entries = getTimeEntries(activity);
      return sum + entries
        .filter(te => {
          const entryDate = new Date(te.date);
          return entryDate >= today && entryDate < tomorrow;
        })
        .reduce((s, te) => s + (te.duration || 0), 0);
    }, 0);
    const todayHours = todayMinutes / 60;

    // Workday history
    const workdays = await Workday.findAll({ where: { userId: req.user.employeeCode }, order: [['date', 'DESC']] });

    // Department members count
    const departmentMembers = await User.count({ where: { departmentId: employee.departmentId, role: 'employee' } });

    res.json({
      employee: {
        name: employee.name,
        email: employee.email,
        department: employee.department
      },
      totalHours: Number(totalHours.toFixed(2)),
      todayHours: Number(todayHours.toFixed(2)),
      activities: activityStats,
      workdays,
      departmentMembers
    });

  } catch (error) {
    console.error("Error fetching employee analytics:", error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ==================== Update employee details ====================
router.put('/:employeeId', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { name, email, departmentId, branchId, role, managerType, teamLeadId } = req.body;

    console.log(`Employee update request:`, {
      employeeId,
      updateData: { name, email, departmentId, branchId, role, managerType },
      user: req.user.employeeCode
    });

    // Check if manager has permission to edit this employee
    if (req.user.role === 'manager') {
      const employeeToEdit = await User.findByPk(employeeId);
      if (!employeeToEdit) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      if (req.user.managerType === 'branch') {
        // Branch manager can only edit employees in their branch
        if (employeeToEdit.branchId !== req.user.branchId) {
          return res.status(403).json({ error: 'You can only edit employees in your branch' });
        }
      } else {
        // Department manager can only edit employees in their department
        if (employeeToEdit.departmentId !== req.user.departmentId) {
          return res.status(403).json({ error: 'You can only edit employees in your department' });
        }
      }
    }

    // Validate required fields
    if (!name || !email || !departmentId) {
      return res.status(400).json({
        error: 'Name, email, and department are required',
        details: 'Missing required fields in request body'
      });
    }

    const employee = await User.findByPk(employeeId);
    if (!employee) {
      console.log(`Employee not found: ${employeeId}`);
      return res.status(404).json({ error: 'Employee not found' });
    }

    console.log(`Found employee: ${employee.employeeCode} (${employee.name})`);

    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const emailChanged = normalizedEmail && normalizedEmail !== String(employee.email || '').trim().toLowerCase();
    const departmentChanged = departmentId !== undefined && String(departmentId) !== String(employee.departmentId || '');
    const branchChanged = branchId !== undefined && String(branchId || '') !== String(employee.branchId || '');
    const roleChanged = role && role !== employee.role;
    const updateEmailChanges = [];
    if (emailChanged) updateEmailChanges.push('Email');
    if (departmentChanged) updateEmailChanges.push('Department');
    if (branchChanged) updateEmailChanges.push('Branch');
    if (roleChanged) updateEmailChanges.push('Role');
    const shouldSendProfileUpdateEmail = updateEmailChanges.length > 0;

    // Check if email is being changed and if it already exists
    if (emailChanged) {
      const existingUser = await User.findOne({ where: { email: normalizedEmail } });
      if (existingUser) {
        console.log(`Email already exists: ${normalizedEmail}`);
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const requestedRole = role || employee.role;
    const effectiveDepartmentId = departmentId || employee.departmentId;

    if (teamLeadId !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can assign employees to a team lead' });
      }

      // Allow clearing assignment when teamLeadId is explicitly null or empty
      if (teamLeadId === null || teamLeadId === '') {
        // no further validation required; assignment will be cleared below
      } else {
        if (requestedRole !== 'employee') {
          return res.status(400).json({ error: 'Only employee records may be assigned a team lead' });
        }

        const leadUser = await User.findOne({ where: { employeeCode: teamLeadId, role: 'teamlead' } });
        if (!leadUser) {
          return res.status(400).json({ error: 'Invalid team lead assignment' });
        }
        if (String(leadUser.departmentId) !== String(effectiveDepartmentId)) {
          return res.status(400).json({ error: 'Team lead must belong to the same department as the assigned employee' });
        }
      }
    }

    // Validate department and branch relationship for team leads
    if (role === 'teamlead') {
      if (!branchId) {
        console.log(`Team lead requires branchId`);
        return res.status(400).json({
          error: 'Team lead must be assigned to a branch',
          details: 'branchId is required when role is teamlead'
        });
      }

      // Verify department belongs to branch
      try {
        const department = await Department.findByPk(departmentId);
        if (!department) {
          console.log(`Invalid department: ${departmentId}`);
          return res.status(400).json({ error: 'Invalid department' });
        }

        // If department doesn't have a branch or has a different branch, update it
        if (!department.branchId || department.branchId !== parseInt(branchId)) {
          console.log(`Updating department ${departmentId} branch from ${department.branchId} to ${branchId}`);
          department.branchId = parseInt(branchId);
          await department.save();
        }

        console.log(`Department ${department.name} (ID: ${departmentId}) is now assigned to branch ${branchId}`);
      } catch (deptError) {
        console.error('Error validating/updating department:', deptError);
        return res.status(500).json({
          error: 'Error validating department',
          details: deptError.message
        });
      }
    }

    // Validate branch exists if provided
    if (branchId) {
      const branch = await Branch.findByPk(branchId);
      if (!branch) {
        console.log(`Invalid branch: ${branchId}`);
        return res.status(400).json({ error: 'Invalid branch' });
      }
    }

    // Validate managerType for manager role
    if (role === 'manager') {
      if (managerType && !['branch', 'department'].includes(managerType)) {
        return res.status(400).json({ error: 'Manager type must be either "branch" or "department"' });
      }
      if (managerType === 'branch' && !branchId) {
        return res.status(400).json({ error: 'Branch manager must have a branch assigned' });
      }
    }

    // Update fields
    if (name) employee.name = name;
    if (normalizedEmail) employee.email = normalizedEmail;
    if (departmentId) employee.departmentId = departmentId;
    if (branchId) employee.branchId = branchId;
    if (role && ['employee', 'teamlead', 'manager'].includes(role)) employee.role = role;
    if (role === 'manager' && managerType) employee.managerType = managerType;
    if (teamLeadId !== undefined) {
      employee.teamLeadId = teamLeadId || null;
    }
    if (requestedRole !== 'employee') {
      employee.teamLeadId = null;
    }
    await employee.save();
    console.log(`Employee updated successfully: ${employee.employeeCode}`);

    const updatedEmployee = await User.findByPk(employeeId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'location'], required: false },
        { model: Branch, as: 'branch', attributes: ['id', 'name'], required: false }
      ],
      attributes: { exclude: ['password'] }
    });

    if (shouldSendProfileUpdateEmail) {
      try {
        const [department, branch] = await Promise.all([
          updatedEmployee.departmentId ? Department.findByPk(updatedEmployee.departmentId) : null,
          updatedEmployee.branchId ? Branch.findByPk(updatedEmployee.branchId) : null,
        ]);
        await sendProfileUpdateEmail({
          user: updatedEmployee,
          department,
          branch,
          changes: updateEmailChanges,
        });
      } catch (mailError) {
        console.error('Profile update email failed after employee profile update:', mailError);
      }
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({
      error: 'Server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== Update employee password ====================
router.put('/:employeeId/password', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ error: 'Password is required' });

    const employee = await User.findByPk(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    employee.password = password;
    await employee.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== Delete employee ====================
router.delete('/:employeeId', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await User.findByPk(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Delete associated activities
    await Activity.destroy({ where: { assignedToId: employeeId } });
    
    // Delete associated workdays
    await Workday.destroy({ where: { userId: employeeId } });

    // Delete the employee
    await employee.destroy();

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
