const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TrainerSchoolRoster = sequelize.define('TrainerSchoolRoster', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  managerId: { type: DataTypes.STRING, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  trainerId: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'trainer_school_rosters',
  indexes: [
    { unique: true, fields: ['managerId', 'schoolId', 'trainerId'] },
    { fields: ['schoolId'] },
    { fields: ['trainerId'] },
  ],
});

module.exports = TrainerSchoolRoster;
