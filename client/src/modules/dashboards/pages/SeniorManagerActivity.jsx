import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Alert, Box, Button, CircularProgress, Container, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { logout } from '../../auth/state/authSlice';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function SeniorManagerActivity({ embedded = false }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [date, setDate] = useState(today);
  const [attendance, setAttendance] = useState(null);
  const [standardHours, setStandardHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingAttendance, setChangingAttendance] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [sessionType, setSessionType] = useState('Offline');
  const [institute, setInstitute] = useState('');
  const [school, setSchool] = useState('');
  const isSessionActivity = title === 'Total No. of Sessions';
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const departmentId = user?.departmentId ?? user?.department?.id ?? user?.department;

  const load = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [status, templateList, ownActivities] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/workday/status`, { params: { date }, withCredentials: true, signal }),
        axios.get(`${apiBaseUrl}/api/activities/templates`, { withCredentials: true, signal }),
        axios.get(`${apiBaseUrl}/api/activities/employee`, { withCredentials: true, signal }),
      ]);
      if (signal?.aborted) return;
      setAttendance(status.data.attendanceType);
      setStandardHours(status.data.standardHours);
      setTemplates(Array.isArray(templateList.data) ? templateList.data : []);
      setActivities(Array.isArray(ownActivities.data) ? ownActivities.data : []);
      setError('');
    } catch (err) {
      if (!signal?.aborted) setError(err.response?.data?.error || 'Could not load My Activity');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const controller = new AbortController();
    setChangingAttendance(false);
    setAttendance(null);
    setActivities([]);
    setMessage('');
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectedActivities = useMemo(() => activities.flatMap((activity) =>
    (Array.isArray(activity.timeEntries) ? activity.timeEntries : []).filter((entry) => {
      const entryDate = entry.date || entry.punchIn;
      return entryDate && new Date(entryDate).toLocaleDateString('en-CA') === date;
    }).map((entry) => ({ id: activity.id, title: activity.title, comment: activity.comment, entry }))), [activities, date]);

  const markAttendance = async (attendanceType) => {
    setBusy(true);
    setError('');
    try {
      await axios.post(`${apiBaseUrl}/api/workday/mark-attendance`, { attendanceType, date }, { withCredentials: true });
      setMessage('Attendance saved');
      setChangingAttendance(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save attendance');
    } finally {
      setBusy(false);
    }
  };

  const addActivity = async () => {
    if (!departmentId || !title || !templateId) {
      setError('Select an activity');
      return;
    }
    if (isSessionActivity && [institute, school].some(value => value === '' || !Number.isInteger(Number(value)) || Number(value) < 0)) {
      setError('Enter a non-negative whole number for Institute and School sessions');
      return;
    }
    if (!isSessionActivity && (!startTime || !endTime)) {
      setError('Enter a start and end time');
      return;
    }
    const start = new Date(isSessionActivity ? `${date}T00:00:00` : `${date}T${startTime}`);
    const end = isSessionActivity ? start : new Date(`${date}T${endTime}`);
    const duration = isSessionActivity ? 0 : (end - start) / 60000;
    if (!Number.isFinite(duration) || (!isSessionActivity && duration <= 0)) {
      setError('End time must be after start time');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await axios.post(`${apiBaseUrl}/api/activities`, {
        title, templateId, description: title, department: departmentId, comment,
        ...(isSessionActivity ? { sessionType, institute: Number(institute), school: Number(school) } : { startTime, endTime }),
        timeEntries: [{ date: start.toISOString(), punchIn: start.toISOString(), punchOut: end.toISOString(), duration, description: title, comment }],
      }, { withCredentials: true });
      setMessage('Activity logged');
      setTitle('');
      setTemplateId('');
      setInstitute('');
      setSchool('');
      setStartTime('');
      setEndTime('');
      setComment('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not log activity');
    } finally {
      setBusy(false);
    }
  };

  const panel = {
    p: { xs: 2, md: 4 }, mb: 4, borderRadius: 3,
    bgcolor: isDark ? 'rgba(35,39,47,0.95)' : '#fff',
    border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
  };
  const field = {
    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
    '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#D0D5DD' } },
  };
  const disabled = busy || loading || !date || date > today();
  const canLog = !disabled && Boolean(attendance) && attendance !== 'leave' && !changingAttendance;
  const dateLabel = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const timeLabel = value => {
    if (!value) return '—';
    if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  return <Container maxWidth={embedded ? false : 'md'} disableGutters={embedded} sx={{ py: embedded ? 0 : 4 }}>
    {!embedded && (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
      <Box><Typography variant="h4">My Activity</Typography><Typography color="text.secondary">Senior Manager · {user?.name}</Typography></Box>
      <Button onClick={async () => { await dispatch(logout()); navigate('/login'); }}>Log out</Button>
    </Stack>
    )}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    <Paper elevation={0} sx={panel}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>∿ My Activity Logger</Typography>
      <Typography color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>Log your daily activities and time spent</Typography>
      <Box sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f6f9ff', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={1.25}>
            <Typography fontWeight={700}>Mark Attendance</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField label="Attendance Date" type="date" size="small" value={date} disabled={busy} onChange={(event) => setDate(event.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: today() }} sx={{ ...field, bgcolor: 'background.paper' }} />
              <Button size="small" variant="outlined" disabled={busy} onClick={() => setDate(today())} sx={{ textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}>Today</Button>
            </Stack>
            {attendance && !changingAttendance && <Button size="small" variant="outlined" disabled={disabled || selectedActivities.length > 0} onClick={() => setChangingAttendance(true)} sx={{ alignSelf: 'flex-start', textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}>Change Attendance</Button>}
            <Typography variant="caption" color="text.secondary">Selected Date: {dateLabel}</Typography>
          </Stack>
          {loading ? <CircularProgress size={24} aria-label="Loading attendance" /> : attendance && !changingAttendance ? <Stack spacing={0.5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="subtitle1" fontWeight={700} color="primary">{({ full_day: 'Full Day', half_day: 'Half Day', leave: 'Leave' })[attendance]}</Typography>
            <Typography variant="body2" color="text.secondary">Standard Hours: {standardHours ?? '—'}</Typography>
          </Stack> : <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {[['full_day', 'Full Day', '#12B76A', '#10A060'], ['half_day', 'Half Day', '#F79009', '#E07F08'], ['leave', 'Leave', '#F04438', '#D73A2E']].map(([value, label, color, hover]) => <Button key={value} size="small" variant="contained" disabled={disabled || selectedActivities.length > 0} onClick={() => markAttendance(value)} sx={{ bgcolor: color, '&:hover': { bgcolor: hover } }}>{label}</Button>)}
            {changingAttendance && <Button size="small" disabled={busy} onClick={() => setChangingAttendance(false)}>Cancel</Button>}
          </Stack>}
        </Stack>
      </Box>
      {!isSessionActivity && <Alert severity="info" sx={{ mb: 2 }}>Please enter start and end time in 24-hour format (e.g., 14:30).</Alert>}
      {!loading && (!attendance || attendance === 'leave' || changingAttendance) && <Alert severity="warning" sx={{ mb: 2 }}>{attendance === 'leave' ? 'Activities cannot be logged while on leave.' : 'Please mark attendance (Full Day or Half Day) before logging an activity.'}</Alert>}
      <Box component="form" onSubmit={event => { event.preventDefault(); if (canLog) addActivity(); }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'minmax(220px, 2fr) repeat(3, minmax(160px, 1fr))' }, gap: 2, mb: 3 }}>
          <FormControl fullWidth disabled={!canLog} sx={field}><InputLabel id="senior-activity-label">Activity</InputLabel><Select labelId="senior-activity-label" value={templateId} label="Activity" onChange={(event) => {
            setTemplateId(event.target.value);
            setTitle(templates.find(template => String(template.id) === String(event.target.value))?.title || '');
          }}>
            {templates.length ? templates.map((template) => <MenuItem key={template.id} value={String(template.id)}>{template.title}{user?.managerType === 'branch' && template.department?.name ? ` — ${template.department.name}` : ''}</MenuItem>) : <MenuItem value="" disabled>No activities available</MenuItem>}
          </Select></FormControl>
          <TextField fullWidth disabled={!canLog} label="Comment" placeholder="Optional comment" value={comment} onChange={(event) => setComment(event.target.value)} sx={field} />
          {isSessionActivity ? <>
            <TextField select fullWidth disabled={!canLog} label="Session Type" value={sessionType} onChange={event => setSessionType(event.target.value)} sx={field}>
              <MenuItem value="Online">Online</MenuItem><MenuItem value="Offline">Offline</MenuItem>
            </TextField>
            <TextField fullWidth disabled={!canLog} label="Institute" type="number" value={institute} onChange={event => setInstitute(event.target.value)} inputProps={{ min: 0, step: 1 }} sx={field} />
            <TextField fullWidth disabled={!canLog} label="School" type="number" value={school} onChange={event => setSchool(event.target.value)} inputProps={{ min: 0, step: 1 }} sx={field} />
          </> : <>
            <TextField fullWidth disabled={!canLog} label="Start Time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} InputLabelProps={{ shrink: true }} sx={field} />
            <TextField fullWidth disabled={!canLog} label="End Time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} InputLabelProps={{ shrink: true }} sx={field} />
          </>}
        </Box>
        <Button type="submit" variant="contained" disabled={!canLog} sx={{ height: 56, minWidth: 180, width: { xs: '100%', sm: 'auto' } }}>{busy ? 'Saving…' : 'Add Activity'}</Button>
      </Box>
    </Paper>
    <Paper elevation={0} sx={{ ...panel, p: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>My Activities</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Activities for {dateLabel}</Typography>
      <TableContainer><Table sx={{ minWidth: 650 }}>
        <TableHead><TableRow>{['Date', 'Activity', 'Duration', 'Time', 'Comment'].map(label => <TableCell key={label} sx={{ fontWeight: 600, fontSize: 13, color: 'text.secondary', bgcolor: isDark ? 'rgba(35,39,47,0.8)' : '#F9FAFB', py: 1.5 }}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{loading ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} aria-label="Loading activities" /></TableCell></TableRow> : selectedActivities.length ? selectedActivities.map((item, index) => <TableRow key={`${item.id}-${index}`} sx={{ '&:hover': { bgcolor: isDark ? 'rgba(44,48,56,0.6)' : '#F9FAFB' }, '&:last-child td': { borderBottom: 'none' } }}>
          <TableCell>{dateLabel}</TableCell><TableCell sx={{ fontWeight: 500 }}>{item.title}</TableCell>
          <TableCell sx={{ color: 'text.secondary' }}>{(Number(item.entry.duration || 0) / 60).toFixed(2)} h</TableCell>
          <TableCell sx={{ color: 'text.secondary' }}>{timeLabel(item.entry.punchIn)} - {timeLabel(item.entry.punchOut)}</TableCell>
          <TableCell sx={{ color: 'text.secondary', maxWidth: 240, overflowWrap: 'anywhere' }}>{item.entry.comment || item.comment || '—'}</TableCell>
        </TableRow>) : <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary', borderBottom: 'none' }}>No activities logged for this date.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
    </Paper>
  </Container>;
}
