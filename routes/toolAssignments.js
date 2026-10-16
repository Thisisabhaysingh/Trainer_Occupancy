const express = require('express');
const router = express.Router();
const { ToolAssignment, Department, User } = require('../models');
const { auth, checkRole } = require('../middleware/auth');

// Default tool visibility (all enabled by default)
const DEFAULT_VISIBILITY = {
  workbook: true,
  reportCard: true
};

// Default roles
const ROLES = ['employee', 'teamlead', 'manager', 'admin'];

// ==================== Get all tool assignments with department-role info ====================
// Returns: { [departmentId]: { departmentName, employee: {...}, teamlead: {...}, manager: {...}, admin: {...} } }
router.get('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const assignments = await ToolAssignment.findAll({
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }]
    });

    // Get all departments to ensure we have complete list
    const allDepartments = await Department.findAll({
      attributes: ['id', 'name']
    });

    // Build result with all departments and roles
    const result = {};
    allDepartments.forEach(dept => {
      const deptAssignments = assignments.filter(a => a.departmentId === dept.id);
      
      result[dept.id] = {
        departmentId: dept.id,
        departmentName: dept.name
      };

      // Add each role's visibility settings
      ROLES.forEach(role => {
        const assignment = deptAssignments.find(a => a.role === role);
        result[dept.id][role] = {
          workbook: assignment ? assignment.workbook : DEFAULT_VISIBILITY.workbook,
          reportCard: assignment ? assignment.reportCard : DEFAULT_VISIBILITY.reportCard
        };
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching tool assignments:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ==================== Get tool assignments for current user's department and role ====================
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.employeeCode;  // User primary key is employeeCode
    const userRole = req.user.role;

    console.log(`🔍 Fetching tool assignments for user ${userId} with role ${userRole}`);

    // Get user's department
    const user = await User.findByPk(userId, {
      attributes: ['departmentId']
    });

    if (!user || !user.departmentId) {
      console.log(`⚠️ User ${userId} has no department assigned, returning defaults`);
      // No department assigned, return defaults
      return res.json({
        role: userRole,
        workbook: DEFAULT_VISIBILITY.workbook,
        reportCard: DEFAULT_VISIBILITY.reportCard
      });
    }

    const departmentId = user.departmentId;
    console.log(`🔍 Looking for assignment: departmentId=${departmentId}, role=${userRole}`);

    // Get assignment for user's department AND role
    const assignment = await ToolAssignment.findOne({
      where: { departmentId, role: userRole }
    });

    if (!assignment) {
      console.log(`⚠️ No assignment found for dept ${departmentId}, role ${userRole}, returning defaults`);
      // Return defaults if no custom assignment exists
      return res.json({
        departmentId,
        role: userRole,
        ...DEFAULT_VISIBILITY
      });
    }

    console.log(`✅ Found assignment: workbook=${assignment.workbook}, reportCard=${assignment.reportCard}`);

    res.json({
      departmentId,
      role: userRole,
      workbook: assignment.workbook,
      reportCard: assignment.reportCard
    });
  } catch (error) {
    console.error('Error fetching tool assignments for user:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ==================== Save tool assignments (admin only) ====================
// Body format: { [departmentId]: { departmentName, employee: {...}, teamlead: {...}, manager: {...}, admin: {...} }, ... }
router.post('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const assignments = req.body;

    // Validate input - should be an object with department IDs as keys
    if (typeof assignments !== 'object' || Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Invalid input format. Expected object with department IDs as keys' });
    }

    // Get valid department IDs
    const departments = await Department.findAll({ attributes: ['id'] });
    const validDepartmentIds = departments.map(d => d.id.toString());

    const results = [];

    for (const [deptIdStr, deptConfig] of Object.entries(assignments)) {
      const deptId = parseInt(deptIdStr, 10);

      if (isNaN(deptId) || !validDepartmentIds.includes(deptIdStr)) {
        return res.status(400).json({ error: `Invalid department ID: ${deptIdStr}` });
      }

      // Save each role's configuration
      for (const role of ROLES) {
        const roleConfig = deptConfig[role];
        
        if (!roleConfig) {
          return res.status(400).json({ error: `Missing configuration for department ${deptId}, role ${role}` });
        }

        if (typeof roleConfig.workbook !== 'boolean' || typeof roleConfig.reportCard !== 'boolean') {
          return res.status(400).json({ error: `Invalid data type for department ${deptId}, role ${role}. workbook and reportCard must be boolean` });
        }

        // Update or create assignment for this department-role
        const [assignment, created] = await ToolAssignment.findOrCreate({
          where: { departmentId: deptId, role: role },
          defaults: {
            departmentId: deptId,
            role: role,
            workbook: roleConfig.workbook,
            reportCard: roleConfig.reportCard
          }
        });

        if (!created) {
          await assignment.update({
            workbook: roleConfig.workbook,
            reportCard: roleConfig.reportCard
          });
        }

        results.push(assignment);
      }
    }

    res.json({
      message: 'Tool assignments saved successfully',
      assignments: results
    });
  } catch (error) {
    console.error('Error saving tool assignments:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ==================== Reset to defaults for all department-role combinations (admin only) ====================
router.post('/reset', auth, checkRole(['admin']), async (req, res) => {
  try {
    // Get all departments
    const departments = await Department.findAll({ attributes: ['id', 'name'] });

    const result = {};

    await Promise.all(
      departments.map(async (dept) => {
        result[dept.id] = {
          departmentId: dept.id,
          departmentName: dept.name
        };

        // Reset each role for this department
        await Promise.all(
          ROLES.map(async (role) => {
            const [assignment, created] = await ToolAssignment.findOrCreate({
              where: { departmentId: dept.id, role: role },
              defaults: {
                departmentId: dept.id,
                role: role,
                workbook: true,
                reportCard: true
              }
            });

            if (!created) {
              await assignment.update({
                workbook: true,
                reportCard: true
              });
            }

            result[dept.id][role] = { ...DEFAULT_VISIBILITY };
          })
        );
      })
    );

    res.json({
      message: 'Tool assignments reset to defaults for all departments and roles',
      assignments: result
    });
  } catch (error) {
    console.error('Error resetting tool assignments:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
