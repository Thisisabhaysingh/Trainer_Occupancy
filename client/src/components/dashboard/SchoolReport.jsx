import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel, Link, MenuItem, Paper,
  Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Download, Assessment } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const todayKey = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const monthStartKey = () => `${todayKey().slice(0, 7)}-01`;
const STATUS_OPTIONS = [
  { value: 'completed', label: 'Done only' },
  { value: 'marked', label: 'Done + Not completed + Cancelled' },
  { value: 'cancelled', label: 'Cancelled classes only' },
  { value: 'all', label: 'All (including Pending)' },
];
const STATUS_COLORS = { Done: 'success', 'Not completed': 'error', 'Class cancelled': 'default', Pending: 'warning' };
const formatDate = dateKey => new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

export default function SchoolReport({ isAdmin = false }) {
  const [filters, setFilters] = useState({ schoolId: '', fromDate: monthStartKey(), toDate: todayKey(), status: 'completed', managerId: '' });
  const [schools, setSchools] = useState([]);
  const [managers, setManagers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const rangeInvalid = !filters.fromDate || !filters.toDate || filters.fromDate > filters.toDate;
  const params = Object.fromEntries(Object.entries(filters).filter(([key, value]) => value && (isAdmin || key !== 'managerId')));

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/school-activity-mail/schools`, { withCredentials: true })
      .then(response => setSchools(response.data))
      .catch(() => setSchools([]));
    if (isAdmin) {
      axios.get(`${apiBaseUrl}/api/school-activity-mail/managers`, { withCredentials: true })
        .then(response => setManagers(response.data))
        .catch(() => setManagers([]));
    }
  }, [isAdmin]);

  const loadReport = useCallback(async () => {
    if (rangeInvalid) return;
    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/school-report`, { params, withCredentials: true });
      setReport(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the school report.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), rangeInvalid]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/school-report/excel`, { params, withCredentials: true, responseType: 'blob' });
      const disposition = response.headers['content-disposition'] || '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'school-report.xlsx';
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setError('');
    } catch (err) {
      const message = err.response?.data instanceof Blob ? JSON.parse(await err.response.data.text()).error : err.response?.data?.error;
      setError(message || 'Could not download the Excel report.');
    } finally {
      setDownloading(false);
    }
  };

  const update = patch => setFilters(current => ({ ...current, ...patch }));
  const showSchool = !filters.schoolId;
  const showStatus = filters.status !== 'completed';

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}><Assessment sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />School Report</Typography>
          <Typography variant="body2" color="text.secondary">
            School activities with date, grade, students present, trainer, course, activity, learning outcome and photo/video link.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Download />} onClick={downloadExcel} disabled={downloading || rangeInvalid || !report?.total}>
          {downloading ? 'Preparing…' : 'Download Excel'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220, flex: '1 1 220px' }}>
          <InputLabel id="report-school-label">School</InputLabel>
          <Select labelId="report-school-label" label="School" value={filters.schoolId} onChange={event => update({ schoolId: event.target.value })}>
            <MenuItem value="">All schools</MenuItem>
            {schools.map(school => <MenuItem key={school.id} value={school.id}>{school.name}</MenuItem>)}
          </Select>
        </FormControl>
        {isAdmin && (
          <FormControl size="small" sx={{ minWidth: 200, flex: '1 1 200px' }}>
            <InputLabel id="report-manager-label">Manager</InputLabel>
            <Select labelId="report-manager-label" label="Manager" value={filters.managerId} onChange={event => update({ managerId: event.target.value })}>
              <MenuItem value="">All managers</MenuItem>
              {managers.map(manager => <MenuItem key={manager.employeeCode} value={manager.employeeCode}>{manager.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <TextField size="small" type="date" label="From" value={filters.fromDate} onChange={event => update({ fromDate: event.target.value })} InputLabelProps={{ shrink: true }} inputProps={{ max: filters.toDate || undefined }} error={rangeInvalid} />
        <TextField size="small" type="date" label="To" value={filters.toDate} onChange={event => update({ toDate: event.target.value })} InputLabelProps={{ shrink: true }} inputProps={{ min: filters.fromDate || undefined }} error={rangeInvalid} helperText={rangeInvalid ? 'From must be on or before To' : ''} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="report-status-label">Activities</InputLabel>
          <Select labelId="report-status-label" label="Activities" value={filters.status} onChange={event => update({ status: event.target.value })}>
            {STATUS_OPTIONS.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && !report ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : report && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {report.total} {report.total === 1 ? 'activity' : 'activities'}{loading ? ' · refreshing…' : ''}
          </Typography>
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflowX: 'auto', maxHeight: 560 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  {['Date', showSchool && 'School', 'Grade', 'Present Students', 'Trainer Name', 'Course', 'Activity Name', 'Learning Outcome', 'Picture/Video Drive Link', showStatus && 'Status']
                    .filter(Boolean)
                    .map(label => <TableCell key={label} sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'action.hover' }}>{label}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {report.rows.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.date)}</TableCell>
                    {showSchool && <TableCell>{row.schoolName}</TableCell>}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.grade}</TableCell>
                    <TableCell align="center">{row.presentStudents ?? '—'}</TableCell>
                    <TableCell>{row.trainerName}</TableCell>
                    <TableCell>{row.course || '—'}</TableCell>
                    <TableCell>{row.activityName}</TableCell>
                    <TableCell sx={{ minWidth: 260, color: 'text.secondary' }}>{row.learningOutcome || '—'}</TableCell>
                    <TableCell>{row.photosLink ? <Link href={row.photosLink} target="_blank" rel="noopener noreferrer">Open link</Link> : '—'}</TableCell>
                    {showStatus && <TableCell><Chip size="small" color={STATUS_COLORS[row.status] || 'default'} label={row.status} /></TableCell>}
                  </TableRow>
                ))}
                {!report.rows.length && (
                  <TableRow><TableCell colSpan={10} sx={{ color: 'text.secondary', py: 3 }}>No school activities match these filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
}
