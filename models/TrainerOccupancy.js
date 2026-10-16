const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TrainerOccupancy = sequelize.define('TrainerOccupancy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  weekStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'trainer_occupancies',
  indexes: [
    {
      unique: true,
      fields: ['employeeId', 'date'],
    },
    {
      fields: ['employeeId', 'weekStart'],
    },
  ],
});

module.exports = TrainerOccupancy;
