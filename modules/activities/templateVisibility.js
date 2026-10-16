const { Op } = require('sequelize');

// Employee rules stay department-based. Only Senior Managers inherit the former
// Manager branch view; branch visibility never follows a client-supplied scope.
async function templateWhere(user, Department) {
  if (user.role === 'senior_manager' && user.managerType === 'branch') {
    if (!user.branchId) throw new Error('Branch manager is not assigned to any branch');
    const departments = await Department.findAll({ where: { branchId: user.branchId }, attributes: ['id'] });
    return { departmentId: { [Op.in]: departments.map(department => department.id) }, title: { [Op.ne]: 'Total No. of Sessions' } };
  }
  if (!user.departmentId && ['manager', 'senior_manager'].includes(user.role)) {
    throw new Error('Manager is not assigned to any department');
  }
  return { departmentId: user.departmentId ?? null };
}

module.exports = { templateWhere };
