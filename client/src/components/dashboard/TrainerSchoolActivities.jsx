import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Stack, Link,
} from '@mui/material';
import { CheckCircleOutline, EventBusy, School } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export default function TrainerSchoolActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [remarkActivity, setRemarkActivity] = useState(null);
  const [remark, setRemark] = useState('');
  const [remarkMode, setRemarkMode] = useState('not_completed');
  const [doneActivity, setDoneActivity] = useState(null);
  const [doneForm, setDoneForm] = useState({ studentCount: '', photosLink: '' });

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/school-curriculum/mine`, { withCredentials: true });
      setActivities(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your school activities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const setStatus = async (activity, status, trainerNote = null, evidence = {}) => {
    setSavingId(activity.id);
    try {
      const response = await axios.patch(`${apiBaseUrl}/api/school-curriculum/assignments/${activity.id}/completion`, { status, trainerNote, ...evidence }, { withCredentials: true });
      setActivities(current => current.map(item => item.id === activity.id
        ? { ...item, ...response.data.assignment }
        : item));
      setError('');
      if (status === 'not_completed' || status === 'cancelled') {
        setRemarkActivity(null);
        setRemark('');
      }
      if (status === 'completed') {
        setDoneActivity(null);
        setDoneForm({ studentCount: '', photosLink: '' });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update activity status.');
    } finally {
      setSavingId(null);
    }
  };

  const openRemark = (activity, mode) => {
    setRemarkMode(mode);
    setRemarkActivity(activity);
    setRemark(activity.completionStatus === mode ? activity.trainerNote || '' : '');
  };
  const submitRemark = () => {
    if (!remark.trim() || !remarkActivity) return;
    setStatus(remarkActivity, remarkMode, remark.trim());
  };

  const openDone = activity => {
    setDoneActivity(activity);
    setDoneForm({ studentCount: activity.studentCount ? String(activity.studentCount) : '', photosLink: activity.photosLink || '' });
  };
  const studentCountValue = Number(doneForm.studentCount);
  const studentCountValid = Number.isInteger(studentCountValue) && studentCountValue >= 1 && studentCountValue <= 1000;
  const photosLinkValid = /^https?:\/\/\S+\.\S+/i.test(doneForm.photosLink.trim());
  const submitDone = () => {
    if (!doneActivity || !studentCountValid || !photosLinkValid) return;
    setStatus(doneActivity, 'completed', null, { studentCount: studentCountValue, photosLink: doneForm.photosLink.trim() });
  };

  const completedCount = activities.filter(activity => activity.completionStatus === 'completed').length;
  const notCompletedCount = activities.filter(activity => activity.completionStatus === 'not_completed').length;
  const cancelledCount = activities.filter(activity => activity.completionStatus === 'cancelled').length;
  const pendingCount = activities.length - completedCount - notCompletedCount - cancelledCount;
  const formatDate = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <Paper elevation={0} sx={{ mb: 3, p: { xs: 2, md: 3 }, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}><School sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />School Activity</Typography>
          <Typography variant="body2" color="text.secondary">Today’s activities assigned by your manager · {completedCount} completed · {notCompletedCount} not completed{cancelledCount ? ` · ${cancelledCount} cancelled` : ''} · {pendingCount} pending</Typography>
        </Box>
        <Button size="small" onClick={loadActivities} disabled={loading}>Refresh</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        : activities.length === 0 ? <Typography color="text.secondary">No school activities have been assigned to you yet.</Typography>
          : <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>School / Class</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 240 }}>Activity</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Date &amp; time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.map(activity => {
              const completed = activity.completionStatus === 'completed';
              const notCompleted = activity.completionStatus === 'not_completed';
              const cancelled = activity.completionStatus === 'cancelled';
              const session = activity.curriculumSession;
                  return <TableRow key={activity.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{activity.schoolName}</Typography>
                      <Typography variant="caption" color="text.secondary">{activity.className}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{session?.course?.courseName || '—'}</Typography>
                      {session?.course && <Typography variant="caption" color="text.secondary">{session.course.term}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{session?.title || activity.activityTitle || 'School activity'}</Typography>
                      {session?.topic && <Typography variant="caption" color="text.secondary">{session.topic}</Typography>}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2">{formatDate(activity.date)}</Typography>
                      <Typography variant="caption" color="text.secondary">{activity.startTime}–{activity.endTime}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={completed ? 'success' : notCompleted ? 'error' : cancelled ? 'default' : 'warning'} label={completed ? 'Done' : notCompleted ? 'Not completed' : cancelled ? 'Class cancelled' : 'Pending'} />
                      {completed && activity.completedAt && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{formatDate(activity.completedAt)}</Typography>}
                      {completed && activity.studentCount && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{activity.studentCount} students</Typography>}
                      {completed && activity.photosLink && <Link href={activity.photosLink} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ display: 'block' }}>View photos</Link>}
                      {(notCompleted || cancelled) && activity.trainerNote && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, maxWidth: 240, whiteSpace: 'normal' }}>Remark: {activity.trainerNote}</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                        {completed
                          ? <Button variant="outlined" size="small" disabled={savingId === activity.id} onClick={() => setStatus(activity, 'pending')}>Undo</Button>
                          : <>
                            <Button variant="contained" color="success" size="small" startIcon={<CheckCircleOutline />} disabled={savingId === activity.id} onClick={() => openDone(activity)}>
                              {savingId === activity.id ? 'Saving…' : 'Mark done'}
                            </Button>
                            <Button variant={notCompleted ? 'outlined' : 'text'} color="error" size="small" disabled={savingId === activity.id} onClick={() => openRemark(activity, 'not_completed')}>
                              {notCompleted ? 'Edit remark' : 'Not completed'}
                            </Button>
                            <Button variant={cancelled ? 'outlined' : 'text'} color="inherit" size="small" startIcon={<EventBusy />} disabled={savingId === activity.id} onClick={() => openRemark(activity, 'cancelled')}>
                              {cancelled ? 'Edit cancel remark' : 'Class cancelled'}
                            </Button>
                            {(notCompleted || cancelled) && <Button variant="text" size="small" disabled={savingId === activity.id} onClick={() => setStatus(activity, 'pending')}>Undo</Button>}
                          </>}
                      </Stack>
                    </TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          </TableContainer>}
      <Dialog open={Boolean(doneActivity)} onClose={() => setDoneActivity(null)} fullWidth maxWidth="sm">
        <DialogTitle>Mark activity as done</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {doneActivity ? `${doneActivity.schoolName} · ${doneActivity.className} · ${doneActivity.curriculumSession?.title || doneActivity.activityTitle}` : ''}
          </Typography>
          <Stack spacing={2}>
            <TextField
              autoFocus
              required
              type="number"
              label="No. of students"
              value={doneForm.studentCount}
              onChange={event => setDoneForm(current => ({ ...current, studentCount: event.target.value }))}
              inputProps={{ min: 1, max: 1000, step: 1 }}
              error={doneForm.studentCount !== '' && !studentCountValid}
              helperText={doneForm.studentCount !== '' && !studentCountValid ? 'Enter a whole number between 1 and 1000' : 'How many students attended this session'}
            />
            <TextField
              required
              label="Photos drive link"
              placeholder="https://drive.google.com/…"
              value={doneForm.photosLink}
              onChange={event => setDoneForm(current => ({ ...current, photosLink: event.target.value }))}
              inputProps={{ maxLength: 1000 }}
              error={doneForm.photosLink !== '' && !photosLinkValid}
              helperText={doneForm.photosLink !== '' && !photosLinkValid ? 'Paste the full link, starting with https://' : 'Link to the folder with this session’s photos (make sure it is shared)'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDoneActivity(null)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircleOutline />} onClick={submitDone} disabled={!studentCountValid || !photosLinkValid || savingId === doneActivity?.id}>
            {savingId === doneActivity?.id ? 'Saving…' : 'Mark done'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(remarkActivity)} onClose={() => { setRemarkActivity(null); setRemark(''); }} fullWidth maxWidth="sm">
        <DialogTitle>{remarkMode === 'cancelled' ? 'Class cancelled' : 'Record incomplete activity'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {remarkMode === 'cancelled'
              ? 'This class will not count as a session and earns no leaderboard points. The activity stays pending for the next scheduled class.'
              : 'The session will be recorded, but this curriculum activity will remain pending for the next scheduled session.'}
          </Typography>
          <TextField autoFocus fullWidth multiline minRows={3} label="Remark" placeholder={remarkMode === 'cancelled' ? 'Why was the class cancelled? (e.g. school holiday, exams, event)' : 'Explain what was completed and why the activity remains unfinished'} value={remark} onChange={event => setRemark(event.target.value)} required inputProps={{ maxLength: 2000 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRemarkActivity(null); setRemark(''); }}>Cancel</Button>
          <Button variant="contained" color={remarkMode === 'cancelled' ? 'inherit' : 'error'} onClick={submitRemark} disabled={!remark.trim() || savingId === remarkActivity?.id}>
            {savingId === remarkActivity?.id ? 'Saving…' : remarkMode === 'cancelled' ? 'Save as class cancelled' : 'Save as not completed'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
