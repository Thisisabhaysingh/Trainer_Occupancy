const express = require('express');
const { Op } = require('sequelize');
const {
  SchoolCurriculumCourse,
  SchoolCurriculumSession,
  TrainerSchoolTimetableTemplate,
  SchoolCatalog,
  TrainerSchoolAssignment,
  SchoolCurriculumActivityOverride,
  SchoolClassCourse,
  User,
  sequelize,
} = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { materializeTrainerWeek } = require('../../services/schoolAssignmentGenerator');
const { loadOverrides, applyToCompletedSet } = require('../../services/curriculumOverrides');
const { getAssignedSchoolIds, getOwnedClasses, ownsClass } = require('../../services/managerScope');

const router = express.Router();

const isPhotosLink = value => {
  if (!value || value.length > 1000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (error) {
    return false;
  }
};

const weekDates = (weekStart) => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
});
router.use(auth);

router.get('/', checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    // Courses are shared by every school, so there is no school filter.
    const where = { academicYear: req.query.academicYear || '2026-27' };
    if (req.query.gradeBand) where.gradeBand = req.query.gradeBand;
    const courses = await SchoolCurriculumCourse.findAll({ where, order: [['gradeBand', 'ASC'], ['term', 'ASC'], ['courseName', 'ASC']] });
    const sessions = courses.length
      ? await SchoolCurriculumSession.findAll({ where: { courseId: { [Op.in]: courses.map((course) => course.id) } }, order: [['courseId', 'ASC'], ['position', 'ASC']] })
      : [];
    const sessionsByCourse = new Map();
    for (const session of sessions) {
      const bucket = sessionsByCourse.get(session.courseId) || [];
      bucket.push(session);
      sessionsByCourse.set(session.courseId, bucket);
    }
    return res.json(courses.map((course) => ({ ...course.toJSON(), sessions: sessionsByCourse.get(course.id) || [] })));
  } catch (error) {
    console.error('Error loading school curriculum:', error);
    return res.status(500).json({ error: 'Failed to load school curriculum' });
  }
});

router.get('/progress', checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const where = { academicYear: req.query.academicYear || '2026-27' };
    if (req.query.courseId) where.id = Number(req.query.courseId);
    // Managers see their own classes in their assigned schools; admins see everything.
    const [allowedSchoolIds, ownedClasses] = await Promise.all([getAssignedSchoolIds(req.user), getOwnedClasses(req.user)]);
    const classVisible = (schoolId, className) => (!allowedSchoolIds || allowedSchoolIds.includes(Number(schoolId)))
      && (!ownedClasses || ownedClasses.has(`${Number(schoolId)}|${className}`));
    const courses = await SchoolCurriculumCourse.findAll({ where, order: [['gradeBand', 'ASC'], ['term', 'ASC'], ['courseName', 'ASC']] });
    const courseIds = courses.map((course) => course.id);
    const sessions = courseIds.length
      ? await SchoolCurriculumSession.findAll({ where: { courseId: { [Op.in]: courseIds } }, order: [['courseId', 'ASC'], ['position', 'ASC']] })
      : [];
    const sessionIds = sessions.map((session) => session.id);
    const assignments = (sessionIds.length
      ? await TrainerSchoolAssignment.findAll({
        where: {
          ...(req.query.schoolId ? { schoolId: Number(req.query.schoolId) } : {}),
          curriculumSessionId: { [Op.in]: sessionIds },
          status: 'published',
        },
        attributes: ['id', 'schoolId', 'className', 'curriculumSessionId', 'completionStatus', 'date', 'startTime', 'trainerNote'],
      })
      : []).filter(assignment => classVisible(assignment.schoolId, assignment.className));
    const overrides = (sessionIds.length
      ? await SchoolCurriculumActivityOverride.findAll({
        where: { curriculumSessionId: { [Op.in]: sessionIds }, ...(req.query.schoolId ? { schoolId: Number(req.query.schoolId) } : {}) },
      })
      : []).filter(row => classVisible(row.schoolId, row.className));
    const overrideEditors = overrides.length
      ? new Map((await User.findAll({ where: { employeeCode: { [Op.in]: [...new Set(overrides.map(row => row.updatedBy).filter(Boolean))] } }, attributes: ['employeeCode', 'name'] }))
        .map(user => [user.employeeCode, user.name]))
      : new Map();
    const overrideByKey = new Map(overrides.map(row => [`${row.schoolId}|${row.className}|${row.curriculumSessionId}`, row]));

    const sessionsByCourse = new Map();
    for (const session of sessions) {
      const bucket = sessionsByCourse.get(session.courseId) || [];
      bucket.push(session.toJSON());
      sessionsByCourse.set(session.courseId, bucket);
    }
    const assignmentsByCourseAndClass = new Map();
    const courseBySession = new Map(sessions.map((session) => [session.id, session.courseId]));
    for (const assignment of assignments) {
      const courseId = courseBySession.get(assignment.curriculumSessionId);
      const key = `${courseId}|${assignment.schoolId}|${assignment.className}`;
      const bucket = assignmentsByCourseAndClass.get(key) || [];
      bucket.push(assignment.toJSON());
      assignmentsByCourseAndClass.set(key, bucket);
    }

    const progress = [];
    for (const course of courses) {
      const courseSessions = sessionsByCourse.get(course.id) || [];
      // Each (school, class) that used this course gets its own progress entry.
      const classKeys = [...new Map([
        ...assignments.filter((assignment) => courseBySession.get(assignment.curriculumSessionId) === course.id),
        ...overrides.filter((row) => courseBySession.get(row.curriculumSessionId) === course.id),
      ].map((row) => [`${row.schoolId}|${row.className}`, { schoolId: Number(row.schoolId), className: row.className }])).values()];
      for (const { schoolId, className } of classKeys) {
        const classAssignments = assignmentsByCourseAndClass.get(`${course.id}|${schoolId}|${className}`) || [];
        const sessionProgress = courseSessions.map((session) => {
          const scheduled = classAssignments.filter((assignment) => assignment.curriculumSessionId === session.id);
          const completedSessions = scheduled.filter(assignment => assignment.completionStatus === 'completed').length;
          const notCompletedSessions = scheduled.filter(assignment => assignment.completionStatus === 'not_completed').length;
          const notCompletedRemarks = scheduled
            .filter(assignment => ['not_completed', 'cancelled'].includes(assignment.completionStatus) && assignment.trainerNote)
            .map(assignment => ({ date: assignment.date, startTime: assignment.startTime, remark: assignment.trainerNote, cancelled: assignment.completionStatus === 'cancelled' }));
          const trainerCompleted = scheduled.some((assignment) => assignment.completionStatus === 'completed');
          const trainerValues = {
            scheduledCount: scheduled.length,
            completedCount: trainerCompleted ? 1 : 0,
            status: trainerCompleted ? 'done' : 'pending',
          };
          // A manager correction replaces the trainer-reported values for this class.
          const override = overrideByKey.get(`${schoolId}|${className}|${session.id}`);
          return {
            ...session,
            scheduledCount: trainerValues.scheduledCount,
            attemptedCount: completedSessions + notCompletedSessions,
            notCompletedCount: notCompletedSessions,
            notCompletedRemarks,
            // An activity is either done or not; there is no partial completion count.
            completedCount: (override ? override.status === 'done' : trainerCompleted) ? 1 : 0,
            isCompleted: override ? override.status === 'done' : trainerCompleted,
            status: override ? override.status : trainerValues.status,
            trainerValues,
            override: override ? {
              status: override.status,
              scheduledCount: override.scheduledCount,
              completedCount: override.completedCount,
              remark: override.remark,
              updatedBy: override.updatedBy,
              updatedByName: overrideEditors.get(override.updatedBy) || override.updatedBy,
              updatedAt: override.updatedAt,
            } : null,
          };
        });
        const nextToSchedule = sessionProgress.find((session) => session.scheduledCount === 0) || null;
        const inProgress = sessionProgress.find((session) => session.scheduledCount > 0 && !session.isCompleted) || null;
        progress.push({
          courseId: course.id,
          schoolId,
          academicYear: course.academicYear,
          term: course.term,
          gradeBand: course.gradeBand,
          courseName: course.courseName,
          className,
          totalTopics: courseSessions.length,
          completedTopics: sessionProgress.filter((session) => session.isCompleted).length,
          scheduledTopics: sessionProgress.filter((session) => session.scheduledCount > 0).length,
          activityProgress: sessionProgress.map(({ id, position, title, topic, scheduledCount, attemptedCount, notCompletedCount, notCompletedRemarks, completedCount, status, trainerValues, override }) => ({ id, position, title, topic, scheduledCount, attemptedCount, notCompletedCount, notCompletedRemarks, completedCount, status, trainerValues, override })),
          nextToSchedule: nextToSchedule ? { id: nextToSchedule.id, position: nextToSchedule.position, title: nextToSchedule.title, topic: nextToSchedule.topic } : null,
          inProgress: inProgress ? { id: inProgress.id, position: inProgress.position, title: inProgress.title, topic: inProgress.topic } : null,
        });
      }
    }
    return res.json(progress);
  } catch (error) {
    console.error('Error loading school curriculum progress:', error);
    return res.status(500).json({ error: 'Failed to load school curriculum progress' });
  }
});

const OVERRIDE_STATUSES = ['pending', 'done', 'not_completed', 'cancelled'];
const parseOverrideTarget = async (body, user) => {
  const schoolId = Number(body?.schoolId);
  const curriculumSessionId = Number(body?.curriculumSessionId);
  const className = String(body?.className || '').trim().slice(0, 100);
  if (!Number.isInteger(schoolId) || !Number.isInteger(curriculumSessionId) || !className) {
    throw Object.assign(new Error('Choose a school, class and activity.'), { status: 400 });
  }
  const session = await SchoolCurriculumSession.findByPk(curriculumSessionId, { attributes: ['id'] });
  if (!session) throw Object.assign(new Error('Activity not found.'), { status: 404 });
  if (!(await ownsClass(user, schoolId, className))) {
    throw Object.assign(new Error('You can only edit classes you schedule. Ask the admin or the class’s manager.'), { status: 403 });
  }
  return { schoolId, className, curriculumSessionId };
};

// Manager/admin correction of an activity's status, counts and remark for one class.
router.put('/activity-override', checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const target = await parseOverrideTarget(req.body, req.user);
    const status = req.body?.status;
    if (!OVERRIDE_STATUSES.includes(status)) return res.status(400).json({ error: 'Choose Pending, Done, Not completed or Class cancelled.' });
    const remark = typeof req.body?.remark === 'string' ? req.body.remark.trim().slice(0, 2000) : '';
    // Only status and remark are corrected; scheduled counts come from the timetable.
    const values = { status, scheduledCount: null, completedCount: null, remark: remark || null, updatedBy: req.user.employeeCode };
    const existing = await SchoolCurriculumActivityOverride.findOne({ where: target });
    const saved = existing ? await existing.update(values) : await SchoolCurriculumActivityOverride.create({ ...target, ...values });
    return res.json({ success: true, override: saved });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error saving curriculum activity override:', error);
    return res.status(500).json({ error: 'Failed to update the activity.' });
  }
});

// Removes the correction so the trainer-reported values apply again.
router.delete('/activity-override', checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const target = await parseOverrideTarget(req.query, req.user);
    await SchoolCurriculumActivityOverride.destroy({ where: target });
    return res.json({ success: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error resetting curriculum activity override:', error);
    return res.status(500).json({ error: 'Failed to reset the activity.' });
  }
});

// ---------- Common school courses (shared by every school and manager) ----------
const GRADES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const courseError = (status, message) => Object.assign(new Error(message), { status });
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const parseCourse = body => {
  const academicYear = text(body?.academicYear || '2026-27', 20);
  const term = text(body?.term, 40);
  const courseName = text(body?.courseName, 255);
  const [from, to] = String(body?.gradeBand || '').split('-').map(part => part.trim().toUpperCase());
  if (!/^\d{4}-\d{2}$/.test(academicYear)) throw courseError(400, 'Academic year must look like 2026-27.');
  if (!term || !courseName) throw courseError(400, 'Course name and term are required.');
  if (!GRADES.includes(from) || !GRADES.includes(to || from) || GRADES.indexOf(to || from) < GRADES.indexOf(from)) {
    throw courseError(400, 'Choose a valid grade range, e.g. III-V.');
  }
  const declaredSessions = Number(body?.declaredSessions ?? 0);
  // code is the omo_reportcard natural key: letters, numbers, - and _ only.
  const code = text(body?.code, 50);
  if (!code) throw courseError(400, 'Course code is required (max 50 characters).');
  if (!/^[A-Za-z0-9_-]+$/.test(code)) throw courseError(400, 'Course code can only use letters, numbers, - and _.');
  const durationWeeks = body?.durationWeeks === '' || body?.durationWeeks == null ? null : Number(body.durationWeeks);
  if (durationWeeks !== null && (!Number.isInteger(durationWeeks) || durationWeeks < 0)) throw courseError(400, 'Duration must be a whole number of weeks.');
  return {
    code,
    description: text(body?.description, 5000) || null,
    durationWeeks,
    status: body?.status === 'archived' ? 'archived' : 'active',
    academicYear,
    term,
    courseName,
    gradeBand: `${from}-${to || from}`,
    declaredSessions: Number.isInteger(declaredSessions) && declaredSessions >= 0 ? declaredSessions : 0,
    computerLab: Boolean(body?.computerLab),
  };
};
const parseSession = body => {
  const title = text(body?.title, 255);
  if (!title) throw courseError(400, 'Activity name is required.');
  return {
    title,
    topic: text(body?.topic, 255) || null,
    learningOutcome: text(body?.learningOutcome, 5000) || null,
    academicConcept: text(body?.academicConcept, 5000) || null,
  };
};
const courseRoute = handler => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.name === 'SequelizeUniqueConstraintError') {
      const byCode = (error.errors || []).some(item => item.path === 'code' || /code/.test(item.message || ''));
      return res.status(409).json({ error: byCode ? 'Another course already uses this course code.' : 'A course with this name, term and grade range already exists for that academic year.' });
    }
    console.error('School course error:', error);
    return res.status(500).json({ error: 'Failed to update school courses.' });
  }
};
const courseWithSessions = async id => {
  const course = await SchoolCurriculumCourse.findByPk(id);
  if (!course) return null;
  const sessions = await SchoolCurriculumSession.findAll({ where: { courseId: course.id }, order: [['position', 'ASC']] });
  return { ...course.toJSON(), sessions };
};
const curriculumEditors = checkRole(['admin', 'manager', 'senior_manager']);

router.post('/courses', curriculumEditors, courseRoute(async (req, res) => {
  const course = await SchoolCurriculumCourse.create({ ...parseCourse(req.body), schoolId: null, sourceSheet: null });
  return res.status(201).json(await courseWithSessions(course.id));
}));

router.put('/courses/:id', curriculumEditors, courseRoute(async (req, res) => {
  const course = await SchoolCurriculumCourse.findByPk(Number(req.params.id));
  if (!course) throw courseError(404, 'Course not found.');
  await course.update(parseCourse({ ...course.toJSON(), ...req.body }));
  return res.json(await courseWithSessions(course.id));
}));

router.delete('/courses/:id', curriculumEditors, courseRoute(async (req, res) => {
  const course = await SchoolCurriculumCourse.findByPk(Number(req.params.id));
  if (!course) throw courseError(404, 'Course not found.');
  const sessionIds = (await SchoolCurriculumSession.findAll({ where: { courseId: course.id }, attributes: ['id'] })).map(row => row.id);
  const [templates, used] = await Promise.all([
    TrainerSchoolTimetableTemplate.count({ where: { courseId: course.id } }),
    sessionIds.length ? TrainerSchoolAssignment.count({ where: { curriculumSessionId: { [Op.in]: sessionIds } } }) : 0,
  ]);
  const assigned = await SchoolClassCourse.count({ where: { courseId: course.id } });
  if (templates || used || assigned) throw courseError(409, 'This course is already used in classes, timetables or school activities, so it cannot be deleted. You can archive it instead.');
  await sequelize.transaction(async transaction => {
    await SchoolCurriculumSession.destroy({ where: { courseId: course.id }, transaction });
    await course.destroy({ transaction });
  });
  return res.json({ success: true });
}));

router.post('/courses/:id/sessions', curriculumEditors, courseRoute(async (req, res) => {
  const course = await SchoolCurriculumCourse.findByPk(Number(req.params.id));
  if (!course) throw courseError(404, 'Course not found.');
  const last = await SchoolCurriculumSession.max('position', { where: { courseId: course.id } });
  await SchoolCurriculumSession.create({ ...parseSession(req.body), courseId: course.id, position: (Number(last) || 0) + 1 });
  return res.status(201).json(await courseWithSessions(course.id));
}));

router.put('/sessions/:id', curriculumEditors, courseRoute(async (req, res) => {
  const session = await SchoolCurriculumSession.findByPk(Number(req.params.id));
  if (!session) throw courseError(404, 'Activity not found.');
  await session.update(parseSession({ ...session.toJSON(), ...req.body }));
  // Keep already generated school activities showing the new name.
  await TrainerSchoolAssignment.update({ activityTitle: session.title }, { where: { curriculumSessionId: session.id } });
  return res.json(await courseWithSessions(session.courseId));
}));

router.delete('/sessions/:id', curriculumEditors, courseRoute(async (req, res) => {
  const session = await SchoolCurriculumSession.findByPk(Number(req.params.id));
  if (!session) throw courseError(404, 'Activity not found.');
  const [used, overridden] = await Promise.all([
    TrainerSchoolAssignment.count({ where: { curriculumSessionId: session.id } }),
    SchoolCurriculumActivityOverride.count({ where: { curriculumSessionId: session.id } }),
  ]);
  if (used || overridden) throw courseError(409, 'This activity is already used in school activities, so it cannot be deleted. You can rename it instead.');
  const { courseId, position } = session;
  await sequelize.transaction(async transaction => {
    await session.destroy({ transaction });
    const later = await SchoolCurriculumSession.findAll({ where: { courseId, position: { [Op.gt]: position } }, order: [['position', 'ASC']], transaction });
    for (const item of later) await item.update({ position: item.position - 1 }, { transaction });
  });
  return res.json(await courseWithSessions(courseId));
}));

// Reorders a course's activities; body.sessionIds lists every activity in the new order.
router.put('/courses/:id/sessions/order', curriculumEditors, courseRoute(async (req, res) => {
  const course = await SchoolCurriculumCourse.findByPk(Number(req.params.id));
  if (!course) throw courseError(404, 'Course not found.');
  const sessions = await SchoolCurriculumSession.findAll({ where: { courseId: course.id } });
  const order = (Array.isArray(req.body?.sessionIds) ? req.body.sessionIds : []).map(Number);
  const known = new Set(sessions.map(session => session.id));
  if (order.length !== sessions.length || new Set(order).size !== order.length || order.some(id => !known.has(id))) {
    throw courseError(400, 'Send every activity of the course exactly once.');
  }
  await sequelize.transaction(async transaction => {
    // Move out of the way first so the (courseId, position) unique key never clashes.
    for (const session of sessions) await session.update({ position: session.position + 100000 }, { transaction });
    for (const [index, id] of order.entries()) await SchoolCurriculumSession.update({ position: index + 1 }, { where: { id }, transaction });
  });
  return res.json(await courseWithSessions(course.id));
}));

router.get('/calendar', checkRole(['employee']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const isDateKey = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
    if (!isDateKey(startDate) || !isDateKey(endDate) || startDate > endDate) {
      return res.status(400).json({ error: 'A valid calendar date range is required.' });
    }
    const rangeDays = (new Date(`${endDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`)) / 86_400_000;
    if (rangeDays > 62) return res.status(400).json({ error: 'Calendar range cannot exceed 63 days.' });

    const employeeCode = req.user.employeeCode;
    const templates = await TrainerSchoolTimetableTemplate.findAll({ where: { trainerId: employeeCode, startWeek: { [Op.lte]: endDate } } });
    const classCourseKeys = [...new Map(templates.map(template => {
      const key = `${template.schoolId}|${template.className}|${template.courseId}`;
      return [key, { schoolId: template.schoolId, className: template.className, courseId: template.courseId }];
    })).values()];
    const relatedTemplates = classCourseKeys.length ? await TrainerSchoolTimetableTemplate.findAll({ where: { [Op.or]: classCourseKeys } }) : [];
    const relatedTemplateIds = relatedTemplates.map(template => template.id);
    const relatedGroupByTemplate = new Map(relatedTemplates.map(template => [Number(template.id), `${template.schoolId}|${template.className}|${template.courseId}`]));
    const [historyAssignments, untemplatedAssignments] = await Promise.all([
      relatedTemplateIds.length ? TrainerSchoolAssignment.findAll({
        where: { timetableTemplateId: { [Op.in]: relatedTemplateIds }, status: 'published', weekStart: { [Op.lte]: endDate } },
        attributes: ['id', 'timetableTemplateId', 'weekStart', 'curriculumSessionId', 'completionStatus', 'schoolId', 'className', 'activityTitle', 'date', 'startTime', 'endTime'],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      }) : [],
      TrainerSchoolAssignment.findAll({ where: { trainerId: employeeCode, status: 'published', date: { [Op.between]: [startDate, endDate] }, timetableTemplateId: null }, order: [['date', 'ASC'], ['startTime', 'ASC']] }),
    ]);
    const savedByTemplateAndDate = new Map(historyAssignments
      .filter(assignment => assignment.timetableTemplateId)
      .map(assignment => [`${assignment.timetableTemplateId}|${assignment.weekStart}`, assignment]));
    const sessionsByCourse = new Map();
    const overrides = await loadOverrides(templates);
    const entries = [];
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    for (const template of templates) {
      const course = await SchoolCurriculumCourse.findByPk(template.courseId);
      if (!course) continue;
      if (!sessionsByCourse.has(course.id)) {
        sessionsByCourse.set(course.id, await SchoolCurriculumSession.findAll({ where: { courseId: course.id }, order: [['position', 'ASC']] }));
      }
      const sessions = sessionsByCourse.get(course.id);
      const initialIndex = Math.max(0, sessions.findIndex(session => Number(session.position) === Number(template.startActivityPosition || 1)));
      for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
        const dateKey = current.toISOString().slice(0, 10);
        if (current.getUTCDay() !== Number(template.dayOfWeek)) continue;
        const weekStartDate = new Date(current);
        weekStartDate.setUTCDate(weekStartDate.getUTCDate() - ((weekStartDate.getUTCDay() + 6) % 7));
        const weekStart = weekStartDate.toISOString().slice(0, 10);
        if (weekStart < template.startWeek) continue;
        const groupKey = relatedGroupByTemplate.get(Number(template.id));
        const trainerCompletedSessions = new Set(historyAssignments
          .filter(assignment => relatedGroupByTemplate.get(Number(assignment.timetableTemplateId)) === groupKey
            && String(assignment.weekStart) < weekStart
            && assignment.completionStatus === 'completed')
          .map(assignment => Number(assignment.curriculumSessionId))
          .filter(Boolean));
        const priorCompletedSessions = applyToCompletedSet(trainerCompletedSessions, overrides, template.schoolId, template.className, sessions.map(item => item.id));
        const scheduledWeek = savedByTemplateAndDate.get(`${template.id}|${weekStart}`);
        const session = scheduledWeek?.curriculumSessionId
          ? sessions.find(item => Number(item.id) === Number(scheduledWeek.curriculumSessionId))
          : sessions.slice(initialIndex).find(item => !priorCompletedSessions.has(Number(item.id)));
        if (!session) continue;
        const saved = scheduledWeek;
        entries.push({
          ...(saved?.toJSON() || {}),
          id: saved?.id || null,
          schoolId: template.schoolId,
          className: template.className,
          courseId: course.id,
          curriculumSessionId: saved?.curriculumSessionId || session.id,
          activityTitle: saved?.activityTitle || session.title,
          date: dateKey,
          startTime: template.startTime,
          endTime: template.endTime,
          completionStatus: saved?.completionStatus || 'pending',
          schoolName: null,
          courseName: course.courseName,
          term: course.term,
        });
      }
    }

    const untemplated = untemplatedAssignments;
    const sessionIds = [...new Set([...entries.map(entry => entry.curriculumSessionId), ...untemplated.map(entry => entry.curriculumSessionId)].filter(Boolean))];
    const schoolIds = [...new Set([...entries.map(entry => entry.schoolId), ...untemplated.map(entry => entry.schoolId)].filter(Boolean))];
    const [sessions, schools] = await Promise.all([
      sessionIds.length ? SchoolCurriculumSession.findAll({ where: { id: { [Op.in]: sessionIds } } }) : [],
      schoolIds.length ? SchoolCatalog.findAll({ where: { id: { [Op.in]: schoolIds } }, attributes: ['id', 'name'] }) : [],
    ]);
    const courses = sessions.length ? await SchoolCurriculumCourse.findAll({ where: { id: { [Op.in]: [...new Set(sessions.map(session => session.courseId))] } } }) : [];
    const sessionById = new Map(sessions.map(session => [Number(session.id), session.toJSON()]));
    const courseById = new Map(courses.map(course => [Number(course.id), course.toJSON()]));
    const schoolById = new Map(schools.map(school => [Number(school.id), school.name]));
    for (const assignment of untemplated) entries.push({ ...assignment.toJSON(), schoolName: schoolById.get(Number(assignment.schoolId)) || 'School', curriculumSession: sessionById.get(Number(assignment.curriculumSessionId)) ? { ...sessionById.get(Number(assignment.curriculumSessionId)), course: courseById.get(Number(sessionById.get(Number(assignment.curriculumSessionId)).courseId)) || null } : null });
    return res.json(entries.map(entry => ({
      ...entry,
      schoolName: entry.schoolName || schoolById.get(Number(entry.schoolId)) || 'School',
      curriculumSession: sessionById.get(Number(entry.curriculumSessionId))
        ? { ...sessionById.get(Number(entry.curriculumSessionId)), course: courseById.get(Number(sessionById.get(Number(entry.curriculumSessionId)).courseId)) || null }
        : null,
    })).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.startTime).localeCompare(String(b.startTime))));
  } catch (error) {
    console.error('Error loading trainer school schedule for calendar:', error);
    return res.status(500).json({ error: 'Failed to load school schedules for your calendar.' });
  }
});

router.get('/mine', checkRole(['employee']), async (req, res) => {
  try {
    const { today } = await materializeTrainerWeek(req.user.employeeCode);
    const assignments = await TrainerSchoolAssignment.findAll({
      where: { trainerId: req.user.employeeCode, status: 'published', date: today },
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
    const sessionIds = [...new Set(assignments.map((assignment) => assignment.curriculumSessionId).filter(Boolean))];
    const sessions = sessionIds.length ? await SchoolCurriculumSession.findAll({ where: { id: { [Op.in]: sessionIds } } }) : [];
    const courseIds = [...new Set(sessions.map((session) => session.courseId))];
    const courses = courseIds.length ? await SchoolCurriculumCourse.findAll({ where: { id: { [Op.in]: courseIds } } }) : [];
    const schoolIds = [...new Set(assignments.map((assignment) => assignment.schoolId))];
    const schools = schoolIds.length ? await SchoolCatalog.findAll({ where: { id: { [Op.in]: schoolIds } }, attributes: ['id', 'name'] }) : [];
    const sessionById = new Map(sessions.map((session) => [session.id, session.toJSON()]));
    const courseById = new Map(courses.map((course) => [course.id, course.toJSON()]));
    const schoolById = new Map(schools.map((school) => [school.id, school.name]));
    return res.json(assignments.map((assignment) => {
      const session = sessionById.get(assignment.curriculumSessionId) || null;
      return {
        ...assignment.toJSON(),
        schoolName: schoolById.get(assignment.schoolId) || 'School',
        curriculumSession: session ? { ...session, course: courseById.get(session.courseId) || null } : null,
      };
    }));
  } catch (error) {
    console.error('Error loading trainer school activities:', error);
    return res.status(500).json({ error: 'Failed to load your assigned school activities' });
  }
});

router.patch('/assignments/:id/completion', checkRole(['employee']), async (req, res) => {
  try {
    const requestedStatus = req.body?.status || (req.body?.completed === true ? 'completed' : 'pending');
    if (!['pending', 'completed', 'not_completed', 'cancelled'].includes(requestedStatus)) {
      return res.status(400).json({ error: 'Choose Done, Not completed, Class cancelled, or Pending.' });
    }
    const trainerNote = typeof req.body?.trainerNote === 'string' ? req.body.trainerNote.trim().slice(0, 2000) : '';
    if (requestedStatus === 'not_completed' && !trainerNote) {
      return res.status(400).json({ error: 'Add a remark when an activity is not completed.' });
    }
    if (requestedStatus === 'cancelled' && !trainerNote) {
      return res.status(400).json({ error: 'Add a remark explaining why the class was cancelled.' });
    }
    const studentCount = Number(req.body?.studentCount);
    const photosLink = typeof req.body?.photosLink === 'string' ? req.body.photosLink.trim() : '';
    if (requestedStatus === 'completed') {
      if (!Number.isInteger(studentCount) || studentCount < 1 || studentCount > 1000) {
        return res.status(400).json({ error: 'Enter the number of students who attended (1–1000).' });
      }
      if (!isPhotosLink(photosLink)) {
        return res.status(400).json({ error: 'Add a valid link (starting with https://) to the session photos.' });
      }
    }
    const assignment = await TrainerSchoolAssignment.findOne({
      where: { id: Number(req.params.id), trainerId: req.user.employeeCode, status: 'published' },
    });
    if (!assignment) return res.status(404).json({ error: 'Published school activity not found' });
    await assignment.update({
      completionStatus: requestedStatus,
      completedAt: requestedStatus === 'completed' ? new Date() : null,
      trainerNote: ['not_completed', 'cancelled'].includes(requestedStatus) ? trainerNote : null,
      studentCount: requestedStatus === 'completed' ? studentCount : null,
      photosLink: requestedStatus === 'completed' ? photosLink : null,
    });
    return res.json({ success: true, assignment });
  } catch (error) {
    console.error('Error updating trainer school activity completion:', error);
    return res.status(500).json({ error: 'Failed to update school activity completion' });
  }
});

module.exports = router;
