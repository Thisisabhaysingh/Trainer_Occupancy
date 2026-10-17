import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, ArrowDownward, ArrowUpward, DeleteOutline, EditOutlined, ExpandMore, MenuBook, Search } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const api = (method, path, data, params) => axios({ method, url: `${apiBaseUrl}/api/school-curriculum${path}`, data, params, withCredentials: true });
const errorText = (err, fallback) => err.response?.data?.error || fallback;
const GRADES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const DEFAULT_YEAR = '2026-27';
const emptyCourse = { code: '', courseName: '', term: 'Term 1', gradeFrom: 'III', gradeTo: 'V', declaredSessions: '', description: '', durationWeeks: '', status: 'active' };
const suggestCode = name => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
const emptyActivity = { title: '', topic: '', learningOutcome: '', academicConcept: '' };

// Courses here are shared by every school and manager across the organisation.
export default function SchoolCourses({ embedded = false }) {
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [filters, setFilters] = useState({ search: '', grade: '', term: '' });
  const [expanded, setExpanded] = useState(null);
  const [courseDialog, setCourseDialog] = useState(null); // { id?, ...form }
  const [activityDialog, setActivityDialog] = useState(null); // { courseId, id?, ...form }
  const [confirm, setConfirm] = useState(null); // { text, action }

  const notify = (severity, text) => setMessage({ severity, text });

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('get', '', null, { academicYear });
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      notify('error', errorText(err, 'Could not load courses.'));
    } finally {
      setLoading(false);
    }
  }, [academicYear]);
  useEffect(() => { loadCourses(); }, [loadCourses]);

  const replaceCourse = updated => setCourses(current => {
    const exists = current.some(course => course.id === updated.id);
    return exists ? current.map(course => (course.id === updated.id ? updated : course)) : [...current, updated];
  });

  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      if (success) notify('success', success);
      return true;
    } catch (err) {
      notify('error', errorText(err, 'Something went wrong.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const terms = useMemo(() => [...new Set(courses.map(course => course.term))].sort(), [courses]);
  const gradesInBand = band => {
    const [from, to] = String(band || '').split('-');
    const start = GRADES.indexOf(from);
    const end = GRADES.indexOf(to || from);
    return start < 0 || end < 0 ? [] : GRADES.slice(start, end + 1);
  };
  const visibleCourses = courses.filter(course => {
    const search = filters.search.trim().toLowerCase();
    if (search && !`${course.courseName} ${(course.sessions || []).map(session => session.title).join(' ')}`.toLowerCase().includes(search)) return false;
    if (filters.grade && !gradesInBand(course.gradeBand).includes(filters.grade)) return false;
    if (filters.term && course.term !== filters.term) return false;
    return true;
  });

  const openCourseDialog = course => {
    const [gradeFrom, gradeTo] = String(course?.gradeBand || '').split('-');
    setCourseDialog(course
      ? {
        id: course.id,
        code: course.code || '',
        courseName: course.courseName,
        term: course.term,
        gradeFrom: gradeFrom || 'III',
        gradeTo: gradeTo || gradeFrom || 'V',
        declaredSessions: course.declaredSessions ? String(course.declaredSessions) : '',
        description: course.description || '',
        durationWeeks: course.durationWeeks ? String(course.durationWeeks) : '',
        status: course.status || 'active',
        codeTouched: true,
      }
      : { ...emptyCourse });
  };
  const saveCourse = async () => {
    const form = courseDialog;
    const payload = {
      academicYear,
      code: form.code.trim(),
      courseName: form.courseName,
      term: form.term,
      gradeBand: `${form.gradeFrom}-${form.gradeTo}`,
      declaredSessions: form.declaredSessions === '' ? 0 : Number(form.declaredSessions),
      description: form.description,
      durationWeeks: form.durationWeeks === '' ? null : Number(form.durationWeeks),
      status: form.status,
    };
    const ok = await run(async () => {
      const response = form.id ? await api('put', `/courses/${form.id}`, payload) : await api('post', '/courses', payload);
      replaceCourse(response.data);
      setExpanded(response.data.id);
    }, form.id ? 'Course updated.' : 'Course added. Now add its activities.');
    if (ok) setCourseDialog(null);
  };
  const deleteCourse = course => setConfirm({
    text: `Delete "${course.courseName}" and all of its ${course.sessions?.length || 0} activities? This affects every manager.`,
    action: () => run(async () => {
      await api('delete', `/courses/${course.id}`);
      setCourses(current => current.filter(item => item.id !== course.id));
    }, 'Course deleted.'),
  });

  const openActivityDialog = (course, session) => setActivityDialog(session
    ? { courseId: course.id, id: session.id, title: session.title || '', topic: session.topic || '', learningOutcome: session.learningOutcome || '', academicConcept: session.academicConcept || '' }
    : { courseId: course.id, ...emptyActivity });
  const saveActivity = async () => {
    const { courseId, id, ...payload } = activityDialog;
    const ok = await run(async () => {
      const response = id ? await api('put', `/sessions/${id}`, payload) : await api('post', `/courses/${courseId}/sessions`, payload);
      replaceCourse(response.data);
    }, id ? 'Activity updated.' : 'Activity added.');
    if (ok) setActivityDialog(null);
  };
  const deleteActivity = session => setConfirm({
    text: `Delete activity "${session.title}"?`,
    action: () => run(async () => replaceCourse((await api('delete', `/sessions/${session.id}`)).data), 'Activity deleted.'),
  });
  const moveActivity = (course, index, direction) => {
    const ids = course.sessions.map(session => session.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(async () => replaceCourse((await api('put', `/courses/${course.id}/sessions/order`, { sessionIds: ids })).data));
  };

  const codeValid = courseDialog && /^[A-Za-z0-9_-]{1,50}$/.test(courseDialog.code.trim());
  const courseFormValid = courseDialog && codeValid && courseDialog.courseName.trim() && courseDialog.term.trim() && GRADES.indexOf(courseDialog.gradeTo) >= GRADES.indexOf(courseDialog.gradeFrom);

  return (
    <Paper elevation={0} sx={embedded ? { p: 0 } : { p: { xs: 2, md: 3 }, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant={embedded ? 'subtitle1' : 'h6'} fontWeight={700}><MenuBook sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />School Courses</Typography>
          <Typography variant="body2" color="text.secondary">Courses and their activities are shared by every school and manager in the organisation. Changes apply everywhere.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => openCourseDialog(null)} disabled={busy}>Add course</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <TextField size="small" label="Academic year" value={academicYear} onChange={event => setAcademicYear(event.target.value)} sx={{ width: 140 }} />
        <TextField
          size="small"
          placeholder="Search courses or activities"
          value={filters.search}
          onChange={event => setFilters(current => ({ ...current, search: event.target.value }))}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ flex: '1 1 240px' }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="course-grade-filter">Grade</InputLabel>
          <Select labelId="course-grade-filter" label="Grade" value={filters.grade} onChange={event => setFilters(current => ({ ...current, grade: event.target.value }))}>
            <MenuItem value="">All grades</MenuItem>
            {GRADES.map(grade => <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="course-term-filter">Term</InputLabel>
          <Select labelId="course-term-filter" label="Term" value={filters.term} onChange={event => setFilters(current => ({ ...current, term: event.target.value }))}>
            <MenuItem value="">All terms</MenuItem>
            {terms.map(term => <MenuItem key={term} value={term}>{term}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : !visibleCourses.length ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>{courses.length ? 'No courses match these filters.' : `No courses for ${academicYear} yet. Use Add course to create one.`}</Typography>
      ) : (
        <Stack spacing={1}>
          {visibleCourses.map(course => (
            <Accordion key={course.id} expanded={expanded === course.id} onChange={() => setExpanded(current => (current === course.id ? null : course.id))} disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} sx={{ mr: 1 }}>{course.courseName}</Typography>
                  <Chip size="small" label={course.term} />
                  <Chip size="small" variant="outlined" label={`Grade ${course.gradeBand}`} />
                  {course.code && <Chip size="small" variant="outlined" label={course.code} sx={{ fontFamily: 'monospace' }} />}
                  {course.status === 'archived' && <Chip size="small" color="warning" label="Archived" />}
                  <Typography variant="caption" color="text.secondary">{course.sessions?.length || 0} activities</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap', mb: 1.5 }}>
                  <Button size="small" startIcon={<Add />} variant="outlined" onClick={() => openActivityDialog(course, null)} disabled={busy}>Add activity</Button>
                  <Button size="small" startIcon={<EditOutlined />} onClick={() => openCourseDialog(course)} disabled={busy}>Edit course</Button>
                  <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={() => deleteCourse(course)} disabled={busy}>Delete course</Button>
                </Box>
                <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 760 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Activity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Topic</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Learning outcome</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: 170 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(course.sessions || []).map((session, index) => (
                        <TableRow key={session.id} hover>
                          <TableCell>{session.position}</TableCell>
                          <TableCell><Typography variant="body2" fontWeight={600}>{session.title}</Typography></TableCell>
                          <TableCell>{session.topic || '—'}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', maxWidth: 360 }}>{session.learningOutcome || '—'}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Tooltip title="Move up"><span><IconButton size="small" disabled={busy || index === 0} onClick={() => moveActivity(course, index, -1)}><ArrowUpward fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Move down"><span><IconButton size="small" disabled={busy || index === course.sessions.length - 1} onClick={() => moveActivity(course, index, 1)}><ArrowDownward fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Edit"><span><IconButton size="small" disabled={busy} onClick={() => openActivityDialog(course, session)}><EditOutlined fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Delete"><span><IconButton size="small" color="error" disabled={busy} onClick={() => deleteActivity(session)}><DeleteOutline fontSize="small" /></IconButton></span></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!course.sessions?.length && <TableRow><TableCell colSpan={5} sx={{ color: 'text.secondary' }}>No activities yet. Use Add activity.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(courseDialog)} onClose={() => setCourseDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{courseDialog?.id ? 'Edit course' : 'Add course'}</DialogTitle>
        <DialogContent>
          {courseDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField autoFocus required label="Course name" value={courseDialog.courseName} onChange={event => setCourseDialog(current => ({ ...current, courseName: event.target.value, code: current.codeTouched ? current.code : suggestCode(event.target.value) }))} inputProps={{ maxLength: 255 }} />
              <TextField
                required
                label="Course code"
                value={courseDialog.code}
                onChange={event => setCourseDialog(current => ({ ...current, code: event.target.value, codeTouched: true }))}
                error={Boolean(courseDialog.code) && !codeValid}
                helperText={courseDialog.code && !codeValid ? 'Letters, numbers, - and _ only (max 50)' : 'Unique code, also used to match courses in omo_reportcard'}
                inputProps={{ maxLength: 50 }}
              />
              <TextField required label="Term" value={courseDialog.term} onChange={event => setCourseDialog(current => ({ ...current, term: event.target.value }))} helperText="e.g. Term 1" inputProps={{ maxLength: 40 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                {['gradeFrom', 'gradeTo'].map(key => (
                  <FormControl key={key} fullWidth>
                    <InputLabel id={`course-${key}`}>{key === 'gradeFrom' ? 'From grade' : 'To grade'}</InputLabel>
                    <Select labelId={`course-${key}`} label={key === 'gradeFrom' ? 'From grade' : 'To grade'} value={courseDialog[key]} onChange={event => setCourseDialog(current => ({ ...current, [key]: event.target.value }))}>
                      {GRADES.map(grade => <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>)}
                    </Select>
                  </FormControl>
                ))}
              </Box>
              {GRADES.indexOf(courseDialog.gradeTo) < GRADES.indexOf(courseDialog.gradeFrom) && <Alert severity="warning" sx={{ py: 0 }}>“To grade” must be the same as or higher than “From grade”.</Alert>}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth type="number" label="Planned sessions" value={courseDialog.declaredSessions} onChange={event => setCourseDialog(current => ({ ...current, declaredSessions: event.target.value }))} inputProps={{ min: 0 }} />
                <TextField fullWidth type="number" label="Duration (weeks)" value={courseDialog.durationWeeks} onChange={event => setCourseDialog(current => ({ ...current, durationWeeks: event.target.value }))} inputProps={{ min: 0 }} />
                <FormControl fullWidth>
                  <InputLabel id="course-status">Status</InputLabel>
                  <Select labelId="course-status" label="Status" value={courseDialog.status} onChange={event => setCourseDialog(current => ({ ...current, status: event.target.value }))}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TextField label="Description" multiline minRows={2} value={courseDialog.description} onChange={event => setCourseDialog(current => ({ ...current, description: event.target.value }))} />
              <Typography variant="caption" color="text.secondary">Academic year: {academicYear}. This course will be available to every school.</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveCourse} disabled={busy || !courseFormValid}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(activityDialog)} onClose={() => setActivityDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{activityDialog?.id ? 'Edit activity' : 'Add activity'}</DialogTitle>
        <DialogContent>
          {activityDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField autoFocus required label="Activity name" value={activityDialog.title} onChange={event => setActivityDialog(current => ({ ...current, title: event.target.value }))} inputProps={{ maxLength: 255 }} />
              <TextField label="Topic" value={activityDialog.topic} onChange={event => setActivityDialog(current => ({ ...current, topic: event.target.value }))} inputProps={{ maxLength: 255 }} />
              <TextField label="Learning outcome" multiline minRows={3} value={activityDialog.learningOutcome} onChange={event => setActivityDialog(current => ({ ...current, learningOutcome: event.target.value }))} />
              <TextField label="Academic concept" multiline minRows={2} value={activityDialog.academicConcept} onChange={event => setActivityDialog(current => ({ ...current, academicConcept: event.target.value }))} />
              {activityDialog.id && <Typography variant="caption" color="text.secondary">Renaming also updates school activities already scheduled with this activity.</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveActivity} disabled={busy || !activityDialog?.title.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent><Typography variant="body2">{confirm?.text}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={async () => { const action = confirm.action; setConfirm(null); await action(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
