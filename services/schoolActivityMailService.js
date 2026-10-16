const { Op } = require('sequelize');
const {
  User,
  SchoolCatalog,
  TrainerSchoolAssignment,
  TrainerSchoolTimetableTemplate,
  SchoolActivityMailSetting,
  SchoolActivityMailLog,
  SchoolMailContact,
  SchoolCurriculumSession,
  SchoolCurriculumCourse,
} = require('../models');
const { MAIL_TYPES } = require('../models/SchoolActivityMail');
const { isEmailEnabled, escapeHtml, buildCustomEmailHtml, sendCustomEmail } = require('./emailService');
const { istToday, materializeTrainerWeek } = require('./schoolAssignmentGenerator');

const GLOBAL_SCOPE = 'global';
const DASHBOARD_URL = 'https://time.onmyowntechnology.com';
const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOOKBACK_OPTIONS = [1, 2, 3, 7];
const MAX_SCHOOL_MAIL_RANGE_DAYS = 92;

// Columns a manager can include in the school mail summary (one row per class).
const SCHOOL_CONTENT_FIELDS = [
  { key: 'course', label: 'Course name' },
  { key: 'sessionCount', label: 'No. of sessions' },
  { key: 'completedCount', label: 'Completed sessions' },
  { key: 'activities', label: 'Activities' },
  { key: 'activityDates', label: 'Date beside each activity' },
  { key: 'activityStatus', label: 'Status beside each activity' },
  { key: 'students', label: 'No. of students' },
  { key: 'photos', label: 'Photos links' },
  { key: 'trainer', label: 'Trainer name' },
  { key: 'remarks', label: 'Trainer remarks' },
];
const DEFAULT_CONTENT_OPTIONS = { course: true, sessionCount: true, completedCount: true, activities: true, activityDates: false, activityStatus: false, students: false, photos: false, trainer: false, remarks: false };
const normalizeContentOptions = value => Object.fromEntries(SCHOOL_CONTENT_FIELDS.map(({ key }) => [
  key, value && typeof value === 'object' && key in value ? Boolean(value[key]) : DEFAULT_CONTENT_OPTIONS[key],
]));
// Placeholders that inject server-generated HTML tables instead of escaped text.
const TABLE_PLACEHOLDERS = ['sessionTable', 'activityTable'];

const DEFAULT_SETTINGS = {
  trainer_reminder: {
    enabled: false,
    delayMinutes: 0,
    sendTime: '18:00',
    lookbackDays: 1,
    subjectTemplate: 'Reminder: {{pendingCount}} school activity status not marked ({{date}})',
    bodyTemplate: [
      'Hi {{trainerName}},',
      '',
      'The following school activities assigned to you have not been marked yet:',
      '',
      '{{activityTable}}',
      '',
      'Please open the MIS dashboard and mark each one as Done or Not completed: {{dashboardUrl}}',
      '',
      'Thanks,',
      '{{managerName}}',
    ].join('\n'),
    toRecipients: { trainer: true, manager: false, school: false, emails: [] },
    ccRecipients: { trainer: false, manager: true, school: false, emails: [] },
  },
  school_notice: {
    enabled: false,
    delayMinutes: 0,
    sendTime: '18:00',
    lookbackDays: 1,
    contentOptions: DEFAULT_CONTENT_OPTIONS,
    subjectTemplate: 'OMOTEC session summary for {{schoolName}} – {{dateRange}}',
    bodyTemplate: [
      'Dear {{schoolName}} team,',
      '',
      'Here is the summary of OMOTEC sessions conducted from {{fromDate}} to {{toDate}}:',
      '',
      '{{sessionTable}}',
      '',
      'Completed: {{completedCount}} of {{sessionCount}} sessions.',
      '',
      'Regards,',
      '{{managerName}}',
      'OMOTEC',
    ].join('\n'),
    toRecipients: { trainer: false, manager: false, school: true, emails: [] },
    ccRecipients: { trainer: false, manager: true, school: false, emails: [] },
  },
};

const PLACEHOLDERS = {
  trainer_reminder: ['trainerName', 'trainerCode', 'managerName', 'pendingCount', 'activityTable', 'schoolName', 'date', 'dashboardUrl'],
  school_notice: ['schoolName', 'managerName', 'dateRange', 'fromDate', 'toDate', 'classCount', 'sessionCount', 'completedCount', 'cancelledCount', 'sessionTable', 'dashboardUrl'],
};

// ---------- helpers ----------

const parseEmails = value => {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,;\s]+/);
  return [...new Set(list.map(item => String(item || '').trim().toLowerCase()).filter(Boolean))];
};
const invalidEmails = list => list.filter(email => !EMAIL_PATTERN.test(email));

const normalizeRecipients = (value = {}) => ({
  trainer: Boolean(value.trainer),
  manager: Boolean(value.manager),
  school: Boolean(value.school),
  emails: parseEmails(value.emails),
});

const isTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');

const formatDisplayDate = dateKey => new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

const istMinutesNow = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map(part => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
};
const toMinutes = time => {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
};
const istDateTime = (dateKey, time) => new Date(`${dateKey}T${time}:00+05:30`);
const shiftDate = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Body templates are plain text. Values are escaped; only the table placeholders
// inject HTML, and those tables are generated by the server.
const renderTemplate = (template, vars, { html = false } = {}) => {
  const source = html ? escapeHtml(template) : String(template || '');
  const rendered = source.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (TABLE_PLACEHOLDERS.includes(key)) return html ? (vars[`${key}Html`] || '') : (vars[`${key}Text`] || '');
    if (!(key in vars)) return match;
    return html ? escapeHtml(vars[key]) : String(vars[key] ?? '');
  });
  return html ? rendered.replace(/\n/g, '<br />') : rendered;
};

const STATUS_TEXT = { completed: 'Done', not_completed: 'Not completed', cancelled: 'Class cancelled' };
const statusLabel = status => STATUS_TEXT[status] || 'Pending';

const naturalCompare = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

// One row per class; all of the class's activities in the range share that row.
const buildSessionTable = (sessions, { userByCode, courseBySessionId, options }) => {
  const byClass = new Map();
  sessions.forEach(session => byClass.set(session.className, [...(byClass.get(session.className) || []), session]));
  const classes = [...byClass.entries()].sort(([a], [b]) => naturalCompare(a, b));

  const shortDate = dateKey => new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  const activityLabel = session => {
    const extras = [options.activityDates && shortDate(session.date), options.activityStatus && statusLabel(session.completionStatus)].filter(Boolean);
    return extras.length ? `${session.activityTitle} (${extras.join(', ')})` : session.activityTitle;
  };
  const columns = [
    { label: 'Class', value: (className) => className },
    options.course && { label: 'Course', value: (className, list) => [...new Set(list.map(session => courseBySessionId.get(Number(session.curriculumSessionId))).filter(Boolean))].join(', ') || '—' },
    options.sessionCount && { label: 'Sessions', value: (className, list) => String(list.length), align: 'center' },
    options.completedCount && { label: 'Completed', value: (className, list) => String(list.filter(session => session.completionStatus === 'completed').length), align: 'center' },
    options.activities && { label: 'Activities', value: (className, list) => list.map(activityLabel), list: true },
    options.students && { label: 'Students', value: (className, list) => list.filter(session => session.completionStatus === 'completed' && session.studentCount).map(session => `${shortDate(session.date)}: ${session.studentCount}`), list: true },
    options.photos && { label: 'Photos', value: (className, list) => list.filter(session => session.photosLink).map(session => ({ href: session.photosLink, text: shortDate(session.date) })), list: true },
    options.trainer && { label: 'Trainer', value: (className, list) => [...new Set(list.map(session => userByCode.get(session.trainerId)?.name || session.trainerId))].join(', ') },
    options.remarks && { label: 'Remarks', value: (className, list) => list.filter(session => session.trainerNote).map(session => `${shortDate(session.date)}: ${session.trainerNote}`), list: true },
  ].filter(Boolean);

  const cell = 'padding:8px 10px;border:1px solid #EAECF0;text-align:left;vertical-align:top;';
  const head = columns.map(column => `<th style="${cell}background:#F9FAFB;color:#475467;font-weight:600;">${column.label}</th>`).join('');
  const renderCell = (column, value) => {
    const style = `${cell}${column.align === 'center' ? 'text-align:center;' : ''}`;
    if (!column.list) return `<td style="${style}">${escapeHtml(value)}</td>`;
    if (!value.length) return `<td style="${style}">—</td>`;
    return `<td style="${style}">${value.map(item => (item && typeof item === 'object'
      ? `<a href="${escapeHtml(item.href)}" style="color:#0070F0;">${escapeHtml(item.text)}</a>`
      : escapeHtml(item))).join('<br />')}</td>`;
  };
  const rows = classes.map(([className, list]) => `<tr>${columns.map(column => renderCell(column, column.value(className, list))).join('')}</tr>`).join('');
  const text = classes.map(([className, list]) => columns
    .map(column => {
      const value = column.value(className, list);
      return `${column.label}: ${Array.isArray(value) ? (value.map(item => (item && typeof item === 'object' ? `${item.text} ${item.href}` : item)).join('; ') || '—') : value}`;
    }).join(' | ')).join('\n');
  return {
    classCount: classes.length,
    html: `<table style="border-collapse:collapse;width:100%;font-size:13px;margin:4px 0;"><tr>${head}</tr>${rows}</table>`,
    text,
  };
};

const buildActivityTable = (assignments, schoolById) => {
  const cell = 'padding:8px 10px;border:1px solid #EAECF0;text-align:left;vertical-align:top;';
  const head = ['Date', 'Time', 'School', 'Class', 'Activity']
    .map(label => `<th style="${cell}background:#F9FAFB;color:#475467;font-weight:600;">${label}</th>`).join('');
  const rows = assignments.map(assignment => `<tr>
      <td style="${cell}white-space:nowrap;">${escapeHtml(formatDisplayDate(assignment.date))}</td>
      <td style="${cell}white-space:nowrap;">${escapeHtml(`${assignment.startTime}–${assignment.endTime}`)}</td>
      <td style="${cell}">${escapeHtml(schoolById.get(Number(assignment.schoolId)) || 'School')}</td>
      <td style="${cell}">${escapeHtml(assignment.className)}</td>
      <td style="${cell}">${escapeHtml(assignment.activityTitle)}</td>
    </tr>`).join('');
  const text = assignments.map(assignment => `- ${formatDisplayDate(assignment.date)} ${assignment.startTime}–${assignment.endTime}: ${schoolById.get(Number(assignment.schoolId)) || 'School'}, ${assignment.className} – ${assignment.activityTitle}`).join('\n');
  return { html: `<table style="border-collapse:collapse;width:100%;font-size:13px;margin:4px 0;"><tr>${head}</tr>${rows}</table>`, text };
};

const getSchoolContacts = async schoolId => {
  const row = await SchoolMailContact.findByPk(schoolId);
  return parseEmails(row?.emails);
};

const resolveRecipientList = (recipients, { trainers = [], managers = [], schoolEmails = [] }) => parseEmails([
  ...(recipients.trainer ? trainers.map(user => user?.email) : []),
  ...(recipients.manager ? managers.map(user => user?.email) : []),
  ...(recipients.school ? schoolEmails : []),
  ...recipients.emails,
]);

// ---------- settings ----------

const settingToJson = (row, type) => {
  const defaults = DEFAULT_SETTINGS[type];
  if (!row) return { type, ...defaults };
  return {
    type,
    enabled: Boolean(row.enabled),
    delayMinutes: row.delayMinutes,
    sendTime: row.sendTime,
    lookbackDays: row.lookbackDays || 1,
    ...(type === 'school_notice' ? { contentOptions: normalizeContentOptions(row.contentOptions) } : {}),
    subjectTemplate: row.subjectTemplate,
    bodyTemplate: row.bodyTemplate,
    toRecipients: normalizeRecipients(row.toRecipients),
    ccRecipients: normalizeRecipients(row.ccRecipients),
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
  };
};

const getScopeSettings = async scope => {
  const rows = await SchoolActivityMailSetting.findAll({ where: { scope } });
  const byType = new Map(rows.map(row => [row.type, row]));
  return Object.fromEntries(MAIL_TYPES.map(type => [type, { ...settingToJson(byType.get(type), type), customized: byType.has(type) }]));
};

// A manager's own row wins; otherwise the admin's global default applies.
const getEffectiveSettings = async managerId => {
  const rows = await SchoolActivityMailSetting.findAll({ where: { scope: { [Op.in]: [managerId, GLOBAL_SCOPE].filter(Boolean) } } });
  return Object.fromEntries(MAIL_TYPES.map(type => {
    const own = rows.find(row => row.scope === managerId && row.type === type);
    const fallback = rows.find(row => row.scope === GLOBAL_SCOPE && row.type === type);
    const source = own || fallback;
    return [type, { ...settingToJson(source, type), sourceScope: source ? source.scope : 'default' }];
  }));
};

const validateSetting = (type, input = {}) => {
  const value = {
    // School mail has no automatic delivery; it is only sent with "Send now".
    enabled: type === 'school_notice' ? false : Boolean(input.enabled),
    delayMinutes: Number.isInteger(Number(input.delayMinutes)) ? Math.min(Math.max(Number(input.delayMinutes), 0), 24 * 60) : DEFAULT_SETTINGS[type].delayMinutes,
    sendTime: isTime(input.sendTime) ? input.sendTime : DEFAULT_SETTINGS[type].sendTime,
    lookbackDays: LOOKBACK_OPTIONS.includes(Number(input.lookbackDays)) ? Number(input.lookbackDays) : 1,
    contentOptions: type === 'school_notice' ? normalizeContentOptions(input.contentOptions) : null,
    subjectTemplate: String(input.subjectTemplate || '').trim().slice(0, 500),
    bodyTemplate: String(input.bodyTemplate || '').trim().slice(0, 10000),
    toRecipients: normalizeRecipients(input.toRecipients),
    ccRecipients: normalizeRecipients(input.ccRecipients),
  };
  if (!value.subjectTemplate || !value.bodyTemplate) return { error: 'Subject and body are required.' };
  const badEmails = invalidEmails([...value.toRecipients.emails, ...value.ccRecipients.emails]);
  if (badEmails.length) return { error: `Invalid email address: ${badEmails.join(', ')}` };
  const to = value.toRecipients;
  if (!to.trainer && !to.manager && !to.school && !to.emails.length) return { error: 'Choose at least one "To" recipient.' };
  return { value };
};

const saveScopeSettings = async (scope, payload, updatedBy) => {
  const saved = {};
  for (const type of MAIL_TYPES) {
    if (!payload[type]) continue;
    const { value, error } = validateSetting(type, payload[type]);
    if (error) throw Object.assign(new Error(error), { status: 400 });
    saved[type] = value;
  }
  for (const [type, value] of Object.entries(saved)) {
    const existing = await SchoolActivityMailSetting.findOne({ where: { scope, type } });
    if (existing) await existing.update({ ...value, updatedBy });
    else await SchoolActivityMailSetting.create({ scope, type, ...value, updatedBy });
  }
  return getScopeSettings(scope);
};

const resetScopeSettings = scope => SchoolActivityMailSetting.destroy({ where: { scope } });

// ---------- message builders ----------

const loadUsers = async codes => {
  const list = [...new Set(codes.filter(Boolean))];
  if (!list.length) return new Map();
  const users = await User.findAll({ where: { employeeCode: { [Op.in]: list } }, attributes: ['employeeCode', 'name', 'email'] });
  return new Map(users.map(user => [user.employeeCode, user]));
};

// One mail per trainer listing every activity they have not marked yet.
const buildTrainerReminder = async ({ trainerId, managerId, assignments, setting, date = istToday() }) => {
  const schoolIds = [...new Set(assignments.map(assignment => Number(assignment.schoolId)))];
  const [userByCode, schools, schoolEmails] = await Promise.all([
    loadUsers([trainerId, managerId]),
    schoolIds.length ? SchoolCatalog.findAll({ where: { id: { [Op.in]: schoolIds } }, attributes: ['id', 'name'] }) : [],
    Promise.all(schoolIds.map(getSchoolContacts)).then(lists => lists.flat()),
  ]);
  const schoolById = new Map(schools.map(school => [Number(school.id), school.name]));
  const trainer = userByCode.get(trainerId);
  const manager = userByCode.get(managerId);
  const table = buildActivityTable(assignments, schoolById);
  const vars = {
    trainerName: trainer?.name || trainerId,
    trainerCode: trainerId,
    managerName: manager?.name || 'OMOTEC Team',
    pendingCount: assignments.length,
    schoolName: [...new Set(schools.map(school => school.name))].join(', ') || 'School',
    date: formatDisplayDate(date),
    activityTableHtml: table.html,
    activityTableText: table.text,
    dashboardUrl: DASHBOARD_URL,
  };
  const context = { trainers: [trainer], managers: [manager], schoolEmails };
  return {
    subject: renderTemplate(setting.subjectTemplate, vars),
    bodyHtml: renderTemplate(setting.bodyTemplate, vars, { html: true }),
    to: resolveRecipientList(setting.toRecipients, context),
    cc: resolveRecipientList(setting.ccRecipients, context),
  };
};

const findSchoolSessions = async ({ schoolId, fromDate, toDate, managerId }) => TrainerSchoolAssignment.findAll({
  where: { schoolId, date: { [Op.between]: [fromDate, toDate] }, status: 'published', ...(managerId ? { managerId } : {}) },
  order: [['className', 'ASC'], ['date', 'ASC'], ['startTime', 'ASC']],
});

const loadCourseNames = async sessions => {
  const sessionIds = [...new Set(sessions.map(session => Number(session.curriculumSessionId)).filter(Boolean))];
  if (!sessionIds.length) return new Map();
  const curriculumSessions = await SchoolCurriculumSession.findAll({ where: { id: { [Op.in]: sessionIds } }, attributes: ['id', 'courseId'] });
  const courseIds = [...new Set(curriculumSessions.map(session => session.courseId))];
  const courses = courseIds.length ? await SchoolCurriculumCourse.findAll({ where: { id: { [Op.in]: courseIds } }, attributes: ['id', 'courseName'] }) : [];
  const courseName = new Map(courses.map(course => [course.id, course.courseName]));
  return new Map(curriculumSessions.map(session => [Number(session.id), courseName.get(session.courseId)]));
};

const validateDateRange = (fromDate, toDate) => {
  const isDateKey = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
  if (!isDateKey(fromDate) || !isDateKey(toDate)) throw Object.assign(new Error('Choose a valid from and to date.'), { status: 400 });
  if (fromDate > toDate) throw Object.assign(new Error('The from date must be on or before the to date.'), { status: 400 });
  const days = (new Date(`${toDate}T00:00:00Z`) - new Date(`${fromDate}T00:00:00Z`)) / 86400000 + 1;
  if (days > MAX_SCHOOL_MAIL_RANGE_DAYS) throw Object.assign(new Error(`Choose a range of ${MAX_SCHOOL_MAIL_RANGE_DAYS} days or less.`), { status: 400 });
};

const buildSchoolNotice = async ({ schoolId, fromDate, toDate, managerId, setting }) => {
  validateDateRange(fromDate, toDate);
  const allSessions = await findSchoolSessions({ schoolId, fromDate, toDate, managerId });
  // Cancelled classes are not sessions: they are left out of the table and counts.
  const list = allSessions.filter(session => session.completionStatus !== 'cancelled');
  const cancelledCount = allSessions.length - list.length;
  const managerCodes = managerId ? [managerId] : list.map(session => session.managerId);
  const [userByCode, school, schoolEmails, courseBySessionId] = await Promise.all([
    loadUsers([...list.map(session => session.trainerId), ...managerCodes]),
    SchoolCatalog.findByPk(schoolId, { attributes: ['id', 'name'] }),
    getSchoolContacts(schoolId),
    loadCourseNames(list),
  ]);
  const managers = [...new Set(managerCodes)].map(code => userByCode.get(code)).filter(Boolean);
  const trainers = [...new Set(list.map(session => session.trainerId))].map(code => userByCode.get(code)).filter(Boolean);
  const table = buildSessionTable(list, { userByCode, courseBySessionId, options: normalizeContentOptions(setting.contentOptions) });
  const dateRange = fromDate === toDate ? formatDisplayDate(fromDate) : `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;
  const vars = {
    schoolName: school?.name || 'School',
    managerName: managers.length === 1 ? managers[0].name : 'OMOTEC Team',
    dateRange,
    date: dateRange,
    fromDate: formatDisplayDate(fromDate),
    toDate: formatDisplayDate(toDate),
    classCount: table.classCount,
    sessionCount: list.length,
    completedCount: list.filter(session => session.completionStatus === 'completed').length,
    cancelledCount,
    sessionTableHtml: list.length ? table.html : '<p style="color:#667085;">No sessions were scheduled in this period.</p>',
    sessionTableText: table.text,
    dashboardUrl: DASHBOARD_URL,
  };
  const context = { trainers, managers, schoolEmails };
  return {
    sessionCount: list.length,
    classCount: table.classCount,
    schoolEmails,
    subject: renderTemplate(setting.subjectTemplate, vars),
    bodyHtml: renderTemplate(setting.bodyTemplate, vars, { html: true }),
    to: resolveRecipientList(setting.toRecipients, context),
    cc: resolveRecipientList(setting.ccRecipients, context),
  };
};

const sampleAssignment = {
  trainerId: 'TRAINER', managerId: null, schoolId: 0, className: 'Grade V', activityTitle: 'Sample activity',
  date: istToday(), startTime: '09:00', endTime: '10:00', completionStatus: 'pending',
};

const buildPreview = async ({ type, setting, scope, schoolId, fromDate, toDate, viewer }) => {
  const managerId = scope === GLOBAL_SCOPE ? null : scope;
  if (type === 'trainer_reminder') {
    const today = istToday();
    const pending = await TrainerSchoolAssignment.findAll({
      where: { status: 'published', completionStatus: 'pending', date: { [Op.between]: [shiftDate(today, -(setting.lookbackDays - 1)), today] }, ...(managerId ? { managerId } : {}) },
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
    const first = pending[0] || await TrainerSchoolAssignment.findOne({ where: { status: 'published', ...(managerId ? { managerId } : {}) }, order: [['date', 'DESC']] });
    const sample = first || { ...sampleAssignment, managerId: managerId || viewer.employeeCode };
    const assignments = pending.length ? pending.filter(item => item.trainerId === sample.trainerId && item.managerId === sample.managerId) : [sample];
    const message = await buildTrainerReminder({ trainerId: sample.trainerId, managerId: sample.managerId, assignments, setting });
    return { ...message, html: buildCustomEmailHtml(message.bodyHtml), sample: pending.length ? 'a trainer who currently has unmarked activities' : 'sample data (no unmarked activities right now)' };
  }
  const rangeTo = toDate || istToday();
  const rangeFrom = fromDate || `${rangeTo.slice(0, 7)}-01`;
  let targetSchoolId = Number(schoolId);
  if (!targetSchoolId) {
    const latest = await TrainerSchoolAssignment.findOne({ where: { status: 'published', ...(managerId ? { managerId } : {}) }, order: [['date', 'DESC']] });
    targetSchoolId = latest?.schoolId || (await SchoolCatalog.findOne({ attributes: ['id'] }))?.id;
  }
  if (!targetSchoolId) throw Object.assign(new Error('Add a school to the catalog first.'), { status: 400 });
  const message = await buildSchoolNotice({ schoolId: targetSchoolId, fromDate: rangeFrom, toDate: rangeTo, managerId, setting });
  return { ...message, html: buildCustomEmailHtml(message.bodyHtml), sample: `${message.sessionCount} sessions across ${message.classCount} classes (${rangeFrom} to ${rangeTo})` };
};

// ---------- delivery ----------

const isUniqueViolation = error => error?.name === 'SequelizeUniqueConstraintError';

// Claims the dedupe key first so parallel server instances never double send.
const deliver = async ({ type, scope, managerId = null, trainerId = null, schoolId = null, assignmentId = null, dedupeKey = null, triggeredBy = 'system', details = null, message }) => {
  let log;
  try {
    log = await SchoolActivityMailLog.create({
      type, scope, managerId, trainerId, schoolId, assignmentId, dedupeKey, triggeredBy,
      toEmails: message.to.join(', '), ccEmails: message.cc.join(', '), subject: message.subject.slice(0, 500), status: 'pending',
      bodyHtml: message.bodyHtml, details,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { status: 'duplicate' };
    throw error;
  }
  if (!message.to.length) {
    await log.update({ status: 'skipped', error: 'No recipient email address found (check user emails or school contacts).' });
    return { status: 'skipped', log };
  }
  if (!isEmailEnabled()) {
    await log.update({ status: 'skipped', error: 'Email delivery is disabled on the server (EMAIL_ENABLED / SMTP settings).' });
    return { status: 'skipped', log };
  }
  try {
    await sendCustomEmail({ to: message.to, cc: message.cc, subject: message.subject, bodyHtml: message.bodyHtml });
    await log.update({ status: 'sent', error: null, sentAt: new Date() });
    return { status: 'sent', log };
  } catch (error) {
    await log.update({ status: 'failed', error: String(error.message || error).slice(0, 2000) });
    return { status: 'failed', log, error };
  }
};

// ---------- automation ----------

const settingsCache = () => {
  const cache = new Map();
  return managerId => {
    if (!cache.has(managerId)) cache.set(managerId, getEffectiveSettings(managerId));
    return cache.get(managerId);
  };
};

// Timetable rows are generated lazily, so make sure today's classes exist before
// checking which ones were left unmarked.
const materializeToday = async today => {
  const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay();
  const templates = await TrainerSchoolTimetableTemplate.findAll({ where: { dayOfWeek, startWeek: { [Op.lte]: today } }, attributes: ['id', 'trainerId'] });
  if (!templates.length) return;
  const existing = await TrainerSchoolAssignment.findAll({
    where: { timetableTemplateId: { [Op.in]: templates.map(template => template.id) }, date: today },
    attributes: ['timetableTemplateId'],
  });
  const done = new Set(existing.map(row => Number(row.timetableTemplateId)));
  const trainers = [...new Set(templates.filter(template => !done.has(Number(template.id))).map(template => template.trainerId))];
  for (const trainerId of trainers) await materializeTrainerWeek(trainerId, today);
};

// At each manager's chosen time (IST), one mail per trainer listing every activity
// that ended and is still Pending within the look-back window. Sent once per day.
const runTrainerReminders = async () => {
  const today = istToday();
  const nowMinutes = istMinutesNow();
  const now = Date.now();
  await materializeToday(today);
  const pending = await TrainerSchoolAssignment.findAll({
    where: { status: 'published', completionStatus: 'pending', date: { [Op.between]: [shiftDate(today, -(Math.max(...LOOKBACK_OPTIONS) - 1)), today] } },
    order: [['date', 'ASC'], ['startTime', 'ASC']],
  });
  const groups = new Map();
  pending.forEach(assignment => {
    const key = `${assignment.managerId}|${assignment.trainerId}`;
    groups.set(key, [...(groups.get(key) || []), assignment]);
  });
  const settingsFor = settingsCache();
  let sent = 0;
  for (const [key, list] of groups) {
    const [managerId, trainerId] = key.split('|');
    const { trainer_reminder: setting } = await settingsFor(managerId);
    if (!setting.enabled || nowMinutes < toMinutes(setting.sendTime)) continue;
    const fromDate = shiftDate(today, -(setting.lookbackDays - 1));
    const due = list.filter(assignment => assignment.date >= fromDate && istDateTime(assignment.date, assignment.endTime).getTime() <= now);
    if (!due.length) continue;
    const dedupeKey = `trainer_reminder:${managerId}:${trainerId}:${today}`;
    if (await SchoolActivityMailLog.count({ where: { dedupeKey } })) continue;
    const message = await buildTrainerReminder({ trainerId, managerId, assignments: due, setting, date: today });
    const result = await deliver({
      type: 'trainer_reminder', scope: setting.sourceScope, managerId, trainerId,
      schoolId: due.length === 1 ? due[0].schoolId : null, assignmentId: due.length === 1 ? due[0].id : null, dedupeKey,
      details: { sendTime: setting.sendTime, activities: due.map(assignment => ({ id: assignment.id, date: assignment.date, startTime: assignment.startTime, endTime: assignment.endTime, schoolId: assignment.schoolId, className: assignment.className, activityTitle: assignment.activityTitle })) },
      message,
    });
    if (result.status === 'sent') sent += 1;
  }
  return sent;
};

let running = false;
const runAutomationPass = async () => {
  if (running) return { skipped: true };
  running = true;
  try {
    // School mails are sent manually only; the scheduler handles trainer reminders.
    const reminders = await runTrainerReminders();
    return { reminders };
  } finally {
    running = false;
  }
};

let timer = null;
const startSchoolActivityMailScheduler = () => {
  if (timer || process.env.SCHOOL_ACTIVITY_MAIL_SCHEDULER === 'false') return;
  const tick = () => runAutomationPass().catch(error => console.error('School activity mail automation failed:', error.message));
  timer = setInterval(tick, SCHEDULER_INTERVAL_MS);
  setTimeout(tick, 30 * 1000);
};

module.exports = {
  GLOBAL_SCOPE,
  DEFAULT_SETTINGS,
  PLACEHOLDERS,
  LOOKBACK_OPTIONS,
  SCHOOL_CONTENT_FIELDS,
  parseEmails,
  invalidEmails,
  getScopeSettings,
  saveScopeSettings,
  resetScopeSettings,
  validateSetting,
  buildPreview,
  buildSchoolNotice,
  getEffectiveSettings,
  getSchoolContacts,
  deliver,
  runAutomationPass,
  startSchoolActivityMailScheduler,
};
