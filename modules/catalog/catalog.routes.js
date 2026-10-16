const express = require("express");
const router = express.Router();
const { SchoolCatalog, Branch, Activity, User } = require("../../models");
const { auth, checkRole } = require("../../middleware/auth");
const { Op } = require("sequelize");

const TIMEZONE_OFFSET_MINUTES = 330; // IST (+05:30)
const buildTimezoneOffsetString = (offsetMinutes) => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.abs(abs % 60)
    .toString()
    .padStart(2, "0");
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

const resolveSessionRange = (query = {}) => {
  const { startDate, endDate } = query;
  if (!startDate && !endDate) {
    return null;
  }

  const startRange = startDate ? getUtcRangeForDate(startDate) : null;
  if (startDate && !startRange) {
    throw new Error("INVALID_RANGE");
  }

  const endRange = endDate ? getUtcRangeForDate(endDate) : startRange;
  if ((endDate && !endRange) || (!startDate && !endDate)) {
    throw new Error("INVALID_RANGE");
  }

  const rangeStart = startRange ? startRange.start : endRange.start;
  const rangeEnd = endRange ? endRange.end : startRange.end;

  if (rangeStart > rangeEnd) {
    throw new Error("INVALID_RANGE");
  }

  return { rangeStart, rangeEnd };
};

const isDateWithinRange = (dateInput, rangeStart, rangeEnd) => {
  if (!rangeStart || !rangeEnd) {
    return true;
  }
  if (!dateInput) {
    return false;
  }
  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(dateObj.getTime())) {
    return false;
  }
  return dateObj >= rangeStart && dateObj <= rangeEnd;
};

// Get list of schools from the catalog
router.get("/schools", auth, async (req, res) => {
  try {
    const schools = await SchoolCatalog.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });
    res.json(schools);
  } catch (error) {
    console.error("Error fetching school catalog:", error);
    res.status(500).json({ error: "Failed to fetch school catalog." });
  }
});

const getTimeEntries = (activity) => {
  if (!activity || !activity.timeEntries) return [];
  if (Array.isArray(activity.timeEntries)) return activity.timeEntries;
  if (typeof activity.timeEntries === "string") {
    try {
      const parsed = JSON.parse(activity.timeEntries);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const extractSchoolName = (activity) => {
  if (!activity) return null;
  const candidates = [
    activity.schoolName,
    activity.school_name,
    activity.schoolLabel,
    activity.schoolDisplayName,
    activity.schoolCatalog?.name,
  ];

  const entryCandidates = getTimeEntries(activity)
    .map((entry) => entry?.schoolName || entry?.school_name || entry?.schoolLabel)
    .filter(Boolean);

  const allCandidates = [...candidates, ...entryCandidates];
  const resolved = allCandidates.find(
    (name) => typeof name === "string" && name.trim().length > 0
  );
  return resolved ? resolved.trim() : null;
};

const deriveSessionCount = (activity) => {
  if (!activity) return 0;
  const title = (activity.title || "").trim().toLowerCase();
  const entries = getTimeEntries(activity);

  if (title === "school session") {
    if (Number.isFinite(Number(activity.sessionsCount)) && Number(activity.sessionsCount) > 0) {
      return Number(activity.sessionsCount);
    }
    const entrySum = entries.reduce((sum, entry) => {
      const value = Number(entry?.sessionsCount);
      return sum + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0);
    if (entrySum > 0) {
      return entrySum;
    }
    return 1;
  }

  if (title === "total no. of sessions") {
    const schoolCount = Number(activity.school);
    if (Number.isFinite(schoolCount) && schoolCount > 0) {
      return schoolCount;
    }
    return entries.reduce((sum, entry) => {
      const schoolValue = Number(entry?.school);
      return sum + (Number.isFinite(schoolValue) && schoolValue > 0 ? schoolValue : 0);
    }, 0) || 0;
  }

  return 0;
};

router.get(
  "/schools/session-stats",
  auth,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      let dateRange = null;
      if (req.query.startDate || req.query.endDate) {
        try {
          dateRange = resolveSessionRange(req.query);
        } catch (rangeError) {
          return res.status(400).json({ error: "Invalid date range supplied" });
        }
      }

      const employeeIdFilter =
        typeof req.query.employeeId === "string" && req.query.employeeId.trim()
          ? req.query.employeeId.trim()
          : null;
      const employeeNameFilterRaw =
        typeof req.query.employeeName === "string" && req.query.employeeName.trim()
          ? req.query.employeeName.trim()
          : null;
      const normalizedEmployeeNameFilter = employeeNameFilterRaw
        ? employeeNameFilterRaw.toLowerCase()
        : null;

      const activityWhere = {
        status: { [Op.ne]: "deleted" },
        title: {
          [Op.in]: ["School Session", "Total No. of Sessions"],
        },
      };

      if (employeeIdFilter) {
        activityWhere.assignedToId = employeeIdFilter;
      }

      const [schools, activities] = await Promise.all([
        SchoolCatalog.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] }),
        Activity.findAll({
          where: activityWhere,
          attributes: [
            "id",
            "title",
            "schoolName",
            "school",
            "sessionsCount",
            "timeEntries",
            "assignedToId",
            "createdAt",
            "updatedAt",
          ],
          include: [
            {
              model: User,
              as: "assignedTo",
              attributes: ["employeeCode", "name"],
              include: [
                {
                  model: Branch,
                  as: "branch",
                  attributes: ["id", "name", "location"],
                  required: false,
                },
              ],
              required: false,
            },
          ],
        }),
      ]);

      const schoolIdFilter = req.query.schoolId ? Number(req.query.schoolId) : null;
      const catalogSchoolForFilter =
        schoolIdFilter != null ? schools.find((school) => school.id === schoolIdFilter) : null;
      const normalizedSchoolFilter =
        (typeof req.query.schoolName === "string" && req.query.schoolName.trim().toLowerCase()) ||
        (catalogSchoolForFilter?.name ? catalogSchoolForFilter.name.trim().toLowerCase() : null);

      const countsBySchool = new Map();
      const countsByTrainer = new Map();
      activities.forEach((activity) => {
        if (normalizedEmployeeNameFilter) {
          const assignedName =
            (activity.assignedTo?.name || activity.assignedToName || "").trim().toLowerCase();
          if (!assignedName || assignedName !== normalizedEmployeeNameFilter) {
            return;
          }
        }
        if (dateRange) {
          const entryDate =
            activity.updatedAt ||
            activity.createdAt ||
            (Array.isArray(activity.timeEntries) && activity.timeEntries.length
              ? activity.timeEntries[0].date
              : null);
          if (!isDateWithinRange(entryDate, dateRange.rangeStart, dateRange.rangeEnd)) {
            return;
          }
        }

        const sessionCount = deriveSessionCount(activity);
        if (!sessionCount || sessionCount <= 0) {
          return;
        }
        const schoolName = extractSchoolName(activity);
        if (!schoolName) {
          return;
        }
        if (normalizedSchoolFilter) {
          if (schoolName.trim().toLowerCase() !== normalizedSchoolFilter) {
            return;
          }
        }

        const current = countsBySchool.get(schoolName) || 0;
        countsBySchool.set(schoolName, current + sessionCount);

        const trainerKey = activity.assignedToId || "UNASSIGNED";
        const trainerName =
          activity.assignedTo?.name ||
          activity.assignedToName ||
          (activity.assignedToId ? activity.assignedToId : "Unassigned Trainer");

        const trainerRecord =
          countsByTrainer.get(trainerKey) || {
            id: activity.assignedToId || null,
            name: trainerName,
            branchId: activity.assignedTo?.branch?.id || activity.assignedTo?.branchId || null,
            branchName: activity.assignedTo?.branch?.name || null,
            branchLocation: activity.assignedTo?.branch?.location || null,
            sessionCount: 0,
            schoolBreakdown: new Map(),
          };

        if (!trainerRecord.branchId && (activity.assignedTo?.branchId || activity.assignedTo?.branch)) {
          trainerRecord.branchId = activity.assignedTo?.branch?.id || activity.assignedTo?.branchId || null;
          trainerRecord.branchName = activity.assignedTo?.branch?.name || trainerRecord.branchName || null;
          trainerRecord.branchLocation =
            activity.assignedTo?.branch?.location || trainerRecord.branchLocation || null;
        }
        trainerRecord.sessionCount += sessionCount;
        const existingSchoolSessions = trainerRecord.schoolBreakdown.get(schoolName) || 0;
        trainerRecord.schoolBreakdown.set(schoolName, existingSchoolSessions + sessionCount);
        countsByTrainer.set(trainerKey, trainerRecord);
      });

      const stats = schools.map((school) => ({
        id: school.id,
        name: school.name,
        sessionCount: countsBySchool.get(school.name) || 0,
      }));

      // Include non-catalog schools that have sessions
      countsBySchool.forEach((count, name) => {
        if (!stats.find((stat) => stat.name === name)) {
          stats.push({ id: null, name, sessionCount: count });
        }
      });

      stats.sort((a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name));

      const trainers = Array.from(countsByTrainer.values()).map((trainer) => ({
        id: trainer.id,
        name: trainer.name,
        branchId: trainer.branchId,
        branchName: trainer.branchName,
        branchLocation: trainer.branchLocation,
        sessionCount: trainer.sessionCount,
        schools: Array.from(trainer.schoolBreakdown.entries()).map(([name, count]) => ({
          name,
          sessionCount: count,
        })),
      }));

      trainers.sort((a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name));

      res.json({
        totalSessions: stats.reduce((sum, stat) => sum + stat.sessionCount, 0),
        schools: stats,
        trainers,
        trainerSessionTotal: trainers.reduce((sum, trainer) => sum + trainer.sessionCount, 0),
      });
    } catch (error) {
      console.error("Error fetching school session stats:", error);
      res.status(500).json({ error: "Failed to fetch school session stats." });
    }
  }
);

// Create a new school entry
router.post("/schools", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "School name is required." });
    }

    const trimmedName = name.trim();

    const existing = await SchoolCatalog.findOne({
      where: { name: trimmedName },
      attributes: ["id"],
    });

    if (existing) {
      return res.status(409).json({ error: "School with this name already exists." });
    }

    const created = await SchoolCatalog.create({ name: trimmedName });

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating school catalog entry:", error);
    res.status(500).json({ error: "Failed to create school." });
  }
});

// Update an existing school entry
router.put("/schools/:id", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id) {
      return res.status(400).json({ error: "School id is required." });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "School name is required." });
    }

    const trimmedName = name.trim();

    const school = await SchoolCatalog.findByPk(Number(id));

    if (!school) {
      return res.status(404).json({ error: "School not found." });
    }

    const duplicate = await SchoolCatalog.findOne({
      where: {
        name: trimmedName,
        id: { [Op.ne]: school.id },
      },
      attributes: ["id"],
    });

    if (duplicate) {
      return res.status(409).json({ error: "Another school with this name already exists." });
    }

    school.name = trimmedName;
    await school.save();

    res.json(school);
  } catch (error) {
    console.error("Error updating school catalog entry:", error);
    res.status(500).json({ error: "Failed to update school." });
  }
});

// Delete a school entry
router.delete("/schools/:id", auth, checkRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "School id is required." });
    }

    const school = await SchoolCatalog.findByPk(Number(id));

    if (!school) {
      return res.status(404).json({ error: "School not found." });
    }

    await school.destroy();

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting school catalog entry:", error);
    res.status(500).json({ error: "Failed to delete school." });
  }
});

// Get list of branches (minimal fields)
router.get("/branches", auth, async (req, res) => {
  try {
    const branches = await Branch.findAll({
      attributes: ["id", "name", "location"],
      order: [["name", "ASC"]],
    });
    res.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ error: "Failed to fetch branches." });
  }
});

module.exports = router;
