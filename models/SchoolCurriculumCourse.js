const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const SchoolCurriculumCourse = sequelize.define('SchoolCurriculumCourse', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  academicYear: { type: DataTypes.STRING(20), allowNull: false },
  term: { type: DataTypes.STRING(40), allowNull: false },
  gradeBand: { type: DataTypes.STRING(40), allowNull: false },
  courseName: { type: DataTypes.STRING(255), allowNull: false },
  declaredSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  computerLab: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sourceSheet: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'school_curriculum_courses',
  indexes: [{ unique: true, fields: ['schoolId', 'academicYear', 'term', 'gradeBand', 'courseName'], name: 'school_curriculum_course_unique' }],
});

module.exports = SchoolCurriculumCourse;
