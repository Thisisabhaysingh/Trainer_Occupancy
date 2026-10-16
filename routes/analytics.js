const express = require("express");
const router = express.Router();
const { Op, fn, col, where, literal } = require("sequelize");

const { User, Activity, Branch, Department, Workday } = require("../models");
const { auth, checkRole } = require("../middleware/auth");

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

// ================== Get overall analytics (admin only) ==================
router.get("/", auth, checkRole(["admin"]), async (req, res) => {
  const routeStart = Date.now();
  try {
    const todayOnly = req.query.today === "true";

    // Get all departments
    const departments = await Department.findAll();
    const afterDepts = Date.now();

    // Get all activities - select only needed fields to reduce memory usage
    let activities = await Activity.findAll({
      attributes: ['id', 'title', 'status', 'departmentId', 'assignedToId', 'sessionType', 'institute', 'school', 'timeEntries'],
      include: [
        { model: Department, as: "department", attributes: ['id', 'name'] },
        { model: User, as: "assignedTo", attributes: ['employeeCode'] }
      ],
      raw: false
    });
    const afterActivities = Date.now();

    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Keep only today's entries - more efficient processing
      activities = activities
        .map((a) => {
          const entries = getTimeEntries(a);
          const todaysEntries = entries.filter((te) => {
            const d = new Date(te.date);
            return d >= today && d < tomorrow;
          });
          if (todaysEntries.length === 0) return null;
          return { 
            ...a.toJSON(), 
            timeEntries: todaysEntries,
            totalMinutes: todaysEntries.reduce((s, te) => s + (te.duration || 0), 0)
          };
        })
        .filter(Boolean);
    } else {
      activities = activities.map((a) => {
        const entries = getTimeEntries(a);
        return {
          ...a.toJSON(),
          timeEntries: entries,
          totalMinutes: entries.reduce((s, te) => s + (te.duration || 0), 0)
        };
      });
    }
    
    // Create lookup maps for O(1) access instead of O(n) filtering
    const activitiesByDept = new Map();
    const activitiesByEmployee = new Map();
    
    activities.forEach(a => {
      const deptName = a.department?.name;
      if (deptName) {
        if (!activitiesByDept.has(deptName)) activitiesByDept.set(deptName, []);
        activitiesByDept.get(deptName).push(a);
      }
      
      const empCode = a.assignedTo?.employeeCode;
      if (empCode) {
        const code = empCode.toString();
        if (!activitiesByEmployee.has(code)) activitiesByEmployee.set(code, []);
        activitiesByEmployee.get(code).push(a);
      }
    });

    // Get all employees - select only needed fields
    const employees = await User.findAll({ 
      where: { role: "employee" },
      attributes: ['employeeCode', 'name', 'departmentId']
    });
    
    // Create employee lookup maps
    const employeesByDept = new Map();
    employees.forEach(emp => {
      if (!employeesByDept.has(emp.departmentId)) employeesByDept.set(emp.departmentId, []);
      employeesByDept.get(emp.departmentId).push(emp);
    });

    // ================== Department Analytics ==================
    const departmentStats = await Promise.all(departments.map(async (dept) => {
      // Use Map lookup instead of filter - O(1) vs O(n)
      const deptActivities = activitiesByDept.get(dept.name) || [];

      const totalActivities = deptActivities.length;
      const completedActivities = deptActivities.filter(
        (a) => a.status === "completed"
      ).length;

      // Use pre-calculated totalMinutes for each activity
      const totalMinutes = deptActivities.reduce((sum, a) => sum + (a.totalMinutes || 0), 0);
      const totalHours = totalMinutes / 60;

      const completionRate = totalActivities
        ? Math.round((completedActivities / totalActivities) * 100)
        : 0;
      
      // Get all employees in the department - use Map for O(1) lookup
      const deptEmployees = employeesByDept.get(dept.id) || [];
      const totalEmployees = deptEmployees.length;
      
      // Calculate expected hours - use pre-parsed timeEntries
      const activityDates = new Set();
      deptActivities.forEach(activity => {
        activity.timeEntries.forEach(entry => {
          if (entry.date) {
            // Faster date extraction without creating Date object
            const dateStr = typeof entry.date === 'string' ? entry.date.split('T')[0] : new Date(entry.date).toISOString().split('T')[0];
            activityDates.add(dateStr);
          }
        });
      });
      
      // Calculate total expected hours: (number of employees) * (number of days) * (standard shift hours)
      const standardShiftHours = 9; // Default standard shift hours
      const totalExpectedHours = totalEmployees * activityDates.size * standardShiftHours;
      
      // Calculate average hours per employee
      const avgHours = totalEmployees > 0 
        ? (totalHours / totalEmployees).toFixed(1) 
        : "0.0";
      
      // Calculate productivity score based on standard shift time
      // If employees worked more than expected (overtime), cap at 100%
      const productivityScore = totalExpectedHours > 0
        ? Math.min(Math.round((totalHours / totalExpectedHours) * 100), 100)
        : 0;

      // Top activity
      const activityEmployeeMap = {};
      deptActivities.forEach((a) => {
        if (!a.title) return;
        if (!activityEmployeeMap[a.title]) activityEmployeeMap[a.title] = new Set();
        if (a.assignedTo?.employeeCode) activityEmployeeMap[a.title].add(a.assignedTo.employeeCode.toString());
      });

      let topActivity = "N/A";
      let maxCount = 0;
      Object.entries(activityEmployeeMap).forEach(([title, empSet]) => {
        if (empSet.size > maxCount) {
          maxCount = empSet.size;
          topActivity = title;
        }
      });

      // Session distribution - more efficient aggregation
      let offlineInstitute = 0, onlineInstitute = 0, school = 0;
      deptActivities.forEach((a) => {
        if (a.title === "Total No. of Sessions" && a.timeEntries.length > 0) {
          if (a.sessionType === "Offline" && a.institute > 0)
            offlineInstitute += a.institute * a.timeEntries.length;
          if (a.sessionType === "Online" && a.institute > 0)
            onlineInstitute += a.institute * a.timeEntries.length;
          if (a.school > 0) school += a.school * a.timeEntries.length;
        }
      });

      return {
        name: dept.name,
        totalEmployees,
        totalActivities,
        completedActivities,
        totalHours: Number(totalHours.toFixed(1)),
        completionRate,
        productivityScore,
        avgHours,
        topActivity,
        offlineInstitute,
        onlineInstitute,
        school,
      };
    }));

    // ================== Department Productivity Trend ==================
    const now = new Date();
    const months = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label, start, end });
    }

    const nonProductiveTitles = new Set([
      "lunch", "inventory", "travel", "total no. of sessions", "other activities"
    ]);

    const departmentProductivityTrend = months.map((month) => {
      const obj = { month: month.label };
      departments.forEach((dept) => {
        // Use Map lookup - O(1)
        const deptActs = activitiesByDept.get(dept.name) || [];
        let productiveMinutes = 0;
        let totalShiftMinutes = 0;

        deptActs.forEach((a) => {
          const isProductive = !nonProductiveTitles.has(a.title?.toLowerCase());
          a.timeEntries.forEach((te) => {
            const d = new Date(te.date);
            if (d >= month.start && d < month.end) {
              const duration = te.duration || 0;
              totalShiftMinutes += duration;
              if (isProductive) productiveMinutes += duration;
            }
          });
        });

        obj[dept.name] =
          totalShiftMinutes > 0
            ? Math.round((productiveMinutes / totalShiftMinutes) * 100)
            : 0;
      });
      return obj;
    });

    // ================== Competition Contribution Index Trend ==================
    const projectKeywords = new Set(["prototype", "codeavour", "ftc", "wro", "vex", "wsro", "research"]);

    const competitionContributionTrend = months.map((month) => {
      const obj = { month: month.label };
      departments.forEach((dept) => {
        const deptActs = activitiesByDept.get(dept.name) || [];
        
        let projectMinutes = 0;
        let totalMinutes = 0;

        deptActs.forEach((a) => {
          const isProject = a.title && projectKeywords.has(a.title.toLowerCase().split(' ')[0]);
          a.timeEntries.forEach((te) => {
            const d = new Date(te.date);
            if (d >= month.start && d < month.end) {
              const duration = te.duration || 0;
              totalMinutes += duration;
              if (isProject) projectMinutes += duration;
            }
          });
        });

        obj[dept.name] =
          totalMinutes > 0
            ? Math.round((projectMinutes / totalMinutes) * 100)
            : 0;
      });
      return obj;
    });

    // ================== Employee Analytics ==================
    const employeeDepartmentStats = employees.map((emp) => {
      // Use Map lookup - O(1)
      const empActivities = activitiesByEmployee.get(emp.employeeCode.toString()) || [];
      const byDept = {};
      empActivities.forEach((a) => {
        const deptName = a.department?.name || "Unknown";
        if (!byDept[deptName]) byDept[deptName] = { hours: 0, completed: 0, total: 0 };
        byDept[deptName].hours += (a.totalMinutes || 0) / 60;
        byDept[deptName].completed += a.status === "completed" ? 1 : 0;
        byDept[deptName].total += 1;
      });
      return {
        name: emp.name,
        departments: byDept,
      };
    });

    const beforeSend = Date.now();
    
    res.json({
      departmentStats,
      employeeDepartmentStats,
      departmentProductivityTrend,
      competitionContributionTrend,
    });
    
    const totalTime = Date.now() - routeStart;
    console.log(`⏱️  /api/analytics: ${totalTime}ms (depts:${afterDepts-routeStart}ms, activities:${afterActivities-afterDepts}ms, processing:${beforeSend-afterActivities}ms) - ${activities.length} activities`);
  } catch (error) {
    console.error("Analytics route error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ================== Get weekly hours summary for chart ==================
router.get("/weekly-summary", auth, checkRole(["admin", "manager"]), async (req, res) => {
  const startTime = Date.now();
  try {
    // Get current week days (Mon-Sat)
    const today = new Date();
    const first = today.getDate() - today.getDay() + 1; // Monday
    const monday = new Date(today.setDate(first));
    
    const weekDays = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push({
        date: d,
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        start: new Date(d.setHours(0, 0, 0, 0)),
        end: new Date(d.setHours(23, 59, 59, 999))
      });
    }
    
    const departmentOptions = ['Coding', 'Mechatronics', 'Electronics'];
    
    // Fetch activities only for this week with timeEntries
    const weekStart = weekDays[0].start;
    const weekEnd = weekDays[5].end;
    
    const activities = await Activity.findAll({
      where: {
        createdAt: { [Op.between]: [weekStart, weekEnd] }
      },
      attributes: ['departmentId', 'timeEntries'],
      include: [
        { model: Department, as: "department", attributes: ['name'] }
      ]
    });
    
    // Pre-group activities by department name
    const actsByDept = new Map();
    departmentOptions.forEach(d => actsByDept.set(d, []));
    
    activities.forEach(a => {
      const deptName = a.department?.name;
      if (deptName && actsByDept.has(deptName)) {
        actsByDept.get(deptName).push(a);
      }
    });
    
    // Calculate weekly data
    const weeklyData = weekDays.map(({ label, start, end }) => {
      const obj = { day: label };
      departmentOptions.forEach(dep => {
        const deptActs = actsByDept.get(dep) || [];
        let totalMinutes = 0;
        
        deptActs.forEach(act => {
          const entries = getTimeEntries(act);
          entries.forEach(te => {
            const teDate = new Date(te.date);
            if (teDate >= start && teDate <= end) {
              totalMinutes += te.duration || 0;
            }
          });
        });
        
        obj[dep] = Math.round((totalMinutes / 60) * 100) / 100;
      });
      return obj;
    });
    
    res.json(weeklyData);
    console.log(`⏱️  /api/analytics/weekly-summary: ${Date.now() - startTime}ms - ${activities.length} week activities`);
  } catch (error) {
    console.error("Weekly summary error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

module.exports = router;
