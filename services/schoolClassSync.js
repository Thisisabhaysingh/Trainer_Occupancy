const { Op } = require('sequelize');
const {
  SchoolCatalog,
  SchoolCurriculumCourse,
  SchoolCurriculumSession,
  SchoolCurriculumActivityOverride,
  TrainerSchoolTimetableTemplate,
  TrainerSchoolAssignment,
  SchoolAcademicSession,
  SchoolAcademicTerm,
  SchoolClass,
  SchoolClassCourse,
} = require('../models');

// Keeps School Management (school_classes / school_class_courses, the tables that
// sync with omo_reportcard) in step with classes onboarded anywhere else in the
// timesheet: recurring timetables, school activities and Course Status edits.

// "2026-27" -> Indian academic year April to March.
const yearDates = label => {
  const match = String(label || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const start = Number(match[1]);
  return { startDate: `${start}-04-01`, endDate: `${start + 1}-03-31` };
};
const termOrderFromName = name => Number(String(name || '').match(/(\d+)/)?.[1]) || null;

// Makes a school's academic year contain every term that the shared courses of
// that year use (course.term, e.g. "Term 1", "Term 2"), so the two never disagree.
const ensureCourseTermsForSession = async (session, stats) => {
  const courseTerms = (await SchoolCurriculumCourse.findAll({
    where: { academicYear: session.label },
    attributes: ['term'],
    group: ['term'],
  })).map(row => row.term).filter(Boolean);
  if (!courseTerms.length) return;
  const existing = await SchoolAcademicTerm.findAll({ where: { academicSessionId: session.id }, attributes: ['name', 'order'] });
  const names = new Set(existing.map(term => term.name.trim().toLowerCase()));
  const orders = new Set(existing.map(term => term.order));
  const missing = courseTerms
    .filter(name => !names.has(name.trim().toLowerCase()))
    .sort((a, b) => (termOrderFromName(a) || 99) - (termOrderFromName(b) || 99) || a.localeCompare(b));
  for (const name of missing) {
    let order = termOrderFromName(name);
    if (!order || orders.has(order)) order = Math.max(0, ...orders) + 1;
    orders.add(order);
    await SchoolAcademicTerm.create({ academicSessionId: session.id, name, order });
    if (stats) stats.termsCreated += 1;
  }
};

// Moves "whole year" assignments into their course's term once that term exists.
const repairUntermedAssignments = async stats => {
  const rows = await SchoolClassCourse.findAll({ where: { academicSessionId: { [Op.ne]: null }, academicTermId: null } });
  for (const row of rows) {
    const course = await SchoolCurriculumCourse.findByPk(row.courseId, { attributes: ['term'] });
    const term = course?.term && await SchoolAcademicTerm.findOne({ where: { academicSessionId: row.academicSessionId, name: course.term } });
    if (!term) continue;
    const duplicate = await SchoolClassCourse.count({ where: { classId: row.classId, courseId: row.courseId, academicSessionId: row.academicSessionId, academicTermId: term.id } });
    if (duplicate) await row.destroy();
    else await row.update({ academicTermId: term.id });
    if (stats) stats.assignmentsMovedToTerm += 1;
  }
};

// Finds (or creates) the school's academic year + term matching a course's
// academicYear and term, so the course assignment lands in the right term.
const ensureAcademicScope = async (schoolId, course, stats) => {
  const dates = yearDates(course.academicYear);
  let session = await SchoolAcademicSession.findOne({ where: { schoolId, label: course.academicYear } });
  if (!session) {
    if (!dates) return { academicSessionId: null, academicTermId: null };
    const hasActive = await SchoolAcademicSession.count({ where: { schoolId, isActive: true } });
    session = await SchoolAcademicSession.create({ schoolId, label: course.academicYear, ...dates, isActive: !hasActive });
    if (stats) stats.sessionsCreated += 1;
  }
  await ensureCourseTermsForSession(session, stats);
  let term = await SchoolAcademicTerm.findOne({ where: { academicSessionId: session.id, name: course.term } });
  if (!term && course.term) {
    const existingOrders = (await SchoolAcademicTerm.findAll({ where: { academicSessionId: session.id }, attributes: ['order'] })).map(row => row.order);
    const preferred = termOrderFromName(course.term);
    const order = preferred && !existingOrders.includes(preferred) ? preferred : Math.max(0, ...existingOrders) + 1;
    term = await SchoolAcademicTerm.create({ academicSessionId: session.id, name: course.term, order });
    if (stats) stats.termsCreated += 1;
  }
  return { academicSessionId: session.id, academicTermId: term?.id || null };
};

const ensureSchoolClass = async ({ schoolId, className, trainerId }, stats) => {
  const title = String(className || '').trim().slice(0, 150);
  if (!schoolId || !title) return null;
  if (!(await SchoolCatalog.count({ where: { id: schoolId } }))) return null;
  let schoolClass = await SchoolClass.findOne({ where: { schoolId, title } });
  if (!schoolClass) {
    const active = await SchoolAcademicSession.findOne({ where: { schoolId, isActive: true } });
    const firstTerm = active ? await SchoolAcademicTerm.findOne({ where: { academicSessionId: active.id }, order: [['order', 'ASC']] }) : null;
    try {
      schoolClass = await SchoolClass.create({
        schoolId,
        title,
        status: 'active',
        trainerId: trainerId || null,
        activeAcademicSessionId: active?.id || null,
        activeAcademicTermId: firstTerm?.id || null,
        description: 'Added automatically from the trainer timetable.',
      });
      if (stats) stats.classesCreated += 1;
    } catch (error) {
      // Another save created the same class at the same moment.
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
      schoolClass = await SchoolClass.findOne({ where: { schoolId, title } });
    }
  } else if (!schoolClass.trainerId && trainerId) {
    await schoolClass.update({ trainerId });
  }
  return schoolClass;
};

const ensureClassCourse = async (schoolClass, courseId, stats) => {
  if (!schoolClass || !courseId) return;
  const course = await SchoolCurriculumCourse.findByPk(courseId, { attributes: ['id', 'academicYear', 'term'] });
  if (!course) return;
  const scope = await ensureAcademicScope(schoolClass.schoolId, course, stats);
  // A class created before its school had an academic year picks it up here.
  if (!schoolClass.activeAcademicSessionId && scope.academicSessionId) {
    await schoolClass.update({ activeAcademicSessionId: scope.academicSessionId, activeAcademicTermId: scope.academicTermId });
  }
  const exists = await SchoolClassCourse.count({ where: { classId: schoolClass.id, courseId: course.id, ...scope } });
  if (!exists) {
    await SchoolClassCourse.create({ classId: schoolClass.id, courseId: course.id, ...scope, assignedBy: 'system' });
    if (stats) stats.assignmentsCreated += 1;
  }
};

const courseIdForCurriculumSession = async sessionId => {
  if (!sessionId) return null;
  const session = await SchoolCurriculumSession.findByPk(sessionId, { attributes: ['courseId'] });
  return session?.courseId || null;
};

// Sync one source row (timetable template, school activity, or override).
const syncSource = async ({ schoolId, className, trainerId, courseId, curriculumSessionId }, stats) => {
  const schoolClass = await ensureSchoolClass({ schoolId: Number(schoolId), className, trainerId }, stats);
  const resolvedCourseId = courseId || await courseIdForCurriculumSession(curriculumSessionId);
  await ensureClassCourse(schoolClass, resolvedCourseId, stats);
};

// One-off / on-demand backfill of everything already in the timesheet.
const backfillFromTimesheet = async () => {
  const stats = { sourcesChecked: 0, classesCreated: 0, assignmentsCreated: 0, sessionsCreated: 0, termsCreated: 0, assignmentsMovedToTerm: 0 };
  const [templates, assignments, overrides] = await Promise.all([
    TrainerSchoolTimetableTemplate.findAll({ attributes: ['schoolId', 'className', 'trainerId', 'courseId'] }),
    TrainerSchoolAssignment.findAll({
      where: { className: { [Op.ne]: '' } },
      attributes: ['schoolId', 'className', 'trainerId', 'curriculumSessionId'],
      group: ['schoolId', 'className', 'trainerId', 'curriculumSessionId'],
    }),
    SchoolCurriculumActivityOverride.findAll({ attributes: ['schoolId', 'className', 'curriculumSessionId'] }),
  ]);
  // Timetables first so a class's trainer comes from its recurring slot.
  for (const row of [...templates, ...assignments, ...overrides]) {
    stats.sourcesChecked += 1;
    await syncSource(row.toJSON(), stats);
  }
  for (const session of await SchoolAcademicSession.findAll()) await ensureCourseTermsForSession(session, stats);
  await repairUntermedAssignments(stats);
  return stats;
};

const runInBackground = source => {
  syncSource(source).catch(error => console.error('School class sync failed:', error.message));
};

// Live sync: any place that saves timetables or school activities keeps
// School Management up to date.
TrainerSchoolTimetableTemplate.addHook('afterSave', 'schoolClassSync', template => runInBackground(template.toJSON()));
TrainerSchoolAssignment.addHook('afterCreate', 'schoolClassSync', assignment => runInBackground(assignment.toJSON()));
TrainerSchoolAssignment.addHook('afterBulkCreate', 'schoolClassSync', rows => {
  const unique = new Map(rows.map(row => [`${row.schoolId}|${row.className}|${row.curriculumSessionId}`, row.toJSON ? row.toJSON() : row]));
  (async () => {
    for (const source of unique.values()) await syncSource(source);
  })().catch(error => console.error('School class sync failed:', error.message));
});
SchoolCurriculumActivityOverride.addHook('afterSave', 'schoolClassSync', override => runInBackground(override.toJSON()));

// A new or renamed course term is added to every school year with that label;
// a newly created school year gets all the course terms of its label.
const alignInBackground = task => task().catch(error => console.error('Academic term sync failed:', error.message));
SchoolCurriculumCourse.addHook('afterSave', 'schoolClassSync', course => alignInBackground(async () => {
  for (const session of await SchoolAcademicSession.findAll({ where: { label: course.academicYear } })) await ensureCourseTermsForSession(session);
  await repairUntermedAssignments();
}));
SchoolAcademicSession.addHook('afterCreate', 'schoolClassSync', session => alignInBackground(async () => {
  // Let the request that created the year add its own terms first.
  await new Promise(resolve => setTimeout(resolve, 1500));
  await ensureCourseTermsForSession(session);
}));

module.exports = { backfillFromTimesheet, syncSource, ensureSchoolClass, ensureCourseTermsForSession };
