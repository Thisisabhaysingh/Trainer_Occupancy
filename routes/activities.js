const express = require("express");
const router = express.Router();
const { Activity, ActivityTemplate, User, Department, Branch } = require("../models"); // Sequelize models index.js exports
const { auth, checkRole } = require("../middleware/auth");
const { Op } = require("sequelize");

// Helper function to ensure timeEntries is always an array
const getTimeEntries = (activity) => {
  const buildProjectTimeEntryFallback = () => {
    if (!activity?.project_id || !["task", "subtask"].includes(activity?.hierarchy_level)) {
      return [];
    }

    const actualHours = Number(activity.actual_hours_new ?? activity.timeSpent);
    if (!Number.isFinite(actualHours) || actualHours <= 0) return [];

    const baseDate = new Date(activity.updatedAt || activity.createdAt || new Date());
    if (!Number.isFinite(baseDate.getTime())) return [];

    const buildDateFromTime = (timeString) => {
      if (typeof timeString !== "string") return null;
      const parts = timeString.split(":").map(part => Number.parseInt(part, 10));
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
      source: "project_time_log_fallback"
    }];
  };

  if (!activity.timeEntries) return buildProjectTimeEntryFallback();
  if (Array.isArray(activity.timeEntries)) {
    return activity.timeEntries.length > 0 ? activity.timeEntries : buildProjectTimeEntryFallback();
  }
  if (typeof activity.timeEntries === 'string') {
    try {
      const parsedEntries = JSON.parse(activity.timeEntries);
      return Array.isArray(parsedEntries) && parsedEntries.length > 0
        ? parsedEntries
        : buildProjectTimeEntryFallback();
    } catch (e) {
      return buildProjectTimeEntryFallback();
    }
  }
  return buildProjectTimeEntryFallback();
};

const parseTimeParts = (timeString) => {
  if (typeof timeString !== 'string') return null;
  const parts = timeString.split(':').map(part => Number.parseInt(part, 10));
  if (parts.length < 2) return null;
  const [hours, minutes, seconds = 0] = parts;
  if ([hours, minutes, seconds].some(Number.isNaN)) return null;
  return { hours, minutes, seconds };
};

const calculateDurationMinutes = (startTime, endTime) => {
  const startParts = parseTimeParts(startTime);
  const endParts = parseTimeParts(endTime);
  if (!startParts || !endParts) return null;

  const start = new Date();
  start.setHours(startParts.hours, startParts.minutes, startParts.seconds || 0, 0);
  const end = new Date();
  end.setHours(endParts.hours, endParts.minutes, endParts.seconds || 0, 0);

  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;

  return diffMs / (1000 * 60);
};

  const TIMEZONE_OFFSET_MINUTES = 330; // IST (+05:30)
const buildTimezoneOffsetString = (offsetMinutes) => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
};
const TIMEZONE_OFFSET_STRING = buildTimezoneOffsetString(TIMEZONE_OFFSET_MINUTES);

const getUtcRangeForDate = (dateInput = null, offsetMinutes = TIMEZONE_OFFSET_MINUTES) => {
  if (typeof dateInput === "string") {
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

const buildDateWithTime = (baseDate, timeParts) => {
  if (!baseDate || !Number.isFinite(baseDate.getTime())) return null;
  const date = new Date(baseDate);
  date.setHours(timeParts.hours, timeParts.minutes, timeParts.seconds || 0, 0);
  return date;
};

const normalizeTimeEntriesWithDuration = (entries, activity, startTime, endTime, durationMinutes) => {
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return entries;

  const startParts = parseTimeParts(startTime);
  const endParts = parseTimeParts(endTime);
  if (!startParts || !endParts) return entries;

  const cloneEntries = Array.isArray(entries)
    ? entries.map(entry => ({ ...entry }))
    : [];

  if (cloneEntries.length === 0) {
    // Preserve the original activity date instead of using current server time
    const anchorDate = activity?.updatedAt || activity?.createdAt || new Date();
    const baseDate = new Date(anchorDate);
    
    // If the activity has existing time entries with dates, use the first one
    const existingEntries = getTimeEntries(activity);
    if (existingEntries && existingEntries.length > 0 && existingEntries[0].date) {
      const existingDate = new Date(existingEntries[0].date);
      if (!isNaN(existingDate.getTime())) {
        baseDate.setTime(existingDate.getTime());
      }
    }
    
    const startDate = buildDateWithTime(baseDate, startParts);
    const endDate = buildDateWithTime(baseDate, endParts);

    if (!startDate || !endDate) {
      return entries;
    }

    return [{
      date: startDate.toISOString(),
      punchIn: startDate.toISOString(),
      punchOut: endDate.toISOString(),
      duration: durationMinutes,
      description: activity?.description || ''
    }];
  }

  const firstEntry = { ...cloneEntries[0] };
  const baseDateRaw = firstEntry.date || firstEntry.punchIn || firstEntry.punchOut;
  let baseDate = baseDateRaw ? new Date(baseDateRaw) : null;
  
  // If baseDate is invalid, try to get from existing activity entries
  if (!baseDate || !Number.isFinite(baseDate.getTime())) {
    const existingEntries = getTimeEntries(activity);
    if (existingEntries && existingEntries.length > 0 && existingEntries[0].date) {
      baseDate = new Date(existingEntries[0].date);
    }
  }
  
  // If still invalid, use activity creation/update date as last resort
  if (!baseDate || !Number.isFinite(baseDate.getTime())) {
    baseDate = activity?.updatedAt || activity?.createdAt || new Date();
  }

  const startDate = buildDateWithTime(baseDate, startParts);
  const endDate = buildDateWithTime(baseDate, endParts);
  if (!startDate || !endDate) {
    return entries;
  }

  cloneEntries[0] = {
    ...firstEntry,
    date: startDate.toISOString(),
    punchIn: startDate.toISOString(),
    punchOut: endDate.toISOString(),
    duration: durationMinutes
  };

  return cloneEntries;
};

const sanitizeTimeEntries = (entries) => {
  if (!Array.isArray(entries)) return [];

  const toIsoString = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString();
  };

  return entries
    .filter(entry => entry && typeof entry === 'object')
    .map(entry => {
      const clone = { ...entry };

      const resolvedDate = toIsoString(clone.date || clone.punchIn || clone.punchOut);
      const resolvedPunchIn = toIsoString(clone.punchIn || resolvedDate);
      const resolvedPunchOut = toIsoString(clone.punchOut || resolvedDate);

      clone.date = resolvedDate;
      clone.punchIn = resolvedPunchIn;
      clone.punchOut = resolvedPunchOut;

      if (clone.duration !== undefined && clone.duration !== null) {
        const durationNumber = Number(clone.duration);
        clone.duration = Number.isFinite(durationNumber) ? durationNumber : null;
      }

      return clone;
    });
};

// Helper function to get complete activity with associations
const getCompleteActivity = async (activityId) => {
  return await Activity.findByPk(activityId, {
    include: [
      { model: Department, as: 'department' },
      { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name', 'email'] }
    ]
  });
};

// ==========================
// Get all activities (for managers, admin, employee)
// ==========================
router.get("/", auth, checkRole(["manager", "admin", "employee"]), async (req, res) => {
  const startTime = Date.now();
  try {
    // Add pagination to prevent loading thousands of records
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const days = parseInt(req.query.days) || 30; // Default to last 30 days
    
    // Build where clause for date filtering
    const whereClause = {};
    if (req.query.recent === 'true' || !req.query.all) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      whereClause.createdAt = { [Op.gte]: cutoffDate };
    }
    
    const activities = await Activity.findAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']], // Most recent first
      include: [
        { model: User, as: "assignedTo", attributes: ["employeeCode", "name", "email"] },
        { model: Department, as: "department", attributes: ["id", "name"] },
      ],
    });
    
    // Parse timeEntries for all activities
    const parsed = activities.map(a => {
      const json = a.toJSON();
      json.timeEntries = getTimeEntries(a);
      return json;
    });
    res.json(parsed);
    console.log(`⏱️  /api/activities: ${Date.now() - startTime}ms - ${parsed.length} activities (limit:${limit})`);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Get employee's activities
// ==========================
router.get("/employee", auth, checkRole(["employee", "teamlead"]), async (req, res) => {
  try {
    const activities = await Activity.findAll({
      where: { assignedToId: req.user.employeeCode },
    });
    // Parse timeEntries for all activities
    const parsed = activities.map(a => {
      const json = a.toJSON();
      json.timeEntries = getTimeEntries(a);
      return json;
    });
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Create new activity (manager + employee)
// ==========================
router.post("/", auth, checkRole(["manager", "employee", "teamlead"]), async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      startTime,
      endTime,
      comment,
      timeEntries,
      institute,
      school,
      sessionType,
      schoolName,
      branchLocation,
      sessionsCount,
    } = req.body;

    const isOfflineSession = title === "Total No. of Sessions";
    const isSchoolSession = title === "School Session";
    const isInstituteSession = title === "Institute Session";

    if (!title || !description || !department) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (isOfflineSession) {
      if (institute === undefined || school === undefined || !sessionType) {
        return res.status(400).json({
          error: "Institute, School, and Session Type fields are required for offline sessions",
        });
      }
    } else {
      if (!startTime || !endTime) {
        return res.status(400).json({ error: "Start time and end time are required for regular activities" });
      }
    }

    if (!Array.isArray(timeEntries) || timeEntries.length === 0) {
      return res.status(400).json({ error: "Time entries are required" });
    }

    const activityData = {
      title,
      description,
      assignedToId: req.body.assignedToId || req.user.employeeCode,
      createdById: req.user.employeeCode,
      departmentId: department,
      comment,
      timeEntries,
      templateId: req.body.templateId || null
    };

    if (isOfflineSession) {
      activityData.institute = institute;
      activityData.school = school;
      activityData.sessionType = sessionType;
    } else {
      activityData.startTime = startTime;
      activityData.endTime = endTime;
      if (isSchoolSession || isInstituteSession) {
        const parsedSessions = Number.isFinite(Number(sessionsCount)) ? Number(sessionsCount) : 0;
        activityData.sessionsCount = parsedSessions;
        if (isSchoolSession) {
          activityData.schoolName = schoolName || null;
          activityData.branchLocation = null;
        } else {
          activityData.branchLocation = branchLocation || null;
          activityData.schoolName = null;
        }
        activityData.institute = null;
        activityData.school = null;
        activityData.sessionType = null;
      }
    }

    const activity = await Activity.create(activityData);
    
    // Fetch the complete activity with associations using our helper function
    const createdActivity = await getCompleteActivity(activity.id);
    
    res.status(201).json(createdActivity);
  } catch (error) {
    console.error("Activity creation error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ==========================
// Add time entry to activity
// ==========================
router.post("/:id/time-entry", auth, checkRole(["employee", "teamlead"]), async (req, res) => {
  try {
    const { duration, description, punchIn, punchOut } = req.body;
    const activity = await Activity.findByPk(req.params.id);

    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (activity.assignedToId !== req.user.employeeCode) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const newEntries = [...(activity.timeEntries || []), { duration, description, punchIn, punchOut, date: new Date() }];
    activity.timeEntries = newEntries;

    if (newEntries.length > 0) activity.status = "in-progress";

    await activity.save();
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Update activity status
// ==========================
router.patch("/:id/status", auth, checkRole(["employee", "teamlead"]), async (req, res) => {
  try {
    const { status } = req.body;
    const activity = await Activity.findByPk(req.params.id);

    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (activity.assignedToId !== req.user.employeeCode) {
      return res.status(403).json({ error: "Not authorized" });
    }

    activity.status = status;
    await activity.save();
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Get today's activities for employee
// ==========================
router.get("/employee/today", auth, checkRole(["employee", "teamlead"]), async (req, res) => {
  try {
    const range = getUtcRangeForDate();
    const start = range.start;
    const end = range.end;

    const activities = await Activity.findAll({
      where: { assignedToId: req.user.employeeCode },
      include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
    });

    // filter by today's time entries and ensure timeEntries is parsed
    const filtered = activities
      .filter((a) => {
        const entries = getTimeEntries(a);
        return entries.some((te) => {
          const d = new Date(te.date);
          return d >= start && d <= end;
        });
      })
      .map((a) => {
        const json = a.toJSON();
        json.timeEntries = getTimeEntries(a);
        return json;
      });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Employee activity history
// ==========================
router.get("/employee/history", auth, checkRole(["employee", "teamlead"]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Missing date range" });

    const startRange = getUtcRangeForDate(startDate);
    const endRange = getUtcRangeForDate(endDate);
    if (!startRange || !endRange) {
      return res.status(400).json({ error: "Invalid date range" });
    }
    const start = startRange.start;
    const end = endRange.end;

    const activities = await Activity.findAll({
      where: { assignedToId: req.user.employeeCode },
    });

    const filtered = activities
      .filter((a) => {
        const entries = getTimeEntries(a);
        return entries.some((te) => {
          const d = new Date(te.date);
          return d >= start && d <= end;
        });
      })
      .map((a) => {
        const json = a.toJSON();
        json.timeEntries = getTimeEntries(a);
        return json;
      });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ==========================
// Create activity template (manager)
// ==========================
router.post("/template", auth, checkRole(["manager"]), async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!req.user.departmentId) {
      return res.status(400).json({ error: "Manager is not assigned to any department" });
    }

    const exists = await ActivityTemplate.findOne({
      where: { title, departmentId: req.user.departmentId },
    });
    if (exists) return res.status(400).json({ error: "Activity name already exists for your department" });

    const template = await ActivityTemplate.create({
      title,
      departmentId: req.user.departmentId,
      createdById: req.user.employeeCode,
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// List activity templates for employee's department
// ==========================
router.get("/department", auth, checkRole(["employee", "teamlead"]), async (req, res) => {
  try {
    const templates = await ActivityTemplate.findAll({
      where: { departmentId: req.user.departmentId },
      attributes: ["id", "title"],
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Employee edits their activity
// ==========================
router.patch("/:id", auth, checkRole(["employee", "manager", "teamlead"]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      startTime,
      endTime,
      comment,
      timeEntries,
      institute,
      school,
      sessionType,
      timeSpent,
      sessionsCount,
      schoolName,
      branchLocation
    } = req.body;

    const activity = await Activity.findByPk(id);
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (activity.assignedToId !== req.user.employeeCode) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updatedTitle = title ?? activity.title;
    const isOfflineSession = updatedTitle === "Total No. of Sessions";
    const isSchoolSession = updatedTitle === "School Session";
    const isInstituteSession = updatedTitle === "Institute Session";

    if (title) {
      activity.title = title;
      activity.description = title;
    }

    if (comment !== undefined) activity.comment = comment;

    if (isOfflineSession) {
      if (institute !== undefined) activity.institute = institute;
      if (school !== undefined) activity.school = school;
      if (sessionType !== undefined) activity.sessionType = sessionType;
      activity.startTime = null;
      activity.endTime = null;
    } else {
      if (startTime !== undefined) activity.startTime = startTime;
      if (endTime !== undefined) activity.endTime = endTime;
      activity.institute = null;
      activity.school = null;
      activity.sessionType = null;
    }

    if (sessionsCount !== undefined) activity.sessionsCount = sessionsCount;
    if (schoolName !== undefined) activity.schoolName = schoolName;
    if (branchLocation !== undefined) activity.branchLocation = branchLocation;

    let updatedTimeEntries = sanitizeTimeEntries(getTimeEntries(activity));
    if (timeEntries !== undefined) {
      updatedTimeEntries = sanitizeTimeEntries(timeEntries);
    }

    const effectiveStartTime = !isOfflineSession ? activity.startTime : null;
    const effectiveEndTime = !isOfflineSession ? activity.endTime : null;

    if (!isOfflineSession && effectiveStartTime && effectiveEndTime) {
      const durationMinutes = calculateDurationMinutes(effectiveStartTime, effectiveEndTime);
      if (durationMinutes !== null) {
        const hoursValue = parseFloat((durationMinutes / 60).toFixed(2));
        if (!Number.isNaN(hoursValue)) {
          activity.timeSpent = hoursValue;
        }

        const normalizedEntries = normalizeTimeEntriesWithDuration(
          updatedTimeEntries,
          activity,
          effectiveStartTime,
          effectiveEndTime,
          durationMinutes
        );

        if (Array.isArray(normalizedEntries) && normalizedEntries.length > 0) {
          updatedTimeEntries = sanitizeTimeEntries(normalizedEntries);
        }
      }
    } else if (isOfflineSession) {
      // Offline sessions rely on counts rather than duration; default timeSpent to 0 unless overridden
      if (timeSpent === undefined) {
        activity.timeSpent = 0;
      }
    }

    const sanitizedEntries = sanitizeTimeEntries(updatedTimeEntries);
    activity.set('timeEntries', sanitizedEntries);
    activity.changed('timeEntries', true);

    if (timeSpent !== undefined) {
      const parsedTimeSpent = parseFloat(timeSpent);
      if (!Number.isNaN(parsedTimeSpent)) {
        activity.timeSpent = parseFloat(parsedTimeSpent.toFixed(2));
      }
    }

    // Persist changes
    await activity.save();

    // Fetch the complete activity with associations using our helper function
    const updatedActivity = await getCompleteActivity(activity.id);

    res.json(updatedActivity);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Delete activity
// ==========================
router.delete("/:id", auth, checkRole(["employee", "teamlead", "manager", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Activity ID is required" });
    }
    
    const activity = await Activity.findByPk(id, {
      include: [
        { model: User, as: "assignedTo", attributes: ["employeeCode", "departmentId", "branchId", "teamLeadId"] }
      ]
    });
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }
    
    const isOwner = activity.assignedToId === req.user.employeeCode;
    const isTeamLead = req.user.role === 'teamlead' && activity.assignedTo?.teamLeadId === req.user.employeeCode;
    const isAdmin = req.user.role === 'admin';
    let isManagerAuthorized = false;

    if (req.user.role === 'manager') {
      const managerType = req.user.managerType;
      const assignedEmployee = activity.assignedTo;
      if (managerType === 'branch') {
        isManagerAuthorized = assignedEmployee?.branchId && Number(assignedEmployee.branchId) === Number(req.user.branchId);
      } else {
        isManagerAuthorized = assignedEmployee?.departmentId && Number(assignedEmployee.departmentId) === Number(req.user.departmentId);
      }
    }

    const isAuthorized = isOwner || isTeamLead || isAdmin || isManagerAuthorized;

    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized to delete this activity" });
    }
    
    // Get the activity data before deleting
    const deletedActivity = await getCompleteActivity(activity.id);
    await activity.destroy();
    
    res.json({ 
      success: true, 
      message: 'Activity deleted successfully',
      activity: deletedActivity
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================
// Delete activity template (manager)
// ==========================
router.delete("/templates/:id", auth, checkRole(["manager"]), async (req, res) => {
  try {
    const template = await ActivityTemplate.findOne({
      where: { id: req.params.id, departmentId: req.user.departmentId },
    });
    if (!template) return res.status(404).json({ error: "Activity name not found for your department" });
    await template.destroy();
    res.json({ message: "Activity name deleted" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Activity Templates CRUD (Manager only)
// ==========================

// Get templates scoped to manager's visibility (department vs branch)
router.get("/templates", auth, checkRole(["manager"]), async (req, res) => {
  try {
    const managerType = req.user.managerType || 'department';
    const isBranchManager = managerType === 'branch';
    let departmentIds = [];

    if (isBranchManager) {
      if (!req.user.branchId) {
        return res.status(400).json({ error: "Branch manager is not assigned to any branch" });
      }

      const branchDepartments = await Department.findAll({
        where: { branchId: req.user.branchId },
        attributes: ['id']
      });
      departmentIds = branchDepartments.map(dept => dept.id);
    } else {
      if (!req.user.departmentId) {
        return res.status(400).json({ error: "Manager is not assigned to any department" });
      }
      departmentIds = [req.user.departmentId];
    }

    if (departmentIds.length === 0) {
      return res.json([]);
    }

    const templates = await ActivityTemplate.findAll({
      where: {
        departmentId: { [Op.in]: departmentIds },
        title: { [Op.ne]: "Total No. of Sessions" }
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'branchId'],
          include: [
            {
              model: Branch,
              as: 'branch',
              attributes: ['id', 'name', 'location'],
              required: false
            }
          ]
        }
      ],
      order: [['title', 'ASC']]
    });

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new template
router.post("/templates", auth, checkRole(["manager"]), async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Template title is required" });
    }

    const template = await ActivityTemplate.create({
      title: title.trim(),
      departmentId: req.user.departmentId,
      createdById: req.user.employeeCode
    });

    res.status(201).json({ 
      message: "Template created successfully", 
      template 
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update template
router.put("/templates/:id", auth, checkRole(["manager"]), async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Template title is required" });
    }

    const template = await ActivityTemplate.findOne({
      where: { 
        id: req.params.id,
        departmentId: req.user.departmentId
      }
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    template.title = title.trim();
    await template.save();

    res.json({ 
      message: "Template updated successfully", 
      template 
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete template
router.delete("/templates/:id", auth, checkRole(["manager"]), async (req, res) => {
  try {
    const template = await ActivityTemplate.findOne({
      where: { 
        id: req.params.id,
        departmentId: req.user.departmentId
      }
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    await template.destroy();

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

// ==========================
// Activity Templates CRUD (Admin only - branch/department scoped)
// ==========================

router.get("/templates/admin", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { branchId, departmentId } = req.query;

    const where = {
      title: { [Op.ne]: "Total No. of Sessions" }
    };

    if (departmentId) {
      where.departmentId = Number(departmentId);
    }

    if (branchId && !departmentId) {
      const branchDepartments = await Department.findAll({
        where: { branchId: Number(branchId) },
        attributes: ['id']
      });
      const departmentIds = branchDepartments.map(dept => dept.id);
      if (departmentIds.length === 0) {
        return res.json([]);
      }
      where.departmentId = { [Op.in]: departmentIds };
    }

    const templates = await ActivityTemplate.findAll({
      where,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'branchId'],
          include: [
            {
              model: Branch,
              as: 'branch',
              attributes: ['id', 'name', 'location'],
              required: false
            }
          ]
        }
      ],
      order: [['title', 'ASC']]
    });

    res.json(templates);
  } catch (error) {
    console.error('Admin get templates error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/templates/admin", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { title, departmentId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Template title is required" });
    }

    if (!departmentId) {
      return res.status(400).json({ error: "Department is required" });
    }

    const department = await Department.findByPk(Number(departmentId));
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    const template = await ActivityTemplate.create({
      title: title.trim(),
      departmentId: Number(departmentId),
      createdById: req.user.employeeCode
    });

    res.status(201).json({
      message: "Template created successfully",
      template
    });
  } catch (error) {
    console.error('Admin create template error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/templates/admin/:id", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Template title is required" });
    }

    const template = await ActivityTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (template.title === 'Total No. of Sessions') {
      return res.status(400).json({ error: "This template cannot be edited" });
    }

    template.title = title.trim();
    await template.save();

    res.json({
      message: "Template updated successfully",
      template
    });
  } catch (error) {
    console.error('Admin update template error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/templates/admin/:id", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const template = await ActivityTemplate.findByPk(req.params.id);

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (template.title === 'Total No. of Sessions') {
      return res.status(400).json({ error: "This template cannot be deleted" });
    }

    await template.destroy();
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error('Admin delete template error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
