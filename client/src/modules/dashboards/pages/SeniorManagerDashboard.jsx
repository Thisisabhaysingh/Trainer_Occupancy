import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Breadcrumb, Header, Sidebar, StatCard, typography } from '../../../components/dashboard/DashboardComponents';
import { logout } from '../../auth/state/authSlice';
import SeniorManagerActivity from './SeniorManagerActivity';
import DepartmentsDashboard from '../../../components/dashboard/DepartmentsDashboard';
import EmployeesDashboard from '../../../components/dashboard/EmployeesDashboard';
import ProfileDashboard from '../../../components/dashboard/ProfileDashboard';
import ActivityTemplatesDashboard from '../../../components/dashboard/ActivityTemplatesDashboard';
import ToolsDashboard from '../../../components/dashboard/ToolsDashboard';
import ProjectsDashboard from '../../../components/dashboard/ProjectsDashboard';
import TrainerSchedulingDashboard from '../../../components/dashboard/TrainerSchedulingDashboard';
import SchoolActivityMailSettings from '../../../components/dashboard/SchoolActivityMailSettings';
import SchoolReport from '../../../components/dashboard/SchoolReport';
import SchoolManagement from '../../../components/dashboard/SchoolManagement';
import { getNavigationForRole } from '../../../core/navigation/roleNavigation';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const sidebarItems = getNavigationForRole('senior_manager');
const navigation = sidebarItems.flatMap(section => section.items);
const colors = ['#0070F0', '#12B76A', '#F79009', '#5220BE', '#F04438'];
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const number = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const reportTime = (value) => {
  if (!value) return '—';
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function SeniorManagerDashboard() {
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const [active, setActive] = useState('overview');
  const [search, setSearch] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState(null);
  const [retry, setRetry] = useState(0);
  const [overviewStart, setOverviewStart] = useState('');
  const [overviewEnd, setOverviewEnd] = useState('');
  const [overviewRange, setOverviewRange] = useState(null);
  const [rangeAnalytics, setRangeAnalytics] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [employee, setEmployee] = useState('');
  const [reportStart, setReportStart] = useState(dateKey(new Date()));
  const [reportEnd, setReportEnd] = useState(dateKey(new Date()));
  const [reportQuery, setReportQuery] = useState(null);
  const [report, setReport] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const weeks = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil(lastDay / 7) }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth(), index * 7 + 1);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(index * 7 + 7, lastDay));
      return { start: dateKey(start), end: dateKey(end), label: `${start.toLocaleString('en-US', { month: 'short' })} ${start.getDate()} - ${end.getDate()}` };
    });
  }, []);
  const [weekIndex, setWeekIndex] = useState(() => Math.floor((new Date().getDate() - 1) / 7));
  const week = weeks[weekIndex];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    axios.get(`${apiBaseUrl}/api/manager/analytics`, {
      params: { startDate: week.start, endDate: week.end }, withCredentials: true, signal: controller.signal,
    }).then(({ data }) => { setAnalytics(data); setLoadedAt(new Date()); })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.error || 'Could not load dashboard'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [week.start, week.end, retry]);

  useEffect(() => {
    if (!overviewRange) { setRangeAnalytics(null); setRangeLoading(false); return; }
    const controller = new AbortController();
    setRangeLoading(true);
    setRangeError('');
    axios.get(`${apiBaseUrl}/api/manager/analytics`, {
      params: { startDate: overviewRange.start, endDate: overviewRange.end }, withCredentials: true, signal: controller.signal,
    }).then(({ data }) => setRangeAnalytics(data))
      .catch(err => { if (!controller.signal.aborted) setRangeError(err.response?.data?.error || 'Could not load overview range'); })
      .finally(() => { if (!controller.signal.aborted) setRangeLoading(false); });
    return () => controller.abort();
  }, [overviewRange]);

  useEffect(() => {
    if (!reportQuery) return;
    const controller = new AbortController();
    setReportLoading(true);
    setReport([]);
    axios.get(`${apiBaseUrl}/api/manager/employee/${encodeURIComponent(reportQuery.employee)}/activities-by-date`, {
      params: { startDate: reportQuery.start, endDate: reportQuery.end }, withCredentials: true, signal: controller.signal,
    }).then(({ data }) => setReport(data.flatMap(activity => (activity.timeEntries || []).map((entry, index) => ({
      id: `${activity.id}-${index}`, title: activity.title, date: new Date(entry.date).toLocaleDateString('en-IN'),
      time: `${reportTime(entry.punchIn || activity.startTime)} - ${reportTime(entry.punchOut || activity.endTime)}`,
      hours: (Number(entry.duration || 0) / 60).toFixed(2), comment: entry.comment || activity.comment,
    })))))
      .catch(err => { if (!controller.signal.aborted) setReportError(err.response?.data?.error || 'Could not load report'); })
      .finally(() => { if (!controller.signal.aborted) setReportLoading(false); });
    return () => controller.abort();
  }, [reportQuery]);

  const panel = { p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(16,24,40,0.08)' };
  const summary = rangeAnalytics || analytics;
  const departmentCards = summary?.departmentCards || [];
  const productivity = departmentCards.length ? departmentCards.reduce((sum, item) => sum + Number(item.productivity || 0) * Number(item.employees || 0), 0) / (Number(summary?.totalEmployees) || 1) : 0;
  const employees = analytics?.employees || [];
  const cards = [
    { title: 'Total Employees', value: number(summary?.totalEmployees), icon: 'users', color: 'primary' },
    { title: overviewRange ? 'Avg Hours' : 'Avg Hours/Week', value: number(summary?.avgHours), icon: 'session', color: 'success' },
    { title: 'Total Hours', value: number(summary?.totalHours), icon: 'session', color: 'warning' },
    { title: 'Productivity Score', value: `${number(productivity)}%`, icon: 'utilization', color: 'purple' },
    { title: 'Overtime Hours', value: number(summary?.overtimeHours), icon: 'session', color: 'error' },
  ];
  const applyRange = () => {
    if (!overviewStart || !overviewEnd || overviewStart > overviewEnd) { setRangeError('Select a valid start and end date.'); return; }
    setOverviewRange({ start: overviewStart, end: overviewEnd });
  };
  const loadReport = () => {
    if (!employee || !reportStart || !reportEnd || reportStart > reportEnd) { setReportError('Select an employee and a valid date range.'); return; }
    setReportError('');
    setReportQuery({ employee, employeeName: employees.find(item => item.employeeCode === employee)?.name || employee, start: reportStart, end: reportEnd });
  };
  const title = navigation.find(item => item.id === active)?.label;
  const selectSection = (id) => {
    if (id === 'reportcard' || id === 'assessments') { setActive('tools'); return; }
    const item = navigation.find(entry => entry.id === id);
    if (item?.route) navigate(item.route);
    else setActive(id);
  };

  return <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#F9FAFB' }}>
    <Sidebar items={sidebarItems} activeItem={active} onItemClick={selectSection}
      user={{ name: user?.name, role: 'Senior Manager' }} onLogout={async () => { await dispatch(logout()); navigate('/login'); }} />
    <Box sx={{ flex: 1, ml: '240px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Header searchValue={search} onSearchChange={setSearch} searchOptions={navigation} onSearchSelect={option => selectSection(option.id)}
        user={{ name: user?.name }} onUserClick={() => setActive('profile')} />
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
        <Breadcrumb items={[{ label: 'Senior Manager' }, { label: title, active: true }]} separator="›" />
        <Box sx={{ mb: 4 }}><Typography sx={{ ...typography.subheadingS2, mb: 0.5 }}>{title}</Typography>
          {loadedAt && <Typography color="text.secondary" sx={typography.paragraphSmall}>Last refreshed: {loadedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })} by {user?.name}</Typography>}
        </Box>
        {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button onClick={() => setRetry(value => value + 1)}>Retry</Button>}>{error}</Alert>}
        {loading && ['overview', 'departments', 'employees'].includes(active) && <CircularProgress aria-label="Loading dashboard" sx={{ mb: 3 }} />}
        {active === 'overview' && analytics && <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 3, mb: 3, opacity: rangeLoading ? 0.6 : 1 }}>
            {cards.map(card => <StatCard key={card.title} {...card} compact sx={{ minHeight: 152 }} />)}
          </Box>
          <Paper elevation={0} sx={panel}><Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xl: 'center' }}>
            <Box><Typography fontWeight={700} sx={{ mb: 1 }}>Overview Range</Typography><Typography color="text.secondary">Pick a custom date range to refresh the overview metrics without impacting other tabs.</Typography></Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField size="small" type="date" label="Start Date" value={overviewStart} onChange={event => setOverviewStart(event.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField size="small" type="date" label="End Date" value={overviewEnd} onChange={event => setOverviewEnd(event.target.value)} InputLabelProps={{ shrink: true }} />
              <Button variant="contained" disabled={rangeLoading} onClick={applyRange}>Apply</Button>
              <Button variant="outlined" disabled={!overviewStart && !overviewEnd && !overviewRange} onClick={() => { setOverviewStart(''); setOverviewEnd(''); setOverviewRange(null); setRangeError(''); }}>Reset</Button>
            </Stack>
          </Stack>{overviewRange && <Typography color="text.secondary" sx={{ mt: 2 }}>{overviewRange.start} to {overviewRange.end}</Typography>}</Paper>
          {rangeError && <Alert severity="error" sx={{ mb: 3 }}>{rangeError}</Alert>}
          <Paper elevation={0} sx={{ ...panel, p: 4 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>Weekly Hours ({analytics.department})</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}><InputLabel id="senior-week-label">Select Week</InputLabel><Select labelId="senior-week-label" label="Select Week" value={weekIndex} onChange={event => setWeekIndex(event.target.value)}>
                {weeks.map((item, index) => <MenuItem key={item.start} value={index}>{item.label}</MenuItem>)}
              </Select></FormControl>
            </Stack>
            <ResponsiveContainer width="100%" height={280}><BarChart data={analytics.daywiseHoursData || []}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Legend />
              {(analytics.departmentOptions?.length ? analytics.departmentOptions : [analytics.department]).map((department, index) => <Bar key={department} dataKey={department} fill={colors[index % colors.length]} radius={[8, 8, 0, 0]} maxBarSize={32} />)}
            </BarChart></ResponsiveContainer>
          </Paper>
        </>}
        {active === 'myactivity' && <SeniorManagerActivity embedded />}
        {active === 'departments' && !loading && analytics && <DepartmentsDashboard
          analytics={analytics} availableWeeks={weeks} selectedWeekIndex={weekIndex} onWeekChange={setWeekIndex}
        />}
        {active === 'employees' && !loading && analytics && <EmployeesDashboard analytics={analytics} />}
        {active === 'datewisereport' && <Paper elevation={0} sx={{ ...panel, borderRadius: 2, borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0' }}>
          <Box component="form" onSubmit={event => { event.preventDefault(); loadReport(); }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
              <FormControl fullWidth size="small" disabled={loading || reportLoading} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 }, '& fieldset': { borderColor: 'divider' } }}>
                <InputLabel id="senior-report-employee" shrink>Employee</InputLabel>
                <Select labelId="senior-report-employee" label="Employee" displayEmpty value={employee} onChange={event => setEmployee(event.target.value)}
                  renderValue={selected => { const match = employees.find(item => item.employeeCode === selected); return match ? `${match.name} (${match.employeeCode})` : 'Select Employee'; }}>
                  <MenuItem value="" disabled>Select Employee</MenuItem>
                  {employees.map(item => <MenuItem key={item.employeeCode} value={item.employeeCode}>{item.name} ({item.employeeCode})</MenuItem>)}
                </Select>
              </FormControl>
              <TextField fullWidth size="small" disabled={reportLoading} type="date" label="Start Date" value={reportStart} onChange={event => setReportStart(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 }, '& fieldset': { borderColor: 'divider' } }} />
              <TextField fullWidth size="small" disabled={reportLoading} type="date" label="End Date" value={reportEnd} onChange={event => setReportEnd(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 }, '& fieldset': { borderColor: 'divider' } }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mt: 2 }}>
              <Button type="submit" variant="contained" disabled={loading || reportLoading || !employee || !reportStart || !reportEnd} sx={{ minHeight: 40, fontWeight: 600, textTransform: 'none', borderRadius: 1 }}>
                {reportLoading ? <CircularProgress size={22} color="inherit" aria-label="Loading report" /> : 'Show Activity'}
              </Button>
              <Button variant="outlined" disabled={reportLoading} onClick={() => { setEmployee(''); setReportStart(dateKey(new Date())); setReportEnd(dateKey(new Date())); setReportQuery(null); setReport([]); setReportError(''); }} sx={{ minHeight: 40, fontWeight: 600, textTransform: 'none', borderRadius: 1, color: 'text.secondary', borderColor: 'divider' }}>Reset</Button>
            </Box>
          </Box>
          {reportError && <Alert severity="error" sx={{ mt: 2 }}>{reportError}</Alert>}
          {!reportQuery && <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>Select an employee and date range, then choose Show Activity to view the report.</Alert>}
          {reportQuery && !reportLoading && !reportError && <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Activities for {reportQuery.employeeName} from {reportQuery.start} to {reportQuery.end}</Typography>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
              <Table stickyHeader sx={{ minWidth: 650 }}>
                <TableHead><TableRow>{['Date', 'Time', 'Activity Title', 'Time Spent (h)', 'Comment'].map(label => <TableCell key={label} align="center" sx={{ fontWeight: 600, fontSize: 13, bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.8)' : '#F9FAFB', color: 'text.secondary', py: 1.5 }}>{label}</TableCell>)}</TableRow></TableHead>
                <TableBody>{report.length ? report.map(row => <TableRow key={row.id} sx={{ '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.6)' : '#F9FAFB' }, '&:last-child td': { borderBottom: 'none' } }}>
                  <TableCell align="center" sx={{ fontWeight: 500 }}>{row.date}</TableCell>
                  <TableCell align="center" sx={{ color: 'text.secondary' }}>{row.time}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 500 }}>{row.title}</TableCell>
                  <TableCell align="center" sx={{ color: Number(row.hours) > 0 ? '#0070F0' : 'text.secondary', fontWeight: Number(row.hours) > 0 ? 700 : 500 }}>{row.hours}</TableCell>
                  <TableCell align="center" sx={{ color: 'text.secondary', maxWidth: 240, overflowWrap: 'anywhere' }}>{row.comment || '—'}</TableCell>
                </TableRow>) : <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary', borderBottom: 'none' }}>No activities found for this date range.</TableCell></TableRow>}</TableBody>
              </Table>
            </TableContainer>
          </Box>}
        </Paper>}
        {active === 'profile' && <ProfileDashboard user={user} manager={analytics?.manager} branch={analytics?.branch} />}
        {active === 'activitytemplates' && <ActivityTemplatesDashboard visibility="manager" departmentId={user?.departmentId || analytics?.manager?.department?.id || user?.department?.id || (typeof user?.department === 'number' ? user.department : null)} departmentName={analytics?.manager?.department?.name || user?.department?.name} />}
        {active === 'tools' && <ToolsDashboard user={user} />}
        {active === 'projectmanagement' && <ProjectsDashboard />}
        {active === 'calendar' && <TrainerSchedulingDashboard key="calendar" mode="calendar" employeeOptions={employees} />}
        {active === 'traineroccupancy' && <TrainerSchedulingDashboard key="occupancy" mode="occupancy" employeeOptions={employees} />}
        {active === 'mailautomation' && <SchoolActivityMailSettings />}
        {active === 'schoolreport' && <SchoolReport />}
        {active === 'schoolmanagement' && <SchoolManagement />}
      </Box>
    </Box>
  </Box>;
}
