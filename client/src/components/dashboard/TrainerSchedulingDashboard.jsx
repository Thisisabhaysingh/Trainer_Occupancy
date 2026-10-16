import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormHelperText, IconButton, InputAdornment, InputLabel, ListItemText, MenuItem, Paper, Select, Snackbar, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { AccessTime, Add as AddIcon, ChevronLeft, ChevronRight, DeleteOutline, EditOutlined, Event, Groups, School as SchoolIcon, Send, Search as SearchIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../../modules/dashboards/pages/CalendarCustom.css';
import { ManagerSectionIntro } from './DashboardSectionIntro';
import { managerSectionPanelSx } from './dashboardSectionStyles';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const curriculumGrades = (gradeBand) => {
  const grades = { III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
  const [start, end] = String(gradeBand || '').split('-').map(part => part.trim().toUpperCase());
  if (!grades[start] || !grades[end]) return [];
  return Object.entries(grades).filter(([, number]) => number >= grades[start] && number <= grades[end]).map(([roman]) => roman);
};
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const plannerHours = [9, 10, 11, 12, 13, 14, 15];
const plannerColors = [
  { border: '#7950F2', background: '#F1ECFF' },
  { border: '#2F80ED', background: '#EAF3FF' },
  { border: '#27AE60', background: '#EAF8EF' },
  { border: '#E84393', background: '#FCEAF3' },
  { border: '#F2994A', background: '#FFF2E5' },
];
const activityOptionId = activity => String(activity?.id ?? activity?._id ?? activity?.title ?? '');
const normalizeWeekStart = value => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateKey(date);
};
export default function TrainerSchedulingDashboard({ mode, employeeOptions = [], activityOptions = [] }) {
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [schoolCatalog, setSchoolCatalog] = useState([]);
  const [schoolCatalogLoading, setSchoolCatalogLoading] = useState(false);
  const [calendarEmployee, setCalendarEmployee] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [employeeCalendarData, setEmployeeCalendarData] = useState({});
  const [selectedTrainerForOccupancy, setSelectedTrainerForOccupancy] = useState('');
  const [selectedOccupancyWeekStart, setSelectedOccupancyWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return dateKey(monday);
  });
  const [setupWeekStart, setSetupWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return dateKey(monday);
  });
  const [occupancyWeeks, setOccupancyWeeks] = useState([]);
  const [trainerOccupancy, setTrainerOccupancy] = useState({});
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [occupancySaving, setOccupancySaving] = useState(false);
  const [occupancyError, setOccupancyError] = useState('');
  const [occupancyEmployeeSearch, setOccupancyEmployeeSearch] = useState('');
  const [occupancyDepartmentFilter, setOccupancyDepartmentFilter] = useState('all');
  const [occupancyBranchFilter, setOccupancyBranchFilter] = useState('all');
  const [occupancyTab, setOccupancyTab] = useState('school');
  const [plannerTrainerFilter, setPlannerTrainerFilter] = useState('all');
  const [plannerActivityFilter, setPlannerActivityFilter] = useState('all');
  const [activitySchedule, setActivitySchedule] = useState([]);
  const [activityScheduleStatus, setActivityScheduleStatus] = useState('draft');
  const [activityScheduleLoading, setActivityScheduleLoading] = useState(false);
  const [activityScheduleSaving, setActivityScheduleSaving] = useState(false);
  const [activityScheduleSavingStatus, setActivityScheduleSavingStatus] = useState('');
  const [loadedActivityOptions, setLoadedActivityOptions] = useState([]);
  const [activityAssignmentError, setActivityAssignmentError] = useState('');
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState('');
  const [activityForm, setActivityForm] = useState({ trainerId: '', activityTemplateId: '', date: '', startTime: '09:00', endTime: '10:00', comment: '' });
  const [schoolSchedule, setSchoolSchedule] = useState([]);
  const [schoolScheduleStatus, setSchoolScheduleStatus] = useState('draft');
  const [schoolScheduleLoading, setSchoolScheduleLoading] = useState(false);
  const [schoolScheduleSaving, setSchoolScheduleSaving] = useState(false);
  const [schoolScheduleSavingStatus, setSchoolScheduleSavingStatus] = useState('');
  const [schoolScheduleError, setSchoolScheduleError] = useState('');
  const [schoolTimetableTemplates, setSchoolTimetableTemplates] = useState([]);
  const [schoolTimetableLoading, setSchoolTimetableLoading] = useState(false);
  const [setupSchoolFilterId, setSetupSchoolFilterId] = useState('');
  const [schoolTrainerIds, setSchoolTrainerIds] = useState([]);
  const [schoolTrainerRosterLoading, setSchoolTrainerRosterLoading] = useState(false);
  const [schoolTrainerRosterSaving, setSchoolTrainerRosterSaving] = useState(false);
  const [setupRowDrafts, setSetupRowDrafts] = useState({});
  const [setupSavingKey, setSetupSavingKey] = useState('');
  const [schoolTemplateDialogOpen, setSchoolTemplateDialogOpen] = useState(false);
  const [editingSchoolTemplateId, setEditingSchoolTemplateId] = useState('');
  const [schoolTemplateForm, setSchoolTemplateForm] = useState({ trainerId: '', schoolId: '', className: '', term: '', courseId: '', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', startWeek: '', comment: '' });
  const [schoolCurriculum, setSchoolCurriculum] = useState([]);
  const [curriculumProgress, setCurriculumProgress] = useState([]);
  const [curriculumProgressLoading, setCurriculumProgressLoading] = useState(false);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [editingSchoolScheduleId, setEditingSchoolScheduleId] = useState('');
  const [schoolForm, setSchoolForm] = useState({ trainerId: '', schoolId: '', className: '', activityTemplateId: '', curriculumCourseId: '', curriculumSessionId: '', date: '', startTime: '09:00', endTime: '10:00', comment: '' });
  const [schoolFormTerm, setSchoolFormTerm] = useState('');
  const [curriculumBrowseSchoolId, setCurriculumBrowseSchoolId] = useState('');
  const [curriculumBrowseClass, setCurriculumBrowseClass] = useState('');
  const [curriculumBrowseTerm, setCurriculumBrowseTerm] = useState('Term 1');
  const [curriculumBrowseCourseId, setCurriculumBrowseCourseId] = useState('');
  const [curriculumDetailOpen, setCurriculumDetailOpen] = useState(false);

  const fetchSchoolCatalog = useCallback(async () => {
    setSchoolCatalogLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/api/catalog/schools`, { withCredentials: true });
      setSchoolCatalog(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching school catalog:', err);
      setSchoolCatalog([]);
    } finally {
      setSchoolCatalogLoading(false);
    }
  }, []);

  const fetchSchoolCurriculum = useCallback(async () => {
    setCurriculumProgressLoading(true);
    try {
      const [coursesResponse, progressResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/school-curriculum`, { params: { academicYear: '2026-27' }, withCredentials: true }),
        axios.get(`${apiBaseUrl}/api/school-curriculum/progress`, { params: { academicYear: '2026-27' }, withCredentials: true }),
      ]);
      setSchoolCurriculum(Array.isArray(coursesResponse.data) ? coursesResponse.data : []);
      setCurriculumProgress(Array.isArray(progressResponse.data) ? progressResponse.data : []);
    } catch (err) {
      console.error('Error loading school curriculum:', err);
      setSchoolCurriculum([]);
      setCurriculumProgress([]);
    } finally {
      setCurriculumProgressLoading(false);
    }
  }, []);

  const fetchSchoolTimetableTemplates = useCallback(async () => {
    setSchoolTimetableLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/api/trainer-occupancy/school-timetable-templates`, { params: { weekStart: setupWeekStart }, withCredentials: true });
      setSchoolTimetableTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading recurring school timetable:', err);
      setSchoolTimetableTemplates([]);
      setSchoolScheduleError(err.response?.data?.error || 'Failed to load school timetable setup.');
    } finally {
      setSchoolTimetableLoading(false);
    }
  }, [setupWeekStart]);

  const fetchSchoolTrainerRoster = useCallback(async schoolId => {
    if (!schoolId) { setSchoolTrainerIds([]); return; }
    setSchoolTrainerRosterLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/trainer-occupancy/school-trainers`, { params: { schoolId }, withCredentials: true });
      setSchoolTrainerIds(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setSchoolTrainerIds([]);
      setSchoolScheduleError(err.response?.data?.error || 'Failed to load trainers assigned to this school.');
    } finally {
      setSchoolTrainerRosterLoading(false);
    }
  }, []);

  const saveSchoolTrainerRoster = async () => {
    if (!setupSchoolFilterId) return;
    setSchoolTrainerRosterSaving(true);
    try {
      const response = await axios.put(`${apiBaseUrl}/api/trainer-occupancy/school-trainers`, { schoolId: setupSchoolFilterId, trainerIds: schoolTrainerIds }, { withCredentials: true });
      const savedIds = Array.isArray(response.data?.trainerIds) ? response.data.trainerIds : schoolTrainerIds;
      setSchoolTrainerIds(savedIds);
      setSetupRowDrafts({});
      setSnackbar({ open: true, message: 'School trainer assignments saved. Save each class row to apply the trainer to its timetable.', severity: 'success' });
    } catch (err) {
      setSchoolScheduleError(err.response?.data?.error || 'Failed to save trainers assigned to this school.');
    } finally {
      setSchoolTrainerRosterSaving(false);
    }
  };

  const fetchTrainerOccupancy = useCallback(async (signal) => {
    if (!selectedTrainerForOccupancy || !selectedOccupancyWeekStart) return;
    setOccupancyLoading(true);
    setOccupancyError('');
    setTrainerOccupancy({});
    try {
      const res = await axios.get(`${apiBaseUrl}/api/trainer-occupancy`, { params: { employeeId: selectedTrainerForOccupancy, weekStart: selectedOccupancyWeekStart }, withCredentials: true, signal });
      const occupancy = {};
      Object.entries(res.data || {}).forEach(([date, data]) => {
        if (data?.schoolId) occupancy[date] = data.schoolId;
      });
      setTrainerOccupancy(occupancy);
    } catch (err) {
      if (signal?.aborted) return;
      setOccupancyError(err.response?.data?.error || 'Failed to load occupancy data');
      console.error('Error fetching trainer occupancy:', err);
      setSnackbar({ open: true, message: 'Failed to load occupancy data', severity: 'error' });
    } finally {
      if (!signal?.aborted) setOccupancyLoading(false);
    }
  }, [selectedTrainerForOccupancy, selectedOccupancyWeekStart]);

  const saveTrainerOccupancy = async () => {
    if (!selectedTrainerForOccupancy || !selectedOccupancyWeekStart) return;
    setOccupancySaving(true);
    try {
      const assignments = {};
      const start = new Date(selectedOccupancyWeekStart);
      for (let i = 0; i < 7; i += 1) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = dateKey(date);
        assignments[dateStr] = trainerOccupancy[dateStr] || null;
      }
      const res = await axios.post(`${apiBaseUrl}/api/trainer-occupancy`, {
        employeeId: selectedTrainerForOccupancy,
        weekStart: selectedOccupancyWeekStart,
        assignments
      }, { withCredentials: true });
      if (res.data.success) {
        setSnackbar({ open: true, message: 'Occupancy saved successfully!', severity: 'success' });
        await fetchTrainerOccupancy();
      }
    } catch (err) {
      console.error('Error saving trainer occupancy:', err);
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to save occupancy', severity: 'error' });
    } finally {
      setOccupancySaving(false);
    }
  };

  const fetchActivitySchedule = useCallback(async (signal) => {
    if (!selectedOccupancyWeekStart) return;
    setActivityScheduleLoading(true);
    setActivityAssignmentError('');
    try {
      const res = await axios.get(`${apiBaseUrl}/api/trainer-occupancy/activities`, {
        params: { weekStart: selectedOccupancyWeekStart },
        withCredentials: true,
        signal,
      });
      setActivitySchedule((res.data || []).map(assignment => ({ ...assignment, localId: String(assignment.id) })));
      setActivityScheduleStatus(res.data?.[0]?.status || 'draft');
    } catch (err) {
      if (signal?.aborted) return;
      setActivitySchedule([]);
      setActivityAssignmentError(err.response?.data?.error || 'Failed to load the weekly activity schedule.');
    } finally {
      if (!signal?.aborted) setActivityScheduleLoading(false);
    }
  }, [selectedOccupancyWeekStart]);

  const fetchActivityOptions = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/activities/templates`, { withCredentials: true });
      setLoadedActivityOptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching planner activity templates:', err);
      setLoadedActivityOptions([]);
    }
  }, []);

  const fetchSchoolSchedule = useCallback(async (signal) => {
    if (!selectedOccupancyWeekStart) return;
    setSchoolScheduleLoading(true);
    setSchoolScheduleError('');
    try {
      const res = await axios.get(`${apiBaseUrl}/api/trainer-occupancy/schools`, {
        params: { weekStart: selectedOccupancyWeekStart },
        withCredentials: true,
        signal,
      });
      setSchoolSchedule((res.data || []).map(assignment => ({
        ...assignment,
        localId: String(assignment.localId || assignment.id),
        schoolId: String(assignment.schoolId || ''),
        activityTemplateId: String(assignment.activityTemplateId || ''),
      })));
      setSchoolScheduleStatus(res.data?.length && res.data.every(assignment => assignment.status === 'published') ? 'published' : 'draft');
    } catch (err) {
      if (signal?.aborted) return;
      setSchoolSchedule([]);
      setSchoolScheduleError(err.response?.data?.error || 'Failed to load the weekly school schedule.');
    } finally {
      if (!signal?.aborted) setSchoolScheduleLoading(false);
    }
  }, [selectedOccupancyWeekStart]);

  const persistSchoolSchedule = async (status, assignmentsToSave = schoolSchedule, notify = true) => {
    setSchoolScheduleSaving(true);
    setSchoolScheduleSavingStatus(status);
    setSchoolScheduleError('');
    try {
      const res = await axios.put(`${apiBaseUrl}/api/trainer-occupancy/schools`, {
        weekStart: selectedOccupancyWeekStart,
        status,
        assignments: assignmentsToSave.map(({ trainerId, schoolId, className, activityTitle, curriculumSessionId, timetableTemplateId, date, startTime, endTime, comment, localId }) => ({
          trainerId,
          schoolId,
          className,
          activityTitle,
          curriculumSessionId: curriculumSessionId || null,
          timetableTemplateId: timetableTemplateId || null,
          legacyLocalId: String(localId || '').startsWith('legacy-') ? localId : null,
          date,
          startTime,
          endTime,
          comment,
        })),
      }, { withCredentials: true });
      setSchoolSchedule((res.data.assignments || []).map(assignment => ({ ...assignment, localId: String(assignment.id), schoolId: String(assignment.schoolId), activityTemplateId: String(assignment.activityTemplateId || '') })));
      setSchoolScheduleStatus(status);
      await fetchSchoolCurriculum();
      if (notify) setSnackbar({ open: true, message: status === 'published' ? 'School schedule published.' : 'School schedule draft saved.', severity: 'success' });
      return true;
    } catch (err) {
      setSchoolScheduleError(err.response?.data?.error || 'Failed to save the weekly school schedule.');
      return false;
    } finally {
      setSchoolScheduleSaving(false);
      setSchoolScheduleSavingStatus('');
    }
  };

  const saveSchoolSchedule = (status) => persistSchoolSchedule(status);

  const openSchoolDialog = (date, startTime = '09:00', assignment = null) => {
    setEditingSchoolScheduleId(assignment?.localId || '');
    const existingCurriculum = assignment?.curriculumSessionId
      ? schoolCurriculum.find(course => course.sessions?.some(session => String(session.id) === String(assignment.curriculumSessionId)))
      : null;
    const defaultCurriculum = !assignment?.curriculumSessionId && assignment?.schoolId
      ? schoolCurriculum.find(course => String(course.schoolId) === String(assignment.schoolId))
      : null;
    const chosenCurriculum = existingCurriculum || defaultCurriculum;
    const firstSession = chosenCurriculum?.sessions?.[0];
    setSchoolForm(assignment ? {
      trainerId: assignment.trainerId,
      schoolId: String(assignment.schoolId || ''),
      className: assignment.className || '',
      activityTemplateId: String(assignment.activityTemplateId || ''),
      curriculumCourseId: chosenCurriculum ? String(chosenCurriculum.id) : '',
      curriculumSessionId: assignment.curriculumSessionId ? String(assignment.curriculumSessionId) : (firstSession ? String(firstSession.id) : ''),
      date: assignment.date,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      comment: assignment.comment || '',
    } : {
      trainerId: plannerTrainerFilter === 'all' ? (trainerOptions[0]?.employeeCode || trainerOptions[0]?._id || '') : plannerTrainerFilter,
      schoolId: '',
      className: '',
      activityTemplateId: plannerActivityFilter === 'all' ? activityOptionId(plannerActivityOptions[0]) : plannerActivityFilter,
      curriculumCourseId: '',
      curriculumSessionId: '',
      date: date || plannerDays[0]?.date || selectedOccupancyWeekStart,
      startTime,
      endTime: `${String((Number(startTime.slice(0, 2)) + 1) % 24).padStart(2, '0')}:${startTime.slice(3, 5)}`,
      comment: '',
    });
    setSchoolScheduleError('');
    setSchoolDialogOpen(true);
  };

  const saveSchoolForm = async (event) => {
    event.preventDefault();
    const selectedCurriculumCourse = schoolCurriculum.find(course => String(course.id) === String(schoolForm.curriculumCourseId));
    const selectedCurriculumSession = selectedCurriculumCourse?.sessions?.find(session => String(session.id) === String(schoolForm.curriculumSessionId));
    if (!schoolForm.trainerId || !schoolForm.schoolId || !schoolForm.className.trim() || !schoolForm.date || !schoolForm.startTime || !schoolForm.endTime) {
      setSchoolScheduleError('Choose a trainer, school, class, date, and time.');
      return;
    }
    if (schoolForm.startTime >= schoolForm.endTime) {
      setSchoolScheduleError('End time must be after start time.');
      return;
    }
    const hasOverlap = schoolSchedule.some(assignment => assignment.localId !== editingSchoolScheduleId &&
      assignment.trainerId === schoolForm.trainerId && assignment.date === schoolForm.date &&
      schoolForm.startTime < assignment.endTime && schoolForm.endTime > assignment.startTime);
    if (hasOverlap) {
      setSchoolScheduleError('This trainer already has a class during that time.');
      return;
    }

    const assignment = {
      ...(schoolSchedule.find(item => item.localId === editingSchoolScheduleId) || {}),
      localId: editingSchoolScheduleId || `new-${Date.now()}`,
      trainerId: schoolForm.trainerId,
      schoolId: schoolForm.schoolId,
      className: schoolForm.className.trim(),
      activityTemplateId: null,
      activityTitle: selectedCurriculumSession?.title || 'School Session',
      curriculumCourseId: selectedCurriculumCourse ? String(selectedCurriculumCourse.id) : '',
      curriculumSessionId: selectedCurriculumSession ? String(selectedCurriculumSession.id) : '',
      curriculumSession: selectedCurriculumSession ? { ...selectedCurriculumSession, course: selectedCurriculumCourse } : null,
      date: schoolForm.date,
      startTime: schoolForm.startTime,
      endTime: schoolForm.endTime,
      comment: schoolForm.comment.trim(),
      status: 'draft',
    };
    const nextSchedule = editingSchoolScheduleId
      ? schoolSchedule.map(item => item.localId === editingSchoolScheduleId ? assignment : item)
      : [...schoolSchedule, assignment];
    const saved = await persistSchoolSchedule('draft', nextSchedule, false);
    if (!saved) return;
    setSchoolDialogOpen(false);
    setSnackbar({ open: true, message: editingSchoolScheduleId ? 'Class updated and saved as a draft.' : 'Class added and saved as a draft.', severity: 'success' });
  };

  const deleteSchoolScheduleItem = async (localId) => {
    const assignment = schoolSchedule.find(item => item.localId === localId);
    if (!assignment) return;
    const isLegacy = String(localId).startsWith('legacy-');
    const wasSaved = Boolean(assignment.id || isLegacy);
    if (wasSaved) {
      try {
        const targetId = isLegacy ? encodeURIComponent(localId) : assignment.id;
        await axios.delete(`${apiBaseUrl}/api/trainer-occupancy/schools/${targetId}`, { withCredentials: true });
      } catch (err) {
        setSchoolScheduleError(err.response?.data?.error || 'Failed to delete the saved school schedule.');
        return;
      }
    }
    setSchoolSchedule(current => current.filter(item => item.localId !== localId));
    if (!wasSaved) setSchoolScheduleStatus('draft');
    else if (!isLegacy) await fetchSchoolCurriculum();
    setSnackbar({ open: true, message: wasSaved ? 'School schedule deleted.' : 'Class removed from the draft.', severity: 'success' });
  };

  const openSchoolTemplateDialog = (template = null) => {
    setEditingSchoolTemplateId(template ? String(template.id) : '');
    const course = template ? schoolCurriculum.find(item => String(item.id) === String(template.courseId)) : null;
    setSchoolTemplateForm(template ? {
      trainerId: template.trainerId, schoolId: String(template.schoolId), className: template.className,
      term: course?.term || '', courseId: String(template.courseId), dayOfWeek: Number(template.dayOfWeek),
      startTime: template.startTime, endTime: template.endTime, startWeek: template.startWeek, comment: template.comment || '',
    } : {
      trainerId: trainerOptions[0]?.employeeCode || trainerOptions[0]?._id || '', schoolId: '', className: '',
      term: '', courseId: '', dayOfWeek: 1, startTime: '09:00', endTime: '10:00',
      startWeek: setupWeekStart, comment: '',
    });
    setSchoolScheduleError('');
    setSchoolTemplateDialogOpen(true);
  };

  const saveSchoolTemplate = async event => {
    event.preventDefault();
    const method = editingSchoolTemplateId ? 'put' : 'post';
    const url = `${apiBaseUrl}/api/trainer-occupancy/school-timetable-templates${editingSchoolTemplateId ? `/${editingSchoolTemplateId}` : ''}`;
    try {
      await axios[method](url, {
        trainerId: schoolTemplateForm.trainerId, schoolId: schoolTemplateForm.schoolId,
        className: schoolTemplateForm.className, courseId: schoolTemplateForm.courseId,
        dayOfWeek: schoolTemplateForm.dayOfWeek, startTime: schoolTemplateForm.startTime,
        endTime: schoolTemplateForm.endTime, startWeek: schoolTemplateForm.startWeek,
        comment: schoolTemplateForm.comment,
      }, { withCredentials: true });
      setSchoolTemplateDialogOpen(false);
      await fetchSchoolTimetableTemplates();
      await fetchSchoolSchedule();
      setSnackbar({ open: true, message: editingSchoolTemplateId ? 'Repeating timetable updated.' : 'Repeating timetable saved.', severity: 'success' });
    } catch (err) {
      setSchoolScheduleError(err.response?.data?.error || 'Failed to save the repeating timetable.');
    }
  };

  const deleteSchoolTemplate = async template => {
    try {
      await axios.delete(`${apiBaseUrl}/api/trainer-occupancy/school-timetable-templates/${template.id}`, { withCredentials: true });
      await fetchSchoolTimetableTemplates();
      setSnackbar({ open: true, message: 'Repeating timetable removed.', severity: 'success' });
    } catch (err) {
      setSchoolScheduleError(err.response?.data?.error || 'Failed to remove repeating timetable.');
    }
  };

  const updateSetupDraft = (row, changes) => setSetupRowDrafts(current => ({
    ...current,
    [row.key]: { ...row.draft, ...changes },
  }));

  const saveSetupRow = async row => {
    const { draft, matches, className, key, selectedCourse } = row;
    if (!draft.trainerIds?.length || !selectedCourse || !draft.slots?.length || draft.slots.some(slot => !slot.activityPosition)) {
      setSchoolScheduleError('Choose at least one trainer, course, activity for each weekly session, and a weekly time.');
      return;
    }
    setSetupSavingKey(key);
    setSchoolScheduleError('');
    try {
      const retainedIds = new Set();
      for (const slot of draft.slots) {
        for (const trainerId of draft.trainerIds) {
          const templateId = slot.templateIds?.[String(trainerId)];
          const payload = {
            trainerId, schoolId: setupSchoolFilterId, className,
            courseId: selectedCourse.id, startActivityPosition: Number(slot.startActivityPosition || slot.activityPosition),
            dayOfWeek: Number(slot.dayOfWeek), startTime: slot.startTime, endTime: slot.endTime,
            startWeek: slot.startWeek || setupWeekStart,
          };
          if (templateId) {
            retainedIds.add(String(templateId));
            await axios.put(`${apiBaseUrl}/api/trainer-occupancy/school-timetable-templates/${templateId}`, payload, { withCredentials: true });
          } else {
            const response = await axios.post(`${apiBaseUrl}/api/trainer-occupancy/school-timetable-templates`, payload, { withCredentials: true });
            if (response.data?.id) retainedIds.add(String(response.data.id));
          }
        }
      }
      for (const match of matches) if (!retainedIds.has(String(match.id))) {
        await axios.delete(`${apiBaseUrl}/api/trainer-occupancy/school-timetable-templates/${match.id}`, { withCredentials: true });
      }
      await fetchSchoolTimetableTemplates();
      await fetchSchoolSchedule();
      setSetupRowDrafts(current => { const next = { ...current }; delete next[key]; return next; });
      setSnackbar({ open: true, message: 'Class timetable saved.', severity: 'success' });
    } catch (err) {
      setSchoolScheduleError(err.response?.data?.error || 'Failed to save this class timetable.');
    } finally {
      setSetupSavingKey('');
    }
  };

  const closeSchoolDialog = () => {
    setSchoolDialogOpen(false);
  };

  const saveActivitySchedule = async (status) => {
    setActivityScheduleSaving(true);
    setActivityScheduleSavingStatus(status);
    setActivityAssignmentError('');
    try {
      const res = await axios.put(`${apiBaseUrl}/api/trainer-occupancy/activities`, {
        weekStart: selectedOccupancyWeekStart,
        status,
        assignments: activitySchedule.map(({ trainerId, activityTemplateId, activityTitle, date, startTime, endTime, comment }) => ({
          trainerId,
          activityTemplateId,
          activityTitle,
          date,
          startTime,
          endTime,
          comment,
        })),
      }, { withCredentials: true });
      setActivitySchedule((res.data.assignments || []).map(assignment => ({ ...assignment, localId: String(assignment.id) })));
      setActivityScheduleStatus(status);
      setSnackbar({ open: true, message: status === 'published' ? 'Weekly activity schedule published.' : 'Draft saved.', severity: 'success' });
    } catch (err) {
      setActivityAssignmentError(err.response?.data?.error || 'Failed to save the weekly activity schedule.');
    } finally {
      setActivityScheduleSaving(false);
      setActivityScheduleSavingStatus('');
    }
  };

  const openActivityDialog = (date, startTime = '09:00', assignment = null) => {
    setEditingScheduleId(assignment?.localId || '');
    setActivityForm(assignment ? {
      trainerId: assignment.trainerId,
      activityTemplateId: assignment.activityTemplateId || '',
      date: assignment.date,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      comment: assignment.comment || '',
    } : {
      trainerId: plannerTrainerFilter === 'all' ? (trainerOptions[0]?.employeeCode || trainerOptions[0]?._id || '') : plannerTrainerFilter,
      activityTemplateId: plannerActivityFilter === 'all' ? activityOptionId(plannerActivityOptions[0]) : plannerActivityFilter,
      date: date || plannerDays[0]?.date || selectedOccupancyWeekStart,
      startTime,
      endTime: `${String((Number(startTime.slice(0, 2)) + 1) % 24).padStart(2, '0')}:${startTime.slice(3, 5)}`,
      comment: '',
    });
    setActivityAssignmentError('');
    setActivityDialogOpen(true);
  };

  const saveActivityForm = (event) => {
    event.preventDefault();
    const selectedActivity = plannerActivityOptions.find(option => activityOptionId(option) === activityForm.activityTemplateId);
    if (!activityForm.trainerId || !selectedActivity || !activityForm.date || !activityForm.startTime || !activityForm.endTime) {
      setActivityAssignmentError('Choose a trainer, activity, date, and time.');
      return;
    }
    if (activityForm.startTime >= activityForm.endTime) {
      setActivityAssignmentError('End time must be after start time.');
      return;
    }
    const hasOverlap = activitySchedule.some(assignment => assignment.localId !== editingScheduleId &&
      assignment.trainerId === activityForm.trainerId && assignment.date === activityForm.date &&
      activityForm.startTime < assignment.endTime && activityForm.endTime > assignment.startTime);
    if (hasOverlap) {
      setActivityAssignmentError('This trainer already has an activity during that time.');
      return;
    }

    const assignment = {
      ...(activitySchedule.find(item => item.localId === editingScheduleId) || {}),
      localId: editingScheduleId || `new-${Date.now()}`,
      trainerId: activityForm.trainerId,
      activityTemplateId: activityOptionId(selectedActivity),
      activityTitle: selectedActivity.title,
      date: activityForm.date,
      startTime: activityForm.startTime,
      endTime: activityForm.endTime,
      comment: activityForm.comment.trim(),
      status: 'draft',
    };
    setActivitySchedule(current => editingScheduleId
      ? current.map(item => item.localId === editingScheduleId ? assignment : item)
      : [...current, assignment]);
    setActivityScheduleStatus('draft');
    setActivityDialogOpen(false);
    setSnackbar({ open: true, message: editingScheduleId ? 'Activity updated in draft.' : 'Activity added to draft.', severity: 'success' });
  };

  const deleteScheduleActivity = (localId) => {
    setActivitySchedule(current => current.filter(assignment => assignment.localId !== localId));
    setActivityScheduleStatus('draft');
  };

  const fetchCalendarOccupancy = useCallback(async (employeeId, signal) => {
    if (!employeeId) return;
    setCalendarLoading(true);
    try {
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      const res = await axios.get(`${apiBaseUrl}/api/trainer-occupancy`, { params: { employeeId, startDate, endDate }, withCredentials: true, signal });
      setEmployeeCalendarData(res.data || {});
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Error fetching calendar occupancy:', err);
      setEmployeeCalendarData({});
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to load calendar assignments', severity: 'error' });
    } finally {
      if (!signal?.aborted) setCalendarLoading(false);
    }
  }, [calendarMonth]);

  const getOccupancyWeeksOfMonth = (year, month) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let current = new Date(firstDay);

    while (current.getDay() !== 1) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= lastDay) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeks.push({
        start: dateKey(weekStart),
        end: dateKey(weekEnd),
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      });
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  };

  useEffect(() => {
    fetchSchoolCatalog();
  }, [fetchSchoolCatalog]);

  useEffect(() => {
    fetchSchoolCurriculum();
  }, [fetchSchoolCurriculum]);

  useEffect(() => {
    fetchSchoolTimetableTemplates();
  }, [fetchSchoolTimetableTemplates]);

  useEffect(() => {
    setSetupRowDrafts({});
  }, [setupWeekStart]);

  useEffect(() => {
    fetchSchoolTrainerRoster(setupSchoolFilterId);
  }, [fetchSchoolTrainerRoster, setupSchoolFilterId]);

  useEffect(() => {
    const date = new Date(selectedOccupancyWeekStart);
    setOccupancyWeeks(getOccupancyWeeksOfMonth(date.getFullYear(), date.getMonth()));
  }, [selectedOccupancyWeekStart]);

  useEffect(() => {
    const controller = new AbortController();
    if (selectedTrainerForOccupancy && selectedOccupancyWeekStart) {
      fetchTrainerOccupancy(controller.signal);
    }
    return () => controller.abort();
  }, [selectedTrainerForOccupancy, selectedOccupancyWeekStart, fetchTrainerOccupancy]);

  useEffect(() => {
    const controller = new AbortController();
    if (calendarEmployee) {
      fetchCalendarOccupancy(calendarEmployee, controller.signal);
    }
    return () => controller.abort();
  }, [calendarEmployee, calendarMonth, fetchCalendarOccupancy]);

  useEffect(() => {
    if (mode !== 'occupancy' || !['school', 'setup'].includes(occupancyTab)) return undefined;
    const controller = new AbortController();
    fetchSchoolSchedule(controller.signal);
    return () => controller.abort();
  }, [mode, occupancyTab, fetchSchoolSchedule]);

  const trainerOptions = useMemo(() => employeeOptions.filter(employee => employee.role === 'employee'), [employeeOptions]);
  const plannerActivityOptions = activityOptions.length ? activityOptions : loadedActivityOptions;
  const schoolClasses = useMemo(() => {
    const courses = schoolCurriculum.filter(course => String(course.schoolId) === String(schoolForm.schoolId));
    const fromCurriculum = [...new Set(courses.flatMap(course => curriculumGrades(course.gradeBand)))].map(grade => `Grade ${grade}`);
    const existingClasses = schoolSchedule.filter(item => String(item.schoolId) === String(schoolForm.schoolId)).map(item => item.className).filter(Boolean);
    return [...new Set([...fromCurriculum, ...existingClasses])];
  }, [schoolCurriculum, schoolSchedule, schoolForm.schoolId]);
  const schoolFormGrade = schoolForm.className.match(/^Grade\s+([IVX]+)$/i)?.[1]?.toUpperCase() || '';
  const schoolFormCourses = useMemo(() => schoolCurriculum.filter(course =>
    String(course.schoolId) === String(schoolForm.schoolId) &&
    (!schoolFormGrade || curriculumGrades(course.gradeBand).includes(schoolFormGrade))
  ), [schoolCurriculum, schoolForm.schoolId, schoolFormGrade]);
  const schoolFormTerms = [...new Set(schoolFormCourses.map(course => course.term))];
  const filteredSchoolFormCourses = schoolFormCourses.filter(course => !schoolFormTerm || course.term === schoolFormTerm);
  const schoolFormCourseOptions = filteredSchoolFormCourses.length ? filteredSchoolFormCourses : schoolFormCourses;
  const selectedSchoolFormCourse = schoolFormCourseOptions.find(course => String(course.id) === String(schoolForm.curriculumCourseId));
  const schoolFormSessions = selectedSchoolFormCourse?.sessions || [];
  const selectedSchoolFormProgress = curriculumProgress.find(progress =>
    String(progress.courseId) === String(selectedSchoolFormCourse?.id) &&
    String(progress.schoolId) === String(schoolForm.schoolId) &&
    progress.className === schoolForm.className
  );
  const schoolFormActivityStatus = new Map((selectedSchoolFormProgress?.activityProgress || []).map(activity => [String(activity.id), activity.status]));
  const templateSchoolCourses = schoolCurriculum.filter(course => String(course.schoolId) === String(schoolTemplateForm.schoolId));
  const templateClassOptions = [...new Set(templateSchoolCourses.flatMap(course => curriculumGrades(course.gradeBand)).map(grade => `Grade ${grade}`))];
  const templateGrade = schoolTemplateForm.className.match(/^Grade\s+([IVX]+)$/i)?.[1]?.toUpperCase() || '';
  const templateGradeCourses = templateSchoolCourses.filter(course => !templateGrade || curriculumGrades(course.gradeBand).includes(templateGrade));
  const templateTerms = [...new Set(templateGradeCourses.map(course => course.term))];
  const templateCourseOptions = templateGradeCourses.filter(course => !schoolTemplateForm.term || course.term === schoolTemplateForm.term);
  const setupSchoolCourses = schoolCurriculum.filter(course => String(course.schoolId) === String(setupSchoolFilterId));
  const setupClassNames = [...new Set(setupSchoolCourses.flatMap(course => curriculumGrades(course.gradeBand).map(grade => `Grade ${grade}`)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const setupRows = setupClassNames.map(className => {
    const matches = schoolTimetableTemplates.filter(item => String(item.schoolId) === String(setupSchoolFilterId) && item.className === className);
    const match = matches[0] || null;
    const groupedSlots = new Map();
    matches.forEach(item => {
      const slotKey = `${item.courseId}|${item.dayOfWeek}|${item.startTime}|${item.endTime}`;
      const slot = groupedSlots.get(slotKey) || {
        dayOfWeek: Number(item.dayOfWeek), startTime: item.startTime, endTime: item.endTime,
        activityPosition: String(item.nextActivity?.position || item.startActivityPosition || ''),
        startActivityPosition: Number(item.startActivityPosition || item.nextActivity?.position || 1),
        startWeek: item.startWeek || setupWeekStart,
        templateIds: {},
      };
      slot.templateIds[String(item.trainerId)] = item.id;
      groupedSlots.set(slotKey, slot);
    });
    const existingSlots = [...groupedSlots.values()];
    const existingTrainerIds = [...new Set(matches.map(item => String(item.trainerId)).filter(Boolean))];
    const key = `${setupSchoolFilterId}|${className}`;
    const grade = className.match(/^Grade\s+([IVX]+)$/i)?.[1]?.toUpperCase() || '';
    const courses = setupSchoolCourses.filter(course => curriculumGrades(course.gradeBand).includes(grade));
    const course = courses.find(item => String(item.id) === String(match?.courseId)) || courses[0];
    const sessions = course?.sessions || [];
    const initialActivity = sessions[0];
    const draft = setupRowDrafts[key] || {
      trainerIds: existingTrainerIds.length ? existingTrainerIds : [schoolTrainerIds[0] || trainerOptions[0]?.employeeCode || trainerOptions[0]?._id || ''].filter(Boolean),
      term: course?.term || '', courseId: String(course?.id || ''),
      slots: existingSlots.length ? existingSlots : [{
        dayOfWeek: 1, startTime: '09:00', endTime: '10:00',
        activityPosition: String(initialActivity?.position || ''),
        startActivityPosition: Number(initialActivity?.position || 1),
        startWeek: setupWeekStart,
        templateIds: {},
      }],
    };
    const termCourses = courses.filter(item => item.term === draft.term);
    const selectedCourse = termCourses.find(item => String(item.id) === String(draft.courseId)) || termCourses[0] || course;
    const courseProgress = curriculumProgress.find(item => String(item.courseId) === String(selectedCourse?.id) && String(item.schoolId) === String(setupSchoolFilterId) && item.className === className)
      || curriculumProgress.find(item => String(item.courseId) === String(selectedCourse?.id) && String(item.schoolId) === String(setupSchoolFilterId) && !item.className);
    const activityStatus = new Map((courseProgress?.activityProgress || []).map(item => [String(item.id), item]));
    const completedCount = courseProgress?.completedTopics || 0;
    const totalCount = courseProgress?.totalTopics ?? (selectedCourse?.sessions?.length || 0);
    const classTrainerOptions = schoolTrainerIds.length
      ? trainerOptions.filter(trainer => schoolTrainerIds.includes(trainer.employeeCode || trainer._id) || matches.some(item => (trainer.employeeCode || trainer._id) === item.trainerId))
      : trainerOptions;
    return { key, className, match, matches, courses, terms: [...new Set(courses.map(item => item.term))], draft, selectedCourse, sessions: selectedCourse?.sessions || [], activityStatus, completedCount, pendingCount: Math.max(0, totalCount - completedCount), classTrainerOptions };
  });
  const curriculumBrowseSchools = [...new Map(schoolCurriculum.map(course => [String(course.schoolId), { id: String(course.schoolId), name: schoolCatalog.find(school => String(school.id || school._id) === String(course.schoolId))?.name || `School ${course.schoolId}` }])).values()];
  const curriculumBrowseGrades = [...new Set(schoolCurriculum.filter(course => String(course.schoolId) === String(curriculumBrowseSchoolId)).flatMap(course => curriculumGrades(course.gradeBand)))];
  const curriculumBrowseCourses = schoolCurriculum.filter(course =>
    String(course.schoolId) === String(curriculumBrowseSchoolId) &&
    (!curriculumBrowseClass || curriculumGrades(course.gradeBand).includes(curriculumBrowseClass)) &&
    course.term === curriculumBrowseTerm
  );
  const curriculumBrowseCourse = curriculumBrowseCourses.find(course => String(course.id) === String(curriculumBrowseCourseId)) || curriculumBrowseCourses[0];
  const curriculumBrowseProgress = curriculumProgress.find(progress =>
    String(progress.courseId) === String(curriculumBrowseCourse?.id) &&
    String(progress.schoolId) === String(curriculumBrowseSchoolId) &&
    progress.className === (curriculumBrowseClass ? `Grade ${curriculumBrowseClass}` : '')
  ) || curriculumProgress.find(progress => String(progress.courseId) === String(curriculumBrowseCourse?.id) && String(progress.schoolId) === String(curriculumBrowseSchoolId) && !progress.className);
  const curriculumBrowseActivityProgress = new Map((curriculumBrowseProgress?.activityProgress || []).map(activity => [String(activity.id), activity]));
  const curriculumSummaryRows = curriculumBrowseGrades.map(grade => {
    const className = `Grade ${grade}`;
    const courses = schoolCurriculum.filter(course => String(course.schoolId) === String(curriculumBrowseSchoolId) && curriculumGrades(course.gradeBand).includes(grade));
    const courseProgress = courses.map(course => curriculumProgress.find(progress => String(progress.courseId) === String(course.id) && String(progress.schoolId) === String(curriculumBrowseSchoolId) && progress.className === className)
      || curriculumProgress.find(progress => String(progress.courseId) === String(course.id) && String(progress.schoolId) === String(curriculumBrowseSchoolId) && !progress.className));
    const totalActivities = courses.reduce((total, course) => total + (course.sessions?.length || 0), 0);
    const sessionsScheduled = courseProgress.reduce((total, progress) => total + (progress?.scheduledTopics || 0), 0);
    const activitiesDone = courseProgress.reduce((total, progress) => total + (progress?.completedTopics || 0), 0);
    const activitiesPending = Math.max(totalActivities - activitiesDone, 0);
    return {
      grade,
      className,
      totalActivities,
      sessionsScheduled,
      activitiesDone,
      activitiesPending,
      status: activitiesDone >= totalActivities && totalActivities > 0 ? 'Completed' : sessionsScheduled === 0 ? 'Not started' : 'In progress',
    };
  });
  const curriculumBrowseTerms = [...new Set(schoolCurriculum.filter(course =>
    String(course.schoolId) === String(curriculumBrowseSchoolId) &&
    (!curriculumBrowseClass || curriculumGrades(course.gradeBand).includes(curriculumBrowseClass))
  ).map(course => course.term))];
  useEffect(() => {
    if (!curriculumBrowseSchoolId && curriculumBrowseSchools.length) setCurriculumBrowseSchoolId(curriculumBrowseSchools[0].id);
  }, [curriculumBrowseSchoolId, curriculumBrowseSchools]);
  useEffect(() => {
    if (curriculumBrowseTerms.length && !curriculumBrowseTerms.includes(curriculumBrowseTerm)) setCurriculumBrowseTerm(curriculumBrowseTerms[0]);
  }, [curriculumBrowseTerms, curriculumBrowseTerm]);
  useEffect(() => {
    if (curriculumBrowseGrades.length && !curriculumBrowseGrades.includes(curriculumBrowseClass)) setCurriculumBrowseClass(curriculumBrowseGrades[0]);
  }, [curriculumBrowseGrades, curriculumBrowseClass]);
  useEffect(() => {
    if (curriculumBrowseCourses.length && !curriculumBrowseCourses.some(course => String(course.id) === String(curriculumBrowseCourseId))) {
      setCurriculumBrowseCourseId(String(curriculumBrowseCourses[0].id));
    }
  }, [curriculumBrowseCourses, curriculumBrowseCourseId]);
  const plannerDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${selectedOccupancyWeekStart}T00:00:00`);
    date.setDate(date.getDate() + index);
    return {
      date: dateKey(date),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }), [selectedOccupancyWeekStart]);
  const plannerWeekLabel = plannerDays.length
    ? `${plannerDays[0].shortDate} - ${plannerDays[6].shortDate}, ${new Date(`${selectedOccupancyWeekStart}T00:00:00`).getFullYear()}`
    : '';
  const visibleActivitySchedule = useMemo(() => activitySchedule.filter(assignment =>
    (plannerTrainerFilter === 'all' || assignment.trainerId === plannerTrainerFilter) &&
    (plannerActivityFilter === 'all' || assignment.activityTemplateId === plannerActivityFilter)
  ), [activitySchedule, plannerTrainerFilter, plannerActivityFilter]);
  const visibleSchoolSchedule = useMemo(() => schoolSchedule.filter(assignment =>
    plannerTrainerFilter === 'all' || assignment.trainerId === plannerTrainerFilter
  ), [schoolSchedule, plannerTrainerFilter]);
  const scheduledSchoolCount = new Set(schoolSchedule.map(assignment => assignment.schoolId)).size;
  const schoolScheduleTrainerCount = new Set(schoolSchedule.map(assignment => assignment.trainerId)).size;
  const schoolScheduleConflictCount = useMemo(() => schoolSchedule.reduce((count, assignment, index) => count + (
    schoolSchedule.slice(index + 1).some(other => other.trainerId === assignment.trainerId && other.date === assignment.date && assignment.startTime < other.endTime && assignment.endTime > other.startTime) ? 1 : 0
  ), 0), [schoolSchedule]);
  const activityScheduleTrainerCount = new Set(activitySchedule.map(assignment => assignment.trainerId)).size;
  const getTrainerName = trainerId => trainerOptions.find(trainer => (trainer.employeeCode || trainer._id) === trainerId)?.name || trainerId;
  const getSchoolName = schoolId => schoolCatalog.find(school => String(school.id || school._id) === String(schoolId))?.name || 'Unknown school';
  const getActivityColor = title => plannerColors[[...title].reduce((sum, char) => sum + char.charCodeAt(0), 0) % plannerColors.length];
  const managerOccupancyDepartments = useMemo(() => [...new Set(trainerOptions.map(employee => typeof employee.department === 'string' ? employee.department : employee.department?.name).filter(Boolean))].sort(), [trainerOptions]);
  const managerOccupancyBranches = useMemo(() => [...new Set(trainerOptions.map(employee => typeof employee.branch === 'string' ? employee.branch : employee.branch?.name).filter(Boolean))].sort(), [trainerOptions]);
  const filteredManagerOccupancyTrainers = useMemo(() => {
    const query = occupancyEmployeeSearch.trim().toLowerCase();
    return trainerOptions.filter(employee => {
      const department = typeof employee.department === 'string' ? employee.department : employee.department?.name || '';
      const branch = typeof employee.branch === 'string' ? employee.branch : employee.branch?.name || '';
      const matchesSearch = !query || `${employee.name || ''} ${employee.employeeCode || employee._id || ''}`.toLowerCase().includes(query);
      return matchesSearch && (occupancyDepartmentFilter === 'all' || department === occupancyDepartmentFilter) && (occupancyBranchFilter === 'all' || branch === occupancyBranchFilter);
    });
  }, [trainerOptions, occupancyEmployeeSearch, occupancyDepartmentFilter, occupancyBranchFilter]);


  return <>
    {mode === 'calendar' && (
          <Box>
            <ManagerSectionIntro
              title="Trainer school calendar"
              description="View where a trainer is assigned throughout the month. Days with an assignment show the school name directly on the calendar."
              steps={['Choose an employee', 'Move to the required month', 'Review school assignments']}
            />

            <Paper elevation={0} sx={{ ...managerSectionPanelSx, mb: 3 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>Employee</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>Select whose monthly school schedule you want to view.</Typography>
              <FormControl fullWidth sx={{ maxWidth: 520 }}>
                <Select
                value={calendarEmployee}
                inputProps={{ 'aria-label': 'Calendar employee' }}
                onChange={(e) => {
                  const empId = e.target.value;
                  setCalendarEmployee(empId);
                  if (!empId) {
                    setEmployeeCalendarData({});
                  }
                }}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) return <em>Choose an employee</em>;
                  const emp = employeeOptions.find(e => (e.employeeCode || e._id) === selected);
                  return emp?.name || 'Unknown';
                }}
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828'
                }}
                >
                  <MenuItem value=""><em>Choose an employee</em></MenuItem>
                  {employeeOptions.map((emp) => (
                    <MenuItem key={emp.employeeCode || emp._id} value={emp.employeeCode || emp._id}>
                      {emp.name} ({emp.employeeCode || 'No Code'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {calendarEmployee ? (
              <Paper elevation={0} sx={managerSectionPanelSx}>
                <Box sx={{ width: '100%' }} className={theme.palette.mode === 'dark' ? 'dark-mode-calendar' : ''}>
                  {calendarLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Calendar
                      value={calendarMonth}
                      onChange={(newValue) => setCalendarMonth(newValue)}
                      onActiveStartDateChange={({ activeStartDate }) => {
                        if (activeStartDate) setCalendarMonth(activeStartDate);
                      }}
                      view="month"
                      tileContent={({ date, view }) => {
                        if (view !== 'month') return null;
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        const dayData = employeeCalendarData[dateStr];
                        if (!dayData?.schoolId) return null;
                        const school = schoolCatalog.find(s => String(s.id || s._id) === String(dayData.schoolId));
                        if (!school) return null;
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, mt: 0.5, width: '100%', overflow: 'hidden' }}>
                            <Box className="calendar-event-bar calendar-event-school">
                              {school.name}
                            </Box>
                          </Box>
                        );
                      }}
                      tileClassName={({ date, view }) => {
                        if (view !== 'month') return '';
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        return employeeCalendarData[dateStr]?.schoolId ? 'calendar-day-with-school' : '';
                      }}
                    />
                  )}
                </Box>
              </Paper>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Select an employee to view their school assignments on the calendar.
              </Alert>
            )}
          </Box>
    )}
    {mode === 'occupancy' && (
          <Box>
            <ManagerSectionIntro
              title={occupancyTab === 'activity' ? 'Track school activity completion' : occupancyTab === 'setup' ? 'Set up recurring school timetables' : 'Plan trainer occupancy'}
              description={occupancyTab === 'activity'
                ? 'Review curriculum activity completion by school, grade, term, and course.'
                : occupancyTab === 'setup' ? 'Set school, class, trainer, weekday, and time once. Each week advances to the next activity in the selected curriculum course.' : 'Assign a trainer to schools for each day of a selected week. Existing assignments appear in the schedule and can be changed before saving.'}
              steps={occupancyTab === 'activity'
                ? ['Choose a school and grade', 'Choose a term and course', 'Review activity completion']
                : occupancyTab === 'setup' ? ['Choose a school, class, and course', 'Assign a trainer and weekly time', 'Review the next curriculum activity'] : ['Choose a trainer', 'Choose a week', 'Assign schools and save']}
            />

            <Tabs
              value={occupancyTab}
              onChange={(event, value) => setOccupancyTab(value)}
              aria-label="School schedule, course status, and setup"
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab value="school" label="Activity Schedule" />
              <Tab value="activity" label="Course Status" />
              <Tab value="setup" label="School & Curriculum Setup" />
            </Tabs>

            {occupancyTab === 'school' && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary' }}>Weekly Class &amp; School Scheduler</Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Assign schools, classes and time slots for each trainer.</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => saveSchoolSchedule('draft')} disabled={schoolScheduleSaving || schoolScheduleLoading}>
                      {schoolScheduleSavingStatus === 'draft' ? 'Saving...' : 'Save draft'}
                    </Button>
                    <Button variant="contained" startIcon={<Send />} onClick={() => saveSchoolSchedule('published')} disabled={schoolScheduleSaving || schoolScheduleLoading || !schoolSchedule.length}>
                      {schoolScheduleSavingStatus === 'published' ? 'Publishing...' : 'Publish schedule'}
                    </Button>
                  </Stack>
                </Box>
                {schoolSchedule.length > 0 && schoolScheduleStatus !== 'published' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This school schedule is saved as a draft and is only visible to managers. Select “Publish schedule” to make it appear on trainers’ dashboards.
                  </Alert>
                )}

                <Paper elevation={0} sx={{ ...managerSectionPanelSx, p: 1.5, mb: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1.2fr 1.2fr' }, gap: 1.5, mb: 1.5 }}>
                    <TextField
                      size="small"
                      label="Search employee"
                      placeholder="Name or employee ID"
                      value={occupancyEmployeeSearch}
                      onChange={event => setOccupancyEmployeeSearch(event.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
                    />
                    <FormControl size="small" fullWidth>
                      <InputLabel id="school-planner-department-label">Department</InputLabel>
                      <Select labelId="school-planner-department-label" label="Department" value={occupancyDepartmentFilter} onChange={event => setOccupancyDepartmentFilter(event.target.value)}>
                        <MenuItem value="all">All departments</MenuItem>
                        {managerOccupancyDepartments.map(department => <MenuItem key={department} value={department}>{department}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="school-planner-branch-label">Branch</InputLabel>
                      <Select labelId="school-planner-branch-label" label="Branch" value={occupancyBranchFilter} onChange={event => setOccupancyBranchFilter(event.target.value)}>
                        <MenuItem value="all">All branches</MenuItem>
                        {managerOccupancyBranches.map(branch => <MenuItem key={branch} value={branch}>{branch}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="school-planner-trainer-label">Trainer</InputLabel>
                      <Select labelId="school-planner-trainer-label" label="Trainer" value={plannerTrainerFilter} onChange={event => setPlannerTrainerFilter(event.target.value)}>
                        <MenuItem value="all">All trainers</MenuItem>
                        {filteredManagerOccupancyTrainers.map(trainer => <MenuItem key={trainer.employeeCode || trainer._id} value={trainer.employeeCode || trainer._id}>{trainer.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title="Previous week"><span><IconButton aria-label="Previous week" size="small" onClick={() => {
                        const date = new Date(`${selectedOccupancyWeekStart}T00:00:00`);
                        date.setDate(date.getDate() - 7);
                        setSelectedOccupancyWeekStart(dateKey(date));
                      }}><ChevronLeft /></IconButton></span></Tooltip>
                      <TextField
                        fullWidth
                        size="small"
                        label="Week"
                        type="date"
                        value={selectedOccupancyWeekStart}
                        onChange={event => setSelectedOccupancyWeekStart(normalizeWeekStart(event.target.value))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ 'aria-label': 'School assignment week' }}
                      />
                      <Tooltip title="Next week"><span><IconButton aria-label="Next week" size="small" onClick={() => {
                        const date = new Date(`${selectedOccupancyWeekStart}T00:00:00`);
                        date.setDate(date.getDate() + 7);
                        setSelectedOccupancyWeekStart(dateKey(date));
                      }}><ChevronRight /></IconButton></span></Tooltip>
                    </Box>
                  </Box>
                </Paper>

                {schoolScheduleError && <Alert severity="error" sx={{ mb: 2 }}>{schoolScheduleError}</Alert>}
                {schoolCatalogLoading && <Alert severity="info" sx={{ mb: 2 }}>Loading school catalog...</Alert>}
                <Paper elevation={0} sx={{ ...managerSectionPanelSx, p: 1.25, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}><Groups sx={{ verticalAlign: 'middle', mr: 1, fontSize: 19, color: 'primary.main' }} />Weekly Class Load</Typography>
                    <Stack direction="row" spacing={{ xs: 2, sm: 4 }}>
                      <Box><Typography sx={{ fontSize: 20, fontWeight: 700 }}>{schoolSchedule.length}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Total classes</Typography></Box>
                      <Box><Typography sx={{ fontSize: 20, fontWeight: 700 }}>{scheduledSchoolCount}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Schools</Typography></Box>
                      <Box><Typography sx={{ fontSize: 20, fontWeight: 700 }}>{schoolScheduleTrainerCount}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Trainers</Typography></Box>
                    </Stack>
                  </Box>
                </Paper>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25, mb: 1.5 }}>
                  {[
                    { label: 'Classes scheduled', value: schoolSchedule.length, icon: <Event />, color: '#7950F2', bg: '#F1ECFF' },
                    { label: 'Schools', value: scheduledSchoolCount, icon: <SchoolIcon />, color: '#2F80ED', bg: '#EAF3FF' },
                    { label: 'Trainers', value: schoolScheduleTrainerCount, icon: <Groups />, color: '#27AE60', bg: '#EAF8EF' },
                    { label: 'Time conflicts', value: schoolScheduleConflictCount, icon: <AccessTime />, color: '#E8435D', bg: '#FCEDEF' },
                  ].map(metric => (
                    <Paper key={metric.label} elevation={0} sx={{ ...managerSectionPanelSx, p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: metric.bg, color: metric.color }}>{metric.icon}</Box>
                      <Box><Typography sx={{ fontSize: 20, lineHeight: 1.1, fontWeight: 700 }}>{metric.value}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{metric.label}</Typography></Box>
                    </Paper>
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 0.75, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>● <Box component="span" sx={{ color: 'primary.main' }}>Scheduled</Box></Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>● Draft</Typography>
                  <Typography sx={{ fontSize: 11, color: 'error.main' }}>● Conflict</Typography>
                </Box>

                <Paper elevation={0} sx={{ borderRadius: 2, bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4EAF2'}`, overflow: 'hidden', minWidth: 0 }}>
                  <Box sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Weekly class schedule</Typography>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => openSchoolDialog(plannerDays[0]?.date)} disabled={!trainerOptions.length || !schoolCatalog.length}>Assign class</Button>
                  </Box>
                  {schoolScheduleLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                  ) : (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                      <Table size="small" sx={{ minWidth: 1050, tableLayout: 'fixed' }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F8FAFC' }}>
                            <TableCell sx={{ width: 78, fontWeight: 700 }}>◷ Time</TableCell>
                            {plannerDays.map(day => <TableCell key={day.date} align="center" sx={{ minWidth: 138, fontWeight: 700 }}>
                              {day.weekday}<Typography component="span" sx={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'text.secondary' }}>{day.shortDate}</Typography>
                            </TableCell>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {plannerHours.map(hour => {
                            const startTime = `${String(hour).padStart(2, '0')}:00`;
                            return <TableRow key={hour} sx={{ height: 94 }}>
                              <TableCell sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>{`${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`}</TableCell>
                              {plannerDays.map(day => {
                                const cellAssignments = visibleSchoolSchedule.filter(assignment => assignment.date === day.date && Number(assignment.startTime?.slice(0, 2)) === hour);
                                return <TableCell key={`${day.date}-${hour}`} sx={{ p: 0.5, verticalAlign: 'top', borderLeft: 1, borderColor: 'divider' }}>
                                  <Box sx={{ minHeight: 80, display: 'grid', alignContent: 'start', gap: 0.5 }}>
                                    {cellAssignments.map(assignment => {
                                      const color = getActivityColor(assignment.activityTitle || 'Class');
                                      const hasConflict = schoolSchedule.some(other => other.localId !== assignment.localId && other.trainerId === assignment.trainerId && other.date === assignment.date && assignment.startTime < other.endTime && assignment.endTime > other.startTime);
                                      return <Box key={assignment.localId} sx={{ display: 'flex', gap: 0.25, p: 0.75, borderLeft: `3px solid ${hasConflict ? '#E8435D' : color.border}`, borderRadius: 1, bgcolor: hasConflict ? '#FCEDEF' : color.background, minWidth: 0 }}>
                                        <Box component="button" type="button" onClick={() => openSchoolDialog(day.date, assignment.startTime, assignment)} sx={{ border: 0, p: 0, textAlign: 'left', color: 'text.primary', bgcolor: 'transparent', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                                          <Typography sx={{ fontSize: 10, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getSchoolName(assignment.schoolId)}</Typography>
                                          <Typography sx={{ fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignment.className}{!assignment.curriculumSession && ` · ${assignment.activityTitle}`}</Typography>
                                          {assignment.curriculumSession && <Typography sx={{ fontSize: 9, color: 'primary.main', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignment.curriculumSession.course?.courseName} · {assignment.curriculumSession.position}. {assignment.curriculumSession.title}</Typography>}
                                          {assignment.curriculumSession && <Typography sx={{ fontSize: 9, color: assignment.completionStatus === 'completed' ? 'success.main' : assignment.completionStatus === 'not_completed' ? 'error.main' : assignment.completionStatus === 'cancelled' ? 'text.disabled' : 'warning.main', fontWeight: 700 }}>{assignment.completionStatus === 'completed' ? 'Done' : assignment.completionStatus === 'not_completed' ? 'Not completed' : assignment.completionStatus === 'cancelled' ? 'Class cancelled' : 'Pending'}</Typography>}
                                          {assignment.completionStatus === 'completed' && (assignment.studentCount || assignment.photosLink) && <Typography sx={{ fontSize: 9, color: 'text.secondary', whiteSpace: 'nowrap' }}>{assignment.studentCount ? `${assignment.studentCount} students` : ''}{assignment.studentCount && assignment.photosLink ? ' · ' : ''}{assignment.photosLink && <a href={assignment.photosLink} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>Photos</a>}</Typography>}
                                          {['not_completed', 'cancelled'].includes(assignment.completionStatus) && assignment.trainerNote && <Tooltip title={assignment.trainerNote}><Typography sx={{ fontSize: 9, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Remark: {assignment.trainerNote}</Typography></Tooltip>}
                                          <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>◷ {assignment.startTime} - {assignment.endTime}</Typography>
                                          <Typography sx={{ fontSize: 9, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getTrainerName(assignment.trainerId)}</Typography>
                                        </Box>
                                        <Tooltip title="Remove class"><IconButton aria-label="Remove class" size="small" onClick={() => deleteSchoolScheduleItem(assignment.localId)} sx={{ alignSelf: 'flex-start', p: 0.25 }}><DeleteOutline sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                                      </Box>;
                                    })}
                                    {cellAssignments.length === 0 && <Tooltip title={`Assign class ${startTime}`}>
                                      <Button aria-label={`Assign class ${day.weekday} ${startTime}`} size="small" onClick={() => openSchoolDialog(day.date, startTime)} sx={{ minWidth: 0, width: '100%', minHeight: 34, border: '1px dashed', borderColor: 'divider', color: 'text.secondary', p: 0 }}>
                                        <AddIcon sx={{ fontSize: 14, mr: 0.5 }} />Assign class
                                      </Button>
                                    </Tooltip>}
                                  </Box>
                                </TableCell>;
                              })}
                            </TableRow>;
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  <Box sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 1, color: 'text.secondary' }}>
                    <Typography sx={{ fontSize: 10 }}>{schoolSchedule.length} classes scheduled · {schoolScheduleStatus}</Typography>
                    <Typography sx={{ fontSize: 10, whiteSpace: 'nowrap' }}>Scroll horizontally to view the full week</Typography>
                  </Box>
                </Paper>

                <Dialog open={schoolDialogOpen} onClose={closeSchoolDialog} maxWidth="sm" fullWidth>
                  <Box component="form" onSubmit={saveSchoolForm}>
                    <DialogTitle>{editingSchoolScheduleId ? 'Edit class assignment' : 'Assign class'}</DialogTitle>
                    <DialogContent>
                      {schoolScheduleError && <Alert severity="error" sx={{ mb: 2 }}>{schoolScheduleError}</Alert>}
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2, pt: 1 }}>
        <FormControl fullWidth required>
                          <InputLabel id="school-assignment-trainer-label">Trainer</InputLabel>
                          <Select labelId="school-assignment-trainer-label" label="Trainer" value={schoolForm.trainerId} onChange={event => setSchoolForm(current => ({ ...current, trainerId: event.target.value }))}>
                            {trainerOptions.map(trainer => <MenuItem key={trainer.employeeCode || trainer._id} value={trainer.employeeCode || trainer._id}>{trainer.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth required>
                          <InputLabel id="school-assignment-school-label">School</InputLabel>
                          <Select labelId="school-assignment-school-label" label="School" value={schoolForm.schoolId} onChange={event => { setSchoolForm(current => ({ ...current, schoolId: event.target.value, className: '', curriculumCourseId: '', curriculumSessionId: '' })); setSchoolFormTerm('Term 1'); }}>
                            {schoolCatalog.map(school => <MenuItem key={school.id || school._id} value={String(school.id || school._id)}>{school.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                        {schoolClasses.length > 0 ? (
                          <FormControl fullWidth required>
                            <InputLabel id="school-assignment-class-label">Class / grade</InputLabel>
                            <Select labelId="school-assignment-class-label" label="Class / grade" value={schoolForm.className} onChange={event => {
                              const grade = event.target.value.match(/^Grade\s+([IVX]+)$/i)?.[1]?.toUpperCase() || '';
                              const matchingCourses = schoolCurriculum.filter(course => String(course.schoolId) === String(schoolForm.schoolId) && (!grade || curriculumGrades(course.gradeBand).includes(grade)));
                              const firstCourse = matchingCourses.find(course => course.term === 'Term 1') || matchingCourses[0];
                              setSchoolForm(current => ({ ...current, className: event.target.value, curriculumCourseId: firstCourse ? String(firstCourse.id) : '', curriculumSessionId: firstCourse?.sessions?.[0] ? String(firstCourse.sessions[0].id) : '' }));
                              setSchoolFormTerm(firstCourse?.term || 'Term 1');
                            }}>
                              {schoolClasses.map(className => <MenuItem key={className} value={className}>{className}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField required label="Class" value={schoolForm.className} onChange={event => setSchoolForm(current => ({ ...current, className: event.target.value }))} placeholder="e.g. Class 6A" />
                        )}
                        <FormControl fullWidth disabled={!schoolFormCourses.length || !schoolForm.className}>
                          <InputLabel id="school-curriculum-term-label">Curriculum term</InputLabel>
                          <Select labelId="school-curriculum-term-label" label="Curriculum term" value={schoolFormTerm} onChange={event => {
                            const nextCourses = schoolFormCourses.filter(course => course.term === event.target.value);
                            const course = nextCourses[0];
                            setSchoolFormTerm(event.target.value);
                            setSchoolForm(current => ({ ...current, curriculumCourseId: course ? String(course.id) : '', curriculumSessionId: course?.sessions?.[0] ? String(course.sessions[0].id) : '' }));
                          }}>
                            {schoolFormTerms.map(term => <MenuItem key={term} value={term}>{term}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth disabled={!schoolFormCourses.length || !schoolForm.className}>
                          <InputLabel id="school-curriculum-course-label">Curriculum course</InputLabel>
                          <Select labelId="school-curriculum-course-label" label="Curriculum course" value={schoolForm.curriculumCourseId} onChange={event => {
                            const course = schoolFormCourseOptions.find(item => String(item.id) === String(event.target.value));
                            setSchoolForm(current => ({ ...current, curriculumCourseId: event.target.value, curriculumSessionId: course?.sessions?.[0] ? String(course.sessions[0].id) : '' }));
                          }}>
                            {schoolFormCourseOptions.map(course => <MenuItem key={course.id} value={String(course.id)}>{course.courseName}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth disabled={!selectedSchoolFormCourse || schoolFormSessions.length === 0}>
                          <InputLabel id="school-curriculum-session-label">Curriculum activity</InputLabel>
                          <Select labelId="school-curriculum-session-label" label="Curriculum activity" value={schoolForm.curriculumSessionId} onChange={event => setSchoolForm(current => ({ ...current, curriculumSessionId: event.target.value }))}>
                            <MenuItem value="">No activity selected</MenuItem>
                            {schoolFormSessions.map(session => {
                              const status = schoolFormActivityStatus.get(String(session.id)) || 'pending';
                              return <MenuItem key={session.id} value={String(session.id)}>
                                {session.position}. {session.topic ? `${session.topic} · ` : ''}{session.title}
                                <Box component="span" sx={{ ml: 1, fontSize: 11, fontWeight: 700, color: status === 'done' ? 'success.main' : 'warning.main' }}>{status === 'done' ? 'Done' : 'Pending'}</Box>
                              </MenuItem>;
                            })}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth required>
                          <InputLabel id="school-assignment-day-label">Day</InputLabel>
                          <Select labelId="school-assignment-day-label" label="Day" value={schoolForm.date} onChange={event => setSchoolForm(current => ({ ...current, date: event.target.value }))}>
                            {plannerDays.map(day => <MenuItem key={day.date} value={day.date}>{day.weekday}, {day.shortDate}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <TextField label="Start" type="time" required value={schoolForm.startTime} onChange={event => setSchoolForm(current => ({ ...current, startTime: event.target.value }))} InputLabelProps={{ shrink: true }} />
                          <TextField label="End" type="time" required value={schoolForm.endTime} onChange={event => setSchoolForm(current => ({ ...current, endTime: event.target.value }))} InputLabelProps={{ shrink: true }} />
                        </Box>
                        <TextField label="Notes (optional)" multiline minRows={2} value={schoolForm.comment} onChange={event => setSchoolForm(current => ({ ...current, comment: event.target.value }))} sx={{ gridColumn: { sm: '1 / -1' } }} />
                      </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                      <Button onClick={closeSchoolDialog}>Cancel</Button>
                      <Button type="submit" variant="contained" disabled={schoolScheduleSaving}>{schoolScheduleSaving ? 'Saving…' : editingSchoolScheduleId ? 'Update class' : 'Add class'}</Button>
                    </DialogActions>
                  </Box>
                </Dialog>
              </Box>
            )}

            {occupancyTab === 'setup' && (
              <Box>
                <Paper elevation={0} sx={{ ...managerSectionPanelSx, p: 1.5 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                      <Box>
                      <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Recurring school timetable</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Each weekly session keeps its activity until it is marked complete, then advances to the next curriculum activity.</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: { xs: '100%', sm: 300 } }}>
                        <Tooltip title="Previous setup week"><span><IconButton aria-label="Previous setup week" size="small" onClick={() => {
                          const date = new Date(`${setupWeekStart}T00:00:00`);
                          date.setDate(date.getDate() - 7);
                          setSetupWeekStart(dateKey(date));
                        }}><ChevronLeft /></IconButton></span></Tooltip>
                        <TextField fullWidth size="small" label="Setup week" type="date" value={setupWeekStart} onChange={event => setSetupWeekStart(normalizeWeekStart(event.target.value))} InputLabelProps={{ shrink: true }} inputProps={{ 'aria-label': 'Timetable setup week' }} />
                        <Tooltip title="Next setup week"><span><IconButton aria-label="Next setup week" size="small" onClick={() => {
                          const date = new Date(`${setupWeekStart}T00:00:00`);
                          date.setDate(date.getDate() + 7);
                          setSetupWeekStart(dateKey(date));
                        }}><ChevronRight /></IconButton></span></Tooltip>
                      </Box>
                    </Box>
                  </Box>
                  <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, maxWidth: 980, bgcolor: 'background.default', borderColor: 'divider' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.25 }}>School trainer assignment</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25 }}>Select a school and assign one or more trainers. These trainers will be available for every class at the school.</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(230px, 0.85fr) minmax(280px, 1fr) auto' }, gap: 1, alignItems: 'center', justifyContent: 'start' }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel id="setup-school-filter-label">School</InputLabel>
                        <Select labelId="setup-school-filter-label" label="School" value={setupSchoolFilterId} onChange={event => { setSetupSchoolFilterId(event.target.value); setSchoolTrainerIds([]); setSetupRowDrafts({}); }}>
                          <MenuItem value="">Choose school</MenuItem>
                          {schoolCatalog.map(school => <MenuItem key={school.id || school._id} value={String(school.id || school._id)}>{school.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl size="small" fullWidth disabled={!setupSchoolFilterId || schoolTrainerRosterLoading}>
                        <InputLabel id="setup-school-trainers-label">Assigned trainers</InputLabel>
                        <Select labelId="setup-school-trainers-label" label="Assigned trainers" multiple value={schoolTrainerIds} onChange={event => setSchoolTrainerIds(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)} renderValue={selected => selected.map(id => getTrainerName(id)).join(', ')}>
                          {trainerOptions.map(trainer => { const trainerId = trainer.employeeCode || trainer._id; return <MenuItem key={trainerId} value={trainerId}><Checkbox size="small" checked={schoolTrainerIds.includes(trainerId)} /><ListItemText primary={trainer.name} /></MenuItem>; })}
                        </Select>
                      </FormControl>
                      <Button variant="contained" onClick={saveSchoolTrainerRoster} disabled={!setupSchoolFilterId || schoolTrainerRosterLoading || schoolTrainerRosterSaving} sx={{ minWidth: 140, whiteSpace: 'nowrap' }}>{schoolTrainerRosterSaving ? 'Saving…' : 'Save assignment'}</Button>
                    </Box>
                  </Paper>
                  {schoolScheduleError && <Alert severity="error" sx={{ mb: 1 }}>{schoolScheduleError}</Alert>}
                  {schoolTimetableLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box> : !setupSchoolFilterId ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>Select a school to view and set up its class timetables.</Typography> : (
                    <TableContainer sx={{ width: '100%', maxWidth: '100%', border: 1, borderColor: 'divider', borderRadius: 1.5, overflowX: 'auto' }}>
                      <Table size="small" sx={{
                        width: '100%', minWidth: 1160, tableLayout: 'fixed',
                        '& .MuiInputBase-root': { fontSize: 13 },
                        '& .MuiSelect-select': { fontSize: 13, py: 1 },
                        '& .MuiInputBase-input': { fontSize: 13, py: 1 },
                        '& .MuiFormHelperText-root': { fontSize: 11, lineHeight: 1.2, mt: 0.4 },
                        '& .MuiMenuItem-root': { fontSize: 13 },
                      }}>
                        <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
                          {[
                            ['Class / grade', '7%'], ['Trainer', '12%'], ['Term', '7%'], ['Course', '13%'],
                            ['Activity by session', '24%'], ['Weekly sessions', '31%'], ['Action', '6%'],
                          ].map(([label, width]) => <TableCell key={label} sx={{ width, minWidth: 0, px: 0.75, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</TableCell>)}
                        </TableRow></TableHead>
                        <TableBody>
                          {setupRows.map(row => <TableRow key={row.key} hover>
                            <TableCell sx={{ width: '7%', minWidth: 0, px: 0.75, fontWeight: 600 }}>{row.className}</TableCell>
                            <TableCell sx={{ width: '12%', minWidth: 0, px: 0.75 }}><FormControl size="small" fullWidth><Select multiple value={row.draft.trainerIds} onChange={event => updateSetupDraft(row, { trainerIds: typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value })} displayEmpty renderValue={selected => selected.length ? selected.map(getTrainerName).join(', ') : 'Choose trainers'}>{row.classTrainerOptions.map(trainer => { const trainerId = trainer.employeeCode || trainer._id; return <MenuItem key={trainerId} value={trainerId}><Checkbox size="small" checked={row.draft.trainerIds.includes(trainerId)} /><ListItemText primary={trainer.name} /></MenuItem>; })}</Select></FormControl></TableCell>
                            <TableCell sx={{ width: '7%', minWidth: 0, px: 0.75 }}><FormControl size="small" fullWidth><Select value={row.draft.term} onChange={event => { const term = event.target.value; const course = row.courses.find(item => item.term === term); const firstPosition = course?.sessions?.[0]?.position || ''; updateSetupDraft(row, { term, courseId: String(course?.id || ''), slots: row.draft.slots.map(slot => ({ ...slot, activityPosition: String(firstPosition), startActivityPosition: Number(firstPosition || 1), startWeek: setupWeekStart })) }); }} displayEmpty><MenuItem value="">Choose term</MenuItem>{row.terms.map(term => <MenuItem key={term} value={term}>{term}</MenuItem>)}</Select></FormControl></TableCell>
                            <TableCell sx={{ width: '13%', minWidth: 0, px: 0.75 }}><FormControl size="small" fullWidth><Select value={String(row.selectedCourse?.id || '')} onChange={event => { const course = row.courses.find(item => String(item.id) === String(event.target.value)); const firstPosition = course?.sessions?.[0]?.position || ''; updateSetupDraft(row, { courseId: String(event.target.value), term: course?.term || row.draft.term, slots: row.draft.slots.map(slot => ({ ...slot, activityPosition: String(firstPosition), startActivityPosition: Number(firstPosition || 1), startWeek: setupWeekStart })) }); }} displayEmpty><MenuItem value="">Choose course</MenuItem>{row.courses.filter(item => !row.draft.term || item.term === row.draft.term).map(course => <MenuItem key={course.id} value={String(course.id)}>{course.courseName}</MenuItem>)}</Select></FormControl></TableCell>
                            <TableCell sx={{ width: '24%', minWidth: 0, px: 0.75 }}>
                              <Stack spacing={0.75}>
                                {row.draft.slots.map((slot, index) => {
                                  const selected = row.sessions.find(session => String(session.position) === String(slot.activityPosition));
                                  const progress = selected ? row.activityStatus.get(String(selected.id)) : null;
                                  return <FormControl key={slot.templateIds?.[row.draft.trainerIds[0]] || index} size="small" fullWidth>
                                    <Select value={String(slot.activityPosition || '')} onChange={event => updateSetupDraft(row, { slots: row.draft.slots.map((item, itemIndex) => itemIndex === index ? { ...item, activityPosition: String(event.target.value), startActivityPosition: Number(event.target.value), startWeek: setupWeekStart } : item) })} displayEmpty renderValue={position => { const activity = row.sessions.find(session => String(session.position) === String(position)); return activity ? `${activity.position}. ${activity.title}` : 'Choose activity'; }}>
                                      <MenuItem value="">Choose activity</MenuItem>
                                      {row.sessions.map(session => { const itemProgress = row.activityStatus.get(String(session.id)); const done = itemProgress?.status === 'done'; const completion = itemProgress?.scheduledCount ? ` · ${itemProgress.attemptedCount || 0}/${itemProgress.scheduledCount} sessions held` : ' · not scheduled'; return <MenuItem key={session.id} value={String(session.position)}><Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><span>{session.position}. {session.title}</span><Typography component="span" variant="caption" sx={{ color: done ? 'success.main' : 'warning.dark', fontWeight: 700, whiteSpace: 'nowrap' }}>{done ? 'Done' : 'Pending'}{completion}</Typography></Box></MenuItem>; })}
                                    </Select>
                                    <FormHelperText>{row.completedCount} complete · {row.pendingCount} pending · {progress?.scheduledCount || 0} sessions scheduled</FormHelperText>
                                  </FormControl>;
                                })}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ width: '31%', minWidth: 0, px: 0.75 }}>
                              <Stack spacing={0.75}>
                                {row.draft.slots.map((slot, index) => <Stack key={slot.templateIds?.[row.draft.trainerIds[0]] || index} direction="row" spacing={0.5} alignItems="center" sx={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 1fr) minmax(96px, 1fr) minmax(96px, 1fr) 28px', width: '100%', minWidth: 0 }}>
                                  <FormControl size="small" sx={{ minWidth: 0, width: '100%' }}><Select value={slot.dayOfWeek} onChange={event => updateSetupDraft(row, { slots: row.draft.slots.map((item, itemIndex) => itemIndex === index ? { ...item, dayOfWeek: Number(event.target.value) } : item) })}>{[[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl>
                                  <TextField size="small" type="time" sx={{ minWidth: 0, width: '100%' }} value={slot.startTime} onChange={event => updateSetupDraft(row, { slots: row.draft.slots.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item) })} InputLabelProps={{ shrink: true }} />
                                  <TextField size="small" type="time" sx={{ minWidth: 0, width: '100%' }} value={slot.endTime} onChange={event => updateSetupDraft(row, { slots: row.draft.slots.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item) })} InputLabelProps={{ shrink: true }} />
                                  <Tooltip title="Remove this weekly session"><span><IconButton size="small" color="error" disabled={row.draft.slots.length === 1} onClick={() => updateSetupDraft(row, { slots: row.draft.slots.filter((_, itemIndex) => itemIndex !== index) })}><DeleteOutline fontSize="small" /></IconButton></span></Tooltip>
                                </Stack>)}
                                <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => { const last = row.draft.slots[row.draft.slots.length - 1]; const startTime = last?.startTime === '09:00' ? '10:00' : '11:00'; const firstPosition = row.sessions[0]?.position || ''; updateSetupDraft(row, { slots: [...row.draft.slots, { dayOfWeek: 1, startTime, endTime: startTime === '10:00' ? '11:00' : '12:00', activityPosition: String(firstPosition), startActivityPosition: Number(firstPosition || 1), startWeek: setupWeekStart, templateIds: {} }] }); }}>+ Add day and time</Button>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ width: '6%', minWidth: 0, px: 0.5, textAlign: 'center' }}><Button size="small" variant="contained" sx={{ minWidth: 0, px: 0.75, whiteSpace: 'nowrap' }} onClick={() => saveSetupRow(row)} disabled={setupSavingKey === row.key || !trainerOptions.length || !row.sessions.length}>{setupSavingKey === row.key ? 'Saving…' : 'Save'}</Button></TableCell>
                          </TableRow>)}
                          {!setupRows.length && <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 3 }}>No curriculum classes were found for this school.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Box>
            )}

            {occupancyTab === 'activity' && (
              <Box>
                <Paper elevation={0} sx={{ ...managerSectionPanelSx, p: 1.5, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                    <Box>
                      <Typography sx={{ fontSize: 15, fontWeight: 700 }}>School activity completion by class</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Select a class to review its terms, courses, and activity statuses.</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{curriculumSummaryRows.length} classes</Typography>
                  </Box>
                  {schoolCurriculum.length === 0 ? <Alert severity="info">No school curriculum is loaded yet.</Alert> : (
                    <>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel id="curriculum-browse-school-label">School</InputLabel>
                          <Select labelId="curriculum-browse-school-label" label="School" value={curriculumBrowseSchoolId} onChange={event => { setCurriculumBrowseSchoolId(event.target.value); setCurriculumBrowseClass(''); setCurriculumBrowseCourseId(''); }}>
                            {curriculumBrowseSchools.map(school => <MenuItem key={school.id} value={school.id}>{school.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>
                      <TableContainer sx={{ mt: 1.25, border: 1, borderColor: 'divider', borderRadius: 1.5, overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 820 }}>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                              <TableCell sx={{ fontWeight: 700 }}>Class / Grade</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>Total activities</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>Sessions scheduled</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>Activities done</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>Activities pending</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {curriculumSummaryRows.map(row => <TableRow key={row.className} hover onClick={() => {
                              const courses = schoolCurriculum.filter(course => String(course.schoolId) === String(curriculumBrowseSchoolId) && curriculumGrades(course.gradeBand).includes(row.grade));
                              const firstCourse = courses.find(course => course.term === 'Term 1') || courses[0];
                              setCurriculumBrowseClass(row.grade);
                              setCurriculumBrowseTerm(firstCourse?.term || 'Term 1');
                              setCurriculumBrowseCourseId(firstCourse ? String(firstCourse.id) : '');
                              setCurriculumDetailOpen(true);
                            }} sx={{ cursor: 'pointer' }}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={700}>{row.className}</Typography>
                                  <Typography variant="caption" color="text.secondary">{curriculumBrowseSchools.find(school => school.id === curriculumBrowseSchoolId)?.name || 'School'}</Typography>
                                </TableCell>
                                <TableCell align="center">{row.totalActivities}</TableCell>
                                <TableCell align="center">{row.sessionsScheduled}</TableCell>
                                <TableCell align="center">{row.activitiesDone}</TableCell>
                                <TableCell align="center">{row.activitiesPending}</TableCell>
                                <TableCell><Typography variant="body2" fontWeight={700} color={row.status === 'Completed' ? 'success.main' : row.status === 'Not started' ? 'text.secondary' : 'warning.main'}>{row.status}</Typography></TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </Paper>
                <Dialog open={curriculumDetailOpen} onClose={() => setCurriculumDetailOpen(false)} maxWidth="md" fullWidth>
                  <DialogTitle>{curriculumBrowseSchools.find(school => school.id === curriculumBrowseSchoolId)?.name || 'School'} · Grade {curriculumBrowseClass} activity details</DialogTitle>
                  <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Choose a term and course to review each activity’s completion status.</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 1.5, mb: 2 }}>
                      <FormControl size="small" fullWidth disabled={!curriculumBrowseTerms.length}>
                        <InputLabel id="curriculum-detail-term-label">Term</InputLabel>
                        <Select labelId="curriculum-detail-term-label" label="Term" value={curriculumBrowseTerm} onChange={event => {
                          const nextCourse = schoolCurriculum.find(course => String(course.schoolId) === String(curriculumBrowseSchoolId) && curriculumGrades(course.gradeBand).includes(curriculumBrowseClass) && course.term === event.target.value);
                          setCurriculumBrowseTerm(event.target.value);
                          setCurriculumBrowseCourseId(nextCourse ? String(nextCourse.id) : '');
                        }}>
                          {curriculumBrowseTerms.map(term => <MenuItem key={term} value={term}>{term}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl size="small" fullWidth disabled={!curriculumBrowseCourses.length}>
                        <InputLabel id="curriculum-detail-course-label">Course</InputLabel>
                        <Select labelId="curriculum-detail-course-label" label="Course" value={curriculumBrowseCourse ? String(curriculumBrowseCourse.id) : ''} onChange={event => setCurriculumBrowseCourseId(event.target.value)}>
                          {curriculumBrowseCourses.map(course => <MenuItem key={course.id} value={String(course.id)}>{course.courseName}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    {curriculumBrowseCourse && <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflowX: 'auto' }}>
                      <Table size="small" sx={{ minWidth: 640 }}>
                        <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700 }}>Activity</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Scheduled</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>Completed</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Trainer remarks</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                          {(curriculumBrowseCourse.sessions || []).map(session => {
                            const progress = curriculumBrowseActivityProgress.get(String(session.id));
                            const done = progress?.status === 'done';
                            return <TableRow key={session.id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>{session.position}. {session.title}</Typography>
                                {session.topic && <Typography variant="caption" color="text.secondary">{session.topic}</Typography>}
                              </TableCell>
                              <TableCell align="center">{progress?.scheduledCount || 0}{progress?.attemptedCount > 0 && <Typography variant="caption" color="text.secondary" display="block">{progress.attemptedCount} held{progress.notCompletedCount ? ` · ${progress.notCompletedCount} incomplete` : ''}</Typography>}</TableCell>
                              <TableCell align="center">{progress?.completedCount || 0}</TableCell>
                              <TableCell><Typography variant="body2" fontWeight={700} color={done ? 'success.main' : 'warning.main'}>{done ? 'Done' : 'Pending'}</Typography></TableCell>
                              <TableCell>{(progress?.notCompletedRemarks || []).length ? progress.notCompletedRemarks.map((entry, index) => <Typography key={`${entry.date}-${index}`} variant="caption" display="block" sx={{ maxWidth: 260, whiteSpace: 'normal' }}>{entry.date}: {entry.remark}</Typography>) : <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                            </TableRow>;
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>}
                  </DialogContent>
                  <DialogActions><Button onClick={() => setCurriculumDetailOpen(false)}>Close</Button></DialogActions>
                </Dialog>
              </Box>
            )}
          </Box>
    )}
    <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(value => ({ ...value, open: false }))}><Alert severity={snackbar.severity} onClose={() => setSnackbar(value => ({ ...value, open: false }))}>{snackbar.message}</Alert></Snackbar>
  </>;
}
