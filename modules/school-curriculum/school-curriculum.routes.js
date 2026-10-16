const express = require('express');
const { Op } = require('sequelize');
const {
  SchoolCurriculumCourse,
  SchoolCurriculumSession,
  TrainerSchoolTimetableTemplate,
  SchoolCatalog,
  TrainerSchoolAssignment,
} = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { materializeTrainerWeek } = require('../../services/schoolAssignmentGenerator');

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
    const where = { academicYear: req.query.academicYear || '2026-27' };
    if (req.query.schoolId) where.schoolId = Number(req.query.schoolId);
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
    if (req.query.schoolId) where.schoolId = Number(req.query.schoolId);
    if (req.query.courseId) where.id = Number(req.query.courseId);
    const courses = await SchoolCurriculumCourse.findAll({ where, order: [['gradeBand', 'ASC'], ['term', 'ASC'], ['courseName', 'ASC']] });
    const courseIds = courses.map((course) => course.id);
    const sessions = courseIds.length
      ? await SchoolCurriculumSession.findAll({ where: { courseId: { [Op.in]: courseIds } }, order: [['courseId', 'ASC'], ['position', 'ASC']] })
      : [];
    const sessionIds = sessions.map((session) => session.id);
    const assignments = sessionIds.length
      ? await TrainerSchoolAssignment.findAll({
        where: {
          schoolId: req.query.schoolId ? Number(req.query.schoolId) : { [Op.in]: courses.map((course) => course.schoolId) },
          curriculumSessionId: { [Op.in]: sessionIds },
          status: 'published',
        },
        attributes: ['id', 'schoolId', 'className', 'curriculumSessionId', 'completionStatus', 'date', 'startTime', 'trainerNote'],
      })
      : [];

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
      const key = `${courseId}|${assignment.className}`;
      const bucket = assignmentsByCourseAndClass.get(key) || [];
      bucket.push(assignment.toJSON());
      assignmentsByCourseAndClass.set(key, bucket);
    }

    const progress = [];
    for (const course of courses) {
      const courseSessions = sessionsByCourse.get(course.id) || [];
      const classNames = [...new Set(assignments
        .filter((assignment) => courseBySession.get(assignment.curriculumSessionId) === course.id)
        .map((assignment) => assignment.className))];
      if (!classNames.length) classNames.push('');
      for (const className of classNames) {
        const classAssignments = assignmentsByCourseAndClass.get(`${course.id}|${className}`) || [];
        const sessionProgress = courseSessions.map((session) => {
          const scheduled = classAssignments.filter((assignment) => assignment.curriculumSessionId === session.id);
          const completedSessions = scheduled.filter(assignment => assignment.completionStatus === 'completed').length;
          const notCompletedSessions = scheduled.filter(assignment => assignment.completionStatus === 'not_completed').length;
          const notCompletedRemarks = scheduled
            .filter(assignment => assignment.completionStatus === 'not_completed' && assignment.trainerNote)
            .map(assignment => ({ date: assignment.date, startTime: assignment.startTime, remark: assignment.trainerNote }));
          return {
            ...session,
            scheduledCount: scheduled.length,
            attemptedCount: completedSessions + notCompletedSessions,
            notCompletedCount: notCompletedSessions,
            notCompletedRemarks,
            completedCount: scheduled.some((assignment) => assignment.completionStatus === 'completed') ? 1 : 0,
            isCompleted: scheduled.some((assignment) => assignment.completionStatus === 'completed'),
            status: scheduled.some((assignment) => assignment.completionStatus === 'completed') ? 'done' : 'pending',
          };
        });
        const nextToSchedule = sessionProgress.find((session) => session.scheduledCount === 0) || null;
        const inProgress = sessionProgress.find((session) => session.scheduledCount > 0 && !session.isCompleted) || null;
        progress.push({
          courseId: course.id,
          schoolId: course.schoolId,
          academicYear: course.academicYear,
          term: course.term,
          gradeBand: course.gradeBand,
          courseName: course.courseName,
          className,
          totalTopics: courseSessions.length,
          completedTopics: sessionProgress.filter((session) => session.isCompleted).length,
          scheduledTopics: sessionProgress.filter((session) => session.scheduledCount > 0).length,
          activityProgress: sessionProgress.map(({ id, position, title, topic, scheduledCount, attemptedCount, notCompletedCount, notCompletedRemarks, completedCount, status }) => ({ id, position, title, topic, scheduledCount, attemptedCount, notCompletedCount, notCompletedRemarks, completedCount, status })),
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
        const priorCompletedSessions = new Set(historyAssignments
          .filter(assignment => relatedGroupByTemplate.get(Number(assignment.timetableTemplateId)) === groupKey
            && String(assignment.weekStart) < weekStart
            && assignment.completionStatus === 'completed')
          .map(assignment => Number(assignment.curriculumSessionId))
          .filter(Boolean));
        const priorCompletedCount = priorCompletedSessions.size;
        const scheduledWeek = savedByTemplateAndDate.get(`${template.id}|${weekStart}`);
        const session = scheduledWeek?.curriculumSessionId
          ? sessions.find(item => Number(item.id) === Number(scheduledWeek.curriculumSessionId))
          : sessions[initialIndex + priorCompletedCount];
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
