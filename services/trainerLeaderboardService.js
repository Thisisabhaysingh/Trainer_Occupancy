const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Branch,
  Activity,
  TrainerSchoolAssignment,
  TrainerLeaderboard,
} = require('../models');

// Points per counted session. Every logged institute session and every completed
// manager-assigned school activity is worth one point.
const POINTS = { institute: 1, school: 1 };
const INSTITUTE_SESSION_TITLE = 'institute session';
const IST_OFFSET_MINUTES = 330;
const STALE_AFTER_MS = 60 * 1000;
const RECOMPUTE_DEBOUNCE_MS = 1500;

const isPeriodKey = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');

const toIstDateKey = value => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000).toISOString().slice(0, 10);
};

const currentPeriodKey = () => toIstDateKey(new Date()).slice(0, 7);

const periodRange = periodKey => {
  const [year, month] = periodKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { startDate: `${periodKey}-01`, endDate: `${periodKey}-${String(lastDay).padStart(2, '0')}` };
};

const parseTimeEntries = activity => {
  const { timeEntries } = activity;
  if (Array.isArray(timeEntries)) return timeEntries;
  if (typeof timeEntries === 'string') {
    try {
      const parsed = JSON.parse(timeEntries);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

// Mirrors the manager session export: each time entry counts its sessionsCount
// (falling back to the activity total), with a minimum of one session.
const countInstituteSessions = async (periodKey, trainerCodes) => {
  const { startDate, endDate } = periodRange(periodKey);
  const loggedFrom = new Date(`${startDate}T00:00:00Z`);
  loggedFrom.setUTCDate(loggedFrom.getUTCDate() - 1);
  const activities = await Activity.findAll({
    where: {
      title: 'Institute Session',
      status: { [Op.notIn]: ['deleted', 'rejected', 'cancelled'] },
      assignedToId: { [Op.in]: trainerCodes },
      updatedAt: { [Op.gte]: loggedFrom },
    },
    attributes: ['id', 'title', 'assignedToId', 'timeEntries', 'sessionsCount'],
  });

  const counts = new Map();
  activities.forEach(activity => {
    const activityTotal = Number(activity.sessionsCount);
    parseTimeEntries(activity).forEach(entry => {
      const dateKey = toIstDateKey(entry?.date || entry?.punchIn || entry?.punchOut);
      if (!dateKey || dateKey < startDate || dateKey > endDate) return;
      const entrySessions = Number.isFinite(Number(entry.sessionsCount)) ? Number(entry.sessionsCount) : activityTotal;
      const increment = Number.isFinite(entrySessions) && entrySessions > 0 ? entrySessions : 1;
      counts.set(activity.assignedToId, (counts.get(activity.assignedToId) || 0) + increment);
    });
  });
  return counts;
};

const countSchoolSessions = async (periodKey, trainerCodes) => {
  const { startDate, endDate } = periodRange(periodKey);
  const rows = await TrainerSchoolAssignment.findAll({
    where: {
      trainerId: { [Op.in]: trainerCodes },
      status: 'published',
      completionStatus: 'completed',
      date: { [Op.between]: [startDate, endDate] },
    },
    attributes: ['trainerId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    group: ['trainerId'],
    raw: true,
  });
  return new Map(rows.map(row => [row.trainerId, Number(row.total) || 0]));
};

const lastComputedAt = new Map();
const inFlight = new Map();

const runRecompute = async periodKey => {
  const trainers = await User.findAll({ where: { role: 'employee' }, attributes: ['employeeCode'], raw: true });
  const trainerCodes = trainers.map(trainer => trainer.employeeCode);
  if (!trainerCodes.length) {
    await TrainerLeaderboard.destroy({ where: { periodKey } });
    return;
  }

  const [instituteCounts, schoolCounts] = await Promise.all([
    countInstituteSessions(periodKey, trainerCodes),
    countSchoolSessions(periodKey, trainerCodes),
  ]);

  const scored = trainerCodes
    .map(userId => {
      const instituteSessions = instituteCounts.get(userId) || 0;
      const schoolSessions = schoolCounts.get(userId) || 0;
      return { userId, instituteSessions, schoolSessions, score: instituteSessions * POINTS.institute + schoolSessions * POINTS.school };
    })
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || b.schoolSessions - a.schoolSessions || a.userId.localeCompare(b.userId));

  // Standard competition ranking: equal scores share a rank (1, 1, 3, ...).
  scored.forEach((row, index) => {
    row.rank = index > 0 && scored[index - 1].score === row.score ? scored[index - 1].rank : index + 1;
  });

  await sequelize.transaction(async transaction => {
    const existing = await TrainerLeaderboard.findAll({ where: { periodKey }, attributes: ['userId', 'rank', 'previousRank'], transaction });
    const existingByUser = new Map(existing.map(row => [row.userId, row]));
    const records = scored.map(row => {
      const previous = existingByUser.get(row.userId);
      const previousRank = previous ? (previous.rank !== row.rank ? previous.rank : previous.previousRank) : null;
      return { ...row, periodKey, previousRank };
    });
    await TrainerLeaderboard.destroy({
      where: { periodKey, ...(records.length ? { userId: { [Op.notIn]: records.map(row => row.userId) } } : {}) },
      transaction,
    });
    if (records.length) {
      await TrainerLeaderboard.bulkCreate(records, {
        updateOnDuplicate: ['instituteSessions', 'schoolSessions', 'score', 'rank', 'previousRank', 'updatedAt'],
        transaction,
      });
    }
  });
};

const recomputeLeaderboard = async (periodKey = currentPeriodKey()) => {
  if (!isPeriodKey(periodKey)) throw new Error('INVALID_PERIOD');
  if (inFlight.has(periodKey)) return inFlight.get(periodKey);
  const job = runRecompute(periodKey)
    .then(() => { lastComputedAt.set(periodKey, Date.now()); })
    .finally(() => { inFlight.delete(periodKey); });
  inFlight.set(periodKey, job);
  return job;
};

const pendingTimers = new Map();
const scheduleRecompute = (periodKeys = [currentPeriodKey()]) => {
  [...new Set(periodKeys.filter(isPeriodKey))].forEach(periodKey => {
    lastComputedAt.delete(periodKey);
    clearTimeout(pendingTimers.get(periodKey));
    pendingTimers.set(periodKey, setTimeout(() => {
      pendingTimers.delete(periodKey);
      recomputeLeaderboard(periodKey).catch(error => console.error('Trainer leaderboard recompute failed:', error));
    }, RECOMPUTE_DEBOUNCE_MS));
  });
};

const ensureFresh = async periodKey => {
  const computedAt = lastComputedAt.get(periodKey);
  if (!computedAt || Date.now() - computedAt > STALE_AFTER_MS) await recomputeLeaderboard(periodKey);
};

const getLeaderboard = async ({ periodKey = currentPeriodKey(), userId, limit = 10 } = {}) => {
  if (!isPeriodKey(periodKey)) throw new Error('INVALID_PERIOD');
  await ensureFresh(periodKey);
  const rows = await TrainerLeaderboard.findAll({
    where: { periodKey },
    include: [{
      model: User,
      as: 'trainer',
      attributes: ['employeeCode', 'name', 'branchId'],
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'], required: false }],
    }],
    order: [['rank', 'ASC'], ['score', 'DESC'], ['userId', 'ASC']],
  });
  const format = row => ({
    userId: row.userId,
    name: row.trainer?.name || row.userId,
    branchName: row.trainer?.branch?.name || null,
    instituteSessions: row.instituteSessions,
    schoolSessions: row.schoolSessions,
    score: row.score,
    rank: row.rank,
    previousRank: row.previousRank,
    updatedAt: row.updatedAt,
  });
  const mine = userId ? rows.find(row => row.userId === userId) : null;
  return {
    periodKey,
    points: POINTS,
    totalRanked: rows.length,
    computedAt: new Date(lastComputedAt.get(periodKey) || Date.now()).toISOString(),
    top: rows.slice(0, limit).map(format),
    me: mine ? format(mine) : null,
  };
};

// Keep the table live: any change to an institute session log or a school
// activity completion triggers a debounced recompute for the affected months.
const periodsForActivity = activity => {
  const keys = parseTimeEntries(activity)
    .map(entry => toIstDateKey(entry?.date || entry?.punchIn || entry?.punchOut))
    .filter(Boolean)
    .map(dateKey => dateKey.slice(0, 7));
  return keys.length ? keys : [currentPeriodKey()];
};
const isInstituteActivity = activity => [activity.title, activity.previous?.('title')]
  .some(title => String(title || '').trim().toLowerCase() === INSTITUTE_SESSION_TITLE);

const onActivityChange = activity => {
  if (activity && isInstituteActivity(activity)) scheduleRecompute(periodsForActivity(activity));
};
const onSchoolAssignmentChange = assignment => {
  const dateKey = toIstDateKey(assignment?.date);
  scheduleRecompute([dateKey ? dateKey.slice(0, 7) : currentPeriodKey()]);
};
const onBulkChange = () => scheduleRecompute();

Activity.addHook('afterSave', 'trainerLeaderboard', onActivityChange);
Activity.addHook('afterDestroy', 'trainerLeaderboard', onActivityChange);
TrainerSchoolAssignment.addHook('afterSave', 'trainerLeaderboard', onSchoolAssignmentChange);
TrainerSchoolAssignment.addHook('afterDestroy', 'trainerLeaderboard', onSchoolAssignmentChange);
TrainerSchoolAssignment.addHook('afterBulkCreate', 'trainerLeaderboard', onBulkChange);
TrainerSchoolAssignment.addHook('afterBulkUpdate', 'trainerLeaderboard', onBulkChange);
TrainerSchoolAssignment.addHook('afterBulkDestroy', 'trainerLeaderboard', onBulkChange);

module.exports = {
  POINTS,
  currentPeriodKey,
  isPeriodKey,
  recomputeLeaderboard,
  scheduleRecompute,
  getLeaderboard,
};
