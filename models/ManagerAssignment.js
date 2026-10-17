const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

// Schools and trainers an admin assigns to a manager (or senior manager).
const ManagerSchoolAssignment = sequelize.define('ManagerSchoolAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  managerId: { type: DataTypes.STRING, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  assignedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'manager_school_assignments',
  indexes: [{ unique: true, fields: ['managerId', 'schoolId'], name: 'manager_school_assignment_unique' }],
});

const ManagerTrainerAssignment = sequelize.define('ManagerTrainerAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  managerId: { type: DataTypes.STRING, allowNull: false },
  trainerId: { type: DataTypes.STRING, allowNull: false },
  assignedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'manager_trainer_assignments',
  indexes: [{ unique: true, fields: ['managerId', 'trainerId'], name: 'manager_trainer_assignment_unique' }],
});

module.exports = { ManagerSchoolAssignment, ManagerTrainerAssignment };
