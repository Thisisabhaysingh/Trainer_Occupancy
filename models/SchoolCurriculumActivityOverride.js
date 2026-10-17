const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

// Manager correction of one curriculum activity for one class. The trainer's
// own school activity rows are kept untouched; these values are applied on top.
const SchoolCurriculumActivityOverride = sequelize.define('SchoolCurriculumActivityOverride', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  className: { type: DataTypes.STRING(100), allowNull: false },
  curriculumSessionId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'done', 'not_completed', 'cancelled'), allowNull: false },
  scheduledCount: { type: DataTypes.INTEGER, allowNull: true },
  completedCount: { type: DataTypes.INTEGER, allowNull: true },
  remark: { type: DataTypes.TEXT, allowNull: true },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'school_curriculum_activity_overrides',
  indexes: [
    { unique: true, fields: ['schoolId', 'className', 'curriculumSessionId'], name: 'school_curriculum_override_unique' },
    { fields: ['curriculumSessionId'], name: 'school_curriculum_override_session' },
  ],
});

module.exports = SchoolCurriculumActivityOverride;
