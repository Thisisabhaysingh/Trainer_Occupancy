const express = require('express');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Branch,
  Department,
  SchoolCatalog,
  ManagerSchoolAssignment,
  ManagerTrainerAssignment,
} = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { getScopeSummary } = require('../../services/managerScope');

const router = express.Router();
router.use(auth);

const MANAGER_ROLES = ['manager', 'senior_manager'];

// The signed-in manager's assigned schools and trainers (null = not restricted yet).
router.get('/mine', checkRole(['admin', ...MANAGER_ROLES]), async (req, res) => {
  try {
    return res.json(await getScopeSummary(req.user));
  } catch (error) {
    console.error('Error loading manager scope:', error);
    return res.status(500).json({ error: 'Failed to load your assigned schools and trainers.' });
  }
});

router.get('/', checkRole(['admin']), async (req, res) => {
  try {
    const [managers, trainers, schools, schoolRows, trainerRows] = await Promise.all([
      User.findAll({ where: { role: { [Op.in]: MANAGER_ROLES } }, attributes: ['employeeCode', 'name', 'email', 'role', 'managerType', 'branchId', 'departmentId'], order: [['name', 'ASC']] }),
      User.findAll({
        where: { role: 'employee' },
        attributes: ['employeeCode', 'name', 'email', 'branchId', 'departmentId'],
        include: [
          { model: Branch, as: 'branch', attributes: ['id', 'name'], required: false },
          { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
        ],
        order: [['name', 'ASC']],
      }),
      SchoolCatalog.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] }),
      ManagerSchoolAssignment.findAll({ attributes: ['managerId', 'schoolId'] }),
      ManagerTrainerAssignment.findAll({ attributes: ['managerId', 'trainerId'] }),
    ]);
    const group = (rows, key) => rows.reduce((map, row) => map.set(row.managerId, [...(map.get(row.managerId) || []), row[key]]), new Map());
    const schoolsByManager = group(schoolRows, 'schoolId');
    const trainersByManager = group(trainerRows, 'trainerId');
    return res.json({
      managers: managers.map(manager => ({
        ...manager.toJSON(),
        schoolIds: (schoolsByManager.get(manager.employeeCode) || []).map(Number),
        trainerIds: trainersByManager.get(manager.employeeCode) || [],
      })),
      trainers: trainers.map(trainer => ({
        employeeCode: trainer.employeeCode,
        name: trainer.name,
        email: trainer.email,
        branchName: trainer.branch?.name || null,
        departmentName: trainer.department?.name || null,
      })),
      schools: schools.map(school => ({ id: school.id, name: school.name })),
    });
  } catch (error) {
    console.error('Error loading manager assignments:', error);
    return res.status(500).json({ error: 'Failed to load manager assignments.' });
  }
});

router.put('/:managerId', checkRole(['admin']), async (req, res) => {
  try {
    const manager = await User.findOne({ where: { employeeCode: req.params.managerId, role: { [Op.in]: MANAGER_ROLES } }, attributes: ['employeeCode'] });
    if (!manager) return res.status(404).json({ error: 'Manager not found.' });
    const schoolIds = [...new Set((Array.isArray(req.body?.schoolIds) ? req.body.schoolIds : []).map(Number).filter(Number.isInteger))];
    const trainerIds = [...new Set((Array.isArray(req.body?.trainerIds) ? req.body.trainerIds : []).map(id => String(id).trim()).filter(Boolean))];
    const [validSchools, validTrainers] = await Promise.all([
      schoolIds.length ? SchoolCatalog.count({ where: { id: { [Op.in]: schoolIds } } }) : 0,
      trainerIds.length ? User.count({ where: { employeeCode: { [Op.in]: trainerIds }, role: 'employee' } }) : 0,
    ]);
    if (validSchools !== schoolIds.length) return res.status(400).json({ error: 'One or more schools were not found.' });
    if (validTrainers !== trainerIds.length) return res.status(400).json({ error: 'One or more trainers were not found.' });

    const managerId = manager.employeeCode;
    await sequelize.transaction(async transaction => {
      await ManagerSchoolAssignment.destroy({ where: { managerId }, transaction });
      await ManagerTrainerAssignment.destroy({ where: { managerId }, transaction });
      if (schoolIds.length) await ManagerSchoolAssignment.bulkCreate(schoolIds.map(schoolId => ({ managerId, schoolId, assignedBy: req.user.employeeCode })), { transaction });
      if (trainerIds.length) await ManagerTrainerAssignment.bulkCreate(trainerIds.map(trainerId => ({ managerId, trainerId, assignedBy: req.user.employeeCode })), { transaction });
    });
    return res.json({ managerId, schoolIds, trainerIds });
  } catch (error) {
    console.error('Error saving manager assignments:', error);
    return res.status(500).json({ error: 'Failed to save manager assignments.' });
  }
});

module.exports = router;
