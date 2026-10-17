const { Op } = require('sequelize');
const { SchoolCurriculumActivityOverride } = require('../models');

const overrideKey = (schoolId, className, sessionId) => `${Number(schoolId)}|${className}|${Number(sessionId)}`;

// Loads manager corrections for the given (schoolId, className) classes.
const loadOverrides = async classes => {
  const unique = [...new Map(classes.map(item => [`${Number(item.schoolId)}|${item.className}`, { schoolId: Number(item.schoolId), className: item.className }])).values()];
  if (!unique.length) return new Map();
  const rows = await SchoolCurriculumActivityOverride.findAll({ where: { [Op.or]: unique } });
  return new Map(rows.map(row => [overrideKey(row.schoolId, row.className, row.curriculumSessionId), row]));
};

// Applies corrections to a set of completed curriculum session ids for one class:
// a manager "done" adds the activity, any other manager status removes it.
const applyToCompletedSet = (completedIds, overrides, schoolId, className, sessionIds) => {
  const result = new Set(completedIds);
  for (const sessionId of sessionIds) {
    const override = overrides.get(overrideKey(schoolId, className, sessionId));
    if (!override) continue;
    if (override.status === 'done') result.add(Number(sessionId));
    else result.delete(Number(sessionId));
  }
  return result;
};

module.exports = { overrideKey, loadOverrides, applyToCompletedSet };
