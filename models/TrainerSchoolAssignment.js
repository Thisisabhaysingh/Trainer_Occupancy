const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TrainerSchoolAssignment = sequelize.define('TrainerSchoolAssignment', {
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
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  className: {
    type: DataTypes.STRING(100),
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
  curriculumSessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  timetableTemplateId: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  completionStatus: {
    // cancelled = class did not happen; it earns no points and does not advance the curriculum.
    type: DataTypes.ENUM('pending', 'completed', 'not_completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  trainerNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Required when the trainer marks the activity Done.
  studentCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  photosLink: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
}, {
  tableName: 'trainer_school_assignments',
  indexes: [
    { fields: ['trainerId', 'date'] },
    { fields: ['managerId', 'weekStart'] },
    { fields: ['curriculumSessionId'] },
    { unique: true, fields: ['timetableTemplateId', 'weekStart'], name: 'trainer_school_template_week_unique' },
  ],
});

module.exports = TrainerSchoolAssignment;
