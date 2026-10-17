import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, CheckCircle, DeleteOutline, EditOutlined, School as SchoolIcon } from '@mui/icons-material';
import SchoolCourses from './SchoolCourses';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const api = (method, path, data, params) => axios({ method, url: `${apiBaseUrl}/api/school-management${path}`, data, params, withCredentials: true });
const errorText = (err, fallback) => err.response?.data?.error || fallback;
const CLASS_STATUSES = { upcoming: { label: 'Upcoming', color: 'default' }, active: { label: 'Active', color: 'success' }, completed: { label: 'Completed', color: 'info' } };
const formatDate = value => (value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const naturalSort = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

const ConfirmDialog = ({ confirm, onClose, busy }) => (
  <Dialog open={Boolean(confirm)} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Are you sure?</DialogTitle>
    <DialogContent><Typography variant="body2">{confirm?.text}</Typography></DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button color="error" variant="contained" disabled={busy} onClick={async () => { const action = confirm.action; onClose(); await action(); }}>Delete</Button>
    </DialogActions>
  </Dialog>
);

// ---------- Academic years & terms ----------
function AcademicYearsPanel({ schoolId, sessions, setSessions, run, busy }) {
  const [yearDialog, setYearDialog] = useState(null);
  const [termDialog, setTermDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const openYear = session => setYearDialog(session
    ? { id: session.id, label: session.label, startDate: session.startDate, endDate: session.endDate, isActive: session.isActive, terms: [] }
    : { label: '', startDate: '', endDate: '', isActive: !sessions.length, terms: [{ name: 'Term 1', order: 1, startsOn: '', endsOn: '' }, { name: 'Term 2', order: 2, startsOn: '', endsOn: '' }] });
  const saveYear = async () => {
    const { id, terms, ...form } = yearDialog;
    const ok = await run(async () => {
      const response = id
        ? await api('put', `/sessions/${id}`, form)
        : await api('post', '/sessions', { ...form, schoolId, terms: terms.filter(term => term.name.trim()) });
      setSessions(response.data);
    }, id ? 'Academic year updated.' : 'Academic year added.');
    if (ok) setYearDialog(null);
  };
  const updateTermRow = (index, patch) => setYearDialog(current => ({ ...current, terms: current.terms.map((term, i) => (i === index ? { ...term, ...patch } : term)) }));

  const openTerm = (session, term) => setTermDialog(term
    ? { sessionId: session.id, id: term.id, name: term.name, order: String(term.order), startsOn: term.startsOn || '', endsOn: term.endsOn || '' }
    : { sessionId: session.id, name: `Term ${(session.terms?.length || 0) + 1}`, order: String((Math.max(0, ...(session.terms || []).map(item => item.order)) || 0) + 1), startsOn: '', endsOn: '' });
  const saveTerm = async () => {
    const { sessionId, id, ...form } = termDialog;
    const payload = { ...form, order: Number(form.order) };
    const ok = await run(async () => {
      const response = id ? await api('put', `/terms/${id}`, payload) : await api('post', '/terms', { ...payload, academicSessionId: sessionId });
      setSessions(response.data);
    }, id ? 'Term updated.' : 'Term added.');
    if (ok) setTermDialog(null);
  };

  const yearValid = yearDialog && yearDialog.label.trim() && yearDialog.startDate && yearDialog.endDate && yearDialog.endDate >= yearDialog.startDate;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">Each school has its own academic years. Only one is active at a time; new classes default to the active year and its first term.</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => openYear(null)} disabled={busy}>Add academic year</Button>
      </Box>
      {!sessions.length && <Alert severity="info">No academic years yet. Add one, e.g. 2026-27, with its terms.</Alert>}
      {sessions.map(session => (
        <Paper key={session.id} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: session.isActive ? 'success.main' : 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography fontWeight={700}>{session.label}</Typography>
              {session.isActive && <Chip size="small" color="success" icon={<CheckCircle />} label="Active" />}
              <Typography variant="body2" color="text.secondary">{formatDate(session.startDate)} – {formatDate(session.endDate)}</Typography>
            </Box>
            <Box>
              {!session.isActive && <Button size="small" disabled={busy} onClick={() => run(async () => setSessions((await api('put', `/sessions/${session.id}`, { isActive: true })).data), `${session.label} is now the active academic year.`)}>Set active</Button>}
              <Button size="small" startIcon={<Add />} disabled={busy} onClick={() => openTerm(session, null)}>Add term</Button>
              <Tooltip title="Edit academic year"><span><IconButton size="small" disabled={busy} onClick={() => openYear(session)}><EditOutlined fontSize="small" /></IconButton></span></Tooltip>
              <Tooltip title="Delete academic year"><span><IconButton size="small" color="error" disabled={busy} onClick={() => setConfirm({ text: `Delete ${session.label} and its ${session.terms?.length || 0} terms?`, action: () => run(async () => setSessions((await api('delete', `/sessions/${session.id}`)).data), 'Academic year deleted.') })}><DeleteOutline fontSize="small" /></IconButton></span></Tooltip>
            </Box>
          </Box>
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Order', 'Term', 'Starts on', 'Ends on', ''].map(label => <TableCell key={label} sx={{ fontWeight: 700 }}>{label}</TableCell>)}
              </TableRow></TableHead>
              <TableBody>
                {(session.terms || []).map(term => (
                  <TableRow key={term.id}>
                    <TableCell sx={{ width: 70 }}>{term.order}</TableCell>
                    <TableCell>{term.name}</TableCell>
                    <TableCell>{formatDate(term.startsOn)}</TableCell>
                    <TableCell>{formatDate(term.endsOn)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" disabled={busy} onClick={() => openTerm(session, term)}><EditOutlined fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" disabled={busy} onClick={() => setConfirm({ text: `Delete ${term.name} from ${session.label}?`, action: () => run(async () => setSessions((await api('delete', `/terms/${term.id}`)).data), 'Term deleted.') })}><DeleteOutline fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!session.terms?.length && <TableRow><TableCell colSpan={5} sx={{ color: 'text.secondary' }}>No terms yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      <Dialog open={Boolean(yearDialog)} onClose={() => setYearDialog(null)} fullWidth maxWidth="md">
        <DialogTitle>{yearDialog?.id ? 'Edit academic year' : 'Add academic year'}</DialogTitle>
        <DialogContent>
          {yearDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField autoFocus required label="Label" placeholder="2026-27" value={yearDialog.label} onChange={event => setYearDialog(current => ({ ...current, label: event.target.value }))} inputProps={{ maxLength: 50 }} sx={{ flex: '1 1 160px' }} />
                <TextField required type="date" label="Start date" InputLabelProps={{ shrink: true }} value={yearDialog.startDate} onChange={event => setYearDialog(current => ({ ...current, startDate: event.target.value }))} sx={{ flex: '1 1 160px' }} />
                <TextField required type="date" label="End date" InputLabelProps={{ shrink: true }} value={yearDialog.endDate} onChange={event => setYearDialog(current => ({ ...current, endDate: event.target.value }))} error={Boolean(yearDialog.endDate && yearDialog.startDate && yearDialog.endDate < yearDialog.startDate)} sx={{ flex: '1 1 160px' }} />
              </Box>
              <FormControlLabel control={<Checkbox checked={Boolean(yearDialog.isActive)} onChange={event => setYearDialog(current => ({ ...current, isActive: event.target.checked }))} />} label="Set as the active academic year" />
              {!yearDialog.id && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Terms</Typography>
                  <Stack spacing={1}>
                    {yearDialog.terms.map((term, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField size="small" label="Term name" value={term.name} onChange={event => updateTermRow(index, { name: event.target.value })} sx={{ flex: '1 1 150px' }} />
                        <TextField size="small" type="number" label="Order" value={term.order} onChange={event => updateTermRow(index, { order: Number(event.target.value) })} sx={{ width: 90 }} />
                        <TextField size="small" type="date" label="Starts on" InputLabelProps={{ shrink: true }} value={term.startsOn} onChange={event => updateTermRow(index, { startsOn: event.target.value })} />
                        <TextField size="small" type="date" label="Ends on" InputLabelProps={{ shrink: true }} value={term.endsOn} onChange={event => updateTermRow(index, { endsOn: event.target.value })} />
                        <IconButton size="small" color="error" onClick={() => setYearDialog(current => ({ ...current, terms: current.terms.filter((_, i) => i !== index) }))}><DeleteOutline fontSize="small" /></IconButton>
                      </Box>
                    ))}
                  </Stack>
                  <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={() => setYearDialog(current => ({ ...current, terms: [...current.terms, { name: `Term ${current.terms.length + 1}`, order: current.terms.length + 1, startsOn: '', endsOn: '' }] }))}>Add term</Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Term dates are optional but must fall inside the academic year.</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYearDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveYear} disabled={busy || !yearValid}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(termDialog)} onClose={() => setTermDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{termDialog?.id ? 'Edit term' : 'Add term'}</DialogTitle>
        <DialogContent>
          {termDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField autoFocus required fullWidth label="Term name" value={termDialog.name} onChange={event => setTermDialog(current => ({ ...current, name: event.target.value }))} inputProps={{ maxLength: 50 }} />
                <TextField required type="number" label="Order" value={termDialog.order} onChange={event => setTermDialog(current => ({ ...current, order: event.target.value }))} inputProps={{ min: 1 }} sx={{ width: 110 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth type="date" label="Starts on" InputLabelProps={{ shrink: true }} value={termDialog.startsOn} onChange={event => setTermDialog(current => ({ ...current, startsOn: event.target.value }))} />
                <TextField fullWidth type="date" label="Ends on" InputLabelProps={{ shrink: true }} value={termDialog.endsOn} onChange={event => setTermDialog(current => ({ ...current, endsOn: event.target.value }))} />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveTerm} disabled={busy || !termDialog?.name.trim() || Number(termDialog?.order) < 1}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} busy={busy} />
    </Stack>
  );
}

// ---------- Classes ----------
function ClassesPanel({ schoolId, sessions, classes, setClasses, trainers, run, busy }) {
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const sessionById = useMemo(() => new Map(sessions.map(session => [session.id, session])), [sessions]);
  const termById = useMemo(() => new Map(sessions.flatMap(session => (session.terms || []).map(term => [term.id, term]))), [sessions]);

  const open = schoolClass => setDialog(schoolClass
    ? { id: schoolClass.id, title: schoolClass.title, description: schoolClass.description || '', status: schoolClass.status, startDate: schoolClass.startDate || '', endDate: schoolClass.endDate || '', totalSessions: String(schoolClass.totalSessions || 0), trainerId: schoolClass.trainerId || '', activeAcademicSessionId: schoolClass.activeAcademicSessionId || '', activeAcademicTermId: schoolClass.activeAcademicTermId || '' }
    : { title: '', description: '', status: 'upcoming', startDate: '', endDate: '', totalSessions: '0', trainerId: '', activeAcademicSessionId: '', activeAcademicTermId: '' });
  const save = async () => {
    const { id, ...form } = dialog;
    const payload = { ...form, totalSessions: Number(form.totalSessions || 0), trainerId: form.trainerId || null, activeAcademicSessionId: form.activeAcademicSessionId || null, activeAcademicTermId: form.activeAcademicTermId || null };
    const ok = await run(async () => {
      const response = id ? await api('put', `/classes/${id}`, payload) : await api('post', '/classes', { ...payload, schoolId });
      setClasses(response.data);
    }, id ? 'Class updated.' : 'Class added.');
    if (ok) setDialog(null);
  };
  const dialogTerms = dialog?.activeAcademicSessionId ? sessionById.get(Number(dialog.activeAcademicSessionId))?.terms || [] : [];
  const visible = classes.filter(item => `${item.title} ${item.trainerName || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search classes or trainers" value={search} onChange={event => setSearch(event.target.value)} sx={{ flex: '1 1 260px', maxWidth: 360 }} />
        <Button variant="contained" startIcon={<Add />} onClick={() => open(null)} disabled={busy}>Add class</Button>
      </Box>
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            {['Class', 'Trainer', 'Status', 'Active year / term', 'Dates', 'Sessions', 'Courses', ''].map(label => <TableCell key={label} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {visible.map(item => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
                  {item.description && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 220 }} noWrap>{item.description}</Typography>}
                </TableCell>
                <TableCell>{item.trainerName || <Typography variant="caption" color="text.secondary">Not set</Typography>}</TableCell>
                <TableCell><Chip size="small" color={CLASS_STATUSES[item.status]?.color} label={CLASS_STATUSES[item.status]?.label || item.status} /></TableCell>
                <TableCell>{[sessionById.get(item.activeAcademicSessionId)?.label, termById.get(item.activeAcademicTermId)?.name].filter(Boolean).join(' · ') || '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.startDate || item.endDate ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}` : '—'}</TableCell>
                <TableCell align="center">{item.totalSessions || 0}</TableCell>
                <TableCell align="center">{item.courseAssignments?.length || 0}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton size="small" disabled={busy} onClick={() => open(item)}><EditOutlined fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" disabled={busy} onClick={() => setConfirm({ text: `Delete class ${item.title} and its ${item.courseAssignments?.length || 0} course assignments?`, action: () => run(async () => setClasses((await api('delete', `/classes/${item.id}`)).data), 'Class deleted.') })}><DeleteOutline fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!visible.length && <TableRow><TableCell colSpan={8} sx={{ color: 'text.secondary', py: 3 }}>{classes.length ? 'No classes match.' : 'No classes yet. Add classes like 6A, 6B, 7A.'}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.id ? `Edit class ${dialog.title}` : 'Add class'}</DialogTitle>
        <DialogContent>
          {dialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField autoFocus required fullWidth label="Class title" placeholder="6A" value={dialog.title} onChange={event => setDialog(current => ({ ...current, title: event.target.value }))} inputProps={{ maxLength: 150 }} helperText="Grade + section, e.g. 6A, 7B, KG" />
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel id="class-status">Status</InputLabel>
                  <Select labelId="class-status" label="Status" value={dialog.status} onChange={event => setDialog(current => ({ ...current, status: event.target.value }))}>
                    {Object.entries(CLASS_STATUSES).map(([value, meta]) => <MenuItem key={value} value={value}>{meta.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Autocomplete
                options={trainers}
                value={trainers.find(trainer => trainer.employeeCode === dialog.trainerId) || null}
                onChange={(event, value) => setDialog(current => ({ ...current, trainerId: value?.employeeCode || '' }))}
                getOptionLabel={option => `${option.name} (${option.employeeCode})`}
                isOptionEqualToValue={(option, value) => option.employeeCode === value.employeeCode}
                renderInput={params => <TextField {...params} label="Trainer" placeholder="Choose the class trainer" />}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="class-year">Active academic year</InputLabel>
                  <Select labelId="class-year" label="Active academic year" value={dialog.activeAcademicSessionId} onChange={event => setDialog(current => ({ ...current, activeAcademicSessionId: event.target.value, activeAcademicTermId: '' }))}>
                    <MenuItem value="">School’s active year</MenuItem>
                    {sessions.map(session => <MenuItem key={session.id} value={session.id}>{session.label}{session.isActive ? ' (active)' : ''}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth disabled={!dialogTerms.length}>
                  <InputLabel id="class-term">Active term</InputLabel>
                  <Select labelId="class-term" label="Active term" value={dialog.activeAcademicTermId} onChange={event => setDialog(current => ({ ...current, activeAcademicTermId: event.target.value }))}>
                    <MenuItem value="">First term</MenuItem>
                    {dialogTerms.map(term => <MenuItem key={term.id} value={term.id}>{term.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth type="date" label="Start date" InputLabelProps={{ shrink: true }} value={dialog.startDate} onChange={event => setDialog(current => ({ ...current, startDate: event.target.value }))} />
                <TextField fullWidth type="date" label="End date" InputLabelProps={{ shrink: true }} value={dialog.endDate} onChange={event => setDialog(current => ({ ...current, endDate: event.target.value }))} />
                <TextField type="number" label="Total sessions" value={dialog.totalSessions} onChange={event => setDialog(current => ({ ...current, totalSessions: event.target.value }))} inputProps={{ min: 0 }} sx={{ width: 150 }} />
              </Box>
              <TextField label="Description" multiline minRows={2} value={dialog.description} onChange={event => setDialog(current => ({ ...current, description: event.target.value }))} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={busy || !dialog?.title.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} busy={busy} />
    </Stack>
  );
}

// ---------- Course assignment ----------
function CourseAssignmentPanel({ sessions, classes, setClasses, courses, run, busy }) {
  const activeSession = sessions.find(session => session.isActive) || sessions[0];
  const [sessionId, setSessionId] = useState(activeSession?.id || '');
  const [termId, setTermId] = useState(activeSession?.terms?.[0]?.id || '');
  const [drafts, setDrafts] = useState({});
  useEffect(() => {
    if (!sessionId && activeSession) {
      setSessionId(activeSession.id);
      setTermId(activeSession.terms?.[0]?.id || '');
    }
  }, [activeSession, sessionId]);
  useEffect(() => { setDrafts({}); }, [sessionId, termId]);

  const terms = sessions.find(session => session.id === Number(sessionId))?.terms || [];
  const courseById = useMemo(() => new Map(courses.map(course => [course.id, course])), [courses]);
  const assignedIds = schoolClass => (schoolClass.courseAssignments || [])
    .filter(item => (item.academicSessionId || '') === (sessionId ? Number(sessionId) : '') && (item.academicTermId || '') === (termId ? Number(termId) : ''))
    .map(item => item.courseId);
  const selectedSession = sessions.find(session => session.id === Number(sessionId));
  const termName = terms.find(term => term.id === Number(termId))?.name || '';
  const sameTerm = course => !termName || String(course.term).trim().toLowerCase() === termName.trim().toLowerCase();
  // Courses of the selected year, with the selected term's courses listed first.
  const selectable = courses
    .filter(course => course.status !== 'archived' && (!selectedSession || course.academicYear === selectedSession.label))
    .sort((a, b) => Number(sameTerm(b)) - Number(sameTerm(a)) || naturalSort(a.courseName, b.courseName));
  const changedClasses = classes.filter(item => drafts[item.id] && drafts[item.id].slice().sort().join(',') !== assignedIds(item).slice().sort().join(','));

  const saveClass = schoolClass => run(async () => {
    const response = await api('put', `/classes/${schoolClass.id}/courses`, { academicSessionId: sessionId || null, academicTermId: termId || null, courseIds: drafts[schoolClass.id] });
    setClasses(response.data);
    setDrafts(current => { const next = { ...current }; delete next[schoolClass.id]; return next; });
  }, `Courses saved for ${schoolClass.title}.`);
  const saveAll = () => run(async () => {
    let latest = null;
    for (const schoolClass of changedClasses) {
      latest = (await api('put', `/classes/${schoolClass.id}/courses`, { academicSessionId: sessionId || null, academicTermId: termId || null, courseIds: drafts[schoolClass.id] })).data;
    }
    if (latest) setClasses(latest);
    setDrafts({});
  }, `Courses saved for ${changedClasses.length} classes.`);

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="assign-year">Academic year</InputLabel>
          <Select labelId="assign-year" label="Academic year" value={sessionId} onChange={event => { setSessionId(event.target.value); const next = sessions.find(session => session.id === Number(event.target.value)); setTermId(next?.terms?.[0]?.id || ''); }}>
            <MenuItem value="">No academic year</MenuItem>
            {sessions.map(session => <MenuItem key={session.id} value={session.id}>{session.label}{session.isActive ? ' (active)' : ''}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }} disabled={!terms.length}>
          <InputLabel id="assign-term">Term</InputLabel>
          <Select labelId="assign-term" label="Term" value={termId} onChange={event => setTermId(event.target.value)}>
            <MenuItem value="">Whole year</MenuItem>
            {terms.map(term => <MenuItem key={term.id} value={term.id}>{term.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={saveAll} disabled={busy || !changedClasses.length}>Save all changes{changedClasses.length ? ` (${changedClasses.length})` : ''}</Button>
      </Box>
      <Typography variant="body2" color="text.secondary">
        Pick the courses each class takes in the selected academic year and term. {termName ? `Courses set up for ${termName} are listed first; a course from another term is marked.` : ''} Courses are shared across the organisation (see the Courses tab).
      </Typography>
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700, width: 160 }}>Class</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Courses</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, width: 110 }} />
          </TableRow></TableHead>
          <TableBody>
            {classes.map(schoolClass => {
              const value = drafts[schoolClass.id] || assignedIds(schoolClass);
              const changed = changedClasses.some(item => item.id === schoolClass.id);
              return (
                <TableRow key={schoolClass.id} sx={changed ? { bgcolor: 'action.selected' } : undefined}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{schoolClass.title}</Typography>
                    {schoolClass.trainerName && <Typography variant="caption" color="text.secondary">{schoolClass.trainerName}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      multiple
                      size="small"
                      options={selectable.map(course => course.id)}
                      groupBy={id => (sameTerm(courseById.get(id) || {}) ? (termName ? `${termName} courses` : 'Courses') : 'Other terms')}
                      value={value}
                      onChange={(event, next) => setDrafts(current => ({ ...current, [schoolClass.id]: next }))}
                      getOptionLabel={id => { const course = courseById.get(id); return course ? `${course.courseName} · ${course.term} · Grade ${course.gradeBand}` : `Course ${id}`; }}
                      renderTags={(ids, getTagProps) => ids.map((id, index) => {
                        const course = courseById.get(id);
                        const mismatch = course && !sameTerm(course);
                        return (
                          <Tooltip key={id} title={mismatch ? `This course is set up for ${course.term}, not ${termName}.` : ''}>
                            <Chip size="small" color={mismatch ? 'warning' : 'default'} label={`${course?.courseName || `Course ${id}`}${mismatch ? ` (${course.term})` : ''}`} {...getTagProps({ index })} />
                          </Tooltip>
                        );
                      })}
                      renderInput={params => <TextField {...params} placeholder={value.length ? '' : 'Add courses'} />}
                    />
                  </TableCell>
                  <TableCell align="right"><Button size="small" variant={changed ? 'contained' : 'text'} disabled={busy || !changed} onClick={() => saveClass(schoolClass)}>Save</Button></TableCell>
                </TableRow>
              );
            })}
            {!classes.length && <TableRow><TableCell colSpan={3} sx={{ color: 'text.secondary', py: 3 }}>Add classes first in the Classes tab.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// ---------- Container ----------
export default function SchoolManagement({ isAdmin = false }) {
  const [tab, setTab] = useState('years');
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      if (success) setMessage({ severity: 'success', text: success });
      return true;
    } catch (err) {
      setMessage({ severity: 'error', text: errorText(err, 'Something went wrong.') });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const loadSchools = useCallback(async () => {
    try {
      const response = await api('get', '/schools');
      setSchools(response.data);
      setSchoolId(current => current || response.data[0]?.id || '');
    } catch (err) {
      setMessage({ severity: 'error', text: errorText(err, 'Could not load schools.') });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadSchools();
    api('get', '/trainers').then(response => setTrainers(response.data)).catch(() => setTrainers([]));
  }, [loadSchools]);

  const loadSchoolData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [sessionResponse, classResponse] = await Promise.all([
        api('get', '/sessions', null, { schoolId }),
        api('get', '/classes', null, { schoolId }),
      ]);
      setSessions(sessionResponse.data);
      setClasses(classResponse.data);
    } catch (err) {
      setMessage({ severity: 'error', text: errorText(err, 'Could not load this school.') });
    } finally {
      setLoading(false);
    }
  }, [schoolId]);
  useEffect(() => { loadSchoolData(); }, [loadSchoolData]);

  useEffect(() => {
    if (tab !== 'assignment') return;
    axios.get(`${apiBaseUrl}/api/school-curriculum`, { params: { academicYear: '2026-27' }, withCredentials: true })
      .then(response => setCourses((response.data || []).slice().sort((a, b) => naturalSort(a.courseName, b.courseName))))
      .catch(() => setCourses([]));
  }, [tab]);

  // Keep the school list's counts in sync after edits.
  useEffect(() => {
    if (!schoolId) return;
    setSchools(current => current.map(school => (school.id === Number(schoolId)
      ? { ...school, classCount: classes.length, activeSession: sessions.find(session => session.isActive) ? { id: sessions.find(session => session.isActive).id, label: sessions.find(session => session.isActive).label } : null }
      : school)));
  }, [classes, sessions, schoolId]);

  const school = schools.find(item => item.id === Number(schoolId));

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}><SchoolIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />School Management</Typography>
          <Typography variant="body2" color="text.secondary">Academic years, terms, classes and course assignment for each school — the same structure as omo_reportcard.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {isAdmin && (
          <Tooltip title="Bring in every class already onboarded in timetables or school activities. New ones are also added automatically.">
            <span><Button variant="outlined" size="small" disabled={busy} onClick={() => run(async () => {
              const stats = (await api('post', '/sync-from-timesheet')).data;
              await loadSchools();
              await loadSchoolData();
              setMessage({ severity: 'success', text: `Synced from timesheet: ${stats.classesCreated} classes, ${stats.assignmentsCreated} course assignments, ${stats.sessionsCreated} academic years and ${stats.termsCreated} terms added.` });
            })}>Sync from timesheet</Button></span>
          </Tooltip>
        )}
        {tab !== 'courses' && (
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="sm-school">School</InputLabel>
            <Select labelId="sm-school" label="School" value={schoolId} onChange={event => setSchoolId(event.target.value)}>
              {schools.map(item => <MenuItem key={item.id} value={item.id}>{item.name}{item.activeSession ? ` · ${item.activeSession.label}` : ''} · {item.classCount} classes</MenuItem>)}
            </Select>
          </FormControl>
        )}
        </Box>
      </Box>

      {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Tabs value={tab} onChange={(event, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="years" label="Academic years & terms" />
        <Tab value="classes" label="Classes" />
        <Tab value="assignment" label="Course assignment" />
        <Tab value="courses" label="Courses" />
      </Tabs>

      {tab === 'courses' ? <SchoolCourses embedded /> : !schools.length && !loading ? (
        <Alert severity="info">No schools are available to you. An admin can add schools in School Catalog or assign them to you in Manager Assignments.</Alert>
      ) : loading || !school ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : (
        <>
          {tab === 'years' && <AcademicYearsPanel schoolId={school.id} sessions={sessions} setSessions={setSessions} run={run} busy={busy} />}
          {tab === 'classes' && <ClassesPanel schoolId={school.id} sessions={sessions} classes={classes} setClasses={setClasses} trainers={trainers} run={run} busy={busy} />}
          {tab === 'assignment' && <CourseAssignmentPanel key={school.id} sessions={sessions} classes={classes} setClasses={setClasses} courses={courses} run={run} busy={busy} />}
        </>
      )}
    </Paper>
  );
}
