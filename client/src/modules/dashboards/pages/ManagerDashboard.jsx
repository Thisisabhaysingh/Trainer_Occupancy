import { employeeActivityTemplates } from '../../../utils/activityTemplates.mjs';
import React, { useState, useEffect, useMemo, useCallback } from 'react';

import {
  Container, Grid, Paper, Typography, Button, Tabs, Tab, Box, Avatar, TextField, InputLabel , MenuItem, Select, FormControl, OutlinedInput, IconButton, Collapse, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, InputAdornment, Stack, Chip, Table, TableHead, TableRow, TableCell, TableBody, TableContainer
} from '@mui/material';
import { Search, ArrowDropDown, ArrowUpward, ArrowDownward, AccessTime, TrendingUp, BarChart, Add as AddIcon, GetApp, Delete as DeleteIcon, Search as SearchIcon, Edit as EditIcon, Group, Timer, Schedule, MoreTime, CheckCircle, PauseCircle, Cancel, Login, Schedule as ClockIcon, MenuBook, Assessment } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { logout } from '../../auth/state/authSlice';
import axios from 'axios';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { StatCard, PageHeader, FilterBar, DataTable, TabNavigation, Pagination, StatusChip, AvatarCell, Sidebar, Header, Breadcrumb, typography } from '../../../components/dashboard/DashboardComponents';
import ProjectsDashboard from '../../../components/dashboard/ProjectsDashboard';
import ToolsDashboard from '../../../components/dashboard/ToolsDashboard';
import ProfileDashboard from '../../../components/dashboard/ProfileDashboard';
import ActivityTemplatesDashboard from '../../../components/dashboard/ActivityTemplatesDashboard';
import TrainerSchedulingDashboard from '../../../components/dashboard/TrainerSchedulingDashboard';
import SchoolActivityMailSettings from '../../../components/dashboard/SchoolActivityMailSettings';
import SchoolReport from '../../../components/dashboard/SchoolReport';
import SchoolManagement from '../../../components/dashboard/SchoolManagement';
import { getNavigationForRole } from '../../../core/navigation/roleNavigation';
import EmployeesDashboard from '../../../components/dashboard/EmployeesDashboard';
import DepartmentsDashboard from '../../../components/dashboard/DepartmentsDashboard';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="14px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const COLORS = ['#4285F4', '#34A853', '#A142F4', '#fbc02d', '#e53935'];
const DEPT_COLORS = {
  Coding: '#4285F4',
  Mechatronics: '#34A853',
  Electronics: '#A142F4',
};

const CORE_MANAGER_TEMPLATES = [
  'Total No. of Sessions',
  'School Session',
  'Institute Session'
];

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';


const employeeSummaryCardBase = {
  p: 3,
  borderRadius: 3,
  minWidth: 220,
  width: '100%',
  minHeight: 200,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 1.5,
  bgcolor: 'background.paper',
  border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
  boxShadow: theme => theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
};


const INITIAL_MANAGER_ACTIVITY = {
  templateId: '',
  description: '',
  comment: '',
  startTime: '',
  endTime: '',
  sessionType: 'Offline',
  institute: '0',
  school: '0',
  sessionsCount: '',
  schoolName: '',
  branchLocation: '',
  attendanceType: ''
};

const INITIAL_ASSIGN_ACTIVITY = {
  title: '',
  description: '',
  assignedToId: '',
  priority: 'medium',
  status: 'pending'
};

const getTodayDateString = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const safeBuildDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (value) => {
  const date = safeBuildDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};



const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={3} sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, minWidth: 120 }}>
        <Typography fontWeight={700} sx={{ mb: 1 }}>{label}</Typography>
        {payload.map((entry, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: entry.color, mr: 1 }} />
            <Typography variant="body2" sx={{ flex: 1 }}>{entry.name}</Typography>
            <Typography variant="body2" fontWeight={700}>{entry.value}h</Typography>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

const AddMemberDialog = ({ open, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    email: '',
    role: 'employee'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${apiBaseUrl}/api/manager/employees`,
        formData,
        { 
          withCredentials: true 
        }
      );

      onAdd(response.data);
      onClose();
      setFormData({ employeeCode: '', name: '', email: '', role: 'employee' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Team Member</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Alert severity="info" sx={{ mb: 2 }}>
            Default password will be password123. A welcome email will ask the user to change it before using MIS.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Employee Code"
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>
            {/* Department selection is not needed; manager's department is applied server-side */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="team_lead">Team Lead</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{ 
              bgcolor: '#222',
              '&:hover': { bgcolor: '#000' }
            }}
          >
            {loading ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogActions>
        </form>
    </Dialog>
  );
};

const DownloadExcelDialog = ({ open, onClose, employees, defaultEmployee, onDownload }) => {
  const [employeeId, setEmployeeId] = useState(defaultEmployee || '');
  const [month, setMonth] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmployeeId(defaultEmployee || '');
  }, [defaultEmployee]);

  const handleDownload = async () => {
    setError('');
    if (!employeeId || !month) {
      setError('Please select both employee and month.');
      return;
    }
    setDownloading(true);
    try {
      await onDownload(employeeId, month);
      onClose();
    } catch (err) {
      setError('Failed to download Excel.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Download Activities Excel</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="excel-employee-label">Employee</InputLabel>
          <Select
            labelId="excel-employee-label"
            value={employeeId}
            label="Employee"
            onChange={e => setEmployeeId(e.target.value)}
          >
                {employees.map(emp => {
                  const key = emp._id || emp.id || emp.employeeCode;
                  return (
                    <MenuItem key={key} value={key}>{emp.name}</MenuItem>
                  );
                })}
          </Select>
        </FormControl>
        <TextField
          label="Month"
          type="month"
          fullWidth
          value={month}
          onChange={e => setMonth(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<GetApp />}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const ManagerDashboard = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));

  // Theme-aware helpers (matching EmployeeDashboard)
  const isDarkMode = theme.palette.mode === 'dark';
  const darkCardBg = isDarkMode ? 'rgba(35,39,47,0.95)' : '#fff';
  const darkGlassBg = isDarkMode ? 'rgba(35,39,47,0.85)' : 'rgba(255, 255, 255, 0.7)';
  const glassStyle = {
    background: darkGlassBg,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 4,
    boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.12)',
  };

  const [selectedTab, setSelectedTab] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState({});
  const [employeeDateFilters, setEmployeeDateFilters] = useState({});
  const [employeeLoading, setEmployeeLoading] = useState({});
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportError, setReportError] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingDatewise, setDownloadingDatewise] = useState(false);
  const [showSessionsTable, setShowSessionsTable] = useState(false);
  const [error, setError] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState('');
  const [selectedWeekRange, setSelectedWeekRange] = useState(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [employeesWithActivityToday, setEmployeesWithActivityToday] = useState([]);
  const [activityTemplates, setActivityTemplates] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [sessionDistribution, setSessionDistribution] = useState(null);
  const [sessionDistributionDatewise, setSessionDistributionDatewise] = useState([]);
  const [allDepartmentEmployees, setAllDepartmentEmployees] = useState([]);
  const [overviewStart, setOverviewStart] = useState('');
  const [overviewEnd, setOverviewEnd] = useState('');
  const [overviewSummary, setOverviewSummary] = useState(null);
  const [overviewAppliedRange, setOverviewAppliedRange] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [managerAttendance, setManagerAttendance] = useState({ type: null, standardHours: null });
  const [managerAttendanceLoading, setManagerAttendanceLoading] = useState(false);
  const [managerAttendanceError, setManagerAttendanceError] = useState('');
  const [managerSelectedDate, setManagerSelectedDate] = useState(getTodayDateString());
  const [managerPendingDate, setManagerPendingDate] = useState(getTodayDateString());
  const [managerHasLoggedActivity, setManagerHasLoggedActivity] = useState(false);
  const [managerMarkingAttendance, setManagerMarkingAttendance] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [totalEmployeesBaseline, setTotalEmployeesBaseline] = useState(null);
  const [managerActivity, setManagerActivity] = useState({ ...INITIAL_MANAGER_ACTIVITY });
  const [managerTemplateId, setManagerTemplateId] = useState('');
  const [managerActivities, setManagerActivities] = useState([]);
  const [loadingManagerActivities, setLoadingManagerActivities] = useState(false);
  const [managerActivityError, setManagerActivityError] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);
  const [editManagerDialogOpen, setEditManagerDialogOpen] = useState(false);
  const [editManagerActivity, setEditManagerActivity] = useState(null);
  const [deleteManagerDialogOpen, setDeleteManagerDialogOpen] = useState(false);
  const [deleteManagerActivity, setDeleteManagerActivity] = useState(null);

  const todayDateString = useMemo(() => getTodayDateString(), []);
  const managerSelectedDateObj = useMemo(() => safeBuildDate(managerSelectedDate), [managerSelectedDate]);
  const managerPendingDateObj = useMemo(() => safeBuildDate(managerPendingDate), [managerPendingDate]);

  const isManagerFutureDate = useMemo(() => {
    if (!managerPendingDateObj) return false;
    const today = safeBuildDate(todayDateString);
    return !!today && managerPendingDateObj > today;
  }, [managerPendingDateObj, todayDateString]);
  const managerSelectedDateLabel = useMemo(() => {
    if (!managerSelectedDateObj) return '';
    return managerSelectedDateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [managerSelectedDateObj]);
  const managerAttendanceLabel = useMemo(() => {
    if (managerAttendance?.type === 'full_day') return 'Full Day';
    if (managerAttendance?.type === 'half_day') return 'Half Day';
    if (managerAttendance?.type === 'leave') return 'Leave';
    return 'Not Marked';
  }, [managerAttendance]);

  const canManagerLogActivity = useMemo(() => (
    managerAttendance?.type && managerAttendance.type !== 'leave'
  ), [managerAttendance]);

  const managerActivityDate = managerSelectedDate || todayDateString;
  const managerActivityFormDisabled = managerAttendanceLoading || isManagerFutureDate || !canManagerLogActivity;

  const managerTemplateOptions = useMemo(() => {
    const list = Array.isArray(activityTemplates) ? [...activityTemplates] : [];
    CORE_MANAGER_TEMPLATES.forEach(title => {
      const hasTemplate = list.some(tpl => (tpl.title || '').toLowerCase() === title.toLowerCase());
      if (!hasTemplate) {
        list.push({ id: `core-${title.replace(/\s+/g, '-').toLowerCase()}`, title });
      }
    });
    return list;
  }, [activityTemplates]);

  const ensureDateFilterEntry = useCallback((employeeCode, targetDate = getTodayDateString()) => {
    if (!employeeCode) return;

    setEmployeeDateFilters(prev => {
      const existing = prev[employeeCode];
      if (existing?.selected && existing?.pending) {
        return prev;
      }

      const resolvedDate = targetDate || existing?.selected || existing?.pending || getTodayDateString();

      return {
        ...prev,
        [employeeCode]: {
          selected: existing?.selected || resolvedDate,
          pending: existing?.pending || resolvedDate
        }
      };
    });
  }, []);

  const fetchEmployeeAnalyticsData = useCallback(async (employeeCode, date = getTodayDateString()) => {
    if (!employeeCode) return;

    setEmployeeLoading(prev => ({ ...prev, [employeeCode]: true }));
    try {
      const res = await axios.get(`${apiBaseUrl}/api/manager/employee/${employeeCode}/analytics`, {
        params: { date },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 200) {
        setEmployeeAnalytics(prev => ({
          ...prev,
          [employeeCode]: res.data
        }));
      } else {
        setEmployeeAnalytics(prev => ({
          ...prev,
          [employeeCode]: { error: res.data?.error || 'Failed to load analytics' }
        }));
      }
    } catch (err) {
      setEmployeeAnalytics(prev => ({
        ...prev,
        [employeeCode]: { error: err.response?.data?.error || 'Failed to load analytics' }
      }));
      ensureDateFilterEntry(employeeCode, date);
    } finally {
      setEmployeeLoading(prev => ({ ...prev, [employeeCode]: false }));
    }
  }, [apiBaseUrl, ensureDateFilterEntry]);

  const handleEmployeeDateChange = useCallback((employeeCode, value) => {
    if (!employeeCode) return;
    const fallback = getTodayDateString();
    const normalized = value || '';

    setEmployeeDateFilters(prev => {
      const existing = prev[employeeCode];
      const resolved = normalized || fallback;
      return {
        ...prev,
        [employeeCode]: {
          selected: existing?.selected || resolved,
          pending: resolved
        }
      };
    });
  }, []);

  const handleApplyEmployeeDate = useCallback((employeeCode) => {
    if (!employeeCode) return;

    const fallback = getTodayDateString();
    const current = employeeDateFilters[employeeCode];
    const pending = current?.pending;
    const targetDate = pending || current?.selected || fallback;
    if (!targetDate) return;

    setEmployeeDateFilters(prev => ({
      ...prev,
      [employeeCode]: {
        selected: targetDate,
        pending: targetDate
      }
    }));

    fetchEmployeeAnalyticsData(employeeCode, targetDate);
  }, [employeeDateFilters, fetchEmployeeAnalyticsData]);

  const handleResetEmployeeDate = useCallback((employeeCode) => {
    if (!employeeCode) return;
    const today = getTodayDateString();

    setEmployeeDateFilters(prev => ({
      ...prev,
      [employeeCode]: {
        selected: today,
        pending: today
      }
    }));

    fetchEmployeeAnalyticsData(employeeCode, today);
  }, [fetchEmployeeAnalyticsData]);

  const fetchManagerAttendanceStatus = useCallback(async (date) => {
    const targetDate = date || managerSelectedDate || getTodayDateString();
    if (!targetDate) return;

    setManagerAttendanceLoading(true);
    setManagerAttendanceError('');
    try {
      const res = await axios.get(`${apiBaseUrl}/api/workday/status`, {
        params: { date: targetDate },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 200) {
        setManagerAttendance({
          type: res.data?.attendanceType ?? null,
          standardHours: res.data?.standardHours ?? null
        });
      } else {
        setManagerAttendance({ type: null, standardHours: null });
        setManagerAttendanceError(res.data?.error || 'Failed to load attendance status');
      }
    } catch (err) {
      setManagerAttendance({ type: null, standardHours: null });
      setManagerAttendanceError(err.response?.data?.error || 'Failed to load attendance status');
    } finally {
      setManagerAttendanceLoading(false);
    }
  }, [apiBaseUrl, managerSelectedDate]);


  const handleMarkManagerAttendance = useCallback(async (type) => {
    if (managerHasLoggedActivity) {
      setSnackbar({ open: true, message: 'Attendance cannot be changed after logging an activity.', severity: 'warning' });
      return;
    }

    if (isManagerFutureDate) {
      setSnackbar({ open: true, message: 'Cannot mark attendance for a future date.', severity: 'warning' });
      return;
    }

    setManagerMarkingAttendance(true);
    try {
      const res = await axios.post(`${apiBaseUrl}/api/workday/mark-attendance`, {
        attendanceType: type,
        date: managerSelectedDate
      }, { withCredentials: true });

      const nextAttendanceType = res.data?.attendanceType || type;
      const nextStandardHours = res.data?.standardHours ?? (type === 'full_day' ? 9 : type === 'half_day' ? 4.5 : 0);
      setManagerAttendance({ type: nextAttendanceType, standardHours: nextStandardHours });
      setSnackbar({
        open: true,
        message: res.data?.message || `Attendance marked as ${nextAttendanceType.replace('_', ' ')}`,
        severity: 'success'
      });
      await fetchManagerAttendanceStatus(managerSelectedDate);
    } catch (error) {
      console.error('Manager mark attendance error:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || 'Failed to mark attendance',
        severity: 'error'
      });
    } finally {
      setManagerMarkingAttendance(false);
    }
  }, [apiBaseUrl, managerSelectedDate, isManagerFutureDate, managerHasLoggedActivity, fetchManagerAttendanceStatus, setSnackbar]);

  const handleResetManagerAttendance = useCallback(() => {
    if (managerHasLoggedActivity) {
      setSnackbar({ open: true, message: 'Attendance cannot be reset after logging an activity.', severity: 'warning' });
      return;
    }
    setManagerAttendance({ type: null, standardHours: null });
  }, [managerHasLoggedActivity, setSnackbar]);

  const handleManagerPendingDateChange = useCallback((event) => {
    const nextValue = event?.target?.value || '';
    setManagerPendingDate(nextValue);
    setManagerSelectedDate(nextValue);
    fetchManagerAttendanceStatus(nextValue);
  }, [fetchManagerAttendanceStatus]);

  const handleResetManagerSelectedDate = useCallback(() => {
    const today = getTodayDateString();
    setManagerPendingDate(today);
    setManagerSelectedDate(today);
    fetchManagerAttendanceStatus(today);
  }, [fetchManagerAttendanceStatus]);

  useEffect(() => {
    fetchManagerAttendanceStatus(managerSelectedDate);
  }, [fetchManagerAttendanceStatus, managerSelectedDate]);

  const fetchAllDepartmentEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/manager/employees`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 200) {
        if (Array.isArray(res.data)) {
          setAllDepartmentEmployees(res.data);
        } else if (res.data && Array.isArray(res.data.employees)) {
          setAllDepartmentEmployees(res.data.employees);
        } else if (res.data && res.data.employees) {
          setAllDepartmentEmployees(Object.values(res.data.employees));
        }
      }
    } catch (err) {
      console.error('Error fetching department employees:', err);
      if (employees && employees.length > 0) {
        setAllDepartmentEmployees(employees);
      } else {
        setAllDepartmentEmployees([]);
      }
    }
  }, [employees]);

  const formatRangeParam = (value, isEnd = false) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = isEnd ? '23:59:59' : '00:00:00';
    return `${year}-${month}-${day}T${time}`;
  };

  async function fetchData(overrideRange = null) {
    setLoading(true);
    try {
      console.log('=== FETCHING ANALYTICS DATA ===');

      const params = new URLSearchParams();
      const effectiveRange = overrideRange || selectedWeekRange;
      if (effectiveRange?.start && effectiveRange?.end) {
        const startParam = formatRangeParam(effectiveRange.start, false);
        const endParam = formatRangeParam(effectiveRange.end, true);
        if (startParam) params.append('startDate', startParam);
        if (endParam) params.append('endDate', endParam);
      } else {
        params.append('week', 'true');
      }
      if (overviewAppliedRange?.start && overviewAppliedRange?.end) {
        params.append('overviewStartDate', overviewAppliedRange.start);
        params.append('overviewEndDate', overviewAppliedRange.end);
      }

      const queryString = params.toString();
      const analyticsUrl = `${apiBaseUrl}/api/manager/analytics${queryString ? `?${queryString}` : ''}`;

      const analyticsRes = await axios.get(analyticsUrl, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('=== ANALYTICS RESPONSE ===');
      console.log('Status:', analyticsRes.status);
      console.log('Data keys:', Object.keys(analyticsRes.data));
      console.log('Is Branch Manager:', analyticsRes.data.isBranchManager);
      console.log('Department:', analyticsRes.data.department);
      console.log('Employees count:', analyticsRes.data.employees?.length || 0);

      if (analyticsRes.data.employees?.length > 0) {
        console.log('Sample employees:');
        analyticsRes.data.employees.slice(0, 3).forEach((emp, idx) => {
          console.log(`Employee ${idx + 1}:`, {
            name: emp.name,
            department: emp.department?.name || 'No Department',
            branch: emp.branch?.name || 'No Branch',
            employeeCode: emp.employeeCode
          });
        });
      }

      setAnalytics(analyticsRes.data);
      const nextTotalEmployees = analyticsRes.data.totalEmployees ?? analyticsRes.data.totalExpectedEmployees ?? analyticsRes.data.employees?.length ?? null;
      if (nextTotalEmployees != null) {
        setTotalEmployeesBaseline(prev => (prev == null ? nextTotalEmployees : prev));
      }
      if (analyticsRes.data.overviewSummary) {
        setOverviewSummary(analyticsRes.data.overviewSummary);
        setOverviewAppliedRange({
          start: analyticsRes.data.overviewSummary.rangeStart,
          end: analyticsRes.data.overviewSummary.rangeEnd
        });
      } else if (!overrideRange) {
        setOverviewSummary(null);
        setOverviewAppliedRange(null);
      }

      if (analyticsRes.data.isBranchManager) {
        const depts = ['All'];

        try {
          if (analyticsRes.data.departmentCards?.length > 0) {
            const departmentNames = analyticsRes.data.departmentCards
              .map(dept => dept?.name)
              .filter(Boolean);
            depts.push(...departmentNames);
          } else if (analyticsRes.data.employees?.length > 0) {
            const employeeDepartments = analyticsRes.data.employees
              .map(emp => {
                if (typeof emp.department === 'string') return emp.department;
                if (emp.department?.name) return emp.department.name;
                return null;
              })
              .filter(Boolean);
            depts.push(...new Set(employeeDepartments));
          }

          setDepartments(depts.sort());
        } catch (error) {
          console.error('Error processing departments:', error);
          setDepartments(['All']);
        }
      } else if (analyticsRes.data.department) {
        try {
          const deptName = typeof analyticsRes.data.department === 'string'
            ? analyticsRes.data.department
            : (analyticsRes.data.department?.name || 'My Department');
          setDepartments([deptName]);
          setDeptFilter(deptName);
        } catch (error) {
          console.error('Error setting department:', error);
          setDepartments(['My Department']);
          setDeptFilter('My Department');
        }
      } else {
        setDepartments(['My Department']);
        setDeptFilter('My Department');
      }

      if (analyticsRes.data.employees) {
        analyticsRes.data.employees.slice(0, 5).forEach(emp => {
          const id = emp.employeeCode;
          if (!id) return;
          const existingFilter = employeeDateFilters[id];
          const targetDate = existingFilter?.selected || getTodayDateString();
          if (!employeeAnalytics[id]) {
            fetchEmployeeAnalyticsData(id, targetDate);
          }
        });
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics. Please try again later.');
      setDepartments(['All']);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const weeks = [];
    let cursor = new Date(monthStart);
    while (cursor <= monthEnd) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + 6);
      if (end > monthEnd) {
        end.setTime(monthEnd.getTime());
      }

      const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { day: 'numeric' })}`;
      weeks.push({ label, start, end });

      cursor.setDate(cursor.getDate() + 7);
    }

    setAvailableWeeks(weeks);
    const currentIdx = weeks.findIndex(week => now >= week.start && now <= week.end);
    const idxToUse = currentIdx >= 0 ? currentIdx : 0;
    const initialWeek = weeks[idxToUse] || null;
    const initialRange = initialWeek
      ? {
          start: new Date(initialWeek.start),
          end: new Date(initialWeek.end)
        }
      : null;

    setSelectedWeekIndex(initialWeek ? idxToUse.toString() : '');
    setSelectedWeekRange(initialRange);

    fetchData(initialRange);
    fetchEmployeesWithActivityToday();
    fetchActivityTemplates();
    fetchAllDepartmentEmployees(); // Fetch all employees for the department
    
    // Use relative URL for the proxy
    axios.get(`${apiBaseUrl}/api/auth/me`, { 
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        setUser(res.data);
      })
      .catch((err) => {
        console.error('Auth error:', err);
        // If unauthorized, redirect to login
        if (err.response?.status === 401) {
          dispatch(logout());
          navigate('/');
        }
        setUser(null);
      });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (analytics && analytics.employees) {
      analytics.employees.forEach(emp => {
        const id = emp.employeeCode;
        if (!id) return;
        if (!employeeAnalytics[id]) {
          axios.get(`${apiBaseUrl}/api/manager/employee/${id}/analytics?today=true`, { withCredentials: true })
            .then(res => setEmployeeAnalytics(prev => ({ ...prev, [id]: res.data })))
            .catch(() => setEmployeeAnalytics(prev => ({ ...prev, [id]: { error: 'Failed to load analytics' } })));
        }
      });
    }
    // eslint-disable-next-line
  }, [analytics]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!emp) return false;
      
      const searchLower = search.toLowerCase();
      const matchesSearch = (emp.name?.toLowerCase() || '').includes(searchLower) ||
                          (emp.email?.toLowerCase() || '').includes(searchLower) ||
                          (emp.employeeCode?.toLowerCase() || '').includes(searchLower);
      
      if (deptFilter === 'All') {
        return matchesSearch;
      }
      
      // Handle both string department names and department objects
      let empDeptName = '';
      if (emp.department) {
        empDeptName = typeof emp.department === 'string' 
          ? emp.department 
          : (emp.department.name || '');
      }
      
      const matchesDept = empDeptName === deptFilter;
      
      return matchesSearch && matchesDept;
    });
  }, [employees, search, deptFilter]);

  const fetchEmployeesWithActivityToday = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/manager/employees/with-activity-today`, { 
        withCredentials: true 
      });
      setEmployeesWithActivityToday(res.data);
    } catch (error) {
      console.error('Error fetching employees with activity:', error);
      setEmployeesWithActivityToday([]);
    }
  };

  const fetchActivityTemplates = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/activities/templates`, { 
        withCredentials: true 
      });
      setActivityTemplates(employeeActivityTemplates(res.data));
    } catch (err) {
      console.error('Error fetching activity templates:', err);
      setActivityTemplates(employeeActivityTemplates([]));
    }
  };


  const handleWeekSelectionChange = (value) => {
    const idx = Number(value);
    setSelectedWeekIndex(value);
    const chosen = availableWeeks[idx];
    if (chosen) {
      const range = {
        start: new Date(chosen.start),
        end: new Date(chosen.end)
      };
      setSelectedWeekRange(range);
      fetchData(range);
    } else {
      setSelectedWeekRange(null);
      fetchData(null);
    }
  };

  const fetchAllDepartments = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/departments`, { 
        withCredentials: true 
      });
      setAllDepartments(res.data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setAllDepartments([]);
    }
  };

  const formatNumber = (value, decimals = 1) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return Number((0).toFixed(decimals));
    }
    return Number(num.toFixed(decimals));
  };

  // Calculate frontend overtime (sum of extra hours above 9h for all employees for today only)
  const getFrontendOvertimeToday = () => {
    if (!analytics || !analytics.employees) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalOvertime = 0;
    analytics.employees.forEach(emp => {
      if (!emp.workdays) return;
      emp.workdays.forEach(w => {
        if (w.clockIn && w.clockOut) {
          const inTime = new Date(w.clockIn);
          const outTime = new Date(w.clockOut);
          const hours = (outTime - inTime) / (1000 * 60 * 60);
          if (hours > 9) {
            totalOvertime += (hours - 9);
          }
        }
      });
    });
    return Number(totalOvertime.toFixed(2));
  };

  const hasOverviewSummary = Boolean(overviewSummary);
  const appliedOverviewRange = overviewSummary?.rangeStart && overviewSummary?.rangeEnd
    ? { start: overviewSummary.rangeStart, end: overviewSummary.rangeEnd }
    : overviewAppliedRange;
  const overviewRangeLabel = appliedOverviewRange
    ? `${appliedOverviewRange.start} → ${appliedOverviewRange.end}`
    : '';

  const totalEmployeesValue = totalEmployeesBaseline
    ?? analytics?.totalEmployees
    ?? analytics?.employees?.length
    ?? 0;

  const avgHoursValue = hasOverviewSummary
    ? formatNumber(overviewSummary.avgHours ?? 0, 2)
    : formatNumber(analytics?.departmentCards?.[0]?.avgHours || 0, 2);

  const totalHoursValue = hasOverviewSummary
    ? formatNumber(overviewSummary.totalHours ?? 0, 2)
    : formatNumber(analytics?.departmentCards?.[0]?.totalHours || 0, 2);

  const productivityValue = hasOverviewSummary
    ? `${formatNumber(overviewSummary.productivity ?? 0, 0)}%`
    : (analytics?.departmentCards?.[0]?.productivity !== undefined
        ? `${formatNumber(analytics.departmentCards[0].productivity || 0, 0)}%`
        : '0%');

  const overtimeValue = hasOverviewSummary
    ? formatNumber(overviewSummary.overtimeHours ?? 0, 2)
    : formatNumber(getFrontendOvertimeToday(), 2);

  const summaryCards = [
    {
      label: 'Total Employees',
      value: totalEmployeesValue,
      sub: '',
      icon: <Avatar sx={{ bgcolor: '#e3e8f7', color: '#4285F4' }}><Group /></Avatar>,
    },
    {
      label: hasOverviewSummary ? 'Avg Hours' : 'Avg Hours/Week',
      value: avgHoursValue,
      sub: hasOverviewSummary ? overviewRangeLabel : '',
      icon: <Avatar sx={{ bgcolor: '#e3e8f7', color: '#34A853' }}><AccessTime /></Avatar>,
    },
    {
      label: 'Total Hours',
      value: totalHoursValue,
      sub: hasOverviewSummary ? overviewRangeLabel : '',
      icon: <Avatar sx={{ bgcolor: '#e3e8f7', color: '#A142F4' }}><Timer /></Avatar>,
    },
    {
      label: 'Productivity Score',
      value: productivityValue,
      sub: hasOverviewSummary ? overviewRangeLabel : '',
      icon: <Avatar sx={{ bgcolor: '#e3e8f7', color: '#fbc02d' }}><TrendingUp /></Avatar>,
    },
    {
      label: 'Overtime Hours',
      value: overtimeValue,
      sub: hasOverviewSummary ? overviewRangeLabel : 'Today',
      icon: <Avatar sx={{ bgcolor: '#e3e8f7', color: '#e53935' }}><MoreTime /></Avatar>,
    },
  ];

  const handleApplyOverviewRange = useCallback(async () => {
    if (!overviewStart || !overviewEnd) {
      setOverviewError('Please select both start and end dates.');
      return;
    }

    const start = new Date(`${overviewStart}T00:00:00`);
    const end = new Date(`${overviewEnd}T23:59:59`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setOverviewError('Selected dates are invalid.');
      return;
    }

    if (start > end) {
      setOverviewError('Start date cannot be after end date.');
      return;
    }

    setOverviewLoading(true);
    setOverviewError('');

    try {
      const params = new URLSearchParams();
      const effectiveRange = selectedWeekRange;
      if (effectiveRange?.start && effectiveRange?.end) {
        params.append('startDate', new Date(effectiveRange.start).toISOString());
        params.append('endDate', new Date(effectiveRange.end).toISOString());
      } else {
        params.append('week', 'true');
      }
      params.append('overviewStartDate', overviewStart);
      params.append('overviewEndDate', overviewEnd);

      const response = await axios.get(`${apiBaseUrl}/api/manager/analytics${params.toString() ? `?${params.toString()}` : ''}`, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      });

      setAnalytics(response.data);
      const nextTotalEmployees = response.data.totalEmployees ?? response.data.totalExpectedEmployees ?? response.data.employees?.length ?? null;
      if (nextTotalEmployees != null) {
        setTotalEmployeesBaseline(prev => (prev == null ? nextTotalEmployees : prev));
      }
      const summary = response.data.overviewSummary || null;
      setOverviewSummary(summary);
      setOverviewAppliedRange(summary ? { start: summary.rangeStart, end: summary.rangeEnd } : { start: overviewStart, end: overviewEnd });
    } catch (err) {
      console.error('Overview summary error:', err);
      setOverviewError(err.response?.data?.error || 'Failed to fetch overview summary.');
    } finally {
      setOverviewLoading(false);
    }
  }, [apiBaseUrl, overviewStart, overviewEnd, selectedWeekRange]);

  const handleResetOverviewRange = useCallback(() => {
    setOverviewStart('');
    setOverviewEnd('');
    setOverviewSummary(null);
    setOverviewAppliedRange(null);
    setOverviewError('');
    fetchData(selectedWeekRange);
  }, [fetchData, selectedWeekRange]);

  // Bar chart: Day-wise hours by department
  const weeklyChartData = Array.isArray(analytics?.daywiseHoursData) ? analytics.daywiseHoursData : [];
  const departmentOptions = Array.isArray(analytics?.departmentOptions) ? analytics.departmentOptions : [];

  // Line chart: Department productivity trend
  const lineData = Array.isArray(analytics?.departmentProductivityTrend) ? analytics.departmentProductivityTrend : [];

  // Department performance table
  const departmentPerformance = analytics?.departmentPerformance || [];

  // Pie chart: Distribution of hours among employees
  const pieData = useMemo(() => 
    analytics?.employeeStats?.map(emp => ({
      name: emp.name,
      value: emp.hours || 0
    })) || [],
    [analytics?.employeeStats]
  );
  
  const employeeOptions = useMemo(() => {
    if (Array.isArray(allDepartmentEmployees) && allDepartmentEmployees.length > 0) {
      return allDepartmentEmployees;
    }
    if (Array.isArray(analytics?.employees) && analytics.employees.length > 0) {
      return analytics.employees;
    }
    return [];
  }, [allDepartmentEmployees, analytics]);


  const handleAssignTemplateChange = (event) => {
    const templateId = event.target.value;
    setAssignTemplateId(templateId);

    if (!templateId) {
      setAssignActivity({ ...INITIAL_ASSIGN_ACTIVITY });
      return;
    }

    const selectedTemplate = activityTemplates.find(tpl => String(tpl.id) === String(templateId));
    if (selectedTemplate) {
      setAssignActivity(prev => ({
        ...prev,
        title: selectedTemplate.title || '',
        description: selectedTemplate.description || ''
      }));
    }
  };

  const resetAssignActivityForm = () => {
    setAssignActivity({ ...INITIAL_ASSIGN_ACTIVITY });
    setAssignTemplateId('');
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleAddActivity = async () => {
    try {
      const trimmedTitle = assignActivity.title.trim();
      if (!trimmedTitle) {
        setSnackbar({ open: true, message: 'Activity title is required', severity: 'error' });
        return;
      }

      if (!assignActivity.assignedToId) {
        setSnackbar({ open: true, message: 'Please choose an employee to assign the activity', severity: 'error' });
        return;
      }

      setCreatingActivity(true);

      const payload = {
        title: trimmedTitle,
        description: assignActivity.description?.trim() || '',
        assignedToId: assignActivity.assignedToId,
        priority: assignActivity.priority || 'medium',
        status: assignActivity.status || 'pending'
      };

      await axios.post(`${apiBaseUrl}/api/manager/activities`, payload, { withCredentials: true });
      
      setSnackbar({ open: true, message: 'Activity created successfully!', severity: 'success' });
      resetAssignActivityForm();
      fetchData(); // Refresh data
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error?.response?.data?.error || 'Failed to create activity', 
        severity: 'error' 
      });
    } finally {
      setCreatingActivity(false);
    }
  };


  const handleAddMember = (newEmployee) => {
    setAnalytics(prev => ({
      ...prev,
      employees: [...(prev.employees || []), newEmployee]
    }));
    setSnackbar({
      open: true,
      message: 'Team member added successfully!',
      severity: 'success'
    });
  };

  const handleShowReport = async () => {
    setLoadingReport(true);
    setReportError('');
    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employee/${selectedEmployee}/activities-by-date?startDate=${selectedStartDate}&endDate=${selectedEndDate}`,
        { withCredentials: true }
      );
      console.log(res); 
      setReportData(res.data);
    } catch (err) {
      setReportError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadDatewiseExcel = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      setReportError('Please select both start and end dates.');
      return;
    }

    setDownloadingDatewise(true);
    setReportError('');

    try {
      const url = selectedEmployee === ''
        ? `${apiBaseUrl}/api/manager/employees/activities-excel?startDate=${selectedStartDate}&endDate=${selectedEndDate}`
        : `${apiBaseUrl}/api/manager/employee/${selectedEmployee}/activities-excel?startDate=${selectedStartDate}&endDate=${selectedEndDate}`;

      const res = await axios.get(url, { responseType: 'blob', withCredentials: true });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const filename = selectedEmployee === ''
        ? `all_employees_activities_${selectedStartDate}_to_${selectedEndDate}.xlsx`
        : `employee_activities_${selectedStartDate}_to_${selectedEndDate}.xlsx`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setReportError(err.response?.data?.error || 'Failed to download report.');
    } finally {
      setDownloadingDatewise(false);
    }
  };

  const handleDownloadExcel = async (employeeId, month) => {
    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employee/${employeeId}/activities-excel?month=${month}`,
        { responseType: 'blob', withCredentials: true }
      );
      // Create a link to download the file
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employee_activities_${month}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      throw err;
    }
  };

  const handleCreateActivityTemplate = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = data.get('title');
    if (!title) {
      setSnackbar({ open: true, message: 'Activity name is required.', severity: 'error' });
      return;
    }
    try {
      await axios.post(`${apiBaseUrl}/api/activities/template`, { title }, { withCredentials: true });
      setSnackbar({ open: true, message: 'Activity name created successfully!', severity: 'success' });
      e.target.reset();
    fetchActivityTemplates();
    fetchAllDepartments();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to create activity name', severity: 'error' });
    }
  };


  const fetchManagerActivities = useCallback(async () => {
    if (!user?.employeeCode || !managerSelectedDateObj) return;

    setLoadingManagerActivities(true);
    setManagerActivityError('');

    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employee/${user.employeeCode}/analytics`,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const activities = Array.isArray(res.data?.activities) ? res.data.activities : [];

      const startOfDay = new Date(managerSelectedDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(managerSelectedDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const filteredActivities = activities
        .map(activity => {
          const entries = Array.isArray(activity.timeEntries) ? activity.timeEntries : [];

          const filteredEntries = entries.filter(entry => {
            const raw = entry?.date || entry?.punchIn || entry?.punchOut;
            if (!raw) return false;
            const parsed = new Date(raw);
            if (Number.isNaN(parsed.getTime())) return false;
            return parsed >= startOfDay && parsed <= endOfDay;
          });

          if (filteredEntries.length > 0) {
            return { ...activity, timeEntries: filteredEntries };
          }

          const fallbackDateRaw = activity.createdAt || activity.updatedAt;
          const fallbackDate = fallbackDateRaw ? new Date(fallbackDateRaw) : null;
          if (fallbackDate && !Number.isNaN(fallbackDate.getTime()) && fallbackDate >= startOfDay && fallbackDate <= endOfDay) {
            return { ...activity, timeEntries: filteredEntries };
          }

          return null;
        })
        .filter(Boolean);

      setManagerActivities(filteredActivities);
    } catch (err) {
      console.error('Error fetching manager activities:', err);
      setManagerActivities([]);
      setManagerActivityError(err.response?.data?.error || 'Failed to load activities');
    } finally {
      setLoadingManagerActivities(false);
    }
  }, [apiBaseUrl, managerSelectedDateObj, user?.employeeCode]);

  useEffect(() => {
    if (user?.employeeCode) {
      fetchManagerActivities();
    }
  }, [user?.employeeCode, fetchManagerActivities]);

  const handleMyActivitySubmit = async () => {
    if (!managerActivity.description) {
      setSnackbar({ open: true, message: 'Please select an activity', severity: 'error' });
      return;
    }

    const selectedTemplate = activityTemplates.find(tpl => String(tpl.id) === String(managerActivity.templateId));
    const title = selectedTemplate?.title || managerActivity.description;

    if (!title) {
      setSnackbar({ open: true, message: 'Activity title is required', severity: 'error' });
      return;
    }

    const isSessionActivity = managerActivity.description === 'Total No. of Sessions';

    if (isSessionActivity) {
      if (!managerActivity.sessionType || managerActivity.institute === '' || managerActivity.school === '') {
        setSnackbar({ open: true, message: 'Please fill all session fields', severity: 'error' });
        return;
      }
    } else {
      if (!managerActivity.startTime || !managerActivity.endTime) {
        setSnackbar({ open: true, message: 'Please provide start and end times', severity: 'error' });
        return;
      }

      if (hasTimeOverlap(managerActivity.startTime, managerActivity.endTime)) {
        setSnackbar({ open: true, message: 'Selected time overlaps with an existing activity.', severity: 'error' });
        return;
      }
    }

    setLoggingActivity(true);
    try {
      const activityDate = managerActivityDate;

      let timeEntry;

      if (isSessionActivity) {
        const sessionDate = managerSelectedDateObj ? new Date(managerSelectedDateObj) : new Date(activityDate);
        timeEntry = {
          date: sessionDate,
          duration: 0,
          punchIn: sessionDate,
          punchOut: sessionDate,
          description: managerActivity.description
        };
      } else {
        const punchIn = new Date(`${activityDate}T${managerActivity.startTime}`);
        const punchOut = new Date(`${activityDate}T${managerActivity.endTime}`);

        const duration = (punchOut - punchIn) / (1000 * 60);

        if (!Number.isFinite(duration) || duration <= 0) {
          setSnackbar({ open: true, message: 'End time must be after start time', severity: 'error' });
          return;
        }

        timeEntry = {
          date: punchIn,
          duration,
          punchIn,
          punchOut,
          description: managerActivity.description
        };
      }

      const trimmedComment = managerActivity.comment?.trim() || '';

      const payload = {
        title,
        description: managerActivity.description,
        comment: trimmedComment,
        assignedToId: user?.employeeCode,
        priority: 'medium',
        status: 'pending',
        timeEntries: [timeEntry],
        department: user?.departmentId || user?.department?.id || ''
      };

      if (isSessionActivity) {
        payload.institute = parseInt(managerActivity.institute, 10) || 0;
        payload.school = parseInt(managerActivity.school, 10) || 0;
        payload.sessionType = managerActivity.sessionType;
      } else {
        payload.startTime = managerActivity.startTime;
        payload.endTime = managerActivity.endTime;
      }

      await axios.post(`${apiBaseUrl}/api/activities`, payload, { withCredentials: true });

      setSnackbar({ open: true, message: 'Activity logged successfully!', severity: 'success' });
      setManagerActivity({ ...INITIAL_MANAGER_ACTIVITY });
      setManagerTemplateId('');
      await fetchManagerActivities();
      fetchData();
    } catch (error) {
      console.error('Error logging activity:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || 'Failed to log activity',
        severity: 'error'
      });
    } finally {
      setLoggingActivity(false);
    }
  };


  const handleOpenEditManagerActivity = useCallback((activity) => {
    if (!activity) return;

    const { start: fallbackStart, end: fallbackEnd } = extractActivityTimeWindow(activity);
    const sessionsCountValue = activity.sessionsCount ?? activity.sessionCount ?? activity._timeEntry?.sessionsCount;

    const normalizedActivity = {
      ...activity,
      id: activity.id || activity._id, // Ensure we have an id
      _id: activity._id || activity.id, // Ensure we have an _id
      startTime: activity.startTime || fallbackStart || '',
      endTime: activity.endTime || fallbackEnd || '',
      sessionsCount: sessionsCountValue !== undefined && sessionsCountValue !== null
        ? String(sessionsCountValue)
        : ''
    };

    setEditManagerActivity(normalizedActivity);
    setEditManagerDialogOpen(true);
  }, []);

  const handleSaveManagerActivity = useCallback(async () => {
    if (!editManagerActivity) return;

    const activityId = editManagerActivity.id || editManagerActivity._id;
    if (!activityId) {
      setSnackbar({ open: true, message: 'Activity ID missing, cannot update.', severity: 'error' });
      return;
    }

    const isSessionActivity = editManagerActivity.title === 'Total No. of Sessions';

    const payload = {
      title: editManagerActivity.title,
      comment: editManagerActivity.comment || ''
    };

    if (isSessionActivity) {
      payload.sessionType = editManagerActivity.sessionType || 'Offline';
      payload.institute = parseInt(editManagerActivity.institute, 10) || 0;
      payload.school = parseInt(editManagerActivity.school, 10) || 0;
      payload.startTime = '';
      payload.endTime = '';
    } else {
      payload.startTime = editManagerActivity.startTime || '';
      payload.endTime = editManagerActivity.endTime || '';

      if (!payload.startTime || !payload.endTime) {
        setSnackbar({ open: true, message: 'Start and end time are required to update this activity.', severity: 'warning' });
        return;
      }

      if (hasTimeOverlap(payload.startTime, payload.endTime, activityId)) {
        setSnackbar({ open: true, message: 'Selected time overlaps with an existing activity.', severity: 'warning' });
        return;
      }
    }

    try {
      await axios.patch(
        `${apiBaseUrl}/api/activities/${activityId}`,
        payload,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      setEditManagerDialogOpen(false);
      setEditManagerActivity(null);
      setSnackbar({ open: true, message: 'Activity updated!', severity: 'success' });
      await fetchManagerActivities();
    } catch (error) {
      console.error('Error updating manager activity:', error);
      setSnackbar({ open: true, message: error?.response?.data?.error || 'Failed to update activity', severity: 'error' });
    }
  }, [apiBaseUrl, editManagerActivity, fetchManagerActivities]);

  const handleOpenDeleteManagerActivity = useCallback((activity) => {
    setDeleteManagerActivity(activity);
    setDeleteManagerDialogOpen(true);
  }, []);

  const handleConfirmDeleteManagerActivity = useCallback(async () => {
    if (!deleteManagerActivity) return;

    const activityId = deleteManagerActivity.id || 
                     deleteManagerActivity._id || 
                     deleteManagerActivity.activityId ||
                     deleteManagerActivity._activityId ||
                     deleteManagerActivity.activity_id;

    console.log('Delete activity object:', deleteManagerActivity);
    console.log('Extracted activity ID:', activityId);

    if (!activityId) {
      setSnackbar({ open: true, message: 'Activity ID missing, cannot delete.', severity: 'error' });
      return;
    }

    try {
      await axios.delete(`${apiBaseUrl}/api/activities/${activityId}`, { withCredentials: true });
      setSnackbar({ open: true, message: 'Activity deleted!', severity: 'success' });
      await fetchManagerActivities();
    } catch (error) {
      console.error('Error deleting manager activity:', error);
      setSnackbar({ open: true, message: error?.response?.data?.error || 'Failed to delete activity', severity: 'error' });
    } finally {
      setDeleteManagerDialogOpen(false);
      setDeleteManagerActivity(null);
    }
  }, [apiBaseUrl, deleteManagerActivity, fetchManagerActivities]);

  const handleCancelDeleteManagerActivity = useCallback(() => {
    setDeleteManagerDialogOpen(false);
    setDeleteManagerActivity(null);
  }, []);

  const handleShowSessions = async () => {
    setShowSessionsTable(true);
    setLoadingReport(true);

    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employee/${selectedEmployee}/activities-by-date`,
        {
          params: { startDate: selectedStartDate, endDate: selectedEndDate },
          withCredentials: true
        }
      );

      const rowsMap = new Map();
      const processedKeys = new Set();

      const toPositiveNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      };

      const ensureRow = (dateKey) => {
        if (!rowsMap.has(dateKey)) {
          rowsMap.set(dateKey, { date: dateKey, offlineInstitute: 0, onlineInstitute: 0, school: 0 });
        }
        return rowsMap.get(dateKey);
      };

      const addToRow = (row, key, amount, fallback = 0) => {
        const value = toPositiveNumber(amount) || fallback;
        if (value <= 0) return;
        row[key] = (row[key] || 0) + value;
      };

      const activities = Array.isArray(res.data) ? res.data : [];

      activities.forEach(activity => {
        const normalizedTitle = (activity.title || '').trim().toLowerCase();
        const normalizedSessionType = (activity.sessionType || '').trim().toLowerCase();
        const activitySessions = toPositiveNumber(activity.sessionsCount);
        const activityInstitute = toPositiveNumber(activity.institute);
        const activitySchool = toPositiveNumber(activity.school);

        if (!Array.isArray(activity.timeEntries)) return;

        activity.timeEntries.forEach(entry => {
          const entryDateSource = entry?.date || entry?.punchIn || entry?.punchOut;
          if (!entryDateSource) return;

          const entryDate = new Date(entryDateSource);
          if (Number.isNaN(entryDate.getTime())) return;

          const dateKey = entryDate.toISOString().slice(0, 10);
          const uniqueKey = `${activity.id || activity._id || activity.activityId || normalizedTitle}-${dateKey}`;
          if (processedKeys.has(uniqueKey)) return;
          processedKeys.add(uniqueKey);

          const row = ensureRow(dateKey);
          const entrySessions = toPositiveNumber(entry?.sessionsCount);
          const sessions = entrySessions > 0 ? entrySessions : activitySessions;

          if (normalizedTitle === 'school session') {
            addToRow(row, 'school', sessions, 1);
            return;
          }

          if (normalizedTitle === 'institute session') {
            addToRow(row, 'offlineInstitute', sessions, 1);
            return;
          }

          if (normalizedTitle === 'total no. of sessions') {
            if (normalizedSessionType === 'offline') {
              addToRow(row, 'offlineInstitute', sessions || activityInstitute, 1);
            } else if (normalizedSessionType === 'online') {
              addToRow(row, 'onlineInstitute', sessions || activityInstitute, 1);
            } else {
              addToRow(row, 'offlineInstitute', sessions || activityInstitute);
            }

            if (activitySchool > 0) {
              addToRow(row, 'school', activitySchool);
            }
            return;
          }

          if (normalizedSessionType === 'offline') {
            addToRow(row, 'offlineInstitute', sessions || activityInstitute, 1);
          } else if (normalizedSessionType === 'online') {
            addToRow(row, 'onlineInstitute', sessions || activityInstitute, 1);
          }

          if (activitySchool > 0) {
            addToRow(row, 'school', activitySchool);
          }
        });
      });

      const rows = Array.from(rowsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      setSessionDistributionDatewise(rows);
    } catch (err) {
      setSessionDistributionDatewise([]);
    } finally {
      setLoadingReport(false);
    }
  };

  // Tabs labels
  const tabLabels = getNavigationForRole('manager').flatMap(section => section.items).filter(item => item.tabIndex !== undefined).map(item => item.label);

  const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString();
  };

  const formatTime = (value) => {
    if (!value) return '--';

    let dateValue = null;

    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'number') {
      dateValue = new Date(value);
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '--';

      if (trimmed.includes('T') || trimmed.includes('Z')) {
        dateValue = new Date(trimmed);
      } else if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
        const [hours, minutes] = trimmed.split(':').map(Number);
        const base = new Date(); // Use current date as base for Manager Dashboard
        dateValue = new Date(base);
        dateValue.setHours(hours, minutes, 0, 0);
      } else {
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
          dateValue = parsed;
        }
      }
    }

    if (!dateValue || Number.isNaN(dateValue.getTime())) {
      return '--';
    }

    return dateValue.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const parseTimeToSelectedDate = useCallback((timeStr) => {
    if (!timeStr) return null;

    const normalized = String(timeStr).trim();
    if (!normalized) return null;

    let hours = null;
    let minutes = null;

    const amPmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
    if (amPmMatch) {
      hours = parseInt(amPmMatch[1], 10);
      minutes = parseInt(amPmMatch[2], 10);
      const period = amPmMatch[3].toLowerCase();
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
    } else {
      const twentyFourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
      if (twentyFourMatch) {
        hours = parseInt(twentyFourMatch[1], 10);
        minutes = parseInt(twentyFourMatch[2], 10);
      }
    }

    if (hours === null || minutes === null || Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    const baseDate = managerSelectedDateObj ? new Date(managerSelectedDateObj) : new Date();
    baseDate.setHours(hours, minutes, 0, 0);
    return baseDate;
  }, [managerSelectedDateObj]);

  const toTimeString = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const extractActivityTimeWindow = (activity) => {
    if (!activity) return { start: null, end: null };
    const { startTime, endTime } = activity;
    if (startTime && endTime) {
      return { start: startTime, end: endTime };
    }
    const firstEntry = activity.timeEntries && activity.timeEntries[0];
    if (firstEntry) {
      const startFromEntry = toTimeString(firstEntry.punchIn);
      const endFromEntry = toTimeString(firstEntry.punchOut);
      if (startFromEntry && endFromEntry) {
        return { start: startFromEntry, end: endFromEntry };
      }
    }
    return { start: null, end: null };
  };

  const hasTimeOverlap = useCallback((startTime, endTime, excludeActivityId = null) => {
    const newStart = parseTimeToSelectedDate(startTime);
    const newEnd = parseTimeToSelectedDate(endTime);
    if (!newStart || !newEnd) return false;

    return managerActivities.some(activity => {
      const activityId = activity.id ?? activity._id;
      if (excludeActivityId && activityId === excludeActivityId) return false;

      const { start, end } = extractActivityTimeWindow(activity);
      const existingStart = parseTimeToSelectedDate(start);
      const existingEnd = parseTimeToSelectedDate(end);

      if (!existingStart || !existingEnd) return false;

      return newStart < existingEnd && newEnd > existingStart;
    });
  }, [managerActivities, parseTimeToSelectedDate]);

  useEffect(() => {
    if (!managerSelectedDate) {
      setManagerHasLoggedActivity(false);
      return;
    }

    const hasActivityForDate = managerActivities.some(activity => {
      const entryDates = Array.isArray(activity.timeEntries) && activity.timeEntries.length > 0
        ? activity.timeEntries.map(te => te.date || te.punchIn || te.punchOut)
        : [activity.date || activity.createdAt || activity.updatedAt];

      return entryDates.some(value => {
        if (!value) return false;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return false;
        return parsed.toISOString().slice(0, 10) === managerSelectedDate;
      });
    });

    setManagerHasLoggedActivity(hasActivityForDate);
  }, [managerSelectedDate, managerActivities]);

  const handleExpandEmployee = useCallback((employeeCode) => {
    setExpandedEmployee(prev => {
      const willExpand = prev !== employeeCode;
      if (willExpand) {
        const currentFilter = employeeDateFilters[employeeCode];
        const targetDate = currentFilter?.selected || getTodayDateString();
        ensureDateFilterEntry(employeeCode, targetDate);
        fetchEmployeeAnalyticsData(employeeCode, targetDate);
      }
      return willExpand ? employeeCode : null;
    });
  }, [employeeDateFilters, ensureDateFilterEntry, fetchEmployeeAnalyticsData]);


  const sidebarItems = getNavigationForRole('manager');

  const activeTabId = tabLabels[selectedTab]?.toLowerCase().replace(/\s+/g, '') || 'overview';
  const handleDashboardNavigation = (id) => {
    if (id === 'reportcard' || id === 'assessments') { setSelectedTab(7); return; }
    const item = sidebarItems.flatMap(section => section.items).find(sidebarItem => sidebarItem.id === id);
    if (item?.route) {
      navigate(item.route);
      return;
    }
    if (item && item.tabIndex >= 0) setSelectedTab(item.tabIndex);
  };
  const headerSearchOptions = sidebarItems.flatMap(section =>
    section.items.map(item => ({ id: item.id, label: item.label, group: section.title }))
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#F9FAFB' }}>
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeItem={activeTabId}
        onItemClick={handleDashboardNavigation}
        user={{ name: user?.name || 'Manager', role: user?.role || 'Manager' }}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, ml: '240px', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Header
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          searchOptions={headerSearchOptions}
          onSearchSelect={(option) => handleDashboardNavigation(option.id)}
          user={{ name: user?.name || 'Manager' }}
        />

        {/* Main Content Area */}
        <Box sx={{ flex: 1, p: 4 }}>
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { label: 'Manager', active: false },
              { label: tabLabels[selectedTab], active: true }
            ]}
            separator="›"
          />

          {/* Page Title */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ ...typography.subheadingS2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 0.5 }}>
              {tabLabels[selectedTab]}
            </Typography>
            <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
              Last modified: {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })} by {user?.name || 'Manager'}
            </Typography>
          </Box>

        {selectedTab === 0 && (
          <Box>
            {/* Stats Cards - ABOVE Overview Range, styled like EmployeeDashboard StatCard */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 3, mb: 3 }}>
              {summaryCards.map((card, idx) => {
                const cardColors = [
                  { main: '#0070F0', light: '#F5FAFF', border: '#D1E6FF' }, // Primary - Blue
                  { main: '#12B76A', light: '#F6FEF9', border: '#D1FADF' }, // Success - Green
                  { main: '#F79009', light: '#FFFCF5', border: '#FEF0C7' }, // Warning - Orange
                  { main: '#5220BE', light: '#F5F3FF', border: '#E0DBFF' }, // Purple
                  { main: '#F04438', light: '#FFFBFA', border: '#FFEAE2' }  // Error - Red
                ];
                const colors = cardColors[idx] || cardColors[0];
                return (
                  <Paper
                    key={card.label}
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      bgcolor: darkCardBg,
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : colors.border}`,
                      boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                  >
                    {/* Top colored border with arc effect */}
                    <Box sx={{
                      height: 4,
                      bgcolor: colors.main,
                      borderRadius: '3px 3px 0 0',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60%',
                        height: 8,
                        bgcolor: colors.main,
                        borderRadius: '0 0 16px 16px'
                      }
                    }} />
                    <Box sx={{ p: 3, pt: 2.5 }}>
                      {/* Title on top */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDarkMode ? '#9CA3AF' : '#667085',
                          fontSize: '14px',
                          fontWeight: 500,
                          mb: 1.5
                        }}
                      >
                        {card.label}
                      </Typography>
                      {/* Value and icon in same row */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                          variant="h3"
                          sx={{
                            fontSize: { xs: '28px', md: '36px' },
                            fontWeight: 700,
                            color: isDarkMode ? '#F2F4F7' : '#101828',
                            lineHeight: 1.2
                          }}
                        >
                          {card.value}
                        </Typography>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '10px',
                            bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.light,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.main
                          }}
                        >
                          {card.icon}
                        </Box>
                      </Box>
                      {card.sub && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 1,
                            color: isDarkMode ? '#667085' : '#9CA3AF',
                            fontSize: '0.7rem'
                          }}
                        >
                          {card.sub}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 3,
                mb: 3,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'flex-end' },
                gap: 2,
                bgcolor: darkCardBg,
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Overview Range</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pick a custom date range to refresh the overview metrics without impacting other tabs.
                </Typography>
                {overviewAppliedRange && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Applied range: {overviewAppliedRange.start} → {overviewAppliedRange.end}
                  </Typography>
                )}
              </Box>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', md: 'center' }}
              >
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  value={overviewStart}
                  onChange={(e) => setOverviewStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: darkCardBg, borderRadius: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } } }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  value={overviewEnd}
                  onChange={(e) => setOverviewEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: darkCardBg, borderRadius: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } } }}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleApplyOverviewRange}
                    disabled={overviewLoading}
                    sx={{ fontWeight: 600 }}
                  >
                    {overviewLoading ? 'Applying…' : 'Apply'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleResetOverviewRange}
                    disabled={overviewLoading || (!overviewStart && !overviewEnd && !overviewAppliedRange)}
                    sx={{ fontWeight: 600 }}
                  >
                    Reset
                  </Button>
                </Stack>
              </Stack>
            </Paper>
            {overviewError && (
              <Alert severity="error" sx={{ mb: 2 }}>{overviewError}</Alert>
            )}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Weekly Hours ({analytics?.department})</Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="manager-week-filter-label-overview">Select Week</InputLabel>
                  <Select
                    labelId="manager-week-filter-label-overview"
                    label="Select Week"
                    value={selectedWeekIndex}
                    onChange={(e) => handleWeekSelectionChange(e.target.value)}
                  >
                    {availableWeeks.map((week, idx) => (
                      <MenuItem key={`${week.label}-${idx}`} value={idx.toString()}>
                        {week.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <ResponsiveContainer width="100%" height={240}>
                <RechartsBarChart data={weeklyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" style={{ fontWeight: 700 }} />
                  <YAxis />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f3f6fa' }} />
                  <Bar
                    dataKey={analytics?.department || 'Department'}
                    name={analytics?.department || 'Department'}
                    fill={COLORS[0]}
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1200}
                    maxBarSize={32}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        )}
        {selectedTab === 1 && (
          <DepartmentsDashboard analytics={analytics} availableWeeks={availableWeeks} selectedWeekIndex={selectedWeekIndex} onWeekChange={handleWeekSelectionChange} />
        )}
        {selectedTab === 2 && <EmployeesDashboard analytics={analytics} />}
        {selectedTab === 3 && (
          <Box>
            {/* Manager Activity Logger Section */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 4 },
                borderRadius: 3,
                mb: 4,
                bgcolor: darkCardBg,
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                color: theme.palette.text.primary
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ 
                mb: { xs: 1, md: 2 },
                fontSize: { xs: '1.1rem', md: '1.25rem' }
              }}>
                &#8767; My Activity Logger
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                Log your daily activities and time spent
              </Typography>
              <Box
                sx={{
                  borderRadius: 2,
                  p: { xs: 1.5, md: 2 },
                  mb: 2.5,
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f6f9ff',
                  border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'stretch', md: 'center' },
                  justifyContent: 'space-between',
                  gap: { xs: 2, md: 3 }
                }}
              >
                <Stack spacing={1.25} sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ fontSize: { xs: '1rem', md: '1.05rem' } }}>
                    Mark Attendance
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <TextField
                      label="Attendance Date"
                      type="date"
                      size="small"
                      value={managerPendingDate}
                      onChange={handleManagerPendingDateChange}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ max: todayDateString }}
                      sx={{ bgcolor: darkCardBg, borderRadius: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } } }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResetManagerSelectedDate}
                      sx={{
                        textTransform: 'none',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#D0D5DD',
                        color: isDarkMode ? '#D1D5DB' : '#344054',
                        fontSize: '13px',
                        '&:hover': {
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.4)' : '#98A2B3',
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
                        }
                      }}
                    >
                      Today
                    </Button>
                  </Stack>
                  {managerAttendanceError && (
                    <Alert severity="error" sx={{ mt: 0.5 }}>
                      {managerAttendanceError}
                    </Alert>
                  )}
                  {managerAttendance?.type && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResetManagerAttendance}
                      disabled={managerHasLoggedActivity}
                      sx={{
                        alignSelf: { xs: 'stretch', sm: 'flex-start' },
                        textTransform: 'none',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#D0D5DD',
                        color: isDarkMode ? '#D1D5DB' : '#344054',
                        fontSize: '13px',
                        '&:hover': {
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.4)' : '#98A2B3',
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
                        }
                      }}
                    >
                      Change Attendance
                    </Button>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {isManagerFutureDate
                      ? 'Future dates cannot be marked until the day arrives.'
                      : `Selected Date: ${managerSelectedDateLabel || '--'}`}
                  </Typography>
                </Stack>
                <Box sx={{ minWidth: { md: 220 }, flexShrink: 0 }}>
                  {managerAttendance?.type ? (
                    <Stack
                      spacing={0.5}
                      alignItems={{ xs: 'flex-start', md: 'flex-end' }}
                      textAlign={{ xs: 'left', md: 'right' }}
                    >
                      <Typography variant="subtitle1" fontWeight={700} color="primary">
                        {managerAttendanceLabel}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Standard Hours: {managerAttendance?.standardHours ?? '--'}
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems="stretch"
                    >
                      <Button
                        size="small"
                        fullWidth
                        variant="contained"
                        disabled={managerMarkingAttendance || managerHasLoggedActivity || isManagerFutureDate}
                        onClick={() => handleMarkManagerAttendance('full_day')}
                        sx={{
                          backgroundColor: '#12B76A',
                          color: '#fff',
                          '&:hover': { backgroundColor: '#10A060' },
                          '&:disabled': {
                            background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)'
                          }
                        }}
                      >
                        Full Day
                      </Button>
                      <Button
                        size="small"
                        fullWidth
                        variant="contained"
                        disabled={managerMarkingAttendance || managerHasLoggedActivity || isManagerFutureDate}
                        onClick={() => handleMarkManagerAttendance('half_day')}
                        sx={{
                          backgroundColor: '#F79009',
                          color: '#fff',
                          '&:hover': { backgroundColor: '#E07F08' },
                          '&:disabled': {
                            background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)'
                          }
                        }}
                      >
                        Half Day
                      </Button>
                      <Button
                        size="small"
                        fullWidth
                        variant="contained"
                        disabled={managerMarkingAttendance || managerHasLoggedActivity || isManagerFutureDate}
                        onClick={() => handleMarkManagerAttendance('leave')}
                        sx={{
                          backgroundColor: '#F04438',
                          color: '#fff',
                          '&:hover': { backgroundColor: '#D73A2E' },
                          '&:disabled': {
                            background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)'
                          }
                        }}
                      >
                        Leave
                      </Button>
                    </Stack>
                  )}
                </Box>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Please enter start and end time in 24-hour format (e.g., 14:30).
              </Alert>
              {!canManagerLogActivity && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Please mark attendance (Full Day or Half Day) before logging an activity.
                </Alert>
              )}
              <Grid container spacing={2} sx={{ mb: { xs: 2, md: 3 }, '& .MuiFormControl-root': { minHeight: { xs: '45px', md: '56px' } } }}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth sx={{ minWidth: 200 }}>
                    <InputLabel>Activity</InputLabel>
                    <Select
                      value={managerActivity.description}
                      onChange={e => setManagerActivity({ ...managerActivity, description: e.target.value })}
                      label="Activity"
                      fullWidth
                      sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary } }}
                    >
                      {activityTemplates.length === 0 ? (
                        <MenuItem value="" disabled>No activities available</MenuItem>
                      ) : (
                        activityTemplates.map((act, idx) => (
                          <MenuItem key={idx} value={act.title}>{act.title}</MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                {managerActivity.description === 'Total No. of Sessions' ? (
                  <>
                    <Grid item xs={6} md={2}>
                      <FormControl fullWidth required sx={{ minWidth: 200 }}>
                        <InputLabel id="session-type-label">Session Type</InputLabel>
                        <Select
                          labelId="session-type-label"
                          value={managerActivity.sessionType}
                          label="Session Type"
                          onChange={e => setManagerActivity({ ...managerActivity, sessionType: e.target.value })}
                          fullWidth
                          sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary } }}
                        >
                          <MenuItem value="Online">Online</MenuItem>
                          <MenuItem value="Offline">Offline</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2} sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                      <TextField
                        label="Institute"
                        type="number"
                        required
                        value={managerActivity.institute}
                        onChange={e => setManagerActivity({ ...managerActivity, institute: e.target.value.replace(/^0+(?!$)/, '') })}
                        fullWidth
                        sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={6} md={2} sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                      <TextField
                        label="School"
                        type="number"
                        required
                        value={managerActivity.school}
                        onChange={e => setManagerActivity({ ...managerActivity, school: e.target.value.replace(/^0+(?!$)/, '') })}
                        fullWidth
                        sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="School name "
                        fullWidth
                        value={managerActivity.comment}
                        onChange={e => setManagerActivity({ ...managerActivity, comment: e.target.value })}
                        placeholder="School name"
                        sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                      />
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Comment"
                        fullWidth
                        value={managerActivity.comment}
                        onChange={e => setManagerActivity({ ...managerActivity, comment: e.target.value })}
                        placeholder="Optional comment"
                        sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, transition: 'box-shadow 0.2s', '&:focus-within': { boxShadow: 4 }, height: '56px' }}
                      />
                    </Grid>
                    <Grid item xs={6} md={4}>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={managerActivity.startTime}
                        onChange={e => setManagerActivity({ ...managerActivity, startTime: e.target.value })}
                        fullWidth
                        sx={{
                          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                          borderRadius: 2,
                          input: { color: theme.palette.text.primary },
                          label: { color: theme.palette.text.secondary },
                          height: { xs: '45px', md: '56px' },
                          '& .MuiInputBase-input': {
                            fontSize: { xs: '0.9rem', md: '1rem' },
                            padding: { xs: '10px 14px', md: '14px 18px' }
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: { xs: '0.85rem', md: '1rem' },
                            transform: 'translate(14px, 12px) scale(1)'
                          },
                          '& .MuiInputLabel-shrink': {
                            transform: 'translate(14px, -6px) scale(0.75)'
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField
                        label="End Time"
                        type="time"
                        value={managerActivity.endTime}
                        onChange={e => setManagerActivity({ ...managerActivity, endTime: e.target.value })}
                        fullWidth
                        sx={{
                          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                          borderRadius: 2,
                          input: { color: theme.palette.text.primary },
                          label: { color: theme.palette.text.secondary },
                          height: { xs: '45px', md: '56px' },
                          '& .MuiInputBase-input': {
                            fontSize: { xs: '0.9rem', md: '1rem' },
                            padding: { xs: '10px 14px', md: '14px 18px' }
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: { xs: '0.85rem', md: '1rem' },
                            transform: 'translate(14px, 12px) scale(1)'
                          },
                          '& .MuiInputLabel-shrink': {
                            transform: 'translate(14px, -6px) scale(0.75)'
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                    </Grid>
                  </>
                )}
                <Grid item xs={12} md={2}>
                  <Button
                    id="add-activity-btn"
                    variant="contained"
                    fullWidth
                    onClick={handleMyActivitySubmit}
                    disabled={loggingActivity || !canManagerLogActivity}
                    sx={{
                      height: { xs: '45px', md: '56px' },
                      fontSize: { xs: '0.9rem', md: '1rem' },
                      backgroundColor: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark
                      },
                      '&:disabled': {
                        background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                        color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)'
                      }
                    }}
                  >
                    {loggingActivity ? <CircularProgress size={22} color="inherit" /> : '+ ADD ACTIVITY'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: isDarkMode ? '#F2F4F7' : '#101828' }}>Recent Activities</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={fetchManagerActivities}
                  disabled={loadingManagerActivities}
                  sx={{
                    textTransform: 'none',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#E4E7F0',
                    color: isDarkMode ? '#D1D5DB' : '#667085',
                    fontSize: '13px',
                    '&:hover': {
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.4)' : '#D0D5DD',
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
                    }
                  }}
                >
                  Refresh
                </Button>
              </Box>
              {managerActivityError && (
                <Alert severity="error" sx={{ mb: 2 }}>{managerActivityError}</Alert>
              )}
              <TableContainer sx={{ overflowX: 'auto', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`, borderRadius: 2, background: isDarkMode ? 'rgba(35,39,47,0.6)' : '#fff' }}>
                <Table stickyHeader sx={{ minWidth: 700 }}>
                  <TableHead>
                    <TableRow>
                      {['Date', 'Activity', 'Duration / Count', 'Session / Time', 'Comment', 'Actions'].map((header) => (
                        <TableCell
                          key={header}
                          sx={{
                            fontWeight: 600,
                            color: isDarkMode ? '#D1D5DB' : '#344054',
                            fontSize: '13px',
                            background: isDarkMode ? 'rgba(35,39,47,0.8)' : '#F9FAFB',
                            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                            padding: '12px 16px'
                          }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingManagerActivities ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : managerActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: isDarkMode ? '#9CA3AF' : '#667085' }}>
                          No activities logged yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      managerActivities.map((activity, activityIdx) => {
                        const entries = Array.isArray(activity.timeEntries) && activity.timeEntries.length > 0
                          ? activity.timeEntries
                          : [{
                              date: activity.createdAt || activity.updatedAt,
                              punchIn: activity.startTime,
                              punchOut: activity.endTime,
                              duration: activity.duration || 0,
                              _fallback: true
                            }];
                        return entries.map((entry, idx) => {
                          const key = `${activity._id || activity.id || activity.createdAt || activity.title || 'activity'}-${activityIdx}-${idx}`;
                          const isSessionActivity = activity.title === 'Total No. of Sessions';
                          return (
                            <TableRow
                              key={key}
                              sx={{
                                background: isDarkMode ? 'rgba(35,39,47,0.4)' : '#fff',
                                transition: 'background 0.15s ease',
                                '&:hover': { background: isDarkMode ? 'rgba(44,48,56,0.6)' : '#F9FAFB' },
                                '&:last-child td': { borderBottom: 'none' }
                              }}
                            >
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 500, padding: '12px 16px' }}>
                                {formatDate(entry.date)}
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 500, padding: '12px 16px' }}>
                                {activity.title}
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px' }}>
                                {isSessionActivity
                                  ? `${activity.sessionType || '--'} • Institute: ${activity.institute || 0} • School: ${activity.school || 0}`
                                  : entry.duration ? `${(entry.duration / 60).toFixed(2)} h` : '--'}
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px' }}>
                                {isSessionActivity
                                  ? 'Sessions'
                                  : `${formatTime(entry.punchIn || activity.startTime)} - ${formatTime(entry.punchOut || activity.endTime)}`}
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px', maxWidth: 200, fontSize: '0.875rem' }}>
                                <Box sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {activity.comment || '--'}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, padding: '12px 16px' }}>
                                <IconButton size="small" onClick={() => handleOpenEditManagerActivity(activity)} aria-label="edit" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', '&:hover': { color: '#0070F0' } }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleOpenDeleteManagerActivity(activity)} aria-label="delete" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', '&:hover': { color: '#F04438' } }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
        {selectedTab === 4 && (
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: isDarkMode ? '#F2F4F7' : '#101828' }}>Datewise Report</Typography>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 4, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required sx={{ minWidth: 200 }}>
                    <InputLabel id="employee-label" shrink sx={{ color: isDarkMode ? '#9CA3AF' : '#667085' }}>Employee</InputLabel>
                    <Select
                      labelId="employee-label"
                      value={selectedEmployee || ''}
                      label="Employee"
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) return 'All Employees';
                        const match = (analytics?.employees || []).find(emp => emp.employeeCode === selected);
                        return match ? `${match.name} (${match.employeeCode})` : selected;
                      }}
                      onChange={e => setSelectedEmployee(e.target.value)}
                      fullWidth
                      sx={{
                        bgcolor: darkCardBg,
                        borderRadius: 1,
                        color: theme.palette.text.primary,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0' }
                      }}
                    >
                      <MenuItem value="">All Employees</MenuItem>
                      {(analytics?.employees || []).map(emp => {
                        const key = emp.employeeCode;
                        return (
                          <MenuItem key={key} value={key}>
                            {emp.name} ({emp.employeeCode})
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    type="date"
                    size="small"
                    value={selectedStartDate}
                    onChange={e => setSelectedStartDate(e.target.value)}
                    label="Start Date"
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      bgcolor: darkCardBg,
                      borderRadius: 1,
                      '& .MuiOutlinedInput-root': {
                        color: theme.palette.text.primary ,
                        '& fieldset': { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0' }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    type="date"
                    size="small"
                    value={selectedEndDate}
                    onChange={e => setSelectedEndDate(e.target.value)}
                    label="End Date"
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      bgcolor: darkCardBg,
                      borderRadius: 1,
                      '& .MuiOutlinedInput-root': {
                        color: theme.palette.text.primary,
                        '& fieldset': { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0' }
                      }
                    }}
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => { setShowSessionsTable(false); handleShowReport(); }}
                    disabled={selectedEmployee === '' || !selectedStartDate || !selectedEndDate || loadingReport}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: 1,
                      '&:hover': { backgroundColor: theme.palette.primary.dark },
                      '&:disabled': {
                        background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                        color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)'
                      }
                    }}
                  >
                    {loadingReport ? <CircularProgress size={22} color="inherit" /> : 'Show Activity'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleShowSessions}
                    disabled={selectedEmployee === '' || !selectedStartDate || !selectedEndDate || loadingReport}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      backgroundColor: '#8B5CF6',
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#7C3AED' },
                      '&:disabled': {
                        background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                        color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)'
                      }
                    }}
                  >
                    No. of Sessions
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<GetApp />}
                    onClick={handleDownloadDatewiseExcel}
                    disabled={!selectedStartDate || !selectedEndDate || downloadingDatewise}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      backgroundColor: '#12B76A',
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#10A060' }
                    }}
                  >
                    {downloadingDatewise ? 'Downloading...' : 'Download Excel'}
                  </Button>
                </Grid>
              </Grid>
              {selectedEmployee === '' && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>
                  Activity preview and session count are available for a single employee only. Use Download Excel to export all employees&apos; activities for the selected date range.
                </Alert>
              )}
              {reportError && <Alert severity="error" sx={{ mb: 2, mt: 2 }}>{reportError}</Alert>}
              {reportData && reportData.length > 0 && !showSessionsTable && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: isDarkMode ? '#F2F4F7' : '#101828' }}>Activities for selected employee on {selectedStartDate} to {selectedEndDate}</Typography>
                  <TableContainer sx={{ overflowX: 'auto', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`, borderRadius: 1, background: isDarkMode ? 'rgba(35,39,47,0.6)' : '#fff' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Date', 'Time', 'Activity Title', 'Time Spent (h)', 'Comment'].map((header) => (
                            <TableCell
                              key={header}
                              sx={{
                                fontWeight: 600,
                                color: isDarkMode ? '#D1D5DB' : '#344054',
                                fontSize: '13px',
                                background: isDarkMode ? 'rgba(35,39,47,0.8)' : '#F9FAFB',
                                borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                                padding: '12px 16px',
                                textAlign: 'center'
                              }}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.filter(act => act.title !== 'Total No. of Sessions').map((act, actIdx) => act.timeEntries.map((te, idx) => (
                          <TableRow
                            key={act._id + '-' + idx}
                            sx={{
                              background: isDarkMode ? 'rgba(35,39,47,0.4)' : '#fff',
                              transition: 'background 0.15s ease',
                              '&:hover': { background: isDarkMode ? 'rgba(44,48,56,0.6)' : '#F9FAFB' },
                              '&:last-child td': { borderBottom: 'none' }
                            }}
                          >
                            <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 500, padding: '12px 16px', textAlign: 'center' }}>
                              {new Date(te.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px', textAlign: 'center' }}>
                              {new Date(te.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(te.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 500, padding: '12px 16px', textAlign: 'center' }}>
                              {act.title}
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: (te.duration/60) > 0 ? (isDarkMode ? '#4f8cff' : '#0070F0') : isDarkMode ? '#9CA3AF' : '#667085', fontWeight: (te.duration/60) > 0 ? 700 : 500, padding: '12px 16px', textAlign: 'center' }}>
                              {(te.duration / 60).toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px', textAlign: 'center' }}>
                              {act.comment || '--'}
                            </TableCell>
                          </TableRow>
                        )))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              {showSessionsTable && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: isDarkMode ? '#F2F4F7' : '#101828' }}>Session Distribution (Date-wise) for selected employee</Typography>
                  <TableContainer sx={{ overflowX: 'auto', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`, borderRadius: 1, background: isDarkMode ? 'rgba(35,39,47,0.6)' : '#fff' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Date', 'Offline Institute', 'Online Institute', 'School'].map((header) => (
                            <TableCell
                              key={header}
                              sx={{
                                fontWeight: 600,
                                color: isDarkMode ? '#D1D5DB' : '#344054',
                                fontSize: '13px',
                                background: isDarkMode ? 'rgba(35,39,47,0.8)' : '#F9FAFB',
                                borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                                padding: '12px 16px',
                                textAlign: 'center'
                              }}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessionDistributionDatewise.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: isDarkMode ? '#9CA3AF' : '#667085', borderBottom: 'none' }}>
                              No activities found for this employee on the selected date range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sessionDistributionDatewise.map((row, idx) => (
                            <TableRow
                              key={row.date}
                              sx={{
                                background: isDarkMode ? 'rgba(35,39,47,0.4)' : '#fff',
                                transition: 'background 0.15s ease',
                                '&:hover': { background: isDarkMode ? 'rgba(44,48,56,0.6)' : '#F9FAFB' },
                                '&:last-child td': { borderBottom: 'none' }
                              }}
                            >
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 500, padding: '12px 16px', textAlign: 'center' }}>
                                {row.date}
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px', textAlign: 'center' }}>
                                {row.offlineInstitute}
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px', textAlign: 'center' }}>
                                {row.onlineInstitute}
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px', textAlign: 'center' }}>
                                {row.school}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              {reportData && reportData.length === 0 && !reportError && (
                <Alert severity="info" sx={{ mt: 3, borderRadius: 1 }}>No activities found for this employee on the selected date range.</Alert>
              )}
              <DownloadExcelDialog
                open={downloadDialogOpen}
                onClose={() => setDownloadDialogOpen(false)}
                employees={analytics?.employees || []}
                defaultEmployee={selectedEmployee}
                onDownload={handleDownloadExcel}
              />
            </Paper>
          </Box>
        )}
        {selectedTab === 6 && <ActivityTemplatesDashboard departmentId={user?.departmentId || analytics?.manager?.department?.id} departmentName={analytics?.manager?.department?.name || user?.department?.name} onTemplatesChange={fetchActivityTemplates} />}
        {selectedTab === 5 && (
          <ProfileDashboard user={user} manager={analytics?.manager} branch={analytics?.branch} />
        )}
        {selectedTab === 7 && <ToolsDashboard user={user} />}

        {selectedTab === 8 && <ProjectsDashboard />}

        {selectedTab === 9 && <TrainerSchedulingDashboard key="calendar" mode="calendar" employeeOptions={employeeOptions} />}

        {selectedTab === 10 && <TrainerSchedulingDashboard key="occupancy" mode="occupancy" employeeOptions={employeeOptions} activityOptions={managerTemplateOptions} />}

        {selectedTab === 11 && <SchoolActivityMailSettings />}

        {selectedTab === 12 && <SchoolReport />}

        {selectedTab === 13 && <SchoolManagement />}

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        departments={allDepartments}
        defaultDepartmentId={(user?.department && (user.department.id || user.department._id)) || ''}
        onAdd={handleAddMember}
      />


      {/* Edit Activity Dialog */}
      <Dialog open={editManagerDialogOpen} onClose={() => setEditManagerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="edit-manager-activity-label">Activity</InputLabel>
            <Select
              labelId="edit-manager-activity-label"
              value={editManagerActivity?.title || ''}
              label="Activity"
              onChange={e => setEditManagerActivity(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2 }}
            >
              {activityTemplates.length === 0 ? (
                <MenuItem value="" disabled>No activities available</MenuItem>
              ) : (
                activityTemplates.map((act, idx) => (
                  <MenuItem key={idx} value={act.title}>{act.title}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {editManagerActivity?.title === 'Total No. of Sessions' ? (
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel id="edit-manager-session-type-label">Session Type</InputLabel>
                  <Select
                    labelId="edit-manager-session-type-label"
                    value={editManagerActivity?.sessionType || 'Offline'}
                    label="Session Type"
                    onChange={e => setEditManagerActivity(prev => ({ ...prev, sessionType: e.target.value }))}
                    fullWidth
                    sx={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', borderRadius: 2 }}
                  >
                    <MenuItem value="Online">Online</MenuItem>
                    <MenuItem value="Offline">Offline</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  label="Institute"
                  type="number"
                  value={editManagerActivity?.institute || 0}
                  onChange={e => setEditManagerActivity(prev => ({ ...prev, institute: parseInt(e.target.value, 10) || 0 }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  label="School"
                  type="number"
                  value={editManagerActivity?.school || 0}
                  onChange={e => setEditManagerActivity(prev => ({ ...prev, school: parseInt(e.target.value, 10) || 0 }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={editManagerActivity?.startTime || ''}
                  onChange={e => setEditManagerActivity(prev => ({ ...prev, startTime: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Time"
                  type="time"
                  value={editManagerActivity?.endTime || ''}
                  onChange={e => setEditManagerActivity(prev => ({ ...prev, endTime: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}

          <TextField
            label="Comment"
            fullWidth
            multiline
            minRows={2}
            value={editManagerActivity?.comment || ''}
            onChange={e => setEditManagerActivity(prev => ({ ...prev, comment: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditManagerDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveManagerActivity} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Activity Dialog */}
      <Dialog open={deleteManagerDialogOpen} onClose={handleCancelDeleteManagerActivity}>
        <DialogTitle>Delete Activity</DialogTitle>
        <DialogContent>Are you sure you want to delete this activity?</DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteManagerActivity}>Cancel</Button>
          <Button onClick={handleConfirmDeleteManagerActivity} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
        </Box>
      </Box>
    </Box>
  );
};

export default ManagerDashboard;
