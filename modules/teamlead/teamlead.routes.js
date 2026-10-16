const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../../middleware/auth");
const { User, Activity, Department, Branch, Workday } = require("../../models");
const { Op } = require("sequelize");

// Helper function to extract time entries from activity
const getTimeEntries = (activity) => {
  if (!activity) {
    console.log('No activity provided to getTimeEntries');
    return [];
  }

  const buildProjectTimeEntryFallback = () => {
    if (!activity?.project_id || !['task', 'subtask'].includes(activity?.hierarchy_level)) {
      return [];
    }

    const actualHours = Number(activity.actual_hours_new ?? activity.timeSpent);
    if (!Number.isFinite(actualHours) || actualHours <= 0) return [];

    const baseDate = new Date(activity.updatedAt || activity.createdAt || new Date());
    if (!Number.isFinite(baseDate.getTime())) return [];

    const buildDateFromTime = (timeString) => {
      if (typeof timeString !== 'string') return null;
      const parts = timeString.split(':').map(part => Number.parseInt(part, 10));
      if (parts.length < 2 || parts.some(Number.isNaN)) return null;
      const [hours, minutes, seconds = 0] = parts;
      const date = new Date(baseDate);
      date.setHours(hours, minutes, seconds || 0, 0);
      return Number.isFinite(date.getTime()) ? date : null;
    };

    const punchIn = buildDateFromTime(activity.startTime);
    const punchOut = buildDateFromTime(activity.endTime);
    const entryDate = punchIn || baseDate;

    return [{
      date: entryDate.toISOString(),
      punchIn: punchIn ? punchIn.toISOString() : entryDate.toISOString(),
      punchOut: punchOut ? punchOut.toISOString() : entryDate.toISOString(),
      duration: Math.round(actualHours * 60),
      description: activity.comment || activity.description || activity.title,
      source: 'project_time_log_fallback'
    }];
  };
  
  // If timeEntries is already an array, return it
  if (activity.timeEntries && Array.isArray(activity.timeEntries)) {
    return activity.timeEntries.length > 0 ? activity.timeEntries : buildProjectTimeEntryFallback();
  }
  
  // If timeEntries is a JSON string, parse it
  if (activity.timeEntries && typeof activity.timeEntries === 'string') {
    try {
      const parsed = JSON.parse(activity.timeEntries);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : buildProjectTimeEntryFallback();
    } catch (e) {
      console.error('Error parsing timeEntries JSON:', e);
      return buildProjectTimeEntryFallback();
    }
  }
  
  // If no timeEntries found, return empty array
  console.log('No timeEntries found in activity:', {
    activityId: activity.id,
    hasTimeEntries: !!activity.timeEntries,
    timeEntriesType: typeof activity.timeEntries
  });
  return buildProjectTimeEntryFallback();
};

const getEntryDateKey = (entry) => {
  if (!entry?.date) return null;
  const date = new Date(entry.date);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const getActivityMinutes = (activities, dateStart = null, dateEnd = null) => {
  return activities.reduce((sum, activity) => {
    const entries = getTimeEntries(activity);
    return sum + entries.reduce((entrySum, entry) => {
      if (entry?.duration == null) return entrySum;
      if (dateStart || dateEnd) {
        const entryDate = new Date(entry.date);
        if (Number.isNaN(entryDate.getTime())) return entrySum;
        if (dateStart && entryDate < dateStart) return entrySum;
        if (dateEnd && entryDate >= dateEnd) return entrySum;
      }
      return entrySum + Number(entry.duration || 0);
    }, 0);
  }, 0);
};

const getWorkedDayKeys = (activities) => {
  const keys = new Set();
  activities.forEach(activity => {
    getTimeEntries(activity).forEach(entry => {
      if (entry?.duration == null || Number(entry.duration) <= 0) return;
      const dateKey = getEntryDateKey(entry);
      if (dateKey) keys.add(`${activity.assignedToId}-${dateKey}`);
    });
  });
  return keys;
};

const toDateOnlyString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value, fallback = new Date()) => {
  if (!value) {
    const date = new Date(fallback);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const parts = String(value).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDateKeysInRange = (start, end) => {
  const keys = [];
  const cursor = new Date(start);
  while (cursor <= end && keys.length < 370) {
    keys.push(toDateOnlyString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

const hasActivityOnDate = (activity, dateKey) => {
  const entries = getTimeEntries(activity);
  if (entries.length > 0) {
    return entries.some(entry => getEntryDateKey(entry) === dateKey);
  }

  const fallbackDate = activity.createdAt || activity.updatedAt;
  if (!fallbackDate) return false;
  const date = new Date(fallbackDate);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateKey;
};

// Get analytics focused on the team lead's assigned employees within the department
router.get('/analytics', auth, checkRole(['teamlead']), async (req, res) => {
  try {
    if (!req.user.departmentId) {
      return res.status(403).json({ error: 'Team lead must be assigned to a department' });
    }

    const today = parseDateOnly();
    const rangeStart = parseDateOnly(req.query.startDate, today);
    const rangeEnd = parseDateOnly(req.query.endDate || req.query.startDate, rangeStart || today);

    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    if (rangeEnd < rangeStart) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const rangeEndExclusive = addDays(rangeEnd, 1);
    const rangeDateKeys = getDateKeysInRange(rangeStart, rangeEnd);
    const rangeStartKey = toDateOnlyString(rangeStart);
    const rangeEndKey = toDateOnlyString(rangeEnd);
    const todayKey = toDateOnlyString(today);

    const teamLeadDept = await Department.findByPk(req.user.departmentId);
    if (!teamLeadDept) return res.status(404).json({ error: 'Department not found' });

    const teamLeadBranch = req.user.branchId ? await Branch.findByPk(req.user.branchId) : null;
    const branchDepartments = req.user.branchId
      ? await Department.findAll({ where: { branchId: req.user.branchId } })
      : [];

    const departmentEmployees = await User.findAll({
      where: {
        role: 'employee',
        departmentId: req.user.departmentId,
        teamLeadId: req.user.employeeCode
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'location'] }
      ]
    });

    const teamEmployees = departmentEmployees;
    const teamEmployeeCodes = teamEmployees.map(e => e.employeeCode);

    // Get all activities only for employees explicitly assigned to this team lead.
    const teamActivities = teamEmployeeCodes.length > 0 ? await Activity.findAll({
      where: { assignedToId: { [Op.in]: departmentEmployees.map(e => e.employeeCode) } },
      include: [{ model: User, as: 'assignedTo', attributes: ['employeeCode','name','email'] }]
    }) : [];

    const rangeActivities = teamActivities.filter(activity =>
      getTimeEntries(activity).some(entry => {
        const entryDate = new Date(entry?.date);
        return !Number.isNaN(entryDate.getTime()) && entryDate >= rangeStart && entryDate < rangeEndExclusive;
      })
    );

    const workdayRecords = teamEmployeeCodes.length > 0 ? await Workday.findAll({
      where: {
        userId: { [Op.in]: teamEmployeeCodes },
        date: { [Op.between]: [rangeStartKey, rangeEndKey] }
      },
      attributes: ['userId', 'date', 'attendanceType', 'standardHours'],
      raw: true
    }) : [];

    const workdayHoursByKey = new Map(
      workdayRecords.map(record => {
        const hours = Number(record.standardHours);
        return [`${record.userId}-${record.date}`, Number.isFinite(hours) ? hours : 9];
      })
    );

    const getExpectedHoursForEmployeeDate = (employeeCode, dateKey) => {
      const recordedHours = workdayHoursByKey.get(`${employeeCode}-${dateKey}`);
      if (recordedHours !== undefined) return Math.max(0, recordedHours);

      const date = parseDateOnly(dateKey);
      if (!date || dateKey > todayKey) return 0;
      if (date.getDay() === 0) return 0;

      return 9;
    };

    const calculateExpectedMinutesForDateKeys = (dateKeys) => {
      return teamEmployeeCodes.reduce((teamSum, employeeCode) => {
        return teamSum + dateKeys.reduce((dateSum, dateKey) => {
          return dateSum + getExpectedHoursForEmployeeDate(employeeCode, dateKey) * 60;
        }, 0);
      }, 0);
    };

    const expectedMinutes = calculateExpectedMinutesForDateKeys(rangeDateKeys);

    const calculateProductivity = (activities, expected) => {
      const productiveMinutes = getActivityMinutes(activities, rangeStart, rangeEndExclusive);
      const expectedMinutes = expected;
      return expectedMinutes > 0 ? Math.min(Math.round((productiveMinutes / expectedMinutes) * 100), 100) : 0;
    };

    const teamMinutes = getActivityMinutes(rangeActivities, rangeStart, rangeEndExclusive);
    const teamHours = teamMinutes / 60;
    const teamProductivity = calculateProductivity(rangeActivities, expectedMinutes);
    const completedActivities = rangeActivities.filter(a => a.status === 'completed' || a.status === 'approved').length;
    const employeesWithTodayActivity = new Set(
      teamActivities
        .filter(activity => hasActivityOnDate(activity, todayKey))
        .map(activity => activity.assignedToId)
    );
    const employeesWithoutTodayActivity = teamEmployees
      .filter(emp => !employeesWithTodayActivity.has(emp.employeeCode))
      .map(emp => ({
        employeeCode: emp.employeeCode,
        name: emp.name,
        email: emp.email,
        department: emp.department?.name || teamLeadDept.name,
        branch: emp.branch?.name || teamLeadBranch?.name || '',
      }));

    console.log('Calculated team lead analytics:', {
      teamHours,
      teamActivitiesCount: rangeActivities.length,
      teamEmployees: teamEmployees.length,
      teamProductivity,
      expectedHours: expectedMinutes / 60,
      rangeStart: rangeStartKey,
      rangeEnd: rangeEndKey
    });

    // Keep legacy keys for the existing frontend, but values are team-only.
    const departmentCards = [
      {
        name: teamLeadDept.name,
        employees: teamEmployees.length,
        productivity: teamProductivity,
        totalHours: teamHours,
        avgHours: teamEmployees.length > 0 ? (teamHours / teamEmployees.length).toFixed(1) : '0',
        isTeamLeadDepartment: true,
        dataSource: 'team'
      }
    ];

    const branchDepartmentsData = departmentCards;

    const daywiseHoursData = rangeDateKeys.map((dateKey) => {
      const dayDate = parseDateOnly(dateKey);
      const nextDay = new Date(dayDate);
      nextDay.setDate(dayDate.getDate() + 1);
      const obj = {
        day: dayDate.toLocaleDateString('default', rangeDateKeys.length > 7 ? { day: '2-digit', month: 'short' } : { weekday: 'short' }),
        date: dateKey
      };
      obj[teamLeadDept.name] = Number((getActivityMinutes(rangeActivities, dayDate, nextDay) / 60).toFixed(1));
      return obj;
    });

    const departmentOptions = [teamLeadDept.name];

    const now = new Date();
    const months = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      months.push({ start, end, label: `${start.toLocaleString('default', { month: 'short' })} ${String(start.getFullYear()).slice(-2)}` });
    }

    const productivityTrendData = months.map(month => {
      const obj = { month: month.label };
      const monthActivities = rangeActivities.filter(activity =>
        getTimeEntries(activity).some(entry => {
          const entryDate = new Date(entry?.date);
          return !Number.isNaN(entryDate.getTime()) && entryDate >= month.start && entryDate < month.end;
        })
      );
      const monthStartKey = toDateOnlyString(month.start);
      const monthEndKey = toDateOnlyString(addDays(month.end, -1));
      const monthDateKeys = rangeDateKeys.filter(dateKey => dateKey >= monthStartKey && dateKey <= monthEndKey);
      const monthExpectedMinutes = calculateExpectedMinutesForDateKeys(monthDateKeys);
      const monthProductiveMinutes = getActivityMinutes(monthActivities, month.start, month.end);
      obj[teamLeadDept.name] = monthExpectedMinutes > 0
        ? Math.min(Math.round((monthProductiveMinutes / monthExpectedMinutes) * 100), 100)
        : 0;
      return obj;
    });

    // Employee Performance
    const employeePerformance = teamEmployees.map(emp => {
      const empActivities = rangeActivities.filter(a => a.assignedToId === emp.employeeCode);
      const totalMinutes = getActivityMinutes(empActivities, rangeStart, rangeEndExclusive);
      const completedCount = empActivities.filter(a => a.status === 'completed').length;

      return {
        name: emp.name,
        department: emp.department?.name || 'N/A',
        hours: (totalMinutes / 60).toFixed(1),
        tasks: empActivities.length,
        productivity: empActivities.length ? Math.round((completedCount / empActivities.length) * 100) : 0,
      };
    });

    // Activity Status Distribution
    const statusCounts = {
      'in-progress': rangeActivities.filter(a => a.status === 'in-progress' || a.status === 'pending').length,
      completed: completedActivities,
    };

    const activityStatusData = [
      { name: 'In Progress', value: statusCounts['in-progress'], color: '#2196f3' },
      { name: 'Completed', value: statusCounts.completed, color: '#4caf50' },
    ];

    res.json({
      branchInfo: {
        name: teamLeadBranch?.name || 'Branch',
        location: teamLeadBranch?.location || '',
        totalDepartments: branchDepartments.length,
        totalEmployees: teamEmployees.length,
      },
      branchDepartments: branchDepartmentsData,
      departmentCards,
      daywiseHoursData,
      departmentOptions,
      productivityTrendData,
      employeePerformance,
      activityStatusData,
      teamLeadDepartment: teamLeadDept.name,
      dataSource: 'team',
      departmentHours: teamHours,
      branchHours: teamHours,
      teamHours,
      departmentProductivity: teamProductivity,
      branchProductivity: teamProductivity,
      teamProductivity,
      departmentEmployees: teamEmployees.length,
      branchEmployees: teamEmployees.length,
      teamEmployees: teamEmployees.length,
      completedActivities,
      expectedHours: Number((expectedMinutes / 60).toFixed(1)),
      analyticsRange: {
        startDate: rangeStartKey,
        endDate: rangeEndKey,
      },
      employeesWithoutTodayActivity,
      employeesWithoutTodayActivityCount: employeesWithoutTodayActivity.length,
      missingActivityDate: todayKey,
      focusDepartment: teamLeadDept.name,
    });
  } catch (error) {
    console.error('Team Lead analytics error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get employees in team lead's department only
router.get('/employees', auth, checkRole(['teamlead']), async (req, res) => {
  try {
    console.log('=== FETCHING EMPLOYEES ===');
    console.log('Team Lead:', {
      id: req.user.id,
      employeeCode: req.user.employeeCode,
      name: req.user.name,
      departmentId: req.user.departmentId,
      branchId: req.user.branchId,
      role: req.user.role
    });
    
    if (!req.user.departmentId) {
      console.error('Team lead missing department assignment');
      return res.status(403).json({ 
        success: false,
        error: 'Team lead must be assigned to a department',
        details: {
          hasDepartment: !!req.user.departmentId
        }
      });
    }

    const teamLeadDept = await Department.findByPk(req.user.departmentId);
    if (!teamLeadDept) {
      console.error('Team lead department not found:', req.user.departmentId);
      return res.status(404).json({ error: 'Department not found' });
    }

    console.log(`Fetching employees assigned to team lead ${req.user.employeeCode} in department ${teamLeadDept.name} (${req.user.departmentId})`);

    // Get employees explicitly assigned to this team lead
    const query = {
      where: {
        role: 'employee',
        departmentId: req.user.departmentId,
        teamLeadId: req.user.employeeCode
      },
      attributes: { exclude: ['password'] },
      include: [
        { 
          model: Department, 
          as: 'department', 
          attributes: ['id', 'name', 'branchId'],
          required: false // Make this a left join to still get users even if department is missing
        },
        { 
          model: Branch, 
          as: 'branch', 
          attributes: ['id', 'name', 'location'],
          required: false // Make this a left join to still get users even if branch is missing
        }
      ]
    };

    console.log('Executing employee query:', JSON.stringify(query, null, 2));
    
    const departmentEmployees = await User.findAll(query);

    console.log(`Found ${departmentEmployees.length} employees assigned to team lead ${req.user.employeeCode} in department ${req.user.departmentId}`);
    
    // Log first few employees for debugging
    departmentEmployees.slice(0, 3).forEach((emp, idx) => {
      console.log(`Employee ${idx + 1}:`, {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        department: emp.department ? emp.department.name : 'None',
        branch: emp.branch ? emp.branch.name : 'None',
        role: emp.role
      });
    });

    // Calculate total hours for each employee
    const employeesWithHours = await Promise.all(departmentEmployees.map(async emp => {
      try {
        console.log(`Processing employee: ${emp.name} (${emp.employeeCode})`);
        
        // Get workday entries for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        // Get today's workday record
        const workday = await Workday.findOne({
          where: {
            userId: emp.employeeCode,
            date: { [Op.gte]: today, [Op.lt]: tomorrow }
          },
          order: [['date', 'DESC']]
        });
        
        // Calculate work hours from workday
        let workdayMinutes = 0;
        if (workday && workday.clockIn) {
          const clockIn = new Date(workday.clockIn);
          const clockOut = workday.clockOut ? new Date(workday.clockOut) : new Date();
          workdayMinutes = (clockOut - clockIn) / (1000 * 60); // Convert ms to minutes
          
          // If it's a partial day, cap at 4 hours for half day
          if (workday.attendanceType === 'half_day' && workdayMinutes > 240) {
            workdayMinutes = 240; // 4 hours for half day
          }
        }
        
        // Get all activities for the employee
        const activities = await Activity.findAll({ 
          where: { assignedToId: emp.employeeCode },
          // No need to include timeEntries as it's a JSON field in the Activity model
          attributes: [
            'id',
            'title',
            'description',
            'comment',
            'assignedToId',
            'status',
            'timeEntries',
            'timeSpent',
            'startTime',
            'endTime',
            'project_id',
            'hierarchy_level',
            'actual_hours_new',
            'createdAt',
            'updatedAt'
          ]
        });

        console.log(`Found ${activities.length} activities for employee ${emp.employeeCode}`);

        // Calculate total hours from all activities (all time)
        let totalActivityMinutes = 0;
        let todayActivityMinutes = 0;
        
        activities.forEach(activity => {
          const entries = getTimeEntries(activity);
          
          // Calculate total minutes for this activity
          const activityMinutes = entries.reduce((sum, entry) => {
            return sum + (parseFloat(entry.duration) || 0);
          }, 0);
          
          // Add to total activity minutes
          totalActivityMinutes += activityMinutes;
          
          // Calculate today's activity minutes
          const todayEntries = entries.filter(entry => {
            try {
              if (!entry.date) return false;
              const entryDate = new Date(entry.date);
              return entryDate >= today && entryDate < tomorrow;
            } catch (e) {
              console.error('Error parsing date:', entry.date, e);
              return false;
            }
          });
          
          const todayActivityMins = todayEntries.reduce((sum, entry) => {
            return sum + (parseFloat(entry.duration) || 0);
          }, 0);
          
          todayActivityMinutes += todayActivityMins;
        });
        
        // Use workday hours if available, otherwise use today's activity hours
        const todayMinutes = workdayMinutes > 0 ? workdayMinutes : todayActivityMinutes;
        
        console.log(`Employee ${emp.employeeCode} - ` +
          `Today: ${todayMinutes.toFixed(1)} min ` +
          `(Workday: ${workdayMinutes.toFixed(1)} min, ` +
          `Activities: ${todayActivityMinutes.toFixed(1)} min), ` +
          `Total Activities: ${(totalActivityMinutes / 60).toFixed(1)} hours`);

        return {
          ...emp.toJSON(),
          // Convert minutes to hours with 1 decimal place
          totalHours: (totalActivityMinutes / 60).toFixed(1),
          todayHours: (todayMinutes / 60).toFixed(1),
          todayActivityHours: (todayActivityMinutes / 60).toFixed(1), // Add this for clarity
          hasWorkday: !!workday,
          workdayType: workday?.attendanceType || 'none',
          activitiesCount: activities.length,
          timeEntriesCount: activities.reduce((sum, a) => sum + (getTimeEntries(a)?.length || 0), 0)
        };
      } catch (error) {
        console.error(`Error processing employee ${emp.employeeCode}:`, error);
        return {
          ...emp.toJSON(),
          totalHours: '0.0',
          todayHours: '0.0',
          error: 'Error calculating hours'
        };
      }
    }));

    // Calculate branch-wide hours
    const branchHours = employeesWithHours.reduce((sum, emp) => {
      return sum + parseFloat(emp.totalHours || 0);
    }, 0);

    // Get total employees in the branch (for reference)
    const totalBranchEmployees = await User.count({
      where: {
        role: 'employee',
        branchId: req.user.branchId
      }
    });

    console.log(`Total employees in branch ${req.user.branchId}: ${totalBranchEmployees}`);
    
    // Debug: Check department and branch info
    try {
      const department = await Department.findByPk(req.user.departmentId);
      const branch = await Branch.findByPk(req.user.branchId);
      
      console.log('Department Info:', {
        id: department?.id,
        name: department?.name,
        branchId: department?.branchId
      });
      
      console.log('Branch Info:', {
        id: branch?.id,
        name: branch?.name,
        location: branch?.location
      });
    } catch (dbError) {
      console.error('Error fetching department/branch info:', dbError);
    }

    const teamLeadBranch = req.user.branchId ? await Branch.findByPk(req.user.branchId) : null;

    const response = {
      success: true,
      employees: employeesWithHours,
      departmentEmployeeCount: departmentEmployees.length,
      branchEmployeeCount: totalBranchEmployees,
      teamLeadDepartment: teamLeadDept?.name || 'Unknown Department',
      branchName: teamLeadBranch?.name || 'Unknown Branch',
      debug: {
        departmentId: req.user.departmentId,
        branchId: req.user.branchId,
        queryExecuted: query,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Sending response with employees:', {
      employeeCount: response.employees.length,
      department: response.teamLeadDepartment,
      branch: response.branchName
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error in /employees endpoint:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get activities for team lead's department with branch context and filtering
router.get('/activities', auth, checkRole(['teamlead']), async (req, res) => {
  console.log('=== ACTIVITIES REQUEST START ===');
  console.log('Request query:', req.query);
  console.log('User:', {
    id: req.user.id,
    employeeCode: req.user.employeeCode,
    departmentId: req.user.departmentId,
    branchId: req.user.branchId
  });
  
  try {
    // Additional validation: Ensure team lead has proper department and branch assignment
    if (!req.user.departmentId) {
      return res.status(403).json({ error: 'Team lead must be assigned to a department' });
    }

    const teamLeadDept = await Department.findByPk(req.user.departmentId);
    if (!teamLeadDept) {
      return res.status(403).json({ error: 'Invalid department assignment' });
    }

    const teamLeadBranch = req.user.branchId ? await Branch.findByPk(req.user.branchId) : null;

    // Get filter parameters
    const { startDate, endDate, employee } = req.query;
    
    // Build base query for activities
    const whereClause = {};
    
    // Apply employee filter if specified
    if (employee && employee !== 'all') {
      const scopedEmployee = await User.findOne({
        where: {
          employeeCode: employee,
          departmentId: req.user.departmentId,
          role: 'employee',
          teamLeadId: req.user.employeeCode
        },
        attributes: ['employeeCode'],
        raw: true
      });

      if (!scopedEmployee) {
        return res.status(403).json({ error: 'Employee is not assigned to you' });
      }

      whereClause.assignedToId = employee;
    } else {
      // If no specific employee selected, get all employees in the department
      const departmentEmployees = await User.findAll({
        where: { 
          departmentId: req.user.departmentId,
          role: 'employee',
          teamLeadId: req.user.employeeCode
        },
        attributes: ['employeeCode'],
        raw: true
      });
      
      if (departmentEmployees.length > 0) {
        whereClause.assignedToId = departmentEmployees.map(e => e.employeeCode);
      } else {
        // No employees in department, return empty result
        return res.json({
          activities: [],
          departmentActivityCount: 0,
          teamLeadDepartment: teamLeadDept.name,
          teamLeadBranch: teamLeadBranch.name,
          success: true
        });
      }
    }
    
    // Date filtering is applied after loading activities so JSON timeEntries are checked by entry date.
    
    console.log('Final where clause:', JSON.stringify(whereClause, null, 2));

    // If we have employee filter but no matching employees, return empty results
    if (employee && employee !== 'all' && whereClause.assignedToId.length === 0) {
      return res.json({
        activities: [],
        departmentActivityCount: 0,
        teamLeadDepartment: teamLeadDept.name,
        teamLeadBranch: teamLeadBranch.name,
        filteredEmployees: 0,
        statusData: [
          { name: 'In Progress', value: 0, color: '#2196f3' },
          { name: 'Completed', value: 0, color: '#4caf50' },
        ],
        departmentHours: 0,
        branchHours: 0,
        departmentProductivity: 0,
        departmentEmployees: 0,
        branchEmployees: 0
      });
    }

    // Apply date filtering if specified
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter[Op.lte] = end;
      }

      // For activities with timeEntries, we need to check the time entry dates
      // This is a simplified approach - in production you might want to use a more sophisticated query
    }

    console.log('Final whereClause for activities:', JSON.stringify(whereClause, null, 2));
    
    // Get activities based on the filtered employees
    console.log('Fetching activities from database...');
    
    // Get activities with assigned user details
    let activities = [];
    try {
      console.log('Fetching activities...');
      activities = await Activity.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'assignedTo',
            attributes: ['employeeCode', 'name', 'email', 'departmentId', 'branchId'],
            required: true,
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['id', 'name']
              },
              {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'location']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        raw: false // Get full model instances for proper associations
      });
      
      console.log(`Found ${activities.length} activities`);
      
      // Convert to plain objects and handle time entries
      activities = activities.map(activity => {
        const plainActivity = activity.get({ plain: true });
        
        // Ensure timeEntries is an array
        if (plainActivity.timeEntries && !Array.isArray(plainActivity.timeEntries)) {
          try {
            plainActivity.timeEntries = JSON.parse(plainActivity.timeEntries);
          } catch (e) {
            console.error('Error parsing timeEntries:', e);
            plainActivity.timeEntries = [];
          }
        } else if (!plainActivity.timeEntries) {
          plainActivity.timeEntries = [];
        }

        if (
          plainActivity.timeEntries.length === 0 &&
          plainActivity.project_id &&
          ['task', 'subtask'].includes(plainActivity.hierarchy_level)
        ) {
          const actualHours = Number(plainActivity.actual_hours_new ?? plainActivity.timeSpent);
          const baseDate = new Date(plainActivity.updatedAt || plainActivity.createdAt || new Date());
          if (Number.isFinite(actualHours) && actualHours > 0 && Number.isFinite(baseDate.getTime())) {
            const buildDateFromTime = (timeString) => {
              if (typeof timeString !== 'string') return null;
              const parts = timeString.split(':').map(part => Number.parseInt(part, 10));
              if (parts.length < 2 || parts.some(Number.isNaN)) return null;
              const [hours, minutes, seconds = 0] = parts;
              const date = new Date(baseDate);
              date.setHours(hours, minutes, seconds || 0, 0);
              return Number.isFinite(date.getTime()) ? date : null;
            };

            const punchIn = buildDateFromTime(plainActivity.startTime);
            const punchOut = buildDateFromTime(plainActivity.endTime);
            const entryDate = punchIn || baseDate;
            plainActivity.timeEntries = [{
              date: entryDate.toISOString(),
              punchIn: punchIn ? punchIn.toISOString() : entryDate.toISOString(),
              punchOut: punchOut ? punchOut.toISOString() : entryDate.toISOString(),
              duration: Math.round(actualHours * 60),
              description: plainActivity.comment || plainActivity.description || plainActivity.title,
              source: 'project_time_log_fallback'
            }];
          }
        }
        
        return plainActivity;
      });
      
    } catch (error) {
      console.error('Error fetching activities:', {
        message: error.message,
        stack: error.stack,
        query: whereClause
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch activities',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching activities'
      });
    }
    
    // Process activities to ensure consistent structure
    const transformedActivities = activities.map(activity => {
      try {
        // Ensure assignedTo exists and has required fields
        const assignedTo = activity.assignedTo || {};
        const department = assignedTo.department || { id: null, name: 'N/A' };
        const branch = assignedTo.branch || { id: null, name: 'N/A', location: 'N/A' };
        
        // Calculate total time spent from timeEntries if not already set
        let totalTimeSpent = activity.timeSpent || 0;
        if (!activity.timeSpent && activity.timeEntries && activity.timeEntries.length > 0) {
          totalTimeSpent = activity.timeEntries.reduce((sum, entry) => {
            return sum + (entry.duration || 0);
          }, 0);
        }
        
        return {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          comment: activity.comment,
          status: activity.status,
          timeSpent: totalTimeSpent,
          timeEntries: activity.timeEntries || [],
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
          assignedTo: {
            employeeCode: assignedTo.employeeCode,
            name: assignedTo.name || 'Unknown',
            email: assignedTo.email,
            department: department,
            branch: branch
          },
          department: department,
          branch: branch
        };
      } catch (e) {
        console.error('Error processing activity:', {
          error: e.message,
          activityId: activity.id,
          stack: e.stack
        });
        return null;
      }
    }).filter(Boolean);

    // Update status distribution to remove "pending"
    const statusCounts = {
      'in-progress': transformedActivities.filter(a => a.status === 'in-progress' || a.status === 'pending').length,
      completed: transformedActivities.filter(a => a.status === 'completed').length,
    };

    const activityStatusData = [
      { name: 'In Progress', value: statusCounts['in-progress'], color: '#2196f3' },
      { name: 'Completed', value: statusCounts.completed, color: '#4caf50' },
    ];

    // Prepare response
    const response = {
      activities: transformedActivities,
      departmentActivityCount: transformedActivities.length,
      teamLeadDepartment: teamLeadDept.name,
      teamLeadBranch: teamLeadBranch.name,
      success: true
    };
    
    console.log('Sending response with activities:', {
      count: response.activities.length,
      department: response.teamLeadDepartment,
      branch: response.teamLeadBranch
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error in /activities endpoint:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      user: {
        id: req.user?.id,
        employeeCode: req.user?.employeeCode,
        departmentId: req.user?.departmentId,
        branchId: req.user?.branchId
      },
      errorDetails: error.response?.data || 'No additional error details'
    });
    
    // Return a more detailed error response
    const errorResponse = {
      success: false,
      error: 'Failed to fetch activities',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching activities',
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack,
        query: req.query,
        user: {
          id: req.user?.id,
          employeeCode: req.user?.employeeCode
        }
      } : undefined
    };
    
    res.status(500).json(errorResponse);
  }
});

// ... (rest of the code remains the same)
router.get('/employee/:employeeId/analytics', auth, checkRole(['teamlead']), async (req, res) => {
  const { employeeId } = req.params;
  const { date } = req.query;
  const requestId = Math.random().toString(36).substring(2, 9);
  
  const log = (message, data = '') => {
    console.log(`[${new Date().toISOString()}] [${requestId}] [${employeeId}] ${message}`, data);
  };
  
  log('Starting analytics fetch');
  
  try {
    // Parse date parameter
    let targetDate = new Date();
    if (date) {
      const parsed = new Date(date);
      if (!Number.isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    log('Target date set', { targetDate, nextDate });

    // Get the employee
    const employee = await User.findOne({
      where: {
        employeeCode: employeeId,
        departmentId: req.user.departmentId,
        role: 'employee',
        teamLeadId: req.user.employeeCode
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'location'] }
      ]
    });

    if (!employee) {
      log('Employee not found in database');
      return res.status(404).json({ 
        success: false,
        error: 'Employee not found',
        employeeId,
        requestId
      });
    }

    // Get workday record for target date
    let workday;
    try {
      log('Fetching workday record');
      workday = await Workday.findOne({
        where: {
          userId: employee.employeeCode,
          date: { [Op.gte]: targetDate, [Op.lt]: nextDate }
        },
        order: [['date', 'DESC']],
        raw: true
      });
      log('Workday record found', workday);
    } catch (workdayError) {
      log('Error fetching workday', workdayError);
      workday = null;
    }

    // Get all activities for the employee
    let activities = [];
    try {
      log('Fetching activities');
      const activitiesResult = await Activity.findAll({ 
        where: { assignedToId: employee.employeeCode },
        raw: true
      });
      activities = Array.isArray(activitiesResult) ? activitiesResult : [];
      log(`Found ${activities.length} activities`);
    } catch (activityError) {
      log('Error fetching activities', activityError);
      activities = [];
    }

    // Filter activities for target date and compute totalMinutes
    const targetDateActivities = activities
      .map((activity) => {
        const entries = getTimeEntries(activity);
        const targetDateEntries = entries.filter((te) => {
          const entryDate = new Date(te.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === targetDate.getTime();
        });
        
        const totalMinutes = targetDateEntries.reduce((sum, te) => sum + (te?.duration || 0), 0);
        
        return {
          ...activity,
          timeEntries: targetDateEntries,
          totalMinutes,
        };
      })
      .filter((activity) => activity.totalMinutes > 0);

    // Calculate total hours from target date activities
    const totalMinutes = targetDateActivities.reduce((sum, act) => sum + act.totalMinutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(2);

    const responseData = {
      success: true,
      employee: {
        name: employee.name,
        email: employee.email,
        employeeCode: employee.employeeCode,
        department: employee.department,
      },
      totalHours: parseFloat(totalHours),
      activities: targetDateActivities.map((act) => ({
        id: act.id,
        title: act.title,
        description: act.description,
        totalMinutes: act.totalMinutes,
        timeEntries: act.timeEntries,
        status: act.status,
        comment: act.comment,
        institute: act.institute || 0,
        school: act.school || 0,
        sessionType: act.sessionType || null,
      })),
      workday: workday ? {
        date: workday.date,
        attendanceType: workday.attendanceType,
        clockIn: workday.clockIn,
        clockOut: workday.clockOut,
      } : null,
      requestId
    };
    
    log('Sending response', responseData);
    res.json(responseData);

  } catch (error) {
    const errorId = `err_${Date.now()}`;
    log('Critical error in analytics endpoint', { 
      error: error.message, 
      stack: error.stack,
      errorId 
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process analytics',
      errorId,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    log('Request completed');
  }
});

// Assign activity to employee in team lead's department
router.post('/activities/assign', auth, checkRole(['teamlead']), async (req, res) => {
  try {
    // Additional validation: Ensure team lead has proper department and branch assignment
    if (!req.user.departmentId) {
      return res.status(403).json({ error: 'Team lead must be assigned to a department' });
    }

    const teamLeadDept = await Department.findByPk(req.user.departmentId);
    if (!teamLeadDept) {
      return res.status(403).json({ error: 'Invalid department assignment' });
    }

    const { activityId, employeeCode } = req.body;

    // Verify employee is explicitly assigned to this team lead
    const employee = await User.findOne({
      where: {
        employeeCode,
        departmentId: req.user.departmentId,
        role: 'employee',
        teamLeadId: req.user.employeeCode
      }
    });

    if (!employee) {
      return res.status(403).json({ error: 'Employee is not assigned to you' });
    }

    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    activity.assignedToId = employeeCode;
    await activity.save();

    res.json({ message: 'Activity assigned successfully', activity });
  } catch (error) {
    console.error('Error assigning activity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
