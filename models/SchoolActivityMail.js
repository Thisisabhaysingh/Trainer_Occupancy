const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const MAIL_TYPES = ['trainer_reminder', 'school_notice'];

// Mail automation settings. scope is 'global' (admin default) or a manager's
// employeeCode; a manager's own row overrides the global default.
const SchoolActivityMailSetting = sequelize.define('SchoolActivityMailSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  scope: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM(...MAIL_TYPES), allowNull: false },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  delayMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 120 },
  sendTime: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '18:00' }, // IST, HH:MM
  lookbackDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  contentOptions: { type: DataTypes.JSON, allowNull: true }, // school mail: which details to include
  subjectTemplate: { type: DataTypes.STRING(500), allowNull: false },
  bodyTemplate: { type: DataTypes.TEXT, allowNull: false },
  toRecipients: { type: DataTypes.JSON, allowNull: false },
  ccRecipients: { type: DataTypes.JSON, allowNull: false },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'school_activity_mail_settings',
  indexes: [{ unique: true, fields: ['scope', 'type'], name: 'school_activity_mail_settings_scope_type' }],
});

const SchoolActivityMailLog = sequelize.define('SchoolActivityMailLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.ENUM(...MAIL_TYPES, 'test'), allowNull: false },
  scope: { type: DataTypes.STRING, allowNull: false },
  managerId: { type: DataTypes.STRING, allowNull: true },
  trainerId: { type: DataTypes.STRING, allowNull: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: true },
  assignmentId: { type: DataTypes.INTEGER, allowNull: true },
  dedupeKey: { type: DataTypes.STRING, allowNull: true },
  toEmails: { type: DataTypes.TEXT, allowNull: true },
  ccEmails: { type: DataTypes.TEXT, allowNull: true },
  subject: { type: DataTypes.STRING(500), allowNull: true },
  bodyHtml: { type: DataTypes.TEXT('medium'), allowNull: true },
  details: { type: DataTypes.JSON, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'sent', 'skipped', 'failed'), allowNull: false, defaultValue: 'pending' },
  error: { type: DataTypes.TEXT, allowNull: true },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  triggeredBy: { type: DataTypes.STRING, allowNull: false, defaultValue: 'system' },
}, {
  tableName: 'school_activity_mail_logs',
  indexes: [
    { unique: true, fields: ['dedupeKey'], name: 'school_activity_mail_logs_dedupe' },
    { fields: ['scope', 'createdAt'], name: 'school_activity_mail_logs_scope_created' },
    { fields: ['managerId', 'createdAt'], name: 'school_activity_mail_logs_manager_created' },
  ],
});

// Contact addresses used when a mail is sent to a school.
const SchoolMailContact = sequelize.define('SchoolMailContact', {
  schoolId: { type: DataTypes.INTEGER, primaryKey: true },
  emails: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  updatedBy: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'school_mail_contacts' });

module.exports = { MAIL_TYPES, SchoolActivityMailSetting, SchoolActivityMailLog, SchoolMailContact };
