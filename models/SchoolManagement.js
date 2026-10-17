const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

// Academic structure mirrored from omo_reportcard. reportcardId stores the
// matching omo_reportcard row id once the two apps are synced.
const SchoolAcademicSession = sequelize.define('SchoolAcademicSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  label: { type: DataTypes.STRING(50), allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  reportcardId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'school_academic_sessions',
  indexes: [{ unique: true, fields: ['schoolId', 'label'], name: 'school_academic_session_label_unique' }],
});

const SchoolAcademicTerm = sequelize.define('SchoolAcademicTerm', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  academicSessionId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(50), allowNull: false },
  order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  startsOn: { type: DataTypes.DATEONLY, allowNull: true },
  endsOn: { type: DataTypes.DATEONLY, allowNull: true },
  reportcardId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'school_academic_terms',
  indexes: [{ unique: true, fields: ['academicSessionId', 'order'], name: 'school_academic_term_order_unique' }],
});

const SchoolClass = sequelize.define('SchoolClass', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('upcoming', 'active', 'completed'), allowNull: false, defaultValue: 'upcoming' },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  totalSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  trainerId: { type: DataTypes.STRING, allowNull: true }, // users.employeeCode
  activeAcademicSessionId: { type: DataTypes.INTEGER, allowNull: true },
  activeAcademicTermId: { type: DataTypes.INTEGER, allowNull: true },
  reportcardId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'school_classes',
  indexes: [{ unique: true, fields: ['schoolId', 'title'], name: 'school_class_title_unique' }],
});

const SchoolClassCourse = sequelize.define('SchoolClassCourse', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  classId: { type: DataTypes.INTEGER, allowNull: false },
  courseId: { type: DataTypes.INTEGER, allowNull: false }, // school_curriculum_courses.id
  academicSessionId: { type: DataTypes.INTEGER, allowNull: true },
  academicTermId: { type: DataTypes.INTEGER, allowNull: true },
  assignedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  assignedBy: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'school_class_courses' });

SchoolAcademicSession.hasMany(SchoolAcademicTerm, { as: 'terms', foreignKey: 'academicSessionId' });
SchoolAcademicTerm.belongsTo(SchoolAcademicSession, { as: 'session', foreignKey: 'academicSessionId' });
SchoolClass.hasMany(SchoolClassCourse, { as: 'courseAssignments', foreignKey: 'classId' });
SchoolClassCourse.belongsTo(SchoolClass, { as: 'schoolClass', foreignKey: 'classId' });

module.exports = { SchoolAcademicSession, SchoolAcademicTerm, SchoolClass, SchoolClassCourse };
