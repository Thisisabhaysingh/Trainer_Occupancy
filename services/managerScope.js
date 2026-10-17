const { Op } = require('sequelize');
const {
  User,
  ManagerSchoolAssignment,
  ManagerTrainerAssignment,
  TrainerSchoolTimetableTemplate,
  TrainerSchoolAssignment,
} = require('../models');
const { scopeWhere } = require('../middleware/seniorManagementScope');

const isAdmin = user => user?.role === 'admin';

// Schools the admin assigned to this manager; null means no restriction
// (admins, or managers the admin has not assigned any schools to yet).
const getAssignedSchoolIds = async user => {
  if (isAdmin(user)) return null;
  const rows = await ManagerSchoolAssignment.findAll({ where: { managerId: user.employeeCode }, attributes: ['schoolId'] });
  return rows.length ? rows.map(row => Number(row.schoolId)) : null;
};

const getAssignedTrainerCodes = async user => {
  if (isAdmin(user)) return null;
  const rows = await ManagerTrainerAssignment.findAll({ where: { managerId: user.employeeCode }, attributes: ['trainerId'] });
  return rows.length ? rows.map(row => row.trainerId) : null;
};

// Trainers a manager may schedule: admin-assigned trainers, otherwise the
// manager's branch/department trainers. Admins get null (everyone).
const getManagedTrainerCodes = async user => {
  if (isAdmin(user)) return null;
  const assigned = await getAssignedTrainerCodes(user);
  if (assigned) return assigned;
  const scope = scopeWhere(user);
  if (!scope) return [];
  const trainers = await User.findAll({ where: { ...scope, role: 'employee' }, attributes: ['employeeCode'] });
  return trainers.map(trainer => trainer.employeeCode);
};

const canAccessSchool = async (user, schoolId) => {
  const allowed = await getAssignedSchoolIds(user);
  return !allowed || allowed.includes(Number(schoolId));
};

const forbidden = message => Object.assign(new Error(message), { status: 403 });
const assertSchoolAccess = async (user, schoolIds) => {
  const allowed = await getAssignedSchoolIds(user);
  if (!allowed) return;
  const blocked = [...new Set(schoolIds.map(Number))].filter(id => !allowed.includes(id));
  if (blocked.length) throw forbidden('This school is not assigned to you. Ask an admin to assign it.');
};

// A manager owns a class when they schedule it (timetable or school activity).
const ownedClassWhere = user => ({ managerId: user.employeeCode });
const ownsClass = async (user, schoolId, className) => {
  if (isAdmin(user)) return true;
  const where = { ...ownedClassWhere(user), schoolId: Number(schoolId), className };
  const [templates, assignments] = await Promise.all([
    TrainerSchoolTimetableTemplate.count({ where }),
    TrainerSchoolAssignment.count({ where }),
  ]);
  return templates + assignments > 0;
};

const getOwnedClasses = async user => {
  if (isAdmin(user)) return null;
  const [templates, assignments] = await Promise.all([
    TrainerSchoolTimetableTemplate.findAll({ where: ownedClassWhere(user), attributes: ['schoolId', 'className'] }),
    TrainerSchoolAssignment.findAll({ where: ownedClassWhere(user), attributes: ['schoolId', 'className'], group: ['schoolId', 'className'] }),
  ]);
  return new Set([...templates, ...assignments].map(row => `${Number(row.schoolId)}|${row.className}`));
};

const getScopeSummary = async user => {
  const [schoolIds, trainerCodes] = await Promise.all([getAssignedSchoolIds(user), getAssignedTrainerCodes(user)]);
  const trainers = trainerCodes
    ? await User.findAll({ where: { employeeCode: { [Op.in]: trainerCodes }, role: 'employee' }, attributes: ['employeeCode', 'name', 'email', 'branchId', 'departmentId', 'role'], order: [['name', 'ASC']] })
    : null;
  return { isAdmin: isAdmin(user), schoolIds, trainerCodes, trainers };
};

module.exports = {
  getAssignedSchoolIds,
  getAssignedTrainerCodes,
  getManagedTrainerCodes,
  canAccessSchool,
  assertSchoolAccess,
  ownsClass,
  getOwnedClasses,
  getScopeSummary,
};
