const express = require('express');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const {
  User,
  SchoolCatalog,
  TrainerSchoolAssignment,
  SchoolCurriculumSession,
  SchoolCurriculumCourse,
} = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');

const router = express.Router();
router.use(auth, checkRole(['admin', 'manager', 'senior_manager']));

const MAX_RANGE_DAYS = 366;
const STATUS_FILTERS = {
  completed: ['completed'],
  marked: ['completed', 'not_completed', 'cancelled'],
  cancelled: ['cancelled'],
  all: ['completed', 'not_completed', 'cancelled', 'pending'],
};
const STATUS_LABELS = { completed: 'Done', not_completed: 'Not completed', cancelled: 'Class cancelled', pending: 'Pending' };
const isDateKey = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

const badRequest = message => Object.assign(new Error(message), { status: 400 });

// Managers only see their own schools' activities; admins see everything or one manager.
const parseFilters = async req => {
  const { fromDate, toDate } = req.query;
  if (!isDateKey(fromDate) || !isDateKey(toDate)) throw badRequest('Choose a valid from and to date.');
  if (fromDate > toDate) throw badRequest('The from date must be on or before the to date.');
  if ((new Date(`${toDate}T00:00:00Z`) - new Date(`${fromDate}T00:00:00Z`)) / 86400000 + 1 > MAX_RANGE_DAYS) {
    throw badRequest(`Choose a range of ${MAX_RANGE_DAYS} days or less.`);
  }
  const schoolId = req.query.schoolId ? Number(req.query.schoolId) : null;
  if (req.query.schoolId && !Number.isInteger(schoolId)) throw badRequest('Choose a valid school.');
  const status = STATUS_FILTERS[req.query.status] ? req.query.status : 'completed';
  let managerId = null;
  if (req.user.role !== 'admin') managerId = req.user.employeeCode;
  else if (req.query.managerId) managerId = String(req.query.managerId);
  return { fromDate, toDate, schoolId, status, managerId };
};

const loadReportRows = async ({ fromDate, toDate, schoolId, status, managerId }) => {
  const assignments = await TrainerSchoolAssignment.findAll({
    where: {
      status: 'published',
      completionStatus: { [Op.in]: STATUS_FILTERS[status] },
      date: { [Op.between]: [fromDate, toDate] },
      ...(schoolId ? { schoolId } : {}),
      ...(managerId ? { managerId } : {}),
    },
    order: [['date', 'ASC'], ['schoolId', 'ASC'], ['className', 'ASC'], ['startTime', 'ASC']],
  });
  const sessionIds = [...new Set(assignments.map(row => Number(row.curriculumSessionId)).filter(Boolean))];
  const sessions = sessionIds.length ? await SchoolCurriculumSession.findAll({ where: { id: { [Op.in]: sessionIds } } }) : [];
  const courseIds = [...new Set(sessions.map(session => session.courseId))];
  const [courses, schools, users] = await Promise.all([
    courseIds.length ? SchoolCurriculumCourse.findAll({ where: { id: { [Op.in]: courseIds } }, attributes: ['id', 'courseName'] }) : [],
    SchoolCatalog.findAll({ where: { id: { [Op.in]: [...new Set(assignments.map(row => row.schoolId))] } }, attributes: ['id', 'name'] }),
    User.findAll({ where: { employeeCode: { [Op.in]: [...new Set(assignments.map(row => row.trainerId))] } }, attributes: ['employeeCode', 'name'] }),
  ]);
  const sessionById = new Map(sessions.map(session => [Number(session.id), session]));
  const courseById = new Map(courses.map(course => [course.id, course.courseName]));
  const schoolById = new Map(schools.map(school => [Number(school.id), school.name]));
  const trainerName = new Map(users.map(user => [user.employeeCode, user.name]));

  return assignments.map(row => {
    const session = sessionById.get(Number(row.curriculumSessionId));
    return {
      id: row.id,
      date: row.date,
      schoolName: schoolById.get(Number(row.schoolId)) || 'School',
      grade: row.className,
      presentStudents: row.studentCount ?? null,
      trainerName: trainerName.get(row.trainerId) || row.trainerId,
      course: session ? courseById.get(session.courseId) || '' : '',
      activityName: session?.title || row.activityTitle,
      learningOutcome: session?.learningOutcome || '',
      photosLink: row.photosLink || '',
      status: STATUS_LABELS[row.completionStatus] || row.completionStatus,
      remark: row.trainerNote || '',
    };
  });
};

const handle = fn => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('School report error:', error);
    return res.status(500).json({ error: 'Failed to build the school report.' });
  }
};

router.get('/', handle(async (req, res) => {
  const filters = await parseFilters(req);
  const rows = await loadReportRows(filters);
  return res.json({ filters, total: rows.length, rows });
}));

const formatExcelDate = dateKey => {
  const [year, month, day] = dateKey.split('-');
  return `${day}-${month}-${year}`;
};
const safeFilePart = value => String(value || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'all-schools';

router.get('/excel', handle(async (req, res) => {
  const filters = await parseFilters(req);
  const rows = await loadReportRows(filters);
  const school = filters.schoolId ? await SchoolCatalog.findByPk(filters.schoolId, { attributes: ['name'] }) : null;
  const allSchools = !filters.schoolId;
  const showStatus = filters.status !== 'completed';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OMOTEC MIS';
  const sheet = workbook.addWorksheet('School Report');
  const columns = [
    { header: 'DATE', key: 'date', width: 13 },
    allSchools && { header: 'SCHOOL', key: 'schoolName', width: 28 },
    { header: 'GRADE', key: 'grade', width: 14 },
    { header: 'PRESENT STUDENT', key: 'presentStudents', width: 17 },
    { header: 'TRAINER NAME', key: 'trainerName', width: 22 },
    { header: 'COURSE', key: 'course', width: 30 },
    { header: 'ACTIVITY NAME', key: 'activityName', width: 34 },
    { header: 'LEARNING OUTCOME', key: 'learningOutcome', width: 48 },
    { header: 'PICTURE/VIDEO DRIVE LINK', key: 'photosLink', width: 42 },
    showStatus && { header: 'STATUS', key: 'status', width: 15 },
    showStatus && { header: 'REMARK', key: 'remark', width: 32 },
  ].filter(Boolean);

  // Title rows, then the table header on row 4.
  sheet.mergeCells(1, 1, 1, columns.length);
  sheet.getCell(1, 1).value = `School Report – ${school?.name || 'All schools'}`;
  sheet.getCell(1, 1).font = { bold: true, size: 14 };
  sheet.mergeCells(2, 1, 2, columns.length);
  sheet.getCell(2, 1).value = `${formatExcelDate(filters.fromDate)} to ${formatExcelDate(filters.toDate)} · ${rows.length} ${rows.length === 1 ? 'activity' : 'activities'}`;
  sheet.getCell(2, 1).font = { color: { argb: 'FF667085' } };

  sheet.columns = columns.map(({ key, width }) => ({ key, width }));
  const headerRow = sheet.getRow(4);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070F0' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 22;

  rows.forEach(row => {
    const added = sheet.addRow({ ...row, date: formatExcelDate(row.date), presentStudents: row.presentStudents ?? '' });
    added.alignment = { vertical: 'top', wrapText: true };
    if (row.photosLink) {
      const cell = added.getCell('photosLink');
      cell.value = { text: row.photosLink, hyperlink: row.photosLink };
      cell.font = { color: { argb: 'FF0070F0' }, underline: true };
    }
    added.getCell('presentStudents').alignment = { vertical: 'top', horizontal: 'center' };
  });
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  const filename = `school-report_${safeFilePart(school?.name)}_${filters.fromDate}_to_${filters.toDate}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  return res.end();
}));

module.exports = router;
