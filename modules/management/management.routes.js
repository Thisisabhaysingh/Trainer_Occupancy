const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { auth, checkRole } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { User, Department, Workday, Activity, Holiday, Branch } = require('../../models');
const { sendWelcomeEmail } = require('../../services/emailService');

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

const TIMEZONE_OFFSET_MINUTES = 330; // IST (+05:30)
const buildTimezoneOffsetString = (offsetMinutes) => {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
const TIMEZONE_OFFSET_STRING = buildTimezoneOffsetString(TIMEZONE_OFFSET_MINUTES);

const convertToTimezoneDate = (date, offsetMinutes = TIMEZONE_OFFSET_MINUTES) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getTime() + offsetMinutes * 60 * 1000);
};

const toTimezoneDateKey = (date, offsetMinutes = TIMEZONE_OFFSET_MINUTES) => {
  const converted = convertToTimezoneDate(date, offsetMinutes);
  if (!converted) return null;
  return converted.toISOString().slice(0, 10);
};

const getUtcRangeForDate = (dateInput = null, offsetMinutes = TIMEZONE_OFFSET_MINUTES) => {
  if (typeof dateInput === 'string') {
    const start = new Date(`${dateInput}T00:00:00${TIMEZONE_OFFSET_STRING}`);
    const end = new Date(`${dateInput}T23:59:59.999${TIMEZONE_OFFSET_STRING}`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return null;
    }
    return { start, end };
  }

  const now = new Date();
  const localNow = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const localStart = new Date(localNow);
  localStart.setHours(0, 0, 0, 0);
  const localEnd = new Date(localNow);
  localEnd.setHours(23, 59, 59, 999);

  return {
    start: new Date(localStart.getTime() - offsetMinutes * 60 * 1000),
    end: new Date(localEnd.getTime() - offsetMinutes * 60 * 1000),
  };
};

// Get analytics for manager's department or branch
router.get('/analytics', auth, checkRole(['manager', 'senior_manager']), async (req, res) => {
  // Initialize variables to prevent reference errors
  let totalHours = 0;
  let overtimeHours = 0;
  let totalActivities = 0;
  let completedActivities = 0;
  
  try {
    const todayOnly = req.query.today === 'true';
    const weekOnly = req.query.week === 'true';
    const hasCustomRange = req.query.startDate && req.query.endDate;
    let rangeStart = null;
    let rangeEnd = null;
    let currentWeekStart = null;
    let currentWeekEndExclusive = null;

    if (hasCustomRange) {
      rangeStart = new Date(req.query.startDate);
      rangeEnd = new Date(req.query.endDate);
      if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        return res.status(400).json({ error: 'Invalid date range supplied' });
      }
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);
    }
    
    // Get manager's details including department and branch
    const manager = await User.findByPk(req.user.employeeCode, {
      include: [
        { 
          model: Department, 
          as: 'department',
          include: [
            { model: Branch, as: 'branch' }
          ]
        },
        { 
          model: Branch, 
          as: 'branch',
          include: [
            { 
              model: Department, 
              as: 'departments',
              include: [
                { 
                  model: User, 
                  as: 'employees',
                  where: { role: 'employee' },
                  required: false,
                  attributes: ['employeeCode']
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    
    if ((!manager.managerType || manager.managerType === 'department') && !manager.department) {
      return res.status(400).json({ error: 'Department manager must have a department assigned' });
    }
    
    if (manager.managerType === 'branch' && !manager.branch) {
      return res.status(400).json({ error: 'Branch manager must have a branch assigned' });
    }
    
    // Determine manager type - use the new managerType field if available, otherwise fall back to the old logic
    const isBranchManager = manager.managerType === 'branch' || 
                          (manager.managerType === undefined && manager.department?.name === 'Branch');
    
    const deptId = isBranchManager ? null : manager.departmentId;
    const branchId = manager.branchId;
    
    // Get all employees based on manager's access level
    const employeeWhereClause = {
      role: { [Op.in]: ['employee', 'teamlead'] },
      ...(isBranchManager ? { branchId } : { departmentId: deptId })
    };
    
    // For branch managers, we'll include all departments in the branch
    // For department managers, we only include their specific department
    
    const employees = await User.findAll({
      attributes: { exclude: ['password'] },
      where: employeeWhereClause,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'location'] }
      ],
      order: [['name', 'ASC']]
    });

    // Get all activities for employees in this branch/department
    const employeeCodes = employees.map(e => e.employeeCode);
    let activities = [];
    
    if (employeeCodes.length > 0) {
      activities = await Activity.findAll({
        where: { 
          assignedToId: { [Op.in]: employeeCodes },
          status: { [Op.ne]: 'deleted' } // Exclude deleted activities
        },
        attributes: ['id', 'title', 'description', 'comment', 'assignedToId', 'status', 'timeEntries', 'createdAt', 'updatedAt', 'startTime', 'endTime', 'institute', 'school', 'sessionType', 'sessionsCount'],
        include: [
          { 
            model: User, 
            as: 'assignedTo', 
            attributes: ['employeeCode', 'name', 'email', 'departmentId'] 
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }
    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      // Only keep activities with at least one timeEntry today
      activities = activities.map(a => {
        const entries = getTimeEntries(a);
        const todaysEntries = entries.filter(te => {
          const d = new Date(te.date);
          return d >= today && d < tomorrow;
        });
        return { ...a.toJSON(), timeEntries: todaysEntries };
      }).filter(a => a.timeEntries.length > 0);
    } else if (hasCustomRange) {
      // Filter activities for custom range
      activities = activities.map(a => {
        const entries = getTimeEntries(a);
        const rangedEntries = entries.filter(te => {
          const d = new Date(te.date);
          return d >= rangeStart && d <= rangeEnd;
        });
        return { ...a.toJSON(), timeEntries: rangedEntries };
      }).filter(a => a.timeEntries.length > 0);
    } else if (weekOnly) {
      // Filter for current week (Monday to Sunday)
      const today = new Date();
      currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
      currentWeekStart.setHours(0, 0, 0, 0);
      currentWeekEndExclusive = new Date(currentWeekStart);
      currentWeekEndExclusive.setDate(currentWeekStart.getDate() + 7); // Next Monday
      currentWeekEndExclusive.setHours(0, 0, 0, 0);
      activities = activities.map(a => {
        const entries = getTimeEntries(a);
        const weekEntries = entries.filter(te => {
          const d = new Date(te.date);
          return d >= currentWeekStart && d < currentWeekEndExclusive;
        });
        return { ...a.toJSON(), timeEntries: weekEntries };
      }).filter(a => a.timeEntries.length > 0);
    }

    let analysisStart = null;
    let analysisEndExclusive = null;
    if (hasCustomRange) {
      analysisStart = new Date(rangeStart);
      analysisEndExclusive = new Date(rangeEnd);
      analysisEndExclusive.setDate(analysisEndExclusive.getDate() + 1);
      analysisEndExclusive.setHours(0, 0, 0, 0);
    } else if (weekOnly) {
      if (!currentWeekStart) {
        currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
        currentWeekStart.setHours(0, 0, 0, 0);
      }
      if (!currentWeekEndExclusive) {
        currentWeekEndExclusive = new Date(currentWeekStart);
        currentWeekEndExclusive.setDate(currentWeekStart.getDate() + 7);
        currentWeekEndExclusive.setHours(0, 0, 0, 0);
      }
      analysisStart = new Date(currentWeekStart);
      analysisEndExclusive = new Date(currentWeekEndExclusive);
    }

    // Aggregate totals for summary cards
    totalActivities = activities.length;
    completedActivities = activities.filter(a => a.status === 'completed').length;
    const totalMinutesAll = activities.reduce((sum, a) => {
      return sum + getTimeEntries(a).reduce((entrySum, te) => {
        if (!te?.date) return entrySum;
        const entryDate = new Date(te.date);
        if (analysisStart && analysisEndExclusive) {
          if (entryDate < analysisStart || entryDate >= analysisEndExclusive) {
            return entrySum;
          }
        }
        return entrySum + (te.duration || 0);
      }, 0);
    }, 0);

    totalHours = totalMinutesAll / 60;

    let analysisWorkdaysMap = new Map();
    if (analysisStart && analysisEndExclusive && employeeCodes.length > 0) {
      const analysisWorkdays = await Workday.findAll({
        where: {
          userId: { [Op.in]: employeeCodes },
          date: {
            [Op.gte]: analysisStart,
            [Op.lt]: analysisEndExclusive
          }
        },
        attributes: ['userId', 'date', 'standardHours']
      });

      analysisWorkdaysMap = new Map(
        analysisWorkdays.map(wd => {
          const hoursValue = wd.standardHours != null ? Number(wd.standardHours) : 9;
          const safeHours = Number.isFinite(hoursValue) ? hoursValue : 9;
          return [`${wd.userId}-${wd.date}`, safeHours];
        })
      );
    }

    // Get departments based on manager type
    let branchDepartments;
    if (isBranchManager) {
      // For branch managers, get all departments in their branch
      branchDepartments = await Department.findAll({
        where: { branchId },
        include: [
          {
            model: User,
            as: 'employees',
            where: { role: 'employee' },
            required: false,
            attributes: ['employeeCode']
          },
          {
            model: User,
            as: 'manager',
            required: false,
            attributes: ['employeeCode', 'name', 'email']
          },
          {
            model: User,
            as: 'teamLead',
            required: false,
            attributes: ['employeeCode', 'name', 'email']
          }
        ],
        order: [['name', 'ASC']]
      });
    } else {
      // For department managers, only get their specific department
      const dept = await Department.findByPk(deptId, {
        include: [
          {
            model: User,
            as: 'employees',
            where: { 
              role: 'employee',
              departmentId: deptId
            },
            required: false,
            attributes: ['employeeCode']
          },
          {
            model: User,
            as: 'manager',
            required: false,
            attributes: ['employeeCode', 'name', 'email']
          },
          {
            model: User,
            as: 'teamLead',
            required: false,
            attributes: ['employeeCode', 'name', 'email']
          }
        ]
      });
      branchDepartments = dept ? [dept] : [];
    }

    // --- Department Summary Cards ---
    const departmentCards = await Promise.all(branchDepartments.map(async (dept) => {
      // Get employees for this department
      const deptEmployees = employees.filter(emp => emp.departmentId === dept.id);
      
      // Get activities for this department's employees
      const deptActivities = activities.filter(act => 
        deptEmployees.some(emp => emp.employeeCode === act.assignedToId)
      );

      // Calculate metrics for this department
      const deptEmployeeCodes = deptEmployees.map(emp => emp.employeeCode);
      const employeeDayMap = new Map();
      let productiveMinutes = 0;

      deptActivities.forEach(activity => {
        const entries = getTimeEntries(activity);
        entries.forEach(te => {
          if (!te?.date || te.duration == null) return;
          const entryDate = new Date(te.date);
          if (analysisStart && analysisEndExclusive) {
            if (entryDate < analysisStart || entryDate >= analysisEndExclusive) {
              return;
            }
          }
          productiveMinutes += te.duration;
          const dayStr = entryDate.toISOString().slice(0, 10);
          if (!employeeDayMap.has(activity.assignedToId)) {
            employeeDayMap.set(activity.assignedToId, new Set());
          }
          employeeDayMap.get(activity.assignedToId).add(dayStr);
        });
      });

      let shiftMinutes = 0;
      deptEmployeeCodes.forEach(code => {
        const daysWorked = employeeDayMap.get(code) || new Set();
        daysWorked.forEach(dayStr => {
          const key = `${code}-${dayStr}`;
          const hours = analysisWorkdaysMap.has(key)
            ? analysisWorkdaysMap.get(key)
            : 9;
          shiftMinutes += (Number.isFinite(hours) ? hours : 9) * 60;
        });
      });

      const totalHours = productiveMinutes / 60;
      const productivity = shiftMinutes > 0
        ? Math.min(Math.round((productiveMinutes / shiftMinutes) * 100), 100)
        : 0;
      
      const avgHours = deptEmployees.length 
        ? (totalHours / deptEmployees.length).toFixed(1) 
        : '0.0';

      return {
        id: dept.id,
        name: dept.name,
        status: 'high',
        employees: deptEmployees.length,
        productivity,
        avgHours,
        totalHours: Math.round(totalHours),
        manager: dept.manager ? {
          name: dept.manager.name,
          email: dept.manager.email
        } : null,
        teamLead: dept.teamLead ? {
          name: dept.teamLead.name,
          email: dept.teamLead.email
        } : null
      };
    }));

    // --- Day-wise Hours by Department (bar chart) ---
    const daySegments = (() => {
      if (analysisStart && analysisEndExclusive) {
        const segments = [];
        const cursor = new Date(analysisStart);
        while (cursor < analysisEndExclusive) {
          segments.push({
            label: cursor.toLocaleDateString(undefined, { weekday: 'short' }),
            dateStr: cursor.toISOString().slice(0, 10)
          });
          cursor.setDate(cursor.getDate() + 1);
        }
        return segments;
      }
      const segments = [];
      const base = new Date();
      base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
      base.setHours(0, 0, 0, 0);
      for (let i = 0; i < 7; i++) {
        const day = new Date(base);
        day.setDate(base.getDate() + i);
        segments.push({
          label: day.toLocaleDateString(undefined, { weekday: 'short' }),
          dateStr: day.toISOString().slice(0, 10)
        });
      }
      return segments;
    })();

    const daywiseHoursData = daySegments.map(segment => {
      const obj = { day: segment.label };

      branchDepartments.forEach(dept => {
        obj[dept.name] = 0;
      });

      activities.forEach(act => {
        const dept = branchDepartments.find(d =>
          employees.some(e => e.employeeCode === act.assignedToId && e.departmentId === d.id)
        );

        if (!dept) return;

        const entries = getTimeEntries(act).filter(te => {
          if (!te?.date) return false;
          const entryDateStr = new Date(te.date).toISOString().slice(0, 10);
          return entryDateStr === segment.dateStr;
        });

        const dayHours = entries.reduce((sum, te) => sum + (te.duration || 0), 0) / 60;
        obj[dept.name] = (obj[dept.name] || 0) + dayHours;
      });

      return obj;
    });

    const departmentOptions = branchDepartments.map(dept => dept.name);

    const weeklyHoursData = daywiseHoursData.map(row => ({ ...row }));

    // --- Department Productivity Trend (line chart, monthly, all departments) ---
    const now = new Date();
    const months = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label, start, end });
    }

    let normalizedWorkdays = [];
    if (employeeCodes.length > 0 && months.length > 0) {
      const earliestMonthStartIso = months[0].start.toISOString().slice(0, 10);
      const latestMonthEndExclusiveIso = months[months.length - 1].end.toISOString().slice(0, 10);
      const workdayRecords = await Workday.findAll({
        where: {
          userId: { [Op.in]: employeeCodes },
          date: {
            [Op.gte]: earliestMonthStartIso,
            [Op.lt]: latestMonthEndExclusiveIso
          }
        },
        attributes: ['userId', 'date', 'standardHours']
      });

      normalizedWorkdays = workdayRecords.map(wd => {
        const hoursValue = wd.standardHours != null ? Number(wd.standardHours) : 9;
        const dateStr = wd.date;
        return {
          userId: wd.userId,
          dateStr,
          dateObj: new Date(`${dateStr}T00:00:00Z`),
          hours: Number.isFinite(hoursValue) ? hoursValue : 9
        };
      });
    }

    const workdaysByUser = new Map();
    normalizedWorkdays.forEach(wd => {
      if (!workdaysByUser.has(wd.userId)) {
        workdaysByUser.set(wd.userId, []);
      }
      workdaysByUser.get(wd.userId).push(wd);
    });

    const departmentProductivityTrend = months.map(month => {
      const obj = { month: month.label };

      branchDepartments.forEach(dept => {
        const deptEmployees = employees.filter(e => e.departmentId === dept.id);
        const deptEmployeeCodes = deptEmployees.map(e => e.employeeCode);

        if (deptEmployeeCodes.length === 0) {
          obj[dept.name] = 0;
          return;
        }

        const deptEmployeeCodeSet = new Set(deptEmployeeCodes);

        let productiveMinutes = 0;
        const workedDayKeys = new Set();

        activities.forEach(a => {
          if (!deptEmployeeCodeSet.has(a.assignedToId)) return;
          const entries = getTimeEntries(a);
          entries.forEach(te => {
            if (!te?.date || te.duration == null) return;
            const entryDate = new Date(te.date);
            if (entryDate >= month.start && entryDate < month.end) {
              productiveMinutes += te.duration;
              const dayStr = entryDate.toISOString().slice(0, 10);
              workedDayKeys.add(`${a.assignedToId}-${dayStr}`);
            }
          });
        });

        let shiftMinutes = 0;
        const recordedShiftKeys = new Set();

        deptEmployeeCodes.forEach(code => {
          const records = workdaysByUser.get(code) || [];
          records.forEach(wd => {
            if (wd.dateObj >= month.start && wd.dateObj < month.end) {
              const key = `${code}-${wd.dateStr}`;
              recordedShiftKeys.add(key);
              shiftMinutes += (wd.hours || 9) * 60;
            }
          });
        });

        workedDayKeys.forEach(key => {
          if (!recordedShiftKeys.has(key)) {
            shiftMinutes += 9 * 60;
          }
        });

        const productivity = shiftMinutes > 0
          ? Math.min(Math.round((productiveMinutes / shiftMinutes) * 100), 100)
          : 0;

        obj[dept.name] = productivity;
      });

      return obj;
    });

    // --- Competition Contribution Index Trend (line chart, monthly, manager's department/branch) ---
    const projectKeywords = ['prototype', 'codeavour', 'ftc', 'wro', 'vex', 'wsro', 'research'];
    const competitionContributionTrend = months.map(month => {
      const obj = { month: month.label };
      // All activities for this department/branch in this month
      const deptActs = activities;
      // Project work activities (case-insensitive substring match)
      const projectActs = deptActs.filter(a => a.title && projectKeywords.some(kw => a.title.toLowerCase().includes(kw)));
      // All time entries for this month
      let projectMinutes = 0;
      let totalMinutes = 0;
      projectActs.forEach(a => {
        const entries = getTimeEntries(a);
        entries.forEach(te => {
          const d = new Date(te.date);
          if (d >= month.start && d < month.end) {
            projectMinutes += te.duration;
          }
        });
      });
      deptActs.forEach(a => {
        const entries = getTimeEntries(a);
        entries.forEach(te => {
          const d = new Date(te.date);
          if (d >= month.start && d < month.end) {
            totalMinutes += te.duration;
          }
        });
      });
      // Use branch or department name based on manager type
      const scopeName = isBranchManager 
        ? (manager.branch?.name || 'Branch') 
        : (manager.department?.name || 'Department');
      obj[scopeName] = totalMinutes > 0 ? Math.round((projectMinutes / totalMinutes) * 100) : 0;
      return obj;
    });

    // --- Department Performance Summary Table ---
    const departmentPerformance = departmentCards.length > 0 ? departmentCards.map(card => ({
      name: card.name,
      employees: card.employees,
      totalHours: card.totalHours,
      avgHours: card.avgHours,
      productivity: card.productivity,
      status: card.status,
    })) : [];

    // Calculate total hours for each employee in this department
    const employeesWithHours = await Promise.all(employees.map(async (emp) => {
      const empActivities = activities.filter(a => a.assignedTo && a.assignedTo.employeeCode && a.assignedTo.employeeCode.toString() === emp.employeeCode.toString());
      const totalMinutes = empActivities.reduce((sum, a) => sum + getTimeEntries(a).reduce((s, te) => {
        const entryDate = new Date(te.date);
        if (analysisStart && analysisEndExclusive && (entryDate < analysisStart || entryDate >= analysisEndExclusive)) return s;
        return s + (te.duration || 0);
      }, 0), 0);
      return { ...emp.toJSON(), totalHours: (totalMinutes / 60).toFixed(1) };
    }));

    // --- Employees/Clock-in/Activity Analytics (for Employees tab) ---
    // Clocked in today
    const today = hasCustomRange ? new Date(rangeStart) : new Date();
    today.setHours(0, 0, 0, 0);
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tomorrow = (() => {
      const next = new Date(today);
      next.setDate(today.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next;
    })();

    // Get all workdays for today (including those without attendance marked)
    const allWorkdaysToday = await Workday.findAll({
      where: {
        userId: { [Op.in]: employees.map(e => e.employeeCode) },
        date: { [Op.gte]: todayDateStr, [Op.lt]: tomorrow.toISOString().slice(0, 10) },
        date: todayDateStr,
      },
    });
    console.log('Workdays found (all):', allWorkdaysToday.length);
    console.log('Workday details:', allWorkdaysToday.map(w => ({ 
      userId: w.userId, 
      date: w.date, 
      attendanceType: w.attendanceType,
      clockIn: w.clockIn,
      clockOut: w.clockOut
    })));
    
    // Only count employees who have marked attendance (full_day, half_day, leave)
    const employeesWithAttendance = allWorkdaysToday.filter(wd => 
      wd.attendanceType && ['full_day', 'half_day', 'leave'].includes(wd.attendanceType)
    );
    
    console.log('Employees with attendance marked:', employeesWithAttendance.length);
    console.log('Employees with attendance details:', employeesWithAttendance.map(wd => ({
      userId: wd.userId,
      attendanceType: wd.attendanceType,
      date: wd.date
    })));
    
    // Filter to only include employees who are present (full_day or half_day, not leave)
    // IMPORTANT: Only count employees who have actually marked attendance for today
    const presentEmployees = employeesWithAttendance.filter(wd => {
      // Count as present if attendanceType is full_day or half_day
      if (wd.attendanceType && ['full_day', 'half_day'].includes(wd.attendanceType)) {
        console.log(`Employee ${wd.userId} counted via attendanceType: ${wd.attendanceType}`);
        return true;
      }
      
      // DO NOT count employees based on clockIn/clockOut alone - they must have marked attendance
      // This prevents counting old clock-in records from previous days
      return false;
    });
    
    const presentToday = presentEmployees.length;
    // For attendance calculation, we should consider ALL employees in the manager's scope
    // Not just those who have marked attendance
    const totalExpectedEmployees = employees.length; // All employees in manager's scope
    const attendanceRate = totalExpectedEmployees ? Math.round((presentToday / totalExpectedEmployees) * 100) : 0;
    const totalEmployees = employees.length; // Total employees in manager's scope
    
    console.log('Present employees (filtered):', presentToday);
    console.log('Attendance rate:', attendanceRate + '%');
    console.log('========================');

    // For department managers, calculate department-specific attendance
    let departmentAttendance = { present: 0, total: 0, rate: 0 };
    if (!isBranchManager && manager.departmentId) {
      const departmentEmployees = employees.filter(e => e.departmentId === manager.departmentId);
      const departmentWorkdaysToday = allWorkdaysToday.filter(wd => {
        const emp = employees.find(e => e.employeeCode === wd.userId);
        return emp && emp.departmentId === manager.departmentId;
      });
      
      // Only count department employees who have marked attendance
      const departmentEmployeesWithAttendance = departmentWorkdaysToday.filter(wd => 
        wd.attendanceType && ['full_day', 'half_day', 'leave'].includes(wd.attendanceType)
      );
      
      // Apply the same filtering logic for department attendance
      const presentDepartmentEmployees = departmentEmployeesWithAttendance.filter(wd => {
        // If attendanceType is marked as full_day or half_day, count as present
        if (wd.attendanceType && ['full_day', 'half_day'].includes(wd.attendanceType)) {
          return true;
        }
        
        // DO NOT count employees based on clockIn/clockOut alone - they must have marked attendance
        // This prevents counting old clock-in records from previous days
        return false;
      });
      
      departmentAttendance = {
        present: presentDepartmentEmployees.length,
        total: departmentEmployees.length, // All department employees
        rate: departmentEmployees.length ? Math.round((presentDepartmentEmployees.length / departmentEmployees.length) * 100) : 0
      };
    }

    // Avg check-in time today (use clockIn field, as in workday route)
    let avgCheckInTime = '--';
    if (allWorkdaysToday.length > 0) {
      const workdaysWithClockIn = allWorkdaysToday.filter(w => w.clockIn);
      if (workdaysWithClockIn.length > 0) {
        const avgMinutes = Math.round(workdaysWithClockIn.reduce((sum, w) => {
          const d = new Date(w.clockIn);
          return sum + d.getHours() * 60 + d.getMinutes();
        }, 0) / workdaysWithClockIn.length);
        const hours = Math.floor(avgMinutes / 60);
        const mins = avgMinutes % 60;
        avgCheckInTime = `${((hours + 11) % 12 + 1)}:${mins.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
      }
    }

    // Compare to yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const workdaysYesterday = await Workday.findAll({
      where: {
        userId: { [Op.in]: employees.map(e => e.employeeCode) },
        date: { [Op.gte]: yesterday, [Op.lt]: today },
        clockIn: { [Op.ne]: null },
      },
    });
    let checkInDelta = '';
    if (allWorkdaysToday.length > 0 && workdaysYesterday.length > 0) {
      const todayWithClockIn = allWorkdaysToday.filter(w => w.clockIn);
      if (todayWithClockIn.length > 0) {
        const avgToday = todayWithClockIn.reduce((sum, w) => {
          const d = new Date(w.clockIn);
          return sum + d.getHours() * 60 + d.getMinutes();
        }, 0) / todayWithClockIn.length;
        const avgYest = workdaysYesterday.reduce((sum, w) => {
          const d = new Date(w.clockIn);
          return sum + d.getHours() * 60 + d.getMinutes();
        }, 0) / workdaysYesterday.length;
        const diff = Math.round(avgToday - avgYest);
        if (diff > 0) checkInDelta = `${diff} min later than yesterday`;
        else if (diff < 0) checkInDelta = `${-diff} min earlier than yesterday`;
        else checkInDelta = 'Same as yesterday';
      }
    }

    // Overtime hours this week (sum of extra hours above 9h per day for each employee)
    const weekStart = hasCustomRange ? new Date(rangeStart) : new Date(today);
    if (hasCustomRange) {
      weekStart.setHours(0, 0, 0, 0);
    } else {
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);
    }
    const weekEnd = hasCustomRange ? (() => {
      const end = new Date(rangeEnd);
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
      return end;
    })() : new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
    if (!hasCustomRange) {
      weekEnd.setHours(0, 0, 0, 0);
    }

    const workdaysThisWeek = await Workday.findAll({
      where: {
        userId: { [Op.in]: employees.map(e => e.employeeCode) },
        date: { [Op.gte]: weekStart, [Op.lt]: weekEnd },
      },
    });
    let overtimeHours = 0;
    if (workdaysThisWeek.length > 0) {
      workdaysThisWeek.forEach(w => {
        if (w.clockIn && w.clockOut) {
          const inTime = new Date(w.clockIn);
          const outTime = new Date(w.clockOut);
          const hours = (outTime - inTime) / (1000 * 60 * 60);
          if (hours > 9) {
            overtimeHours += (hours - 9);
          }
        }
      });
      overtimeHours = Number(overtimeHours.toFixed(2));
    }

    // Time spent by activity type (this week)
    const activityTimeData = [];
    const activityTypes = {};
    activities.forEach(a => {
      const entries = getTimeEntries(a);
      entries.forEach(te => {
        const teDate = new Date(te.date);
        if (teDate >= weekStart && teDate < weekEnd) {
          const type = a.type || a.title || 'Other';
          if (!activityTypes[type]) activityTypes[type] = 0;
          activityTypes[type] += te.duration;
        }
      });
    });
    for (const [name, value] of Object.entries(activityTypes)) {
      activityTimeData.push({ name, value: Math.round(value / 60) });
    }

    // Weekly productivity trend (Mon-Fri)
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weeklyProductivityData = daysOfWeek.map((day, idx) => {
      // For each day, productivity = completed activities / total activities that day
      let completed = 0, total = 0;
      activities.forEach(a => {
        const entries = getTimeEntries(a);
        entries.forEach(te => {
          const teDay = new Date(te.date).getDay();
          if (teDay === idx + 1) { // Monday=1
            total++;
            if (a.status === 'completed') completed++;
          }
        });
      });
      return {
        day,
        productivity: total ? Math.round((completed / total) * 100) : 0
      };
    });

    // --- Session Stats Per Day (Mon-Fri, this week) ---
    const sessionStatsPerDay = [];
    const sessionDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weekStartSession = hasCustomRange ? new Date(rangeStart) : new Date();
    weekStartSession.setHours(0, 0, 0, 0);
    if (!hasCustomRange) {
      weekStartSession.setDate(weekStartSession.getDate() - ((weekStartSession.getDay() + 6) % 7)); // Monday local
    }
    for (let i = 0; i < 5; i++) {
      const day = new Date(weekStartSession);
      day.setDate(weekStartSession.getDate() + i);
      const dayStr = day.toISOString().slice(0, 10);
      // Filter session activities and aggregate counts for this day
      let online = 0, offline = 0, school = 0;
      activities
        .filter(a => (a.title || '').toLowerCase() === 'total no. of sessions')
        .forEach(a => {
          const hasEntryToday = getTimeEntries(a).some(te => new Date(te.date).toISOString().slice(0,10) === dayStr);
          if (!hasEntryToday) return;
          const instituteCount = Number(a.institute || 0);
          const schoolCount = Number(a.school || 0);
          if (a.sessionType === 'Online') online += instituteCount > 0 ? instituteCount : 1;
          if (a.sessionType === 'Offline') offline += instituteCount > 0 ? instituteCount : 1;
          if (schoolCount > 0) school += schoolCount;
        });
      sessionStatsPerDay.push({
        day: sessionDays[i],
        date: dayStr,
        online,
        offline,
        school
      });
    }
    // Add weekly totals to departmentCards[0]
    if (departmentCards.length > 0) {
      departmentCards[0].sessionStats = {
        online: sessionStatsPerDay.reduce((sum, d) => sum + d.online, 0),
      };
    }
    
    // Prepare response data with null checks
    const responseData = {
      department: isBranchManager ? 
        (manager.branch?.name || 'No Branch') : 
        (manager.department?.name || 'No Department'),
      departmentId: isBranchManager ? null : (manager.departmentId || null),
      branch: manager.branch ? {
        id: manager.branch.id || null,
        name: manager.branch.name || 'No Branch',
        location: manager.branch.location || 'No Location'
      } : {
        id: null,
        name: 'No Branch',
        location: 'No Location'
      },
      isBranchManager,
      managerType: isBranchManager ? 'branch' : 'department',
      manager: {
        id: manager.employeeCode || null,
        name: manager.name || 'Unknown',
        email: manager.email || 'No email',
        role: manager.role || 'manager',
        managerType: manager.managerType || (isBranchManager ? 'branch' : 'department'),
        department: manager.department ? {
          id: manager.department.id || null,
          name: manager.department.name || 'No Department'
        } : {
          id: null,
          name: 'No Department'
        },
        branch: manager.branch ? {
          id: manager.branch.id || null,
          name: manager.branch.name || 'No Branch'
        } : {
          id: null,
          name: 'No Branch'
        }
      },
      departmentCards,
      daywiseHoursData: weeklyHoursData,
      departmentOptions,
      departmentProductivityTrend,
      competitionContributionTrend,
      employeeStats: employeesWithHours,
      employees: employees.map(emp => ({
        ...emp.toJSON(),
        department: emp.department?.name || 'No Department',
        branch: emp.branch?.name || 'No Branch'
      })),
      sessionStatsPerDay: sessionStatsPerDay || [],
      weeklyProductivityData,
      totalHours: totalHours ? totalHours.toFixed(1) : '0.0',
      avgHours: employees.length > 0 ? (totalHours / employees.length).toFixed(1) : '0.0',
      completedActivities,
      pendingActivities: Math.max(0, totalActivities - completedActivities),
      overtimeHours: overtimeHours.toFixed(1),
      totalEmployees,
      clockedInToday: presentToday, // Use presentToday for clocked-in count
      attendanceRate,
      totalExpectedEmployees, // Send this for frontend to use as denominator
      departmentAttendance, // Add department-specific attendance for department managers
      branch: {
        id: manager.branch?.id,
        name: manager.branch?.name || 'Branch',
        location: manager.branch?.location,
        totalEmployees: employees.length,
        totalDepartments: isBranchManager ? branchDepartments.length : 1,
        totalHours: totalHours.toFixed(1),
        avgHoursPerEmployee: employees.length > 0 ? (totalHours / employees.length).toFixed(1) : '0.0',
        isBranchManager
      },
      isBranchManager,
      managerDepartment: isBranchManager ? null : {
        id: manager.department?.id,
        name: manager.department?.name
      }
    };
    
    console.log('Sending response with', employees.length, 'employees');
    if (employees.length > 0) {
      console.log('Sample employee data:', {
        name: employees[0].name,
        department: employees[0].department?.name,
        branch: employees[0].branch?.name,
        employeeCode: employees[0].employeeCode
      });
    }
    res.json(responseData);
  } catch (error) {
    console.error('Manager analytics error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error', details: error.message, stack: error.stack });
  }
});

router.get('/department/:departmentId/activities-excel', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { rangeStart, rangeEnd, filenameSegment } = resolveActivityRange(req.query);

    const department = await Department.findByPk(departmentId, {
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (req.user.role === 'manager') {
      if (req.user.managerType === 'branch') {
        if (String(department.branchId) !== String(req.user.branchId)) {
          return res.status(403).json({ error: 'Forbidden: Department is outside your branch scope' });
        }
      } else if (String(department.id) !== String(req.user.departmentId)) {
        return res.status(403).json({ error: 'Forbidden: Department is outside your scope' });
      }
    }

    const employees = await User.findAll({
      where: {
        departmentId: department.id,
        role: { [Op.in]: ['employee', 'manager', 'teamlead'] }
      },
      attributes: ['employeeCode', 'name', 'departmentId', 'branchId'],
      include: [
        { model: Department, as: 'department', attributes: ['name'] },
        { model: Branch, as: 'branch', attributes: ['name'] }
      ]
    });

    const employeeCodes = employees
      .map(emp => emp.employeeCode)
      .filter(code => typeof code === 'string' && code.trim());

    const activities = employeeCodes.length
      ? await Activity.findAll({
          where: {
            assignedToId: { [Op.in]: employeeCodes },
            status: { [Op.ne]: 'deleted' }
          },
          attributes: ['id', 'title', 'description', 'comment', 'assignedToId', 'timeEntries', 'schoolName', 'branchLocation', 'sessionsCount'],
          include: [
            {
              model: User,
              as: 'assignedTo',
              attributes: ['employeeCode', 'name', 'departmentId', 'branchId'],
              required: true,
              include: [
                { model: Department, as: 'department', attributes: ['name'] },
                { model: Branch, as: 'branch', attributes: ['name'] }
              ]
            }
          ]
        })
      : [];

    const rows = collectActivityRows(activities, rangeStart, rangeEnd).sort((a, b) => {
      const codeCompare = String(a.employeeCode).localeCompare(String(b.employeeCode));
      if (codeCompare !== 0) return codeCompare;
      return a.entryDate.getTime() - b.entryDate.getTime();
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Department Activities');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Employee Code', key: 'employeeCode', width: 18 },
      { header: 'Employee Name', key: 'employeeName', width: 26 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Branch', key: 'branch', width: 22 },
      { header: 'Activity Title', key: 'activityTitle', width: 30 },
      { header: 'Activity Description', key: 'activityDescription', width: 36 },
      { header: 'Activity Comment', key: 'activityComment', width: 28 },
      { header: 'Entry Comment', key: 'entryComment', width: 28 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Duration (hrs)', key: 'durationHours', width: 16 },
      { header: 'School Name', key: 'schoolName', width: 28 },
      { header: 'School Sessions Count', key: 'schoolSessionsCount', width: 22 },
      { header: 'Institute Branch', key: 'instituteBranch', width: 28 },
      { header: 'Institute Sessions Count', key: 'instituteSessionsCount', width: 24 }
    ];

    rows.forEach(row => {
      sheet.addRow({
        date: formatDateForExcel(row.entryDate),
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        department: row.departmentName || department.name,
        branch: row.branchName || department.branch?.name || '',
        activityTitle: row.activityTitle,
        activityDescription: row.activityDescription,
        activityComment: row.activityComment,
        entryComment: row.entryComment,
        startTime: formatTimeForExcel(row.punchIn),
        endTime: formatTimeForExcel(row.punchOut),
        durationHours: formatDurationHours(row.durationMinutes),
        schoolName: row.schoolName,
        schoolSessionsCount: row.schoolSessionsCount,
        instituteBranch: row.instituteBranch,
        instituteSessionsCount: row.instituteSessionsCount
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="department_${departmentId}_activities_${filenameSegment}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (error.message === 'MISSING_RANGE') {
      return res.status(400).json({ error: 'Please provide month or both startDate and endDate query parameters.' });
    }
    if (error.message === 'INVALID_RANGE') {
      return res.status(400).json({ error: 'Invalid date range supplied' });
    }
    console.error('Department activities export error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/employee/:employeeId/analytics', auth, checkRole(['manager', 'admin', 'teamlead', 'senior_manager']), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const todayOnly = req.query.today === 'true';
    const days = parseInt(req.query.days, 10);
    const isSelfRequest = String(employeeId) === String(req.user.employeeCode);

    let employee;
    if (isSelfRequest) {
      employee = await User.findOne({
        where: { employeeCode: employeeId }
      });
    } else if (req.user.role === 'admin') {
      employee = await User.findOne({
        where: { employeeCode: employeeId, role: { [Op.in]: ['employee', 'manager', 'teamlead'] } }
      });
    } else {
      const isBranchManager = req.user.managerType === 'branch';

      const whereClause = {
        employeeCode: employeeId,
        role: { [Op.in]: ['employee', 'manager', 'teamlead'] }
      };
      if (isBranchManager) {
        whereClause.branchId = req.user.branchId;
      } else {
        whereClause.departmentId = req.user.departmentId;
      }
      employee = await User.findOne({ where: whereClause });
    }

    if (!employee) {
      const scopeError =
        req.user.role === 'admin'
          ? 'User not found'
          : req.user.managerType === 'branch'
            ? 'User not found in your branch'
            : 'User not found in your department';
      return res.status(404).json({ error: scopeError });
    }

    const activities = await Activity.findAll({
      where: {
        assignedToId: employeeId,
        status: { [Op.ne]: 'deleted' }
      },
      order: [['createdAt', 'DESC']]
    });

    let processedActivities = activities;
    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      processedActivities = activities
        .map((a) => {
          const entries = getTimeEntries(a);
          const todaysEntries = entries.filter((te) => {
            const d = new Date(te.date);
            return d >= today && d < tomorrow;
          });
          return { ...a.toJSON(), timeEntries: todaysEntries };
        })
        .filter((a) => a.timeEntries.length > 0);
    }

    const activityStats = processedActivities.map((act) => ({
      id: act.id,
      activityId: act.activityId || act.id,
      title: act.title,
      description: act.description,
      totalMinutes: getTimeEntries(act).reduce((sum, te) => sum + (te?.duration || 0), 0),
      timeEntries: getTimeEntries(act),
      status: act.status,
      comment: act.comment,
      institute: act.institute || 0,
      school: act.school || 0,
      sessionType: act.sessionType || null
    }));

    const totalMinutes = activityStats.reduce((sum, a) => sum + a.totalMinutes, 0);
    const totalHours = totalMinutes / 60;

    let workdays;
    if (days && days > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(today.getDate() - (days - 1));
      workdays = await Workday.findAll({
        where: { userId: employeeId, date: { [Op.gte]: start, [Op.lte]: today } },
        order: [['date', 'DESC']]
      });
    } else {
      workdays = await Workday.findAll({
        where: { userId: employeeId },
        order: [['date', 'DESC']],
        limit: 30
      });
    }
    workdays = workdays.map((w) => {
      let durationHours = 0;
      if (w.clockIn && w.clockOut) {
        durationHours = (new Date(w.clockOut) - new Date(w.clockIn)) / (1000 * 60 * 60);
        durationHours = Math.max(0, Number(durationHours.toFixed(2)));
      }
      const obj = w.toJSON();
      return { ...obj, totalHours: durationHours };
    });

    res.json({
      employee: {
        name: employee.name,
        email: employee.email,
        department: employee.department || null
      },
      totalHours: Number(totalHours.toFixed(2)),
      activities: activityStats,
      workdays
    });
  } catch (error) {
    console.error('Manager analytics error for employeeId:', req.params.employeeId, error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/manager/activities', async (req, res) => {

  try {
    const { employeeId } = req.params;
    const todayOnly = req.query.today === 'true';
    const days = parseInt(req.query.days, 10);
    let employee;
    let activities;
    if (req.user.role === 'admin') {
      employee = await User.findOne({ 
        where: { employeeCode: employeeId, role: { [Op.in]: ['employee', 'manager', 'teamlead'] } }
      });
      if (!employee) {
        console.log('User not found with code:', employeeId);
        return res.status(404).json({ error: 'User not found' });
      }
      // Fetch department separately
      if (employee.departmentId) {
        employee.department = await Department.findByPk(employee.departmentId);
      }
      // Fetch branch separately
      if (employee.branchId) {
        employee.branch = await Branch.findByPk(employee.branchId);
      }
      activities = await Activity.findAll({ where: { assignedToId: employeeId } });
    } else {
      // Manager - check based on manager type
      const isBranchManager = req.user.managerType === 'branch';
      
      const whereClause = {
        employeeCode: employeeId,
        role: { [Op.in]: ['employee', 'manager', 'teamlead'] }
      };
      
      if (isBranchManager) {
        whereClause.branchId = req.user.branchId;
      } else {
        whereClause.departmentId = req.user.departmentId;
      }
      
      employee = await User.findOne({ where: whereClause });
      
      if (!employee) {
        console.log(`User not found in ${isBranchManager ? 'branch' : 'department'} with code:`, employeeId);
        return res.status(404).json({ 
          error: isBranchManager 
            ? 'User not found in your branch' 
            : 'User not found in your department' 
        });
      }
      
      // Fetch department separately
      if (employee.departmentId) {
        employee.department = await Department.findByPk(employee.departmentId);
      }
      // Fetch branch separately
      if (employee.branchId) {
        employee.branch = await Branch.findByPk(employee.branchId);
      }
      
      // Fetch activities - branch managers see all activities, department managers only their dept
      activities = await Activity.findAll({ 
        where: { assignedToId: employeeId }
      });
    }
    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      activities = activities.map(a => {
        const entries = getTimeEntries(a);
        const todaysEntries = entries.filter(te => {
          const d = new Date(te.date);
          return d >= today && d < tomorrow;
        });
        return { ...a.toJSON(), timeEntries: todaysEntries };
      }).filter(a => a.timeEntries.length > 0);
    }
    // Aggregate hours per activity
    const activityStats = activities.map(act => ({
      id: act.id,
      activityId: act.activityId || act.id,
      title: act.title,
      description: act.description,
      totalMinutes: getTimeEntries(act).reduce((sum, te) => sum + (te?.duration || 0), 0),
      timeEntries: getTimeEntries(act),
      status: act.status,
      comment: act.comment,
      // include session distribution fields for frontend graphs
      institute: act.institute || 0,
      school: act.school || 0,
      sessionType: act.sessionType || null,
    }));
    const totalMinutes = activityStats.reduce((sum, a) => sum + a.totalMinutes, 0);
    const totalHours = totalMinutes / 60;
    // Workday (clock in/out) history
    let workdays;
    if (days && days > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(today.getDate() - (days - 1));
      workdays = await Workday.findAll({ where: { userId: employeeId, date: { [Op.gte]: start, [Op.lte]: today } }, order: [['date','DESC']] });
    } else {
      workdays = await Workday.findAll({ where: { userId: employeeId }, order: [['date','DESC']] });
    }
    // Add totalHours to each workday
    workdays = workdays.map(w => {
      let totalHours = 0;
      if (w.clockIn && w.clockOut) {
        totalHours = (new Date(w.clockOut) - new Date(w.clockIn)) / (1000 * 60 * 60);
        totalHours = Math.max(0, Number(totalHours.toFixed(2)));
      }
      const obj = w.toJSON();
      return { ...obj, totalHours };
    });
    res.json({
      employee: {
        name: employee.name,
        email: employee.email,
        department: employee.department || null
      },
      totalHours: Number(totalHours.toFixed(2)),
      activities: activityStats,
      workdays
    });
  } catch (error) {
    console.error('Employee analytics error for employeeId:', req.params.employeeId, error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get activities for a specific employee in a date range (datewise report)
router.get('/employee/:employeeId/activities-by-date', auth, checkRole(['manager', 'admin', 'senior_manager']), async (req, res) => {
  try {
    const { employeeId } = req.params;
    let { startDate, endDate, date } = req.query;
    // Support old ?date=... for backward compatibility
    if (date && !startDate && !endDate) {
      startDate = endDate = date;
    }
    if (!startDate || !endDate) return res.status(400).json({ error: 'Start date and end date are required' });
    let employee;
    if (req.user.role === 'admin') {
      employee = await User.findOne({ where: { employeeCode: employeeId, role: { [Op.in]: ['employee', 'manager', 'teamlead'] } } });
    } else {
      // Manager - check based on manager type
      const isBranchManager = req.user.managerType === 'branch';
      const whereClause = {
        employeeCode: employeeId,
        role: { [Op.in]: ['employee', 'manager', 'teamlead'] }
      };
      
      if (isBranchManager) {
        whereClause.branchId = req.user.branchId;
      } else {
        whereClause.departmentId = req.user.departmentId;
      }
      
      employee = await User.findOne({ where: whereClause });
    }
    
    if (!employee) {
      const errorMsg = req.user.role === 'admin' 
        ? 'User not found' 
        : (req.user.managerType === 'branch' ? 'User not found in your branch' : 'User not found in your department');
      return res.status(404).json({ error: errorMsg });
    }
    
    // Parse date range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    // Find activities assigned to this employee
    const where = { assignedToId: employeeId };
    const activities = await Activity.findAll({ where });
    // Filter timeEntries to only those in the selected date range
    const filtered = activities.map(act => ({
      id: act.id,
      title: act.title,
      description: act.description,
      status: act.status,
      comment: act.comment,
      department: act.department ? { name: act.department.name } : undefined,
      institute: act.institute || 0,
      school: act.school || 0,
      sessionType: act.sessionType || null,
      timeEntries: getTimeEntries(act).filter(te => {
        const d = new Date(te.date);
        return d >= start && d <= end;
      })
    })).filter(act => act.timeEntries.length > 0);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Add new employee to manager's department
router.post('/employees', auth, checkRole(['manager','admin']), async (req, res) => {
  try {
    const { employeeCode, name, email } = req.body;
    if (!employeeCode || !name || !email) {
      return res.status(400).json({ message: 'Employee code, name, and email are required.' });
    }
    // Manager-created team members use the standard default password.
    const password = DEFAULT_NEW_USER_PASSWORD;
    const departmentId = req.user.departmentId;
    const branchId = req.user.branchId || null;
    // Check for duplicate email
    const existing = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    const existingCode = await User.findByPk(employeeCode);
    if (existingCode) {
      return res.status(400).json({ message: 'Employee code already exists.' });
    }
    const newUser = await User.create({
      employeeCode,
      name,
      email: email.trim().toLowerCase(),
      password,
      role: 'employee',
      departmentId,
      branchId
    });

    try {
      const [department, branch] = await Promise.all([
        departmentId ? Department.findByPk(departmentId) : null,
        branchId ? Branch.findByPk(branchId) : null,
      ]);
      await sendWelcomeEmail({
        user: newUser,
        department,
        branch,
        defaultPassword: password,
      });
    } catch (mailError) {
      console.error('Welcome email failed:', mailError);
    }

    const json = newUser.toJSON();
    delete json.password;
    res.status(201).json(json);
  } catch (err) {
    console.error('Add employee error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const parseMonthRange = (month) => {
  if (!month) {
    throw new Error('Month is required (format: YYYY-MM)');
  }

  const [year, mon] = month.split('-').map(Number);
  if (!year || !mon) {
    throw new Error('Invalid month format');
  }

  const paddedMonth = mon.toString().padStart(2, '0');
  const startDateStr = `${year}-${paddedMonth}-01`;
  const daysInMonth = new Date(year, mon, 0).getDate();
  const endDateStr = `${year}-${paddedMonth}-${daysInMonth.toString().padStart(2, '0')}`;
  const startRange = getUtcRangeForDate(startDateStr);
  const endRange = getUtcRangeForDate(endDateStr);

  if (!startRange || !endRange) {
    throw new Error('Invalid month supplied');
  }

  return { start: startRange.start, end: endRange.end };
};

const computeEmployeesWithoutActivity = async (start, end, employeeScope = {}) => {
  const employees = await User.findAll({
    where: { role: 'employee', ...employeeScope },
    attributes: ['employeeCode', 'name', 'departmentId', 'branchId'],
    include: [
      { model: Department, as: 'department', attributes: ['name'] },
      { model: Branch, as: 'branch', attributes: ['name'] }
    ],
    order: [['name', 'ASC']]
  });

  const employeeCodes = employees
    .map(employee => employee.employeeCode)
    .filter(Boolean);

  if (employeeCodes.length === 0) return [];

  const activities = await Activity.findAll({
    where: {
      assignedToId: { [Op.in]: employeeCodes },
      status: { [Op.ne]: 'deleted' }
    },
    attributes: [
      'assignedToId',
      'timeEntries',
      'timeSpent',
      'actual_hours_new',
      'project_id',
      'hierarchy_level',
      'startTime',
      'endTime',
      'createdAt',
      'updatedAt'
    ]
  });

  const employeesWithActivity = new Set();
  activities.forEach(activity => {
    const hasEntryInRange = getTimeEntries(activity).some(entry => {
      const rawDate = entry?.date || entry?.punchIn || entry?.punchOut;
      if (!rawDate) return false;

      const entryDate = new Date(rawDate);
      if (Number.isNaN(entryDate.getTime()) || entryDate < start || entryDate > end) {
        return false;
      }

      const duration = Number(entry?.duration ?? entry?.durationMinutes ?? 0);
      return Number.isFinite(duration) && duration > 0;
    });

    if (hasEntryInRange) employeesWithActivity.add(activity.assignedToId);
  });

  const startDateKey = toTimezoneDateKey(start);
  const endDateKey = toTimezoneDateKey(end);
  const leaveWorkdays = await Workday.findAll({
    where: {
      userId: { [Op.in]: employeeCodes },
      date: { [Op.between]: [startDateKey, endDateKey] },
      attendanceType: 'leave'
    },
    attributes: ['userId'],
    raw: true
  });

  const employeesWithRecordedWorkday = new Set(leaveWorkdays.map(w => w.userId));

  return employees.filter(emp => {
    const code = emp.employeeCode;
    return !employeesWithActivity.has(code) && !employeesWithRecordedWorkday.has(code);
  });
};

const pickFirstStringValue = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
};

const resolveSessionCountValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    if (typeof candidate === 'string' && !candidate.trim()) {
      continue;
    }

    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }

  return '';
};

const collectActivityRows = (activities, rangeStart, rangeEnd) => {
  return activities.flatMap(activity => {
    const employeeCode = activity.assignedTo?.employeeCode || activity.assignedToId;
    if (!employeeCode) {
      return [];
    }

    const entries = getTimeEntries(activity);
    if (!entries.length) {
      return [];
    }

    const employeeName = activity.assignedTo?.name || '';
    const departmentName = activity.assignedTo?.department?.name || '';
    const branchName = activity.assignedTo?.branch?.name || '';
    const activityTitle = activity.title || '';
    const activityDescription = activity.description || '';
    const activityComment = activity.comment || '';
    const normalizedTitle = activityTitle.trim().toLowerCase();
    const isSchoolSession = normalizedTitle === 'school session';
    const isInstituteSession = normalizedTitle === 'institute session';

    return entries.map(entry => {
      const entryDateRaw = entry.date || entry.punchIn || entry.punchOut;
      if (!entryDateRaw) {
        return null;
      }

      const entryDate = new Date(entryDateRaw);
      if (Number.isNaN(entryDate.getTime()) || entryDate < rangeStart || entryDate > rangeEnd) {
        return null;
      }

      const punchIn = entry.punchIn ? new Date(entry.punchIn) : null;
      const punchOut = entry.punchOut ? new Date(entry.punchOut) : null;
      const durationMinutesValue = Number(entry.duration ?? 0);
      const sessionCount = resolveSessionCountValue(entry.sessionsCount, activity.sessionsCount);
      console.log('Session count debug:', {
        activityTitle: activityTitle,
        entrySessionsCount: entry.sessionsCount,
        activitySessionsCount: activity.sessionsCount,
        resolvedSessionCount: sessionCount
      });
      const schoolName = pickFirstStringValue(
        entry.schoolName,
        entry.school_name,
        entry.schoolLabel,
        entry.school,
        activity.schoolName,
        activity.school
      );
      const instituteBranch = pickFirstStringValue(
        entry.branchLocation,
        entry.branch_location,
        entry.branchName,
        entry.branch,
        activity.branchLocation
      );

      return {
        employeeCode,
        employeeName,
        departmentName,
        branchName,
        activityTitle,
        activityDescription,
        activityComment,
        entryComment: entry.description || entry.comment || '',
        entryDate,
        punchIn,
        punchOut,
        durationMinutes: Number.isFinite(durationMinutesValue) && durationMinutesValue > 0 ? durationMinutesValue : null,
        schoolName: isSchoolSession ? schoolName : '',
        schoolSessionsCount: isSchoolSession ? (sessionCount === '' ? '' : sessionCount) : '',
        instituteBranch: isInstituteSession ? instituteBranch : '',
        instituteSessionsCount: isInstituteSession ? (sessionCount === '' ? '' : sessionCount) : ''
      };
    }).filter(Boolean);
  });
};

const resolveActivityRange = (query) => {
  const { month, startDate, endDate } = query;

  if (month) {
    const { start, end } = parseMonthRange(month);
    return {
      rangeStart: start,
      rangeEnd: end,
      filenameSegment: month
    };
  }

  if (startDate && endDate) {
    const startRange = getUtcRangeForDate(startDate);
    const endRange = getUtcRangeForDate(endDate);
    if (!startRange || !endRange) {
      throw new Error('INVALID_RANGE');
    }
    return {
      rangeStart: startRange.start,
      rangeEnd: endRange.end,
      filenameSegment: `${startDate}_to_${endDate}`
    };
  }

  throw new Error('MISSING_RANGE');
};

const formatDateForExcel = (date) => {
  const shifted = convertToTimezoneDate(date);
  return shifted ? shifted.toISOString().slice(0, 10) : '';
};

const formatTimeForExcel = (date) => {
  const shifted = convertToTimezoneDate(date);
  return shifted ? shifted.toISOString().slice(11, 16) : '';
};

const formatDurationHours = (minutes) => (Number.isFinite(minutes) ? (minutes / 60).toFixed(2) : '');

router.get('/employees/activities-excel', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const { rangeStart, rangeEnd, filenameSegment } = resolveActivityRange(req.query);

    const assignedScope = {};
    if (req.user.role === 'manager') {
      if (req.user.managerType === 'branch') {
        assignedScope.branchId = req.user.branchId;
      } else {
        assignedScope.departmentId = req.user.departmentId;
      }
    }

    const activities = await Activity.findAll({
      where: {
        status: { [Op.ne]: 'deleted' }
      },
      attributes: ['id', 'title', 'description', 'comment', 'assignedToId', 'timeEntries', 'schoolName', 'branchLocation', 'sessionsCount'],
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['employeeCode', 'name', 'departmentId', 'branchId'],
          required: true,
          where: Object.keys(assignedScope).length ? assignedScope : undefined,
          include: [
            { model: Department, as: 'department', attributes: ['name'] },
            { model: Branch, as: 'branch', attributes: ['name'] }
          ]
        }
      ]
    });

    // Fetch workday data for attendance information
    const workdays = await Workday.findAll({
      where: {
        date: {
          [Op.between]: [rangeStart.toISOString().slice(0, 10), rangeEnd.toISOString().slice(0, 10)]
        }
      },
      attributes: ['userId', 'date', 'attendanceType']
    });

    // Create a map for quick lookup of attendance data
    const attendanceMap = new Map();
    workdays.forEach(workday => {
      const workdayDate = workday.date instanceof Date ? workday.date : new Date(workday.date);
      const key = `${workday.userId}_${workdayDate.toISOString().slice(0, 10)}`;
      attendanceMap.set(key, workday.attendanceType);
    });

    const rows = collectActivityRows(activities, rangeStart, rangeEnd).sort((a, b) => {
      const codeCompare = String(a.employeeCode).localeCompare(String(b.employeeCode));
      if (codeCompare !== 0) return codeCompare;
      return a.entryDate.getTime() - b.entryDate.getTime();
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employee Activities');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Attendance Status', key: 'attendanceStatus', width: 18 },
      { header: 'Employee Code', key: 'employeeCode', width: 18 },
      { header: 'Employee Name', key: 'employeeName', width: 26 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Branch', key: 'branch', width: 22 },
      { header: 'Activity Title', key: 'activityTitle', width: 30 },
      { header: 'Activity Description', key: 'activityDescription', width: 36 },
      { header: 'Activity Comment', key: 'activityComment', width: 28 },
      { header: 'Entry Comment', key: 'entryComment', width: 28 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Duration (hrs)', key: 'durationHours', width: 16 },
      { header: 'School Name', key: 'schoolName', width: 28 },
      { header: 'School Sessions Count', key: 'schoolSessionsCount', width: 22 },
      { header: 'Institute Branch', key: 'instituteBranch', width: 28 },
      { header: 'Institute Sessions Count', key: 'instituteSessionsCount', width: 24 }
    ];

    rows.forEach(row => {
      const dateKey = row.entryDate.toISOString().slice(0, 10);
      const attendanceKey = `${row.employeeCode}_${dateKey}`;
      const attendanceType = attendanceMap.get(attendanceKey) || 'full_day';
      
      // Format attendance status for display
      let attendanceStatus = 'Present';
      if (attendanceType === 'full_day') {
        attendanceStatus = 'Full Day';
      } else if (attendanceType === 'half_day') {
        attendanceStatus = 'Half Day';
      } else if (attendanceType === 'leave') {
        attendanceStatus = 'On Leave';
      }
      
      sheet.addRow({
        date: formatDateForExcel(row.entryDate),
        attendanceStatus: attendanceStatus,
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        department: row.departmentName,
        branch: row.branchName,
        activityTitle: row.activityTitle,
        activityDescription: row.activityDescription,
        activityComment: row.activityComment,
        entryComment: row.entryComment,
        startTime: formatTimeForExcel(row.punchIn),
        endTime: formatTimeForExcel(row.punchOut),
        durationHours: formatDurationHours(row.durationMinutes),
        schoolName: row.schoolName,
        schoolSessionsCount: row.schoolSessionsCount,
        instituteBranch: row.instituteBranch,
        instituteSessionsCount: row.instituteSessionsCount
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employee_activities_${filenameSegment}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (error.message === 'MISSING_RANGE') {
      return res.status(400).json({ error: 'Please provide month or both startDate and endDate query parameters.' });
    }
    if (error.message === 'INVALID_RANGE') {
      return res.status(400).json({ error: 'Invalid date range supplied' });
    }
    console.error('Employee activities export error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/employee/:employeeId/activities-excel', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { rangeStart, rangeEnd, filenameSegment } = resolveActivityRange(req.query);

    const employeeWhere = {
      employeeCode: employeeId,
      role: { [Op.in]: ['employee', 'manager', 'teamlead'] }
    };

    if (req.user.role === 'manager') {
      if (req.user.managerType === 'branch') {
        employeeWhere.branchId = req.user.branchId;
      } else {
        employeeWhere.departmentId = req.user.departmentId;
      }
    }

    const employee = await User.findOne({
      where: employeeWhere,
      include: [
        { model: Department, as: 'department', attributes: ['name'] },
        { model: Branch, as: 'branch', attributes: ['name'] }
      ],
      attributes: ['employeeCode', 'name', 'departmentId', 'branchId']
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const activities = await Activity.findAll({
      where: {
        assignedToId: employee.employeeCode,
        status: { [Op.ne]: 'deleted' }
      },
      attributes: ['id', 'title', 'description', 'comment', 'assignedToId', 'timeEntries', 'schoolName', 'branchLocation', 'sessionsCount'],
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['employeeCode', 'name'],
          include: [
            { model: Department, as: 'department', attributes: ['name'] },
            { model: Branch, as: 'branch', attributes: ['name'] }
          ]
        }
      ]
    });

    // Fetch workday data for attendance information
    const workdays = await Workday.findAll({
      where: {
        userId: employee.employeeCode,
        date: {
          [Op.between]: [rangeStart.toISOString().slice(0, 10), rangeEnd.toISOString().slice(0, 10)]
        }
      },
      attributes: ['userId', 'date', 'attendanceType']
    });

    // Create a map for quick lookup of attendance data
    const attendanceMap = new Map();
    workdays.forEach(workday => {
      const workdayDate = workday.date instanceof Date ? workday.date : new Date(workday.date);
      const key = `${workday.userId}_${workdayDate.toISOString().slice(0, 10)}`;
      attendanceMap.set(key, workday.attendanceType);
    });

    const rows = collectActivityRows(activities, rangeStart, rangeEnd).sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employee Activities');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Attendance Status', key: 'attendanceStatus', width: 18 },
      { header: 'Employee Code', key: 'employeeCode', width: 18 },
      { header: 'Employee Name', key: 'employeeName', width: 26 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Branch', key: 'branch', width: 22 },
      { header: 'Activity Title', key: 'activityTitle', width: 30 },
      { header: 'Activity Description', key: 'activityDescription', width: 36 },
      { header: 'Activity Comment', key: 'activityComment', width: 28 },
      { header: 'Entry Comment', key: 'entryComment', width: 28 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Duration (hrs)', key: 'durationHours', width: 16 },
      { header: 'School Name', key: 'schoolName', width: 28 },
      { header: 'School Sessions Count', key: 'schoolSessionsCount', width: 22 },
      { header: 'Institute Branch', key: 'instituteBranch', width: 28 },
      { header: 'Institute Sessions Count', key: 'instituteSessionsCount', width: 24 }
    ];

    rows.forEach(row => {
      const dateKey = row.entryDate.toISOString().slice(0, 10);
      const attendanceKey = `${row.employeeCode}_${dateKey}`;
      const attendanceType = attendanceMap.get(attendanceKey) || 'full_day';
      
      // Format attendance status for display
      let attendanceStatus = 'Present';
      if (attendanceType === 'full_day') {
        attendanceStatus = 'Full Day';
      } else if (attendanceType === 'half_day') {
        attendanceStatus = 'Half Day';
      } else if (attendanceType === 'leave') {
        attendanceStatus = 'On Leave';
      }
      
      sheet.addRow({
        date: formatDateForExcel(row.entryDate),
        attendanceStatus: attendanceStatus,
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        department: row.departmentName || employee.department?.name || '',
        branch: row.branchName || employee.branch?.name || '',
        activityTitle: row.activityTitle,
        activityDescription: row.activityDescription,
        activityComment: row.activityComment,
        entryComment: row.entryComment,
        startTime: formatTimeForExcel(row.punchIn),
        endTime: formatTimeForExcel(row.punchOut),
        durationHours: formatDurationHours(row.durationMinutes),
        schoolName: row.schoolName,
        schoolSessionsCount: row.schoolSessionsCount,
        instituteBranch: row.instituteBranch,
        instituteSessionsCount: row.instituteSessionsCount
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employee_${employee.employeeCode}_activities_${filenameSegment}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (error.message === 'MISSING_RANGE') {
      return res.status(400).json({ error: 'Please provide month or both startDate and endDate query parameters.' });
    }
    if (error.message === 'INVALID_RANGE') {
      return res.status(400).json({ error: 'Invalid date range supplied' });
    }
    console.error('Single employee activities export error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

const collectSessionCounts = (activities, rangeStart, rangeEnd) => {
  const countsByEmployee = new Map();

  activities
    .filter(activity => {
      const title = (activity.title || '').trim().toLowerCase();
      return title === 'school session' || title === 'institute session';
    })
    .forEach(activity => {
      const employeeCode = activity.assignedTo?.employeeCode || activity.assignedToId;
      if (!employeeCode) {
        return;
      }

      const employeeName = activity.assignedTo?.name || '';
      const entries = getTimeEntries(activity);
      if (!entries.length) {
        return;
      }

      const isSchoolSession = (activity.title || '').trim().toLowerCase() === 'school session';
      const isInstituteSession = (activity.title || '').trim().toLowerCase() === 'institute session';
      const sessionsTotal = Number.isFinite(Number(activity.sessionsCount)) ? Number(activity.sessionsCount) : 0;

      entries.forEach(entry => {
        const entryDateRaw = entry.date || entry.punchIn || entry.punchOut;
        const entryDate = entryDateRaw ? new Date(entryDateRaw) : null;
        if (!entryDate || Number.isNaN(entryDate.getTime()) || entryDate < rangeStart || entryDate > rangeEnd) {
          return;
        }

        const dateKey = entryDate.toISOString().slice(0, 10);
        const entrySessions = Number.isFinite(Number(entry.sessionsCount)) ? Number(entry.sessionsCount) : sessionsTotal;
        const increment = Number.isFinite(entrySessions) && entrySessions > 0 ? entrySessions : 1;

        if (!countsByEmployee.has(employeeCode)) {
          countsByEmployee.set(employeeCode, { name: employeeName, dates: new Map() });
        }

        const employeeRecord = countsByEmployee.get(employeeCode);
        const dateCounts = employeeRecord.dates.get(dateKey) || {
          schoolSessions: 0,
          instituteSessions: 0,
          schoolNames: new Set(),
          branchLocations: new Set()
        };

        const contextSchoolName = [
          entry.schoolName,
          entry.school_name,
          entry.schoolLabel,
          entry.school,
          activity.schoolName,
          activity.school
        ].find(value => typeof value === 'string' && value.trim());

        const contextBranchLocation = [
          entry.branchLocation,
          entry.branch_location,
          entry.branchName,
          entry.branch,
          activity.branchLocation
        ].find(value => typeof value === 'string' && value.trim());

        if (isSchoolSession) {
          dateCounts.schoolSessions += increment;
          if (contextSchoolName) {
            dateCounts.schoolNames.add(contextSchoolName.trim());
          }
        }

        if (isInstituteSession) {
          dateCounts.instituteSessions += increment;
          if (contextBranchLocation) {
            dateCounts.branchLocations.add(contextBranchLocation.trim());
          }
        }

        employeeRecord.dates.set(dateKey, dateCounts);
      });
    });

  return countsByEmployee;
};

router.get('/employees/sessions-excel', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    let rangeStart;
    let rangeEnd;
    let filenameSegment;

    try {
      ({ rangeStart, rangeEnd, filenameSegment } = resolveActivityRange(req.query));
    } catch (error) {
      if (error.message === 'MISSING_RANGE') {
        return res.status(400).json({ error: 'Please provide month or both startDate and endDate query parameters.' });
      }
      if (error.message === 'INVALID_RANGE') {
        return res.status(400).json({ error: 'Invalid date range supplied' });
      }
      throw error;
    }

    const assignedScope = {};
    if (req.user.role === 'manager') {
      if (req.user.managerType === 'branch') {
        assignedScope.branchId = req.user.branchId;
      } else {
        assignedScope.departmentId = req.user.departmentId;
      }
    }

    const activities = await Activity.findAll({
      where: {
        status: { [Op.ne]: 'deleted' }
      },
      attributes: ['id', 'title', 'assignedToId', 'timeEntries', 'institute', 'school', 'sessionType', 'sessionsCount', 'schoolName', 'branchLocation'],
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['employeeCode', 'name', 'departmentId', 'branchId'],
          required: true,
          where: Object.keys(assignedScope).length ? assignedScope : undefined
        }
      ]
    });

    const countsByEmployee = collectSessionCounts(activities, rangeStart, rangeEnd);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sessions');
    sheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 18 },
      { header: 'Employee Name', key: 'employeeName', width: 28 },
      { header: 'Date', key: 'date', width: 16 },
      { header: 'School Sessions', key: 'schoolSessions', width: 18 },
      { header: 'Institute Sessions', key: 'instituteSessions', width: 19 },
      { header: 'Total Sessions', key: 'total', width: 16 },
      { header: 'School Name', key: 'schoolName', width: 28 },
      { header: 'Branch Location', key: 'branchLocation', width: 28 }
    ];

    const sortedEmployees = Array.from(countsByEmployee.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    sortedEmployees.forEach(([employeeCode, record]) => {
      const sortedDates = Array.from(record.dates.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      sortedDates.forEach(([dateKey, counts]) => {
        const total = (counts.schoolSessions || 0) + (counts.instituteSessions || 0);
        const schoolNameDisplay = counts.schoolNames instanceof Set ? Array.from(counts.schoolNames).join(', ') : (counts.schoolName || '');
        const branchLocationDisplay = counts.branchLocations instanceof Set ? Array.from(counts.branchLocations).join(', ') : (counts.branchLocation || '');
        sheet.addRow({
          employeeCode,
          employeeName: record.name,
          date: dateKey,
          schoolSessions: counts.schoolSessions || 0,
          instituteSessions: counts.instituteSessions || 0,
          total,
          schoolName: schoolNameDisplay,
          branchLocation: branchLocationDisplay
        });
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employees_sessions_${filenameSegment}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Employees sessions export error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/employee/:employeeId/sessions-excel', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId } = req.params;

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date range supplied' });
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    let employee;
    if (req.user.role === 'admin') {
      employee = await User.findOne({ where: { employeeCode: employeeId, role: { [Op.in]: ['employee', 'manager', 'teamlead'] } } });
    } else {
      const scopeWhere = {
        employeeCode: employeeId,
        role: { [Op.in]: ['employee', 'manager', 'teamlead'] }
      };
      if (req.user.managerType === 'branch') {
        scopeWhere.branchId = req.user.branchId;
      } else {
        scopeWhere.departmentId = req.user.departmentId;
      }
      employee = await User.findOne({ where: scopeWhere });
      if (!employee) {
        return res.status(403).json({ error: 'Forbidden: User not in your scope' });
      }
    }

    if (!employee) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activities = await Activity.findAll({
      where: {
        assignedToId: employeeId,
        status: { [Op.ne]: 'deleted' }
      },
      attributes: ['id', 'title', 'assignedToId', 'timeEntries', 'institute', 'school', 'sessionType', 'sessionsCount', 'schoolName', 'branchLocation'],
      include: [
        { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] }
      ]
    });

    const countsByEmployee = collectSessionCounts(activities, start, end);
    const employeeRecord = countsByEmployee.get(employee.employeeCode) || { name: employee.name, dates: new Map() };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sessions');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'School Sessions', key: 'schoolSessions', width: 20 },
      { header: 'Institute Sessions', key: 'instituteSessions', width: 20 },
      { header: 'Total Sessions', key: 'total', width: 18 },
      { header: 'School Name', key: 'schoolName', width: 28 },
      { header: 'Branch Location', key: 'branchLocation', width: 28 }
    ];

    const sortedDates = Array.from(employeeRecord.dates.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    sortedDates.forEach(([dateKey, counts]) => {
      const total = (counts.schoolSessions || 0) + (counts.instituteSessions || 0);
      const schoolNameDisplay = counts.schoolNames instanceof Set ? Array.from(counts.schoolNames).join(', ') : (counts.schoolName || '');
      const branchLocationDisplay = counts.branchLocations instanceof Set ? Array.from(counts.branchLocations).join(', ') : (counts.branchLocation || '');
      sheet.addRow({
        date: dateKey,
        schoolSessions: counts.schoolSessions || 0,
        instituteSessions: counts.instituteSessions || 0,
        total,
        schoolName: schoolNameDisplay,
        branchLocation: branchLocationDisplay
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="employee_${employeeId}_sessions_${startDate}_to_${endDate}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/employees/with-activity-today', auth, checkRole(['manager', 'admin']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const employeeWhere = { role: { [Op.in]: ['employee', 'manager', 'teamlead'] } };

    if (req.user.role === 'manager') {
      if (req.user.managerType === 'branch') {
        employeeWhere.branchId = req.user.branchId;
      } else {
        employeeWhere.departmentId = req.user.departmentId;
      }
    }

    const employees = await User.findAll({
      where: employeeWhere,
      attributes: ['employeeCode', 'name', 'departmentId', 'branchId'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'location'] }
      ],
      order: [['name', 'ASC']]
    });

    if (!employees.length) {
      return res.json([]);
    }

    const employeeByCode = new Map();
    const employeeCodes = [];
    employees.forEach(emp => {
      const code = typeof emp.employeeCode === 'string' ? emp.employeeCode.trim() : '';
      if (code) {
        employeeCodes.push(code);
        employeeByCode.set(code, emp);
      }
    });

    if (!employeeCodes.length) {
      return res.json([]);
    }

    const activities = await Activity.findAll({
      where: {
        assignedToId: { [Op.in]: employeeCodes },
        status: { [Op.ne]: 'deleted' }
      },
      attributes: ['assignedToId', 'timeEntries', 'title']
    });

    const summaryByEmployee = new Map();

    activities.forEach(activity => {
      const entries = getTimeEntries(activity);
      if (!entries.length) return;

      const todaysEntries = entries.filter(entry => {
        const rawDate = entry?.date || entry?.punchIn || entry?.punchOut;
        if (!rawDate) return false;
        const entryDate = new Date(rawDate);
        if (Number.isNaN(entryDate.getTime())) return false;
        return entryDate >= today && entryDate < tomorrow;
      });

      if (!todaysEntries.length) return;

      const code = activity.assignedToId;
      if (!employeeByCode.has(code)) return;

      const baseEmployee = employeeByCode.get(code);
      const existing = summaryByEmployee.get(code) || {
        employeeCode: code,
        name: baseEmployee.name,
        department: baseEmployee.department?.name || null,
        branch: baseEmployee.branch?.name || null,
        todayEntries: 0,
        todayMinutes: 0
      };

      todaysEntries.forEach(entry => {
        const duration = Number(entry?.duration ?? entry?.durationMinutes ?? 0);
        if (Number.isFinite(duration) && duration > 0) {
          existing.todayMinutes += duration;
        }
        existing.todayEntries += 1;
      });

      summaryByEmployee.set(code, existing);
    });

    const response = Array.from(summaryByEmployee.values())
      .map(summary => ({
        ...summary,
        todayMinutes: Number(summary.todayMinutes.toFixed(2)),
        todayHours: Number((summary.todayMinutes / 60).toFixed(2))
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(response);
  } catch (error) {
    console.error('Employees with activity today error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/employees/no-activity-report', auth, checkRole(['manager', 'admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const startRange = getUtcRangeForDate(startDate);
    const endRange = getUtcRangeForDate(endDate);
    if (!startRange || !endRange) {
      return res.status(400).json({ error: 'Invalid date range supplied' });
    }
    const start = startRange.start;
    const end = endRange.end;
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const scope = req.user.role === 'manager'
      ? (req.user.managerType === 'branch'
          ? { branchId: req.user.branchId }
          : { departmentId: req.user.departmentId })
      : {};

    const list = await computeEmployeesWithoutActivity(start, end, scope);
    res.json(list);
  } catch (error) {
    console.error('No activity report error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/employees/no-activity-report-excel', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const startRange = getUtcRangeForDate(startDate);
    const endRange = getUtcRangeForDate(endDate);
    if (!startRange || !endRange) {
      return res.status(400).json({ error: 'Invalid date range supplied' });
    }
    const start = startRange.start;
    const end = endRange.end;
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const employees = await computeEmployeesWithoutActivity(start, end);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('No Activity Employees');
    sheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 18 },
      { header: 'Employee Name', key: 'employeeName', width: 28 },
      { header: 'Department', key: 'department', width: 24 },
      { header: 'Branch', key: 'branch', width: 24 }
    ];

    employees.forEach(emp => {
      sheet.addRow({
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        department: emp.department?.name || '',
        branch: emp.branch?.name || ''
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="no_activity_employees_${startDate}_to_${endDate}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('No activity excel error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
