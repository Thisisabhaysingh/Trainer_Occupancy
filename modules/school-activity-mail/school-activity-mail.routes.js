const express = require('express');
const { Op } = require('sequelize');
const { User, SchoolCatalog, SchoolActivityMailLog, SchoolMailContact } = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { isEmailEnabled, buildCustomEmailHtml } = require('../../services/emailService');
const { istToday } = require('../../services/schoolAssignmentGenerator');
const mail = require('../../services/schoolActivityMailService');

const router = express.Router();
router.use(auth, checkRole(['admin', 'manager', 'senior_manager']));

const isDateKey = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

// Admins act on the global default or any manager; managers only on themselves.
const resolveScope = async (req, requested) => {
  if (req.user.role !== 'admin') return req.user.employeeCode;
  const scope = requested || mail.GLOBAL_SCOPE;
  if (scope === mail.GLOBAL_SCOPE) return scope;
  const manager = await User.findOne({ where: { employeeCode: scope, role: { [Op.in]: ['manager', 'senior_manager'] } }, attributes: ['employeeCode'] });
  if (!manager) throw Object.assign(new Error('Manager not found.'), { status: 404 });
  return scope;
};

const handle = fn => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('School activity mail error:', error);
    return res.status(500).json({ error: 'Something went wrong with school activity mail.' });
  }
};

router.get('/settings', handle(async (req, res) => {
  const scope = await resolveScope(req, req.query.scope);
  const [settings, effective] = await Promise.all([
    mail.getScopeSettings(scope),
    scope === mail.GLOBAL_SCOPE ? null : mail.getEffectiveSettings(scope),
  ]);
  return res.json({
    scope,
    settings,
    effective,
    placeholders: mail.PLACEHOLDERS,
    lookbackOptions: mail.LOOKBACK_OPTIONS,
    schoolContentFields: mail.SCHOOL_CONTENT_FIELDS,
    defaults: mail.DEFAULT_SETTINGS,
    emailEnabled: Boolean(isEmailEnabled()),
  });
}));

router.put('/settings', handle(async (req, res) => {
  const scope = await resolveScope(req, req.body?.scope);
  const settings = await mail.saveScopeSettings(scope, req.body?.settings || {}, req.user.employeeCode);
  return res.json({ scope, settings });
}));

// Removes a manager's override so the organisation default applies again.
router.delete('/settings', handle(async (req, res) => {
  const scope = await resolveScope(req, req.query.scope);
  if (scope === mail.GLOBAL_SCOPE) return res.status(400).json({ error: 'The organisation default cannot be removed.' });
  await mail.resetScopeSettings(scope);
  return res.json({ scope, settings: await mail.getScopeSettings(scope) });
}));

router.get('/managers', checkRole(['admin']), handle(async (req, res) => {
  const managers = await User.findAll({ where: { role: { [Op.in]: ['manager', 'senior_manager'] } }, attributes: ['employeeCode', 'name', 'email', 'role'], order: [['name', 'ASC']] });
  return res.json(managers);
}));

router.get('/schools', handle(async (req, res) => {
  const [schools, contacts] = await Promise.all([
    SchoolCatalog.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] }),
    SchoolMailContact.findAll(),
  ]);
  const emailsBySchool = new Map(contacts.map(row => [row.schoolId, mail.parseEmails(row.emails)]));
  return res.json(schools.map(school => ({ id: school.id, name: school.name, contactEmails: emailsBySchool.get(school.id) || [] })));
}));

router.put('/schools/:id/contacts', handle(async (req, res) => {
  const schoolId = Number(req.params.id);
  const school = Number.isInteger(schoolId) ? await SchoolCatalog.findByPk(schoolId) : null;
  if (!school) return res.status(404).json({ error: 'School not found.' });
  const emails = mail.parseEmails(req.body?.emails);
  const invalid = mail.invalidEmails(emails);
  if (invalid.length) return res.status(400).json({ error: `Invalid email address: ${invalid.join(', ')}` });
  await SchoolMailContact.upsert({ schoolId, emails: emails.join(', '), updatedBy: req.user.employeeCode });
  return res.json({ id: schoolId, name: school.name, contactEmails: emails });
}));

const draftSetting = (type, input) => {
  const { value, error } = mail.validateSetting(type, input);
  if (error) throw Object.assign(new Error(error), { status: 400 });
  return value;
};

router.post('/preview', handle(async (req, res) => {
  const { type, setting, schoolId, fromDate, toDate } = req.body || {};
  if (!mail.PLACEHOLDERS[type]) return res.status(400).json({ error: 'Unknown mail type.' });
  const scope = await resolveScope(req, req.body?.scope);
  const preview = await mail.buildPreview({ type, setting: draftSetting(type, setting), scope, schoolId, fromDate: isDateKey(fromDate) ? fromDate : null, toDate: isDateKey(toDate) ? toDate : null, viewer: req.user });
  return res.json({ subject: preview.subject, html: preview.html, to: preview.to, cc: preview.cc, sample: preview.sample });
}));

// Sends the rendered preview only to the signed-in user.
router.post('/test', handle(async (req, res) => {
  const { type, setting, schoolId, fromDate, toDate } = req.body || {};
  if (!mail.PLACEHOLDERS[type]) return res.status(400).json({ error: 'Unknown mail type.' });
  if (!req.user.email) return res.status(400).json({ error: 'Your profile has no email address.' });
  const scope = await resolveScope(req, req.body?.scope);
  const preview = await mail.buildPreview({ type, setting: draftSetting(type, setting), scope, schoolId, fromDate: isDateKey(fromDate) ? fromDate : null, toDate: isDateKey(toDate) ? toDate : null, viewer: req.user });
  const result = await mail.deliver({
    type: 'test', scope, managerId: scope === mail.GLOBAL_SCOPE ? null : scope, triggeredBy: req.user.employeeCode,
    message: { ...preview, subject: `[Test] ${preview.subject}`, to: [req.user.email], cc: [] },
  });
  return res.json({ status: result.status, sentTo: req.user.email, error: result.log?.error || null });
}));

// Manual "send to school" for one school and day, using the scope's school mail template.
router.post('/send-school', handle(async (req, res) => {
  const schoolId = Number(req.body?.schoolId);
  const toDate = isDateKey(req.body?.toDate) ? req.body.toDate : istToday();
  const fromDate = isDateKey(req.body?.fromDate) ? req.body.fromDate : toDate;
  if (!Number.isInteger(schoolId) || !(await SchoolCatalog.findByPk(schoolId))) return res.status(404).json({ error: 'School not found.' });
  const scope = await resolveScope(req, req.body?.scope);
  const managerId = scope === mail.GLOBAL_SCOPE ? null : scope;
  const setting = req.body?.setting
    ? draftSetting('school_notice', req.body.setting)
    : (managerId ? (await mail.getEffectiveSettings(managerId)).school_notice : (await mail.getScopeSettings(scope)).school_notice);
  const message = await mail.buildSchoolNotice({ schoolId, fromDate, toDate, managerId, setting });
  if (!message.sessionCount && !req.body?.allowEmpty) return res.status(400).json({ error: 'No school activities are scheduled for this school in that date range.' });
  const result = await mail.deliver({
    type: 'school_notice', scope, managerId, schoolId, triggeredBy: req.user.employeeCode, message,
    details: { manual: true, fromDate, toDate, sessionCount: message.sessionCount, classCount: message.classCount, contentOptions: setting.contentOptions },
  });
  if (result.status === 'failed') return res.status(502).json({ error: `Mail could not be sent: ${result.log?.error}` });
  return res.json({ status: result.status, to: message.to, cc: message.cc, error: result.log?.error || null });
}));

router.get('/logs', handle(async (req, res) => {
  const scope = await resolveScope(req, req.query.scope);
  const where = scope === mail.GLOBAL_SCOPE ? {} : { [Op.or]: [{ managerId: scope }, { scope }] };
  const statusFilter = ['sent', 'skipped', 'failed', 'pending'].includes(req.query.status) ? { status: req.query.status } : {};
  const typeFilter = ['trainer_reminder', 'school_notice', 'test'].includes(req.query.type) ? { type: req.query.type } : {};
  const logs = await SchoolActivityMailLog.findAll({
    where: { ...where, ...statusFilter, ...typeFilter },
    attributes: { exclude: ['bodyHtml'] },
    order: [['createdAt', 'DESC']],
    limit: Math.min(Number(req.query.limit) || 100, 500),
  });
  const [schools, users] = await Promise.all([
    SchoolCatalog.findAll({ where: { id: { [Op.in]: [...new Set(logs.map(log => log.schoolId).filter(Boolean))] } }, attributes: ['id', 'name'] }),
    User.findAll({ where: { employeeCode: { [Op.in]: [...new Set(logs.map(log => log.trainerId).filter(Boolean))] } }, attributes: ['employeeCode', 'name'] }),
  ]);
  const schoolName = new Map(schools.map(school => [school.id, school.name]));
  const userName = new Map(users.map(user => [user.employeeCode, user.name]));
  return res.json(logs.map(log => ({
    ...log.toJSON(),
    schoolName: schoolName.get(log.schoolId) || null,
    trainerName: userName.get(log.trainerId) || null,
  })));
}));

// Full copy of a logged mail exactly as it was delivered.
router.get('/logs/:id', handle(async (req, res) => {
  const scope = await resolveScope(req, req.query.scope);
  const log = await SchoolActivityMailLog.findByPk(Number(req.params.id));
  const visible = log && (scope === mail.GLOBAL_SCOPE || log.managerId === scope || log.scope === scope);
  if (!visible) return res.status(404).json({ error: 'Mail log not found.' });
  const record = log.toJSON();
  return res.json({ ...record, html: record.bodyHtml ? buildCustomEmailHtml(record.bodyHtml) : null });
}));

router.post('/run-now', checkRole(['admin']), handle(async (req, res) => res.json(await mail.runAutomationPass())));

module.exports = router;
