const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TrainerSchoolTimetableTemplate = sequelize.define('TrainerSchoolTimetableTemplate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  managerId: { type: DataTypes.STRING, allowNull: false },
  trainerId: { type: DataTypes.STRING, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  className: { type: DataTypes.STRING(100), allowNull: false },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  startActivityPosition: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  dayOfWeek: { type: DataTypes.TINYINT, allowNull: false },
  startTime: { type: DataTypes.STRING(5), allowNull: false },
  endTime: { type: DataTypes.STRING(5), allowNull: false },
  startWeek: { type: DataTypes.DATEONLY, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'trainer_school_timetable_templates',
  indexes: [
    { fields: ['managerId', 'schoolId'] },
    { fields: ['trainerId', 'dayOfWeek'] },
    { fields: ['courseId'] },
  ],
});

module.exports = TrainerSchoolTimetableTemplate;
