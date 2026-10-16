const { Op } = require('sequelize');
const {
  SchoolCurriculumSession,
  TrainerSchoolTimetableTemplate,
  TrainerSchoolAssignment,
} = require('../models');

const weekDates = (weekStart) => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
});

const istToday = () => {
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
};

// Creates this week's published school activities from a trainer's recurring
// timetable, advancing each class to its next curriculum activity. Safe to call
// repeatedly: existing rows are kept and duplicates are ignored.
const materializeTrainerWeek = async (trainerId, today = istToday()) => {
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const currentWeekStart = monday.toISOString().slice(0, 10);
  const datesThisWeek = weekDates(currentWeekStart);
  const templates = await TrainerSchoolTimetableTemplate.findAll({
    where: { trainerId, startWeek: { [Op.lte]: currentWeekStart } },
  });
  const classCourseKeys = [...new Map(templates.map(template => {
    const key = `${template.schoolId}|${template.className}|${template.courseId}`;
    return [key, { schoolId: template.schoolId, className: template.className, courseId: template.courseId }];
  })).values()];
  const relatedTemplates = classCourseKeys.length ? await TrainerSchoolTimetableTemplate.findAll({ where: { [Op.or]: classCourseKeys } }) : [];
  const relatedTemplateIds = relatedTemplates.map(template => template.id);
  const relatedGroupByTemplate = new Map(relatedTemplates.map(template => [Number(template.id), `${template.schoolId}|${template.className}|${template.courseId}`]));
  const [existingThisWeek, priorCompletedAssignments] = await Promise.all([
    TrainerSchoolAssignment.findAll({ where: { trainerId, weekStart: currentWeekStart } }),
    relatedTemplateIds.length ? TrainerSchoolAssignment.findAll({
      where: { timetableTemplateId: { [Op.in]: relatedTemplateIds }, status: 'published', weekStart: { [Op.lt]: currentWeekStart }, completionStatus: 'completed' },
      attributes: ['timetableTemplateId', 'curriculumSessionId'],
    }) : [],
  ]);
  const existingTemplateIds = new Set(existingThisWeek.map((assignment) => Number(assignment.timetableTemplateId)).filter(Boolean));
  const completedSessionsByGroup = new Map();
  for (const assignment of priorCompletedAssignments) {
    const group = relatedGroupByTemplate.get(Number(assignment.timetableTemplateId));
    const sessionIds = completedSessionsByGroup.get(group) || new Set();
    if (assignment.curriculumSessionId) sessionIds.add(Number(assignment.curriculumSessionId));
    completedSessionsByGroup.set(group, sessionIds);
  }
  const generated = [];
  for (const template of templates) {
    if (existingTemplateIds.has(Number(template.id))) continue;
    const scheduledDate = datesThisWeek.find((day) => new Date(`${day}T00:00:00Z`).getUTCDay() === Number(template.dayOfWeek));
    if (!scheduledDate) continue;
    const sessions = await SchoolCurriculumSession.findAll({ where: { courseId: template.courseId }, order: [['position', 'ASC']] });
    const initialIndex = Math.max(0, sessions.findIndex(session => Number(session.position) === Number(template.startActivityPosition || 1)));
    const groupKey = relatedGroupByTemplate.get(Number(template.id));
    const session = sessions[initialIndex + (completedSessionsByGroup.get(groupKey)?.size || 0)];
    if (!session) continue;
    generated.push({
      managerId: template.managerId,
      trainerId: template.trainerId,
      schoolId: template.schoolId,
      className: template.className,
      activityTitle: session.title,
      curriculumSessionId: session.id,
      timetableTemplateId: template.id,
      weekStart: currentWeekStart,
      date: scheduledDate,
      startTime: template.startTime,
      endTime: template.endTime,
      comment: template.comment,
      status: 'published',
    });
  }
  if (generated.length) await TrainerSchoolAssignment.bulkCreate(generated, { ignoreDuplicates: true });
  return { today, currentWeekStart };
};

module.exports = { istToday, materializeTrainerWeek };
