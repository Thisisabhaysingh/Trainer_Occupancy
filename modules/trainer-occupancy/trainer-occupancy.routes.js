const express = require('express');
const router = express.Router();
const { TrainerOccupancy, TrainerActivityAssignment, TrainerSchoolAssignment, TrainerSchoolTimetableTemplate, TrainerSchoolRoster, SchoolCurriculumCourse, SchoolCurriculumSession, User, SchoolCatalog, sequelize } = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { seniorTrainerScope, scopeWhere } = require('../../middleware/seniorManagementScope');
const { Op } = require('sequelize');
const { loadOverrides, overrideKey } = require('../../services/curriculumOverrides');

const isDateKey = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

// Admin-assigned trainers (or the manager's branch/department) and assigned schools.
const { getManagedTrainerCodes, assertSchoolAccess } = require('../../services/managerScope');
const scopeError = (res, error) => (error.status === 403 ? res.status(403).json({ error: error.message }) : null);

const getWeekDates = weekStart => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
});
const currentWeekStart = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};
const findTimetableTemplateConflict = ({ trainerId, dayOfWeek, startTime, endTime, excludeId }) => TrainerSchoolTimetableTemplate.findOne({
  where: {
    ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    trainerId,
    dayOfWeek,
    startTime: { [Op.lt]: endTime },
    endTime: { [Op.gt]: startTime },
  },
});

const activityForTemplateWeek = async (template, sessions, weekStart) => {
  const initialIndex = Math.max(0, sessions.findIndex(session => Number(session.position) === Number(template.startActivityPosition || 1)));
  let activityIndex = initialIndex;
  // Manager corrections: "done" skips the activity, any other status keeps it open.
  const overrides = await loadOverrides([template]);
  const overrideFor = session => session && overrides.get(overrideKey(template.schoolId, template.className, session.id));
  const skipManagerDone = () => {
    while (activityIndex < sessions.length && overrideFor(sessions[activityIndex])?.status === 'done') activityIndex += 1;
  };
  skipManagerDone();
  if (!isDateKey(weekStart) || weekStart <= template.startWeek) return sessions[Math.min(activityIndex, sessions.length - 1)] || null;

  const slotTemplates = await TrainerSchoolTimetableTemplate.findAll({
    where: {
      managerId: template.managerId,
      schoolId: template.schoolId,
      className: template.className,
      courseId: template.courseId,
      dayOfWeek: template.dayOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
    },
    attributes: ['id'],
  });
  const history = await TrainerSchoolAssignment.findAll({
    where: {
      timetableTemplateId: { [Op.in]: slotTemplates.map(item => item.id) },
      weekStart: { [Op.gte]: template.startWeek, [Op.lt]: weekStart },
      status: 'published',
    },
    attributes: ['weekStart', 'curriculumSessionId', 'completionStatus'],
    order: [['weekStart', 'ASC']],
  });
  const assignmentsByWeek = new Map();
  history.forEach(assignment => {
    const bucket = assignmentsByWeek.get(assignment.weekStart) || [];
    bucket.push(assignment);
    assignmentsByWeek.set(assignment.weekStart, bucket);
  });
  const target = new Date(`${weekStart}T00:00:00Z`);
  const cursor = new Date(`${template.startWeek}T00:00:00Z`);
  while (cursor < target && activityIndex < sessions.length) {
    const assignments = assignmentsByWeek.get(cursor.toISOString().slice(0, 10)) || [];
    const currentSession = sessions[activityIndex];
    const forcedOpen = overrideFor(currentSession) && overrideFor(currentSession).status !== 'done';
    const completed = !forcedOpen && assignments.some(assignment => Number(assignment.curriculumSessionId) === Number(currentSession.id) && assignment.completionStatus === 'completed');
    if (completed) {
      activityIndex += 1;
      skipManagerDone();
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return sessions[Math.min(activityIndex, sessions.length - 1)] || null;
};

const withCurriculumDetails = async assignments => {
  const sessionIds = [...new Set(assignments.map(assignment => Number(assignment.curriculumSessionId)).filter(id => Number.isInteger(id) && id > 0))];
  if (!sessionIds.length) return assignments.map(assignment => assignment.toJSON ? assignment.toJSON() : assignment);
  const sessions = await SchoolCurriculumSession.findAll({ where: { id: { [Op.in]: sessionIds } } });
  const courseIds = [...new Set(sessions.map(session => session.courseId))];
  const courses = courseIds.length ? await SchoolCurriculumCourse.findAll({ where: { id: { [Op.in]: courseIds } } }) : [];
  const sessionById = new Map(sessions.map(session => [session.id, session.toJSON()]));
  const courseById = new Map(courses.map(course => [course.id, course.toJSON()]));
  return assignments.map(assignment => {
    const record = assignment.toJSON ? assignment.toJSON() : assignment;
    const session = sessionById.get(Number(record.curriculumSessionId)) || null;
    return { ...record, curriculumSession: session ? { ...session, course: courseById.get(session.courseId) || null } : null };
  });
};

router.get('/activities', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const { weekStart, trainerId } = req.query;
    if (!isDateKey(weekStart) || new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 1) {
      return res.status(400).json({ error: 'A Monday week start in YYYY-MM-DD format is required' });
    }

    const trainerCodes = await getManagedTrainerCodes(req.user);
    if (trainerCodes && !trainerCodes.length) return res.json([]);
    if (trainerId && trainerCodes && !trainerCodes.includes(trainerId)) {
      return res.status(404).json({ error: 'Trainer not found in your management scope' });
    }

    const where = { weekStart };
    if (req.user.role !== 'admin') where.managerId = req.user.employeeCode;
    if (trainerId) where.trainerId = trainerId;
    else if (trainerCodes) where.trainerId = { [Op.in]: trainerCodes };

    const assignments = await TrainerActivityAssignment.findAll({ where, order: [['date', 'ASC'], ['startTime', 'ASC']] });
    return res.json(assignments);
  } catch (error) {
    console.error('Error fetching trainer activity schedule:', error);
    return res.status(500).json({ error: 'Failed to load trainer activity schedule' });
  }
});

router.put('/activities', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { weekStart, status, assignments } = req.body;
    if (!isDateKey(weekStart) || new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 1) {
      await transaction.rollback();
      return res.status(400).json({ error: 'A Monday week start in YYYY-MM-DD format is required' });
    }
    if (!['draft', 'published'].includes(status) || !Array.isArray(assignments)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'A valid schedule status and assignments list are required' });
    }

    const trainerCodes = await getManagedTrainerCodes(req.user);
    if (trainerCodes && !trainerCodes.length) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No trainers are available in your management scope' });
    }
    const requestedTrainerCodes = [...new Set(assignments.map(assignment => assignment.trainerId).filter(Boolean))];
    const validTrainerCodes = trainerCodes || (await User.findAll({
      where: { employeeCode: { [Op.in]: requestedTrainerCodes }, role: 'employee' },
      attributes: ['employeeCode']
    })).map(trainer => trainer.employeeCode);
    const weekDates = new Set(getWeekDates(weekStart));
    const assignedIntervals = new Map();
    const records = [];

    for (const assignment of assignments) {
      const { trainerId, date, activityTitle, startTime, endTime } = assignment;
      if (!trainerId || !weekDates.has(date) || !isDateKey(date) || !String(activityTitle || '').trim()) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Each assignment needs a trainer, activity, and date in the selected week' });
      }
      if (!validTrainerCodes.includes(trainerId)) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Trainer not found in your management scope' });
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '') || startTime >= endTime) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Activity times must be valid and end after start' });
      }

      const intervalKey = `${trainerId}:${date}`;
      const intervals = assignedIntervals.get(intervalKey) || [];
      if (intervals.some(interval => startTime < interval.end && endTime > interval.start)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'A trainer cannot have overlapping activities' });
      }
      intervals.push({ start: startTime, end: endTime });
      assignedIntervals.set(intervalKey, intervals);
      records.push({
        managerId: req.user.employeeCode,
        trainerId,
        activityTemplateId: assignment.activityTemplateId || null,
        activityTitle: String(activityTitle).trim(),
        weekStart,
        date,
        startTime,
        endTime,
        comment: assignment.comment || null,
        status,
      });
    }

    await TrainerActivityAssignment.destroy({ where: { managerId: req.user.employeeCode, weekStart }, transaction });
    const savedAssignments = records.length
      ? await TrainerActivityAssignment.bulkCreate(records, { transaction, returning: true })
      : [];
    await transaction.commit();
    return res.json({ success: true, status, assignments: savedAssignments });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Error saving trainer activity schedule:', error);
    return res.status(500).json({ error: 'Failed to save trainer activity schedule' });
  }
});

router.get('/school-trainers', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const schoolId = Number(req.query.schoolId);
    if (!Number.isInteger(schoolId) || schoolId <= 0) return res.status(400).json({ error: 'Choose a valid school.' });
    const where = { schoolId };
    if (req.user.role !== 'admin') where.managerId = req.user.employeeCode;
    const rows = await TrainerSchoolRoster.findAll({ where, order: [['trainerId', 'ASC']] });
    return res.json(rows.map(row => row.trainerId));
  } catch (error) {
    console.error('Error loading school trainer assignments:', error);
    return res.status(500).json({ error: 'Failed to load trainers assigned to this school.' });
  }
});

router.put('/school-trainers', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  let transaction;
  try {
    const schoolId = Number(req.body?.schoolId);
    const trainerIds = [...new Set((Array.isArray(req.body?.trainerIds) ? req.body.trainerIds : []).map(id => String(id).trim()).filter(Boolean))];
    if (!Number.isInteger(schoolId) || schoolId <= 0) return res.status(400).json({ error: 'Choose a valid school.' });
    const school = await SchoolCatalog.findByPk(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });
    await assertSchoolAccess(req.user, [schoolId]);
    const managedTrainerCodes = await getManagedTrainerCodes(req.user);
    let validTrainerCodes = managedTrainerCodes;
    if (managedTrainerCodes) {
      if (trainerIds.some(id => !managedTrainerCodes.includes(id))) return res.status(404).json({ error: 'One or more trainers are outside your management scope.' });
      validTrainerCodes = managedTrainerCodes;
    } else if (trainerIds.length) {
      validTrainerCodes = (await User.findAll({ where: { employeeCode: { [Op.in]: trainerIds }, role: 'employee' }, attributes: ['employeeCode'] })).map(user => user.employeeCode);
      if (trainerIds.some(id => !validTrainerCodes.includes(id))) return res.status(404).json({ error: 'One or more trainers were not found.' });
    }
    transaction = await sequelize.transaction();
    const managerId = req.user.employeeCode;
    await TrainerSchoolRoster.destroy({ where: { managerId, schoolId }, transaction });
    if (trainerIds.length) await TrainerSchoolRoster.bulkCreate(trainerIds.map(trainerId => ({ managerId, schoolId, trainerId })), { transaction });
    await transaction.commit();
    return res.json({ success: true, schoolId, trainerIds });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    if (scopeError(res, error)) return undefined;
    console.error('Error saving school trainer assignments:', error);
    return res.status(500).json({ error: 'Failed to save trainers assigned to this school.' });
  }
});

router.get('/school-timetable-templates', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? {} : { managerId: req.user.employeeCode };
    const selectedWeek = isDateKey(req.query.weekStart) ? req.query.weekStart : null;
    const templates = await TrainerSchoolTimetableTemplate.findAll({ where, order: [['schoolId', 'ASC'], ['className', 'ASC'], ['dayOfWeek', 'ASC'], ['startTime', 'ASC']] });
    const enriched = await Promise.all(templates.map(async template => {
      const course = await SchoolCurriculumCourse.findByPk(template.courseId);
      const sessions = await SchoolCurriculumSession.findAll({ where: { courseId: template.courseId }, order: [['position', 'ASC']] });
      const nextActivity = await activityForTemplateWeek(template, sessions, selectedWeek || template.startWeek);
      return { ...template.toJSON(), course: course?.toJSON() || null, nextActivity: nextActivity?.toJSON() || null };
    }));
    return res.json(enriched);
  } catch (error) {
    console.error('Error fetching recurring school timetable:', error);
    return res.status(500).json({ error: 'Failed to load school timetable setup' });
  }
});

router.post('/school-timetable-templates', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const { trainerId, schoolId: rawSchoolId, className, courseId: rawCourseId, startActivityPosition: rawStartActivityPosition, dayOfWeek: rawDay, startTime, endTime, startWeek, comment } = req.body || {};
    const schoolId = Number(rawSchoolId);
    const courseId = Number(rawCourseId);
    const dayOfWeek = Number(rawDay);
    if (!trainerId || !String(className || '').trim() || !Number.isInteger(schoolId) || !Number.isInteger(courseId) || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !isDateKey(startWeek)) {
      return res.status(400).json({ error: 'Choose a trainer, school, class, course, weekday, and start week.' });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '') || startTime >= endTime) {
      return res.status(400).json({ error: 'Class times must be valid and end after start.' });
    }
    const trainerCodes = await getManagedTrainerCodes(req.user);
    if (trainerCodes && !trainerCodes.includes(trainerId)) return res.status(404).json({ error: 'Trainer not found in your management scope.' });
    if (!trainerCodes) {
      const trainer = await User.findOne({ where: { employeeCode: trainerId, role: 'employee' }, attributes: ['employeeCode'] });
      if (!trainer) return res.status(404).json({ error: 'Trainer not found.' });
    }
    await assertSchoolAccess(req.user, [schoolId]);
    const [school, course] = await Promise.all([
      SchoolCatalog.findByPk(schoolId),
      SchoolCurriculumCourse.findByPk(courseId),
    ]);
    if (!school || !course) return res.status(400).json({ error: 'Choose a school and a course.' });
    const startActivityPosition = Number(rawStartActivityPosition || 1);
    const startingSession = await SchoolCurriculumSession.findOne({ where: { courseId, position: startActivityPosition } });
    if (!startingSession) return res.status(400).json({ error: 'Choose an activity from the selected course.' });
    if (await findTimetableTemplateConflict({ trainerId, dayOfWeek, startTime, endTime })) {
      return res.status(409).json({ error: 'This trainer already has a timetable at that time on this weekday.' });
    }
    const template = await TrainerSchoolTimetableTemplate.create({
      managerId: req.user.employeeCode,
      trainerId,
      schoolId,
      className: String(className).trim(),
      courseId,
      startActivityPosition,
      dayOfWeek,
      startTime,
      endTime,
      startWeek,
      comment: String(comment || '').trim() || null,
    });
    return res.status(201).json(template);
  } catch (error) {
    if (scopeError(res, error)) return undefined;
    console.error('Error creating recurring school timetable:', error);
    return res.status(500).json({ error: 'Failed to save school timetable setup' });
  }
});

router.put('/school-timetable-templates/:id', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const where = { id: Number(req.params.id) };
    if (req.user.role !== 'admin') where.managerId = req.user.employeeCode;
    const template = await TrainerSchoolTimetableTemplate.findOne({ where });
    if (!template) return res.status(404).json({ error: 'School timetable setup not found.' });
    const { trainerId, schoolId: rawSchoolId, className, courseId: rawCourseId, startActivityPosition: rawStartActivityPosition, dayOfWeek: rawDay, startTime, endTime, startWeek, comment } = req.body || {};
    const schoolId = Number(rawSchoolId);
    const courseId = Number(rawCourseId);
    const dayOfWeek = Number(rawDay);
    if (!trainerId || !String(className || '').trim() || !Number.isInteger(schoolId) || !Number.isInteger(courseId) || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !isDateKey(startWeek)) {
      return res.status(400).json({ error: 'Choose a trainer, school, class, course, weekday, and start week.' });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '') || startTime >= endTime) return res.status(400).json({ error: 'Class times must be valid and end after start.' });
    const trainerCodes = await getManagedTrainerCodes(req.user);
    if (trainerCodes && !trainerCodes.includes(trainerId)) return res.status(404).json({ error: 'Trainer not found in your management scope.' });
    if (!trainerCodes) {
      const trainer = await User.findOne({ where: { employeeCode: trainerId, role: 'employee' }, attributes: ['employeeCode'] });
      if (!trainer) return res.status(404).json({ error: 'Trainer not found.' });
    }
    await assertSchoolAccess(req.user, [schoolId]);
    const [school, course] = await Promise.all([SchoolCatalog.findByPk(schoolId), SchoolCurriculumCourse.findByPk(courseId)]);
    if (!school || !course) return res.status(400).json({ error: 'Choose a school and a course.' });
    const startActivityPosition = Number(rawStartActivityPosition || 1);
    const startingSession = await SchoolCurriculumSession.findOne({ where: { courseId, position: startActivityPosition } });
    if (!startingSession) return res.status(400).json({ error: 'Choose an activity from the selected course.' });
    if (await findTimetableTemplateConflict({ trainerId, dayOfWeek, startTime, endTime, excludeId: template.id })) {
      return res.status(409).json({ error: 'This trainer already has a timetable at that time on this weekday.' });
    }
    await template.update({ trainerId, schoolId, className: String(className).trim(), courseId, startActivityPosition, dayOfWeek, startTime, endTime, startWeek, comment: String(comment || '').trim() || null });
    const resetWeek = startWeek > currentWeekStart() ? startWeek : currentWeekStart();
    await TrainerSchoolAssignment.destroy({ where: { timetableTemplateId: template.id, weekStart: { [Op.gte]: resetWeek } } });
    return res.json(template);
  } catch (error) {
    if (scopeError(res, error)) return undefined;
    console.error('Error updating recurring school timetable:', error);
    return res.status(500).json({ error: 'Failed to update school timetable setup' });
  }
});

router.delete('/school-timetable-templates/:id', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const where = { id: Number(req.params.id) };
    if (req.user.role !== 'admin') where.managerId = req.user.employeeCode;
    const deleted = await TrainerSchoolTimetableTemplate.destroy({ where });
    if (!deleted) return res.status(404).json({ error: 'School timetable setup not found.' });
    await TrainerSchoolAssignment.destroy({ where: { timetableTemplateId: Number(req.params.id), weekStart: { [Op.gte]: currentWeekStart() } } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring school timetable:', error);
    return res.status(500).json({ error: 'Failed to delete school timetable setup' });
  }
});

router.get('/schools', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const { weekStart, trainerId } = req.query;
    if (!isDateKey(weekStart) || new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 1) {
      return res.status(400).json({ error: 'A Monday week start in YYYY-MM-DD format is required' });
    }

    const trainerCodes = await getManagedTrainerCodes(req.user);
    if (trainerCodes && !trainerCodes.length) return res.json([]);
    if (trainerId && trainerCodes && !trainerCodes.includes(trainerId)) {
      return res.status(404).json({ error: 'Trainer not found in your management scope' });
    }

    const where = { weekStart };
    if (req.user.role !== 'admin') where.managerId = req.user.employeeCode;
    if (trainerId) where.trainerId = trainerId;
    else if (trainerCodes) where.trainerId = { [Op.in]: trainerCodes };

    const assignments = await TrainerSchoolAssignment.findAll({ where, order: [['date', 'ASC'], ['startTime', 'ASC']] });
    const templateWhere = req.user.role === 'admin' ? {} : { managerId: req.user.employeeCode };
    if (trainerId) templateWhere.trainerId = trainerId;
    const templates = await TrainerSchoolTimetableTemplate.findAll({ where: templateWhere, order: [['startTime', 'ASC']] });
    const weekDates = getWeekDates(weekStart);
    const generated = [];
    for (const template of templates) {
      if (weekStart < template.startWeek) continue;
      const date = weekDates.find(day => new Date(`${day}T00:00:00Z`).getUTCDay() === Number(template.dayOfWeek));
      if (!date) continue;
      const sessions = await SchoolCurriculumSession.findAll({ where: { courseId: template.courseId }, order: [['position', 'ASC']] });
      const session = await activityForTemplateWeek(template, sessions, weekStart);
      if (!session) continue;
      const existingAssignment = assignments.find(assignment => Number(assignment.timetableTemplateId) === Number(template.id));
      if (existingAssignment) {
        if (weekStart >= currentWeekStart() && existingAssignment.completionStatus === 'pending' && Number(existingAssignment.curriculumSessionId) !== Number(session.id)) {
          await existingAssignment.update({ curriculumSessionId: session.id, activityTitle: session.title });
        }
        continue;
      }
      generated.push({
        managerId: template.managerId,
        trainerId: template.trainerId,
        schoolId: template.schoolId,
        className: template.className,
        activityTitle: session.title,
        curriculumSessionId: session.id,
        timetableTemplateId: template.id,
        weekStart,
        date,
        startTime: template.startTime,
        endTime: template.endTime,
        comment: template.comment,
        status: 'published',
      });
    }
    if (generated.length) {
      await TrainerSchoolAssignment.bulkCreate(generated, { ignoreDuplicates: true, returning: true });
      const refreshed = await TrainerSchoolAssignment.findAll({ where, order: [['date', 'ASC'], ['startTime', 'ASC']] });
      return res.json(await withCurriculumDetails(refreshed));
    }
    if (assignments.length) return res.json(await withCurriculumDetails(assignments));

    const legacyWhere = { date: { [Op.in]: getWeekDates(weekStart) } };
    if (trainerId) legacyWhere.employeeId = trainerId;
    else if (trainerCodes) legacyWhere.employeeId = { [Op.in]: trainerCodes };
    const legacyAssignments = await TrainerOccupancy.findAll({ where: legacyWhere, order: [['date', 'ASC']] });
    return res.json(legacyAssignments.map(assignment => ({
      localId: `legacy-${assignment.employeeId}-${assignment.date}`,
      trainerId: assignment.employeeId,
      schoolId: assignment.schoolId,
      className: 'Class',
      activityTemplateId: null,
      activityTitle: 'School Session',
      weekStart,
      date: String(assignment.date).slice(0, 10),
      startTime: '09:00',
      endTime: '10:00',
      comment: '',
      status: 'draft',
    })));
  } catch (error) {
    console.error('Error fetching trainer school schedule:', error);
    return res.status(500).json({ error: 'Failed to load trainer school schedule' });
  }
});

router.delete('/schools/:id', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const legacyMatch = String(req.params.id).match(/^legacy-(.+)-(\d{4}-\d{2}-\d{2})$/);
    if (legacyMatch) {
      const [, employeeId, date] = legacyMatch;
      if (!isDateKey(date)) return res.status(400).json({ error: 'A valid school schedule date is required' });
      const trainerCodes = await getManagedTrainerCodes(req.user);
      if (trainerCodes && !trainerCodes.includes(employeeId)) return res.status(404).json({ error: 'School schedule was not found' });
      const deleted = await TrainerOccupancy.destroy({ where: { employeeId, date } });
      if (!deleted) return res.status(404).json({ error: 'Legacy school schedule was not found' });
      return res.json({ success: true, legacy: true, employeeId, date });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'A valid school schedule ID is required' });
    const where = { id };
    if (req.user.role !== 'admin') where.managerId = req.user.employeeCode;
    const assignment = await TrainerSchoolAssignment.findOne({ where });
    if (!assignment) return res.status(404).json({ error: 'School schedule was not found' });
    if (assignment.timetableTemplateId) {
      const templateWhere = { id: assignment.timetableTemplateId };
      if (req.user.role !== 'admin') templateWhere.managerId = req.user.employeeCode;
      await TrainerSchoolTimetableTemplate.destroy({ where: templateWhere });
      await TrainerSchoolAssignment.destroy({ where: { timetableTemplateId: assignment.timetableTemplateId, weekStart: { [Op.gte]: currentWeekStart() } } });
    }
    const deleted = await TrainerSchoolAssignment.destroy({ where });
    if (!deleted) return res.status(404).json({ error: 'School schedule was not found' });
    return res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting school schedule:', error);
    return res.status(500).json({ error: 'Failed to delete school schedule' });
  }
});

router.put('/schools', auth, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { weekStart, status, assignments } = req.body;
    if (!isDateKey(weekStart) || new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 1) {
      await transaction.rollback();
      return res.status(400).json({ error: 'A Monday week start in YYYY-MM-DD format is required' });
    }
    if (!['draft', 'published'].includes(status) || !Array.isArray(assignments)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'A valid schedule status and assignments list are required' });
    }

    const trainerCodes = await getManagedTrainerCodes(req.user);
    if (trainerCodes && !trainerCodes.length) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No trainers are available in your management scope' });
    }
    const requestedTrainerCodes = [...new Set(assignments.map(assignment => assignment.trainerId).filter(Boolean))];
    const validTrainerCodes = trainerCodes || (await User.findAll({
      where: { employeeCode: { [Op.in]: requestedTrainerCodes }, role: 'employee' },
      attributes: ['employeeCode']
    })).map(trainer => trainer.employeeCode);
    const requestedSchoolIds = [...new Set(assignments.map(assignment => Number(assignment.schoolId)).filter(Number.isInteger))];
    try {
      await assertSchoolAccess(req.user, requestedSchoolIds);
    } catch (error) {
      await transaction.rollback();
      return res.status(error.status || 403).json({ error: error.message });
    }
    const validSchoolIds = (await SchoolCatalog.findAll({ where: { id: { [Op.in]: requestedSchoolIds } }, attributes: ['id'] })).map(school => school.id);
    const requestedCurriculumSessionIds = [...new Set(assignments.map(assignment => Number(assignment.curriculumSessionId)).filter(id => Number.isInteger(id) && id > 0))];
    const curriculumSessions = requestedCurriculumSessionIds.length
      ? await SchoolCurriculumSession.findAll({ where: { id: { [Op.in]: requestedCurriculumSessionIds } } })
      : [];
    const curriculumCourses = curriculumSessions.length
      ? await SchoolCurriculumCourse.findAll({ where: { id: { [Op.in]: [...new Set(curriculumSessions.map(session => session.courseId))] } }, attributes: ['id', 'schoolId'] })
      : [];
    const curriculumSessionById = new Map(curriculumSessions.map(session => [session.id, session]));
    const curriculumCourseById = new Map(curriculumCourses.map(course => [course.id, course]));
    const weekDates = new Set(getWeekDates(weekStart));
    const scheduledIntervals = new Map();
    const records = [];

    for (const assignment of assignments) {
      const { trainerId, date, className, activityTitle, startTime, endTime } = assignment;
      const schoolId = Number(assignment.schoolId);
      const curriculumSessionId = assignment.curriculumSessionId ? Number(assignment.curriculumSessionId) : null;
      if (!trainerId || !weekDates.has(date) || !isDateKey(date) || !String(className || '').trim() || !String(activityTitle || '').trim()) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Each class needs a trainer, school, class name, subject, and date in the selected week' });
      }
      if (!validTrainerCodes.includes(trainerId)) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Trainer not found in your management scope' });
      }
      if (!validSchoolIds.includes(schoolId)) {
        await transaction.rollback();
        return res.status(404).json({ error: 'School not found in the school catalog' });
      }
      if (curriculumSessionId) {
        const curriculumSession = curriculumSessionById.get(curriculumSessionId);
        const curriculumCourse = curriculumSession && curriculumCourseById.get(curriculumSession.courseId);
        if (!curriculumSession || !curriculumCourse) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Choose a valid curriculum activity.' });
        }
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '') || startTime >= endTime) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Class times must be valid and end after start' });
      }

      const intervalKey = `${trainerId}:${date}`;
      const intervals = scheduledIntervals.get(intervalKey) || [];
      if (intervals.some(interval => startTime < interval.end && endTime > interval.start)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'A trainer cannot have overlapping classes' });
      }
      intervals.push({ start: startTime, end: endTime });
      scheduledIntervals.set(intervalKey, intervals);
      records.push({
        managerId: req.user.employeeCode,
        trainerId,
        schoolId,
        className: String(className).trim(),
        activityTemplateId: assignment.activityTemplateId || null,
        activityTitle: String(activityTitle).trim(),
        curriculumSessionId,
        timetableTemplateId: assignment.timetableTemplateId ? Number(assignment.timetableTemplateId) : null,
        weekStart,
        date,
        startTime,
        endTime,
        comment: assignment.comment || null,
        status,
      });
    }

    const existingAssignments = await TrainerSchoolAssignment.findAll({
      where: { managerId: req.user.employeeCode, weekStart },
      transaction,
    });
    const completionBySchedule = new Map(existingAssignments.map(assignment => [
      [assignment.trainerId, assignment.schoolId, assignment.className, assignment.date, assignment.startTime, assignment.endTime, assignment.curriculumSessionId || ''].join('|'),
      { completionStatus: assignment.completionStatus, completedAt: assignment.completedAt, trainerNote: assignment.trainerNote, studentCount: assignment.studentCount, photosLink: assignment.photosLink },
    ]));
    for (const record of records) {
      const key = [record.trainerId, record.schoolId, record.className, record.date, record.startTime, record.endTime, record.curriculumSessionId || ''].join('|');
      Object.assign(record, completionBySchedule.get(key) || {});
    }

    const legacyOccupancyKeys = assignments.map(assignment => {
      const match = String(assignment.legacyLocalId || '').match(/^legacy-(.+)-(\d{4}-\d{2}-\d{2})$/);
      if (!match || match[1] !== assignment.trainerId || match[2] !== assignment.date || !weekDates.has(match[2]) || !validTrainerCodes.includes(match[1])) return null;
      return { employeeId: match[1], date: match[2] };
    }).filter(Boolean);
    if (legacyOccupancyKeys.length) {
      await TrainerOccupancy.destroy({ where: { [Op.or]: legacyOccupancyKeys }, transaction });
    }

    await TrainerSchoolAssignment.destroy({ where: { managerId: req.user.employeeCode, weekStart }, transaction });
    const savedAssignments = records.length
      ? await TrainerSchoolAssignment.bulkCreate(records, { transaction, returning: true })
      : [];
    await transaction.commit();
    return res.json({ success: true, status, assignments: await withCurriculumDetails(savedAssignments) });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Error saving trainer school schedule:', error);
    return res.status(500).json({ error: 'Failed to save trainer school schedule' });
  }
});

// Get weeks of a month
const getWeeksOfMonth = (year, month) => {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let current = new Date(firstDay);
  // Find first Monday
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() + 1);
  }
  
  while (current <= lastDay) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    weeks.push({
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
      label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    });
    
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
};

// Get occupancy for an employee by week or date range
router.get('/', auth, seniorTrainerScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const { employeeId, weekStart, startDate, endDate } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const whereClause = { employeeId };
    
    if (weekStart) {
      // Get all dates for this week (Monday to Sunday)
      const start = new Date(weekStart);
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
      whereClause.date = { [Op.in]: dates };
    } else if (startDate && endDate) {
      // Date range query for calendar
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const occupancies = await TrainerOccupancy.findAll({
      where: whereClause,
      order: [['date', 'ASC']],
    });

    // Get school names separately
    const schoolIds = [...new Set(occupancies.map(o => o.schoolId).filter(Boolean))];
    const schools = await SchoolCatalog.findAll({
      where: { id: { [Op.in]: schoolIds } },
      attributes: ['id', 'name'],
    });
    const schoolMap = {};
    schools.forEach(s => schoolMap[s.id] = s.name);

    // Format as { 'YYYY-MM-DD': { schoolId, schoolName } }
    const formatted = {};
    occupancies.forEach(occ => {
      // Ensure date is in YYYY-MM-DD format without timezone issues
      const dateValue = occ.date;
      let dateStr;
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else {
        // Already a string, just take first 10 chars (YYYY-MM-DD)
        dateStr = String(dateValue).slice(0, 10);
      }
      formatted[dateStr] = {
        schoolId: occ.schoolId,
        schoolName: schoolMap[occ.schoolId] || null,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching trainer occupancy:', error);
    res.status(500).json({ error: 'Failed to fetch occupancy data' });
  }
});

// Get available weeks for a month
router.get('/weeks', auth, seniorTrainerScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const weeks = getWeeksOfMonth(parseInt(year), parseInt(month));
    res.json(weeks);
  } catch (error) {
    console.error('Error fetching weeks:', error);
    res.status(500).json({ error: 'Failed to fetch weeks' });
  }
});

// Save/update occupancy for a week
router.post('/', auth, seniorTrainerScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const { employeeId, weekStart, assignments } = req.body;
    
    if (!employeeId || !weekStart || !assignments) {
      return res.status(400).json({ error: 'Employee ID, week start, and assignments are required' });
    }

    // assignments should be { 'YYYY-MM-DD': schoolId }
    const transaction = await require('../../models').sequelize.transaction();
    
    try {
      for (const [date, schoolId] of Object.entries(assignments)) {
        if (schoolId) {
          await TrainerOccupancy.upsert({
            employeeId,
            date,
            schoolId,
            weekStart,
          }, { transaction });
        } else {
          // If schoolId is null/empty, delete the record
          await TrainerOccupancy.destroy({
            where: { employeeId, date },
            transaction,
          });
        }
      }
      
      await transaction.commit();
      
      // Return updated data
      const start = new Date(weekStart);
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
      
      const occupancies = await TrainerOccupancy.findAll({
        where: {
          employeeId,
          date: { [Op.in]: dates },
        },
      });
      
      // Get school names separately
      const schoolIds = [...new Set(occupancies.map(o => o.schoolId).filter(Boolean))];
      const schools = await SchoolCatalog.findAll({
        where: { id: { [Op.in]: schoolIds } },
        attributes: ['id', 'name'],
      });
      const schoolMap = {};
      schools.forEach(s => schoolMap[s.id] = s.name);
      
      const formatted = {};
      occupancies.forEach(occ => {
        formatted[occ.date] = {
          schoolId: occ.schoolId,
          schoolName: schoolMap[occ.schoolId] || null,
        };
      });
      
      res.json({ success: true, data: formatted });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  } catch (error) {
    console.error('Error saving trainer occupancy:', error);
    res.status(500).json({ error: 'Failed to save occupancy data' });
  }
});

// Delete occupancy for a specific date
router.delete('/', auth, seniorTrainerScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
  try {
    const { employeeId, date } = req.query;
    
    if (!employeeId || !date) {
      return res.status(400).json({ error: 'Employee ID and date are required' });
    }

    await TrainerOccupancy.destroy({
      where: { employeeId, date },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting trainer occupancy:', error);
    res.status(500).json({ error: 'Failed to delete occupancy' });
  }
});

module.exports = router;
