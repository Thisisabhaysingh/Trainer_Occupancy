const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const SchoolCurriculumCourse = sequelize.define('SchoolCurriculumCourse', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(50), allowNull: true }, // unique; matches omo_reportcard courses.code
  schoolId: { type: DataTypes.INTEGER, allowNull: true }, // legacy import source; courses are shared by all schools
  academicYear: { type: DataTypes.STRING(20), allowNull: false },
  term: { type: DataTypes.STRING(40), allowNull: false },
  gradeBand: { type: DataTypes.STRING(40), allowNull: false },
  courseName: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  durationWeeks: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },
  declaredSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  computerLab: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sourceSheet: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'school_curriculum_courses',
  indexes: [
    { unique: true, fields: ['academicYear', 'term', 'gradeBand', 'courseName'], name: 'school_curriculum_course_common_unique' },
    { unique: true, fields: ['code'], name: 'school_curriculum_course_code_unique' },
  ],
});

module.exports = SchoolCurriculumCourse;
