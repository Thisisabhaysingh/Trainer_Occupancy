const express = require('express');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  SchoolCatalog,
  SchoolCurriculumCourse,
  SchoolAcademicSession,
  SchoolAcademicTerm,
  SchoolClass,
  SchoolClassCourse,
} = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { getAssignedSchoolIds, assertSchoolAccess, getManagedTrainerCodes } = require('../../services/managerScope');
const { backfillFromTimesheet } = require('../../services/schoolClassSync');

// School academic structure (academic years, terms, classes, course assignment),
// mirroring omo_reportcard so the two apps can be synced later.
const router = express.Router();
router.use(auth, checkRole(['admin', 'manager', 'senior_manager']));

const fail = (status, message) => Object.assign(new Error(message), { status });
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
const optionalDate = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  if (!isDate(value)) throw fail(400, `${label} must be a valid date.`);
  return value;
};
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const handle = fn => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'That already exists for this school.' });
    console.error('School management error:', error);
    return res.status(500).json({ error: 'Something went wrong in school management.' });
  }
};

const loadSchool = async (user, schoolId) => {
  const id = Number(schoolId);
  const school = Number.isInteger(id) ? await SchoolCatalog.findByPk(id, { attributes: ['id', 'name'] }) : null;
  if (!school) throw fail(404, 'School not found.');
  await assertSchoolAccess(user, [id]);
  return school;
};
const loadSessionForUser = async (user, sessionId) => {
  const session = await SchoolAcademicSession.findByPk(Number(sessionId));
  if (!session) throw fail(404, 'Academic year not found.');
  await assertSchoolAccess(user, [session.schoolId]);
  return session;
};
const loadClassForUser = async (user, classId) => {
  const schoolClass = await SchoolClass.findByPk(Number(classId));
  if (!schoolClass) throw fail(404, 'Class not found.');
  await assertSchoolAccess(user, [schoolClass.schoolId]);
  return schoolClass;
};

// ---------- schools ----------

router.get('/schools', handle(async (req, res) => {
  const allowed = await getAssignedSchoolIds(req.user);
  const schools = await SchoolCatalog.findAll({ where: allowed ? { id: { [Op.in]: allowed } } : {}, attributes: ['id', 'name'], order: [['name', 'ASC']] });
  const ids = schools.map(school => school.id);
  const [classCounts, activeSessions] = ids.length ? await Promise.all([
    SchoolClass.findAll({ where: { schoolId: { [Op.in]: ids } }, attributes: ['schoolId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']], group: ['schoolId'], raw: true }),
    SchoolAcademicSession.findAll({ where: { schoolId: { [Op.in]: ids }, isActive: true }, attributes: ['schoolId', 'id', 'label'] }),
  ]) : [[], []];
  const classesBySchool = new Map(classCounts.map(row => [Number(row.schoolId), Number(row.total)]));
  const activeBySchool = new Map(activeSessions.map(row => [Number(row.schoolId), { id: row.id, label: row.label }]));
  return res.json(schools.map(school => ({ id: school.id, name: school.name, classCount: classesBySchool.get(school.id) || 0, activeSession: activeBySchool.get(school.id) || null })));
}));

// Trainers that can be set as a class's trainer.
router.get('/trainers', handle(async (req, res) => {
  const codes = await getManagedTrainerCodes(req.user);
  const trainers = await User.findAll({
    where: { role: 'employee', ...(codes ? { employeeCode: { [Op.in]: codes } } : {}) },
    attributes: ['employeeCode', 'name', 'email'],
    order: [['name', 'ASC']],
  });
  return res.json(trainers);
}));

// ---------- academic years (sessions) and terms ----------

const validateTerms = (terms, startDate, endDate) => {
  const orders = new Set();
  return (Array.isArray(terms) ? terms : []).map((term, index) => {
    const name = text(term?.name, 50);
    const order = Number(term?.order ?? index + 1);
    if (!name) throw fail(400, 'Every term needs a name.');
    if (!Number.isInteger(order) || order < 1) throw fail(400, 'Term order must be 1 or more.');
    if (orders.has(order)) throw fail(400, 'Two terms cannot have the same order.');
    orders.add(order);
    const startsOn = optionalDate(term?.startsOn, 'Term start');
    const endsOn = optionalDate(term?.endsOn, 'Term end');
    if (startsOn && endsOn && endsOn < startsOn) throw fail(400, `${name}: end date must be on or after the start date.`);
    if ((startsOn && (startsOn < startDate || startsOn > endDate)) || (endsOn && (endsOn < startDate || endsOn > endDate))) {
      throw fail(400, `${name}: term dates must be inside the academic year.`);
    }
    return { name, order, startsOn, endsOn };
  });
};

// Only one academic year per school can be active.
const activateSession = async (session, transaction) => {
  await SchoolAcademicSession.update({ isActive: false }, { where: { schoolId: session.schoolId, id: { [Op.ne]: session.id } }, transaction });
  if (!session.isActive) await session.update({ isActive: true }, { transaction });
};

const sessionsForSchool = schoolId => SchoolAcademicSession.findAll({
  where: { schoolId },
  include: [{ model: SchoolAcademicTerm, as: 'terms' }],
  order: [['startDate', 'DESC'], [{ model: SchoolAcademicTerm, as: 'terms' }, 'order', 'ASC']],
});

router.get('/sessions', handle(async (req, res) => {
  const school = await loadSchool(req.user, req.query.schoolId);
  return res.json(await sessionsForSchool(school.id));
}));

router.post('/sessions', handle(async (req, res) => {
  const school = await loadSchool(req.user, req.body?.schoolId);
  const label = text(req.body?.label, 50);
  const { startDate, endDate } = req.body || {};
  if (!label) throw fail(400, 'Academic year label is required, e.g. 2026-27.');
  if (!isDate(startDate) || !isDate(endDate)) throw fail(400, 'Choose a start and end date.');
  if (endDate < startDate) throw fail(400, 'End date must be on or after the start date.');
  if (await SchoolAcademicSession.count({ where: { schoolId: school.id, label } })) throw fail(409, `${label} already exists for this school.`);
  const terms = validateTerms(req.body?.terms, startDate, endDate);
  await sequelize.transaction(async transaction => {
    const session = await SchoolAcademicSession.create({ schoolId: school.id, label, startDate, endDate, isActive: false }, { transaction });
    if (terms.length) await SchoolAcademicTerm.bulkCreate(terms.map(term => ({ ...term, academicSessionId: session.id })), { transaction });
    const hasActive = await SchoolAcademicSession.count({ where: { schoolId: school.id, isActive: true }, transaction });
    if (req.body?.isActive || !hasActive) await activateSession(session, transaction);
  });
  return res.status(201).json(await sessionsForSchool(school.id));
}));

router.put('/sessions/:id', handle(async (req, res) => {
  const session = await loadSessionForUser(req.user, req.params.id);
  const label = req.body?.label !== undefined ? text(req.body.label, 50) : session.label;
  const startDate = req.body?.startDate ?? session.startDate;
  const endDate = req.body?.endDate ?? session.endDate;
  if (!label) throw fail(400, 'Academic year label is required.');
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) throw fail(400, 'Choose valid start and end dates.');
  if (label !== session.label && await SchoolAcademicSession.count({ where: { schoolId: session.schoolId, label } })) throw fail(409, `${label} already exists for this school.`);
  const outside = await SchoolAcademicTerm.count({
    where: { academicSessionId: session.id, [Op.or]: [{ startsOn: { [Op.lt]: startDate } }, { endsOn: { [Op.gt]: endDate } }] },
  });
  if (outside) throw fail(400, 'Some terms fall outside these dates. Update the terms first.');
  await sequelize.transaction(async transaction => {
    await session.update({ label, startDate, endDate }, { transaction });
    if (req.body?.isActive === true) await activateSession(session, transaction);
    if (req.body?.isActive === false) await session.update({ isActive: false }, { transaction });
  });
  return res.json(await sessionsForSchool(session.schoolId));
}));

router.delete('/sessions/:id', handle(async (req, res) => {
  const session = await loadSessionForUser(req.user, req.params.id);
  if (await SchoolClassCourse.count({ where: { academicSessionId: session.id } })) {
    throw fail(409, 'Courses are assigned to classes in this academic year. Remove those assignments first.');
  }
  await sequelize.transaction(async transaction => {
    const termIds = (await SchoolAcademicTerm.findAll({ where: { academicSessionId: session.id }, attributes: ['id'], transaction })).map(term => term.id);
    await SchoolClass.update({ activeAcademicSessionId: null, activeAcademicTermId: null }, { where: { activeAcademicSessionId: session.id }, transaction });
    if (termIds.length) await SchoolClass.update({ activeAcademicTermId: null }, { where: { activeAcademicTermId: { [Op.in]: termIds } }, transaction });
    await SchoolAcademicTerm.destroy({ where: { academicSessionId: session.id }, transaction });
    await session.destroy({ transaction });
  });
  return res.json(await sessionsForSchool(session.schoolId));
}));

const parseTerm = (body, session) => {
  const [term] = validateTerms([body], session.startDate, session.endDate);
  return term;
};

router.post('/terms', handle(async (req, res) => {
  const session = await loadSessionForUser(req.user, req.body?.academicSessionId);
  const term = parseTerm(req.body, session);
  if (await SchoolAcademicTerm.count({ where: { academicSessionId: session.id, order: term.order } })) throw fail(409, `A term with order ${term.order} already exists in ${session.label}.`);
  await SchoolAcademicTerm.create({ ...term, academicSessionId: session.id });
  return res.status(201).json(await sessionsForSchool(session.schoolId));
}));

router.put('/terms/:id', handle(async (req, res) => {
  const existing = await SchoolAcademicTerm.findByPk(Number(req.params.id));
  if (!existing) throw fail(404, 'Term not found.');
  const session = await loadSessionForUser(req.user, existing.academicSessionId);
  const term = parseTerm({ ...existing.toJSON(), ...req.body }, session);
  if (term.order !== existing.order && await SchoolAcademicTerm.count({ where: { academicSessionId: session.id, order: term.order } })) {
    throw fail(409, `A term with order ${term.order} already exists in ${session.label}.`);
  }
  await existing.update(term);
  return res.json(await sessionsForSchool(session.schoolId));
}));

router.delete('/terms/:id', handle(async (req, res) => {
  const term = await SchoolAcademicTerm.findByPk(Number(req.params.id));
  if (!term) throw fail(404, 'Term not found.');
  const session = await loadSessionForUser(req.user, term.academicSessionId);
  if (await SchoolClassCourse.count({ where: { academicTermId: term.id } })) throw fail(409, 'Courses are assigned to classes in this term. Remove those assignments first.');
  await sequelize.transaction(async transaction => {
    await SchoolClass.update({ activeAcademicTermId: null }, { where: { activeAcademicTermId: term.id }, transaction });
    await term.destroy({ transaction });
  });
  return res.json(await sessionsForSchool(session.schoolId));
}));

// ---------- classes ----------

const classesForSchool = async schoolId => {
  const classes = await SchoolClass.findAll({
    where: { schoolId },
    include: [{ model: SchoolClassCourse, as: 'courseAssignments' }],
    order: [['title', 'ASC']],
  });
  const trainerCodes = [...new Set(classes.map(row => row.trainerId).filter(Boolean))];
  const trainers = trainerCodes.length ? await User.findAll({ where: { employeeCode: { [Op.in]: trainerCodes } }, attributes: ['employeeCode', 'name'] }) : [];
  const trainerName = new Map(trainers.map(trainer => [trainer.employeeCode, trainer.name]));
  return classes
    .map(row => ({ ...row.toJSON(), trainerName: trainerName.get(row.trainerId) || null }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
};

const parseClass = async (user, body, schoolId) => {
  const title = text(body?.title, 150);
  if (!title) throw fail(400, 'Class title is required, e.g. 6A.');
  const status = ['upcoming', 'active', 'completed'].includes(body?.status) ? body.status : 'upcoming';
  const startDate = optionalDate(body?.startDate, 'Start date');
  const endDate = optionalDate(body?.endDate, 'End date');
  if (startDate && endDate && endDate < startDate) throw fail(400, 'End date must be on or after the start date.');
  const totalSessions = Number(body?.totalSessions || 0);
  if (!Number.isInteger(totalSessions) || totalSessions < 0) throw fail(400, 'Total sessions must be 0 or more.');

  const trainerId = body?.trainerId ? String(body.trainerId) : null;
  if (trainerId) {
    const allowed = await getManagedTrainerCodes(user);
    const trainer = await User.findOne({ where: { employeeCode: trainerId, role: 'employee' }, attributes: ['employeeCode'] });
    if (!trainer || (allowed && !allowed.includes(trainerId))) throw fail(400, 'Choose a trainer you manage.');
  }

  let activeAcademicSessionId = body?.activeAcademicSessionId ? Number(body.activeAcademicSessionId) : null;
  let activeAcademicTermId = body?.activeAcademicTermId ? Number(body.activeAcademicTermId) : null;
  if (activeAcademicTermId) {
    const term = await SchoolAcademicTerm.findByPk(activeAcademicTermId, { include: [{ model: SchoolAcademicSession, as: 'session' }] });
    if (!term || Number(term.session.schoolId) !== Number(schoolId)) throw fail(400, 'Choose a term from this school.');
    if (activeAcademicSessionId && activeAcademicSessionId !== term.academicSessionId) throw fail(400, 'The term must belong to the chosen academic year.');
    activeAcademicSessionId = term.academicSessionId;
  }
  if (activeAcademicSessionId) {
    const session = await SchoolAcademicSession.findByPk(activeAcademicSessionId);
    if (!session || Number(session.schoolId) !== Number(schoolId)) throw fail(400, 'Choose an academic year from this school.');
  } else {
    // Like omo_reportcard: default to the school's active year and its first term.
    const active = await SchoolAcademicSession.findOne({ where: { schoolId, isActive: true } });
    if (active) {
      activeAcademicSessionId = active.id;
      const firstTerm = await SchoolAcademicTerm.findOne({ where: { academicSessionId: active.id }, order: [['order', 'ASC']] });
      activeAcademicTermId = activeAcademicTermId || firstTerm?.id || null;
    }
  }
  return {
    title,
    description: text(body?.description, 5000) || null,
    status,
    startDate,
    endDate,
    totalSessions,
    trainerId,
    activeAcademicSessionId,
    activeAcademicTermId,
  };
};

router.get('/classes', handle(async (req, res) => {
  const school = await loadSchool(req.user, req.query.schoolId);
  return res.json(await classesForSchool(school.id));
}));

router.post('/classes', handle(async (req, res) => {
  const school = await loadSchool(req.user, req.body?.schoolId);
  const values = await parseClass(req.user, req.body, school.id);
  if (await SchoolClass.count({ where: { schoolId: school.id, title: values.title } })) throw fail(409, `Class ${values.title} already exists in ${school.name}.`);
  await SchoolClass.create({ ...values, schoolId: school.id });
  return res.status(201).json(await classesForSchool(school.id));
}));

router.put('/classes/:id', handle(async (req, res) => {
  const schoolClass = await loadClassForUser(req.user, req.params.id);
  const values = await parseClass(req.user, { ...schoolClass.toJSON(), ...req.body }, schoolClass.schoolId);
  if (values.title !== schoolClass.title && await SchoolClass.count({ where: { schoolId: schoolClass.schoolId, title: values.title } })) {
    throw fail(409, `Class ${values.title} already exists in this school.`);
  }
  await schoolClass.update(values);
  return res.json(await classesForSchool(schoolClass.schoolId));
}));

router.delete('/classes/:id', handle(async (req, res) => {
  const schoolClass = await loadClassForUser(req.user, req.params.id);
  await sequelize.transaction(async transaction => {
    await SchoolClassCourse.destroy({ where: { classId: schoolClass.id }, transaction });
    await schoolClass.destroy({ transaction });
  });
  return res.json(await classesForSchool(schoolClass.schoolId));
}));

// ---------- course assignment ----------

// Replaces a class's courses for one academic year + term (both optional),
// like omo_reportcard's per-term class-course import.
router.put('/classes/:id/courses', handle(async (req, res) => {
  const schoolClass = await loadClassForUser(req.user, req.params.id);
  let academicSessionId = req.body?.academicSessionId ? Number(req.body.academicSessionId) : null;
  const academicTermId = req.body?.academicTermId ? Number(req.body.academicTermId) : null;
  if (academicTermId) {
    const term = await SchoolAcademicTerm.findByPk(academicTermId);
    if (!term) throw fail(400, 'Term not found.');
    if (academicSessionId && academicSessionId !== term.academicSessionId) throw fail(400, 'The term must belong to the chosen academic year.');
    academicSessionId = term.academicSessionId;
  }
  if (academicSessionId) {
    const session = await SchoolAcademicSession.findByPk(academicSessionId);
    if (!session || Number(session.schoolId) !== Number(schoolClass.schoolId)) throw fail(400, 'Choose an academic year from this class’s school.');
  }
  const courseIds = [...new Set((Array.isArray(req.body?.courseIds) ? req.body.courseIds : []).map(Number).filter(Number.isInteger))];
  if (courseIds.length && await SchoolCurriculumCourse.count({ where: { id: { [Op.in]: courseIds } } }) !== courseIds.length) {
    throw fail(400, 'One or more courses were not found.');
  }
  await sequelize.transaction(async transaction => {
    await SchoolClassCourse.destroy({ where: { classId: schoolClass.id, academicSessionId, academicTermId }, transaction });
    if (courseIds.length) {
      await SchoolClassCourse.bulkCreate(courseIds.map(courseId => ({
        classId: schoolClass.id, courseId, academicSessionId, academicTermId, assignedBy: req.user.employeeCode,
      })), { transaction });
    }
  });
  return res.json(await classesForSchool(schoolClass.schoolId));
}));

// Pulls every class already onboarded in the timesheet (timetables, school
// activities, Course Status edits) into School Management.
router.post('/sync-from-timesheet', checkRole(['admin']), handle(async (req, res) => res.json(await backfillFromTimesheet())));

module.exports = router;
