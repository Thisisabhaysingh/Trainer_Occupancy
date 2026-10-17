const path = require('path');
const xlsx = require('xlsx');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const {
  sequelize,
  SchoolCatalog,
  SchoolCurriculumCourse,
  SchoolCurriculumSession,
} = require('../models');

const schoolName = 'Apeejay Gr. Noida';
const academicYear = '2026-27';

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeGrade = (value) => String(value || '').replace(/^grade\s*/i, '').replace(/\s/g, '').replace(/–/g, '-').trim();
const normalizeCourse = (value) => normalize(value).replace(/^school[_\s]*/, '').replace(/[^a-z0-9]/g, '');
const cellText = (value) => String(value ?? '').replace(/\r/g, '').trim();

function getTerm(value) {
  const match = String(value || '').match(/(?:semester|term)\s*[-:]?\s*(i{1,3}|iv|v|1|2|3|4)/i);
  if (!match) return '';
  const roman = match[1].toUpperCase();
  const term = ({ I: 1, II: 2, III: 3, IV: 4, V: 5 })[roman] || Number(roman);
  return term ? `Term ${term}` : '';
}

function parseOverview(rows) {
  const metadata = new Map();
  let term = '';
  for (const row of rows) {
    const values = row.map(cellText);
    const termCell = values.find((value) => /^Term\s+\d+/i.test(value));
    if (termCell) term = termCell.match(/^Term\s+(\d+)/i)?.[1] ? `Term ${termCell.match(/^Term\s+(\d+)/i)[1]}` : '';
    if (!/^\d+$/.test(values[0] || '') || !values[1] || !values[2]) continue;
    metadata.set(`${normalizeGrade(values[1])}|${term}|${normalizeCourse(values[2])}`, {
      computerLab: /^yes$/i.test(values[3] || ''),
    });
  }
  return metadata;
}

function parseCurriculum(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const overview = workbook.Sheets.Overview;
  if (!overview) throw new Error('Workbook is missing the Overview sheet.');
  const overviewRows = xlsx.utils.sheet_to_json(overview, { header: 1, defval: '' });
  const overviewMetadata = parseOverview(overviewRows);
  const courses = [];

  for (const sheetName of workbook.SheetNames.filter((name) => name !== 'Overview')) {
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    let pendingDeclaredSessions = 0;
    let gradeBand = normalizeGrade(sheetName);
    let current = null;
    const finishCourse = () => {
      if (!current) return;
      if (!current.courseName || !current.sessions.length) throw new Error(`Could not parse curriculum course in ${sheetName}.`);
      const lab = overviewMetadata.get(`${normalizeGrade(current.gradeBand)}|${current.term}|${normalizeCourse(current.courseName)}`);
      courses.push({ ...current, computerLab: Boolean(lab?.computerLab), sourceSheet: sheetName });
      current = null;
    };

    for (const row of rows) {
      const values = row.map(cellText);
      const first = values[0] || '';
      const sectionTotal = first.match(/^TOTAL\s+(\d+)\s+SESSIONS/i);
      if (sectionTotal) {
        finishCourse();
        pendingDeclaredSessions = Number(sectionTotal[1]);
        continue;
      }
      if (/^GRADE\s+/i.test(first)) {
        gradeBand = normalizeGrade(first);
        if (current) current.gradeBand = gradeBand;
        continue;
      }

      const courseHeader = first.match(/^COURSE\s*-\s*([\s\S]+)$/i);
      const semesterCourseHeader = first.match(/^SEMESTER\s+(I{1,3}|IV|V|\d+)\s+COURSE\s*:\s*(.+)$/i);
      if (courseHeader || semesterCourseHeader) {
        finishCourse();
        const headerText = first;
        const parsedTerm = getTerm(headerText);
        const term = parsedTerm || (pendingDeclaredSessions ? `Term ${pendingDeclaredSessions === 8 ? 1 : 2}` : '');
        const courseName = (courseHeader ? courseHeader[1] : semesterCourseHeader[2]).split('\n')[0].trim();
        current = { courseName, term, gradeBand, declaredSessions: pendingDeclaredSessions, sessions: [], sourceSheet: sheetName };
        pendingDeclaredSessions = 0;
        continue;
      }

      if (!current) continue;
      const headerCells = values.map(normalize);
      if (headerCells.some((value) => value === 'sr no' || value === 'sr no.')) {
        current.headers = headerCells;
        current.lastTopic = '';
        continue;
      }
      if (!/^\d+$/.test(first) || !values.slice(1).some(Boolean) || !current.headers) continue;

      const valueFor = (...names) => {
        const index = current.headers.findIndex((header) => names.includes(header));
        return index >= 0 ? values[index] || '' : '';
      };
      const sourceTopic = valueFor('topics', 'topic');
      if (sourceTopic) current.lastTopic = sourceTopic;
      const activityName = valueFor('activity name', 'activity');
      const title = activityName || sourceTopic;
      if (!title) continue;
      const hasSeparateActivity = current.headers.some((header) => header === 'activity name' || header === 'activity');
      current.sessions.push({
        position: current.sessions.length + 1,
        sourceSessionNumber: first,
        topic: hasSeparateActivity && activityName ? (current.lastTopic || null) : null,
        title,
        learningOutcome: valueFor('learning outcome', 'learning outcomes', 'concept') || null,
        academicConcept: valueFor('academic concept') || null,
      });
    }
    finishCourse();
  }
  if (courses.length !== 4) throw new Error(`Expected 4 grade/term courses but found ${courses.length}.`);
  return courses;
}

async function main() {
  const workbookPath = process.argv[2];
  if (!workbookPath) throw new Error('Usage: node scripts/importSchoolCurriculum.js <path-to-xlsx>');
  const courses = parseCurriculum(workbookPath);
  await sequelize.authenticate();
  const transaction = await sequelize.transaction();
  try {
    let school = await SchoolCatalog.findOne({ where: { name: schoolName }, transaction });
    if (!school) school = await SchoolCatalog.create({ name: schoolName }, { transaction });

    let topicCount = 0;
    for (const courseData of courses) {
      const { sessions, ...courseAttributes } = courseData;
      // Courses are shared across schools: reuse an existing course with the same name/term/grades.
      let course = await SchoolCurriculumCourse.findOne({
        where: { academicYear, term: courseData.term, gradeBand: courseData.gradeBand, courseName: courseData.courseName },
        transaction,
      });
      const payload = { ...courseAttributes, schoolId: course ? course.schoolId : school.id, academicYear };
      if (course) await course.update(payload, { transaction });
      else course = await SchoolCurriculumCourse.create(payload, { transaction });

      for (const sessionData of sessions) {
        let session = await SchoolCurriculumSession.findOne({ where: { courseId: course.id, position: sessionData.position }, transaction });
        if (session) await session.update(sessionData, { transaction });
        else await SchoolCurriculumSession.create({ ...sessionData, courseId: course.id }, { transaction });
        topicCount += 1;
      }
    }
    await transaction.commit();
    const declared = courses.reduce((sum, course) => sum + course.declaredSessions, 0);
    process.stdout.write(`Imported ${courses.length} courses and ${topicCount} curriculum activities for ${schoolName} (${academicYear}). Declared sessions: ${declared}.\n`);
    for (const course of courses) {
      process.stdout.write(`${course.gradeBand} · ${course.term} · ${course.courseName}: ${course.sessions.length} activities (workbook declares ${course.declaredSessions})${course.computerLab ? ' · computer lab required' : ''}\n`);
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Curriculum import failed: ${error.message}\n`);
  process.exit(1);
});
