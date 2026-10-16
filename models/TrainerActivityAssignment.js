const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TrainerActivityAssignment = sequelize.define('TrainerActivityAssignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  managerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  trainerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  activityTemplateId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  activityTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  weekStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.STRING(5),
    allowNull: false,
  },
  endTime: {
    type: DataTypes.STRING(5),
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    allowNull: false,
    defaultValue: 'draft',
  },
}, {
  tableName: 'trainer_activity_assignments',
  indexes: [
    { fields: ['trainerId', 'date'] },
    { fields: ['managerId', 'weekStart'] },
  ],
});

module.exports = TrainerActivityAssignment;