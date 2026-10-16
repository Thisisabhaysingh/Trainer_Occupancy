const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const SchoolCurriculumSession = sequelize.define('SchoolCurriculumSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false },
  sourceSessionNumber: { type: DataTypes.STRING(20), allowNull: true },
  topic: { type: DataTypes.STRING(255), allowNull: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  learningOutcome: { type: DataTypes.TEXT, allowNull: true },
  academicConcept: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'school_curriculum_sessions',
  indexes: [{ unique: true, fields: ['courseId', 'position'], name: 'school_curriculum_session_unique' }],
});

module.exports = SchoolCurriculumSession;
