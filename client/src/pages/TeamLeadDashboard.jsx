import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ArrowDropDown, MoreVert, Search as SearchIcon, HelpOutline as HelpOutlineIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarCustom.css';
import { logout } from '../features/auth/authSlice';
import {
  AvatarCell,
  Breadcrumb,
  Header,
  Sidebar,
  StatCard,
  StatusChip,
  typography,
} from '../components/dashboard/DashboardComponents';
import EmployeeProjects from '../components/pm/employee/EmployeeProjects';
import EmployeeProjectDetail from '../components/pm/employee/EmployeeProjectDetail';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const chartColors = ['#4285F4', '#34A853', '#F79009', '#5220BE', '#F04438'];
const ALL_EMPLOYEES = '__all_employees__';
const departmentColors = {
  Coding: '#4285F4',
  Electronics: '#34A853',
  Mechatronics: '#F79009',
  Robotics: '#5220BE',
};

const getTodayDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatHours = (value) => `${toNumber(value).toFixed(1)}h`;

const formatActivityTime = (value) => {
  if (!value) return '--';
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toTimeInputValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'TL';

const normalizeEntries = (activity) => {
  if (Array.isArray(activity?.timeEntries)) return activity.timeEntries;
  if (!activity?.timeEntries) return [];

  try {
    const parsed = JSON.parse(activity.timeEntries);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const activityDate = (activity, entry) => entry?.date || activity?.createdAt || activity?.updatedAt;

const sameOrAfter = (dateValue, startDate) => {
  if (!startDate) return true;
  const date = new Date(dateValue);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return !Number.isNaN(date.getTime()) && date >= start;
};

const sameOrBefore = (dateValue, endDate) => {
  if (!endDate) return true;
  const date = new Date(dateValue);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return !Number.isNaN(date.getTime()) && date <= end;
};

const isSameDateValue = (dateValue, dateString) => sameOrAfter(dateValue, dateString) && sameOrBefore(dateValue, dateString);

const EmployeeCard = ({ employee }) => {
  const theme = useTheme();
  const departmentName = employee.department?.name || 'Unassigned';
  const accent = departmentColors[departmentName] || '#0070F0';
  const todayHours = toNumber(employee.todayActivityHours ?? employee.todayHours);
  const totalHours = toNumber(employee.totalHours);
  const status =
    todayHours >= 8 ? 'Full Day' : todayHours >= 4 ? 'Half Day' : todayHours > 0 ? 'Part Day' : 'No Activity';
  const statusColor =
    todayHours >= 8 ? '#12B76A' : todayHours >= 4 ? '#F79009' : todayHours > 0 ? '#0070F0' : '#F04438';

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: accent, color: '#fff', fontWeight: 800 }}>{getInitials(employee.name)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ ...typography.paragraphMedium, fontWeight: 700, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }} noWrap>
              {employee.name}
            </Typography>
            <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }} noWrap>
              {employee.email}
            </Typography>
            <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
              {employee.employeeCode}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip size="small" label={departmentName} sx={{ bgcolor: `${accent}18`, color: accent, fontWeight: 700 }} />
          <Chip size="small" label={employee.branch?.name || 'No branch'} variant="outlined" />
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: `${statusColor}12`,
            border: `1px solid ${statusColor}33`,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700, color: statusColor }}>{status}</Typography>
            <Typography sx={{ ...typography.paragraphSmall, fontWeight: 800, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
              {formatHours(todayHours)}
            </Typography>
          </Box>
          <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
            {employee.activitiesCount || 0} activities, {employee.timeEntriesCount || 0} entries
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
            Total logged
          </Typography>
          <Typography sx={{ ...typography.paragraphSmall, fontWeight: 800, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
            {formatHours(totalHours)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const TeamLeadDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useSelector((state) => state.auth);

  const [tab, setTab] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [search, setSearch] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshingActivities, setRefreshingActivities] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [analytics, setAnalytics] = useState(null);
  const [employeesData, setEmployeesData] = useState({ employees: [] });
  const [activitiesData, setActivitiesData] = useState({ activities: [] });
  const [filters, setFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    employee: '',
  });
  const [historyFilters, setHistoryFilters] = useState({
    date: getTodayDate(),
    employee: '',
  });
  const [historyActivitiesData, setHistoryActivitiesData] = useState({ activities: [] });
  const [historySearched, setHistorySearched] = useState(false);

  // My Activity form state
  const [myActivityDate, setMyActivityDate] = useState(getTodayDate());
  const [myActivityDescription, setMyActivityDescription] = useState('');
  const [myActivityComment, setMyActivityComment] = useState('');
  const [myActivityStartTime, setMyActivityStartTime] = useState('');
  const [myActivityEndTime, setMyActivityEndTime] = useState('');
  const [myActivitySessionType, setMyActivitySessionType] = useState('Offline');
  const [myActivityInstitute, setMyActivityInstitute] = useState('');
  const [myActivitySchool, setMyActivitySchool] = useState('');
  const [myActivityLoading, setMyActivityLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState({ type: null, standardHours: null });
  const [myAttendanceLoading, setMyAttendanceLoading] = useState(false);
  const [myAttendanceError, setMyAttendanceError] = useState('');
  const [myAttendanceMarking, setMyAttendanceMarking] = useState(false);
  const [myActivityRows, setMyActivityRows] = useState([]);
  const [myActivityRowsLoading, setMyActivityRowsLoading] = useState(false);
  const [myActivityRowsError, setMyActivityRowsError] = useState('');
  const [myActivityMenuAnchor, setMyActivityMenuAnchor] = useState(null);
  const [selectedMyActivityRow, setSelectedMyActivityRow] = useState(null);
  const [editMyActivityOpen, setEditMyActivityOpen] = useState(false);
  const [editMyActivitySaving, setEditMyActivitySaving] = useState(false);
  const [editMyActivityForm, setEditMyActivityForm] = useState({
    id: '',
    title: '',
    date: getTodayDate(),
    startTime: '',
    endTime: '',
    comment: '',
    sessionType: 'Offline',
    institute: '',
    school: '',
  });
  const [deleteMyActivityOpen, setDeleteMyActivityOpen] = useState(false);
  const [deleteMyActivityLoading, setDeleteMyActivityLoading] = useState(false);
  const [activityTemplates, setActivityTemplates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarPopupOpen, setCalendarPopupOpen] = useState(false);
  const [calendarPopupDate, setCalendarPopupDate] = useState(null);
  const [calendarPopupData, setCalendarPopupData] = useState(null);
  const [toolAssignments, setToolAssignments] = useState({ workbook: true, reportCard: true });
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Employee expansion state for Employees tab
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState({});
  const [employeeAnalytics, setEmployeeAnalytics] = useState({});
  const [employeeDateFilters, setEmployeeDateFilters] = useState({});

  const employees = useMemo(() => employeesData.employees || [], [employeesData.employees]);
  const activities = useMemo(() => activitiesData.activities || [], [activitiesData.activities]);
  const historyActivities = useMemo(() => historyActivitiesData.activities || [], [historyActivitiesData.activities]);
  const normalizedSearch = search.trim().toLowerCase();
  const tabLabels = ['Overview', 'Team', 'My Team', 'Activities', 'My Activity', 'Activity History', 'My Projects', 'Calendar', 'Tools', 'Profile'];
  const sidebarItems = [
    {
      title: 'MAIN',
      items: [
        { id: 'overview', label: 'Overview', icon: 'home', tabIndex: 0 },
        { id: 'employees', label: 'My Team', icon: 'users', tabIndex: 2 },
        { id: 'projects', label: 'My Projects', icon: 'projects', tabIndex: 6 },
        { id: 'myactivity', label: 'My Activity', icon: 'session', tabIndex: 4 },
        { id: 'calendar', label: 'Calendar', icon: 'calendar', tabIndex: 7 },
        { id: 'tools', label: 'Tools', icon: 'settings', tabIndex: 8 },
        { id: 'activityhistory', label: 'Activity History', icon: 'history', tabIndex: 5 },
        { id: 'profile', label: 'Profile', icon: 'profile', tabIndex: 9 },
      ],
    },
  ];

  const activeTabId = sidebarItems[0].items.find((item) => item.tabIndex === tab)?.id || 'overview';
  const handleDashboardNavigation = (id) => {
    const item = sidebarItems.flatMap(section => section.items).find(sidebarItem => sidebarItem.id === id);
    if (item) {
      if (id === 'projects') setSelectedProjectId(null);
      setTab(item.tabIndex);
    }
  };
  const headerSearchOptions = sidebarItems.flatMap(section =>
    section.items.map(item => ({ id: item.id, label: item.label, group: section.title }))
  );
  const todayDate = getTodayDate();
  const selectedActivityDate = useMemo(() => {
    const date = new Date(`${myActivityDate}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [myActivityDate]);
  const selectedActivityDateLabel = selectedActivityDate
    ? selectedActivityDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '--';
  const isFutureActivityDate = selectedActivityDate
    ? selectedActivityDate > new Date(`${todayDate}T00:00:00`)
    : false;
  const myAttendanceLabel =
    myAttendance.type === 'full_day' ? 'Full Day' :
    myAttendance.type === 'half_day' ? 'Half Day' :
    myAttendance.type === 'leave' ? 'Leave' :
    'Not Marked';
  const canLogMyActivity = !!myAttendance.type && myAttendance.type !== 'leave' && !isFutureActivityDate;
  const visibleMyActivityRows = useMemo(() => {
    if (!selectedActivityDate) return [];

    const start = new Date(selectedActivityDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedActivityDate);
    end.setHours(23, 59, 59, 999);

    return myActivityRows
      .flatMap((activity) => {
        const entries = normalizeEntries(activity);
        const rowEntries = entries.length > 0 ? entries : [{ date: activity.createdAt || activity.updatedAt, duration: activity.timeSpent || 0 }];
        return rowEntries.map((entry, index) => ({ activity, entry, index }));
      })
      .filter(({ activity, entry }) => {
        const rawDate = activityDate(activity, entry);
        if (!rawDate) return false;
        const date = new Date(rawDate);
        return !Number.isNaN(date.getTime()) && date >= start && date <= end;
      });
  }, [myActivityRows, selectedActivityDate]);

  const visibleEmployees = useMemo(() => {
    if (!normalizedSearch) return employees;

    return employees.filter((employee) =>
      [employee.name, employee.email, employee.employeeCode, employee.department?.name, employee.branch?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [employees, normalizedSearch]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const employeeCode = activity.assignedTo?.employeeCode || activity.assignedToId;
      const entries = normalizeEntries(activity);
      const matchesSearch =
        !normalizedSearch ||
        [
          activity.title,
          activity.description,
          activity.comment,
          activity.assignedTo?.name,
          activity.assignedTo?.employeeCode,
          activity.assignedTo?.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const hasMatchingDate =
        entries.length === 0
          ? sameOrAfter(activity.createdAt, filters.startDate) && sameOrBefore(activity.createdAt, filters.endDate)
          : entries.some((entry) => {
              const date = activityDate(activity, entry);
              return sameOrAfter(date, filters.startDate) && sameOrBefore(date, filters.endDate);
            });

      return (!filters.employee || employeeCode === filters.employee) && hasMatchingDate && matchesSearch;
    });
  }, [activities, filters, normalizedSearch]);

  const filteredHistoryActivities = useMemo(() => {
    if (!historySearched) return [];

    return historyActivities.filter((activity) => {
      const employeeCode = activity.assignedTo?.employeeCode || activity.assignedToId;
      const entries = normalizeEntries(activity);
      const matchesEmployee = historyFilters.employee === ALL_EMPLOYEES || employeeCode === historyFilters.employee;
      const matchesSearch =
        !normalizedSearch ||
        [
          activity.title,
          activity.description,
          activity.comment,
          activity.assignedTo?.name,
          activity.assignedTo?.employeeCode,
          activity.assignedTo?.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const hasMatchingDate =
        entries.length === 0
          ? sameOrAfter(activity.createdAt, historyFilters.date) && sameOrBefore(activity.createdAt, historyFilters.date)
          : entries.some((entry) => {
              const date = activityDate(activity, entry);
              return sameOrAfter(date, historyFilters.date) && sameOrBefore(date, historyFilters.date);
            });

      return matchesEmployee && hasMatchingDate && matchesSearch;
    });
  }, [historyActivities, historyFilters, historySearched, normalizedSearch]);

  const totals = useMemo(() => {
    const activityMinutes = filteredActivities.reduce((sum, activity) => {
      const entries = normalizeEntries(activity);
      if (entries.length === 0) return sum + toNumber(activity.timeSpent);
      return sum + entries.reduce((entrySum, entry) => entrySum + toNumber(entry.duration), 0);
    }, 0);

    return {
      teamEmployees: analytics?.teamEmployees ?? employeesData.departmentEmployeeCount ?? employees.length,
      teamHours: analytics?.teamHours ?? analytics?.departmentHours ?? activityMinutes / 60,
      teamProductivity: analytics?.teamProductivity ?? analytics?.departmentProductivity ?? 0,
      completedActivities:
        analytics?.completedActivities ??
        filteredActivities.filter((activity) => activity.status === 'completed' || activity.status === 'approved').length,
    };
  }, [analytics, employees.length, employeesData, filteredActivities]);

  const employeesWithoutTodayActivity = useMemo(() => {
    if (employees.length === 0) return analytics?.employeesWithoutTodayActivity || [];

    const todayKey = getTodayDate();
    const employeesWithActivity = new Set();

    activities.forEach((activity) => {
      const employeeCode = activity.assignedTo?.employeeCode || activity.assignedToId;
      if (!employeeCode) return;

      const entries = normalizeEntries(activity);
      const hasTodayEntry = entries.some((entry) => {
        const rawDate = activityDate(activity, entry);
        if (!rawDate) return false;
        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) return false;
        const localDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return localDateKey === todayKey && toNumber(entry.duration) > 0;
      });

      if (hasTodayEntry) employeesWithActivity.add(employeeCode);
    });

    return employees
      .filter(employee => !employeesWithActivity.has(employee.employeeCode))
      .map(employee => ({
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        department: employee.department?.name || employeesData.teamLeadDepartment || '',
        branch: employee.branch?.name || employeesData.branchName || '',
      }));
  }, [activities, analytics?.employeesWithoutTodayActivity, employees, employeesData]);
  const analyticsRangeLabel = analytics?.analyticsRange
    ? analytics.analyticsRange.startDate === analytics.analyticsRange.endDate
      ? analytics.analyticsRange.startDate
      : `${analytics.analyticsRange.startDate} to ${analytics.analyticsRange.endDate}`
    : filters.startDate === filters.endDate
      ? filters.startDate
      : `${filters.startDate} to ${filters.endDate}`;

  const fetchActivities = async (nextFilters = filters) => {
    setRefreshingActivities(true);
    try {
      const params = new URLSearchParams();
      if (nextFilters.startDate) params.append('startDate', nextFilters.startDate);
      if (nextFilters.endDate) params.append('endDate', nextFilters.endDate);
      if (nextFilters.employee) params.append('employee', nextFilters.employee);

      const response = await axios.get(`${apiBaseUrl}/api/teamlead/activities?${params.toString()}`, {
        withCredentials: true,
      });
      setActivitiesData(response.data || { activities: [] });
      setSnackbar({
        open: true,
        message: `Loaded ${response.data?.activities?.length || 0} activities`,
        severity: 'success',
      });
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load activities';
      setError(message);
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setRefreshingActivities(false);
    }
  };

  const fetchActivityHistory = async () => {
    if (!historyFilters.employee || !historyFilters.date) {
      setHistorySearched(false);
      setHistoryActivitiesData({ activities: [] });
      setSnackbar({ open: true, message: 'Please select employee and date first', severity: 'warning' });
      return;
    }

    setRefreshingActivities(true);
    try {
      const params = new URLSearchParams({
        startDate: historyFilters.date,
        endDate: historyFilters.date,
      });
      if (historyFilters.employee !== ALL_EMPLOYEES) {
        params.append('employee', historyFilters.employee);
      }
      const response = await axios.get(`${apiBaseUrl}/api/teamlead/activities?${params.toString()}`, {
        withCredentials: true,
      });
      setHistoryActivitiesData(response.data || { activities: [] });
      setHistorySearched(true);
      setSnackbar({
        open: true,
        message: `Loaded ${response.data?.activities?.length || 0} activities`,
        severity: 'success',
      });
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load activity history';
      setHistorySearched(false);
      setHistoryActivitiesData({ activities: [] });
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setRefreshingActivities(false);
    }
  };

  const fetchActivityTemplates = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/api/activities/department`, { withCredentials: true });
      setActivityTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setActivityTemplates([]);
    }
  };

  const fetchMyAttendanceStatus = async (date = myActivityDate) => {
    if (!date) return;
    setMyAttendanceLoading(true);
    setMyAttendanceError('');
    try {
      const response = await axios.get(`${apiBaseUrl}/api/workday/status`, {
        params: { date },
        withCredentials: true,
      });
      setMyAttendance({
        type: response.data?.attendanceType ?? null,
        standardHours: response.data?.standardHours ?? null,
      });
    } catch (err) {
      setMyAttendance({ type: null, standardHours: null });
      setMyAttendanceError(err.response?.data?.error || 'Failed to load attendance status');
    } finally {
      setMyAttendanceLoading(false);
    }
  };

  const fetchMyActivityRows = async () => {
    setMyActivityRowsLoading(true);
    setMyActivityRowsError('');
    try {
      const response = await axios.get(`${apiBaseUrl}/api/activities/employee`, { withCredentials: true });
      setMyActivityRows(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setMyActivityRows([]);
      setMyActivityRowsError(err.response?.data?.error || 'Failed to load your activities');
    } finally {
      setMyActivityRowsLoading(false);
    }
  };

  const fetchCalendarData = useCallback(async (year, month) => {
    setCalendarLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      const data = {};

      try {
        const attendanceRes = await axios.get(`${apiBaseUrl}/api/workday/history`, {
          withCredentials: true,
          params: { startDate: startStr, endDate: endStr },
        });

        (attendanceRes.data || []).forEach((record) => {
          const date = record.date?.split('T')[0];
          if (!date) return;
          data[date] = {
            ...data[date],
            attendance: record.attendanceType,
            clockedIn: record.clockedIn,
            hours: record.hours,
          };
        });
      } catch (attendanceError) {
        console.warn('Error fetching team lead attendance history:', attendanceError);
      }

      try {
        const activitiesRes = await axios.get(`${apiBaseUrl}/api/activities/employee/history`, {
          withCredentials: true,
          params: { startDate: startStr, endDate: endStr },
        });

        (activitiesRes.data || []).forEach((activity) => {
          normalizeEntries(activity).forEach((entry) => {
            const date = entry.date?.split('T')[0];
            if (!date) return;
            const durationHours = Number(entry.duration) ? Number(entry.duration) / 60 : 0;
            if (!data[date]) data[date] = {};
            if (!data[date].sessions) data[date].sessions = { institute: 0, school: 0, activities: [] };
            data[date].hours = (toNumber(data[date].hours) + durationHours).toFixed(1);
            data[date].sessions.activities.push({
              title: activity.title,
              sessionsCount: activity.sessionsCount || 1,
            });

            const title = String(activity.title || '').toLowerCase();
            if (title.includes('institute session')) {
              data[date].sessions.institute += activity.sessionsCount || 1;
            } else if (title.includes('school session')) {
              data[date].sessions.school += activity.sessionsCount || 1;
            }
          });
        });
      } catch (activitiesError) {
        console.warn('Error fetching team lead activity history:', activitiesError);
      }

      setCalendarData(data);
    } catch (err) {
      setCalendarData({});
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const fetchToolAssignments = useCallback(async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/api/admin/tool-assignments/me`, { withCredentials: true });
      setToolAssignments({
        workbook: response.data.workbook ?? true,
        reportCard: response.data.reportCard ?? true,
      });
    } catch (err) {
      setToolAssignments({ workbook: true, reportCard: true });
    }
  }, []);

  const handleMyActivityDateChange = (event) => {
    const nextDate = event.target.value;
    setMyActivityDate(nextDate);
  };

  const handleMarkMyAttendance = async (attendanceType) => {
    if (isFutureActivityDate) {
      setSnackbar({ open: true, message: 'Cannot mark attendance for a future date.', severity: 'warning' });
      return;
    }

    setMyAttendanceMarking(true);
    try {
      const response = await axios.post(`${apiBaseUrl}/api/workday/mark-attendance`, {
        attendanceType,
        date: myActivityDate,
      }, { withCredentials: true });

      setMyAttendance({
        type: response.data?.attendanceType || attendanceType,
        standardHours: response.data?.standardHours ?? (attendanceType === 'full_day' ? 9 : attendanceType === 'half_day' ? 4.5 : 0),
      });
      setSnackbar({
        open: true,
        message: response.data?.message || 'Attendance marked',
        severity: 'success',
      });
      await fetchMyAttendanceStatus(myActivityDate);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to mark attendance', severity: 'error' });
    } finally {
      setMyAttendanceMarking(false);
    }
  };

  const resetMyActivityForm = () => {
    setMyActivityDate(getTodayDate());
    setMyActivityDescription('');
    setMyActivityComment('');
    setMyActivityStartTime('');
    setMyActivityEndTime('');
    setMyActivitySessionType('Offline');
    setMyActivityInstitute('');
    setMyActivitySchool('');
  };

  const handleTeamLeadActivitySubmit = async () => {
    if (!canLogMyActivity) {
      setSnackbar({ open: true, message: 'Please mark Full Day or Half Day before logging an activity.', severity: 'warning' });
      return;
    }

    if (!myActivityDescription) {
      setSnackbar({ open: true, message: 'Please select an activity template', severity: 'error' });
      return;
    }

    const isSessionCount = myActivityDescription === 'Total No. of Sessions';
    if (isSessionCount) {
      if (myActivityInstitute === '' || myActivitySchool === '') {
        setSnackbar({ open: true, message: 'Enter institute and school counts', severity: 'error' });
        return;
      }
    } else {
      if (!myActivityStartTime || !myActivityEndTime) {
        setSnackbar({ open: true, message: 'Enter start and end time', severity: 'error' });
        return;
      }
      const duration = (new Date(`${myActivityDate}T${myActivityEndTime}`) - new Date(`${myActivityDate}T${myActivityStartTime}`)) / 60000;
      if (!Number.isFinite(duration) || duration <= 0) {
        setSnackbar({ open: true, message: 'End time must be after start time', severity: 'error' });
        return;
      }
    }

    setMyActivityLoading(true);
    try {
      const departmentId = user?.departmentId || employees[0]?.department?.id || employees[0]?.departmentId || null;
      const entries = isSessionCount
        ? [{ duration: 0, description: myActivityDescription, date: new Date(`${myActivityDate}T00:00:00`).toISOString(), comment: myActivityComment }]
        : [{
            duration: Math.max(0, (new Date(`${myActivityDate}T${myActivityEndTime}`) - new Date(`${myActivityDate}T${myActivityStartTime}`)) / 60000),
            punchIn: new Date(`${myActivityDate}T${myActivityStartTime}`).toISOString(),
            punchOut: new Date(`${myActivityDate}T${myActivityEndTime}`).toISOString(),
            description: myActivityDescription,
            date: new Date(`${myActivityDate}T${myActivityStartTime}`).toISOString(),
            comment: myActivityComment
          }];

      await axios.post(`${apiBaseUrl}/api/activities`, {
        title: myActivityDescription,
        description: myActivityDescription,
        department: departmentId,
        startTime: isSessionCount ? '' : myActivityStartTime,
        endTime: isSessionCount ? '' : myActivityEndTime,
        comment: myActivityComment,
        timeEntries: entries,
        institute: isSessionCount ? Number(myActivityInstitute || 0) : undefined,
        school: isSessionCount ? Number(myActivitySchool || 0) : undefined,
        sessionType: isSessionCount ? myActivitySessionType : undefined
      }, { withCredentials: true });

      setSnackbar({ open: true, message: 'Activity logged', severity: 'success' });
      resetMyActivityForm();
      fetchDashboard();
      fetchMyAttendanceStatus(myActivityDate);
      fetchMyActivityRows();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to log activity', severity: 'error' });
    } finally {
      setMyActivityLoading(false);
    }
  };

  const closeMyActivityMenu = () => {
    setMyActivityMenuAnchor(null);
  };

  const handleOpenMyActivityMenu = (event, row) => {
    setMyActivityMenuAnchor(event.currentTarget);
    setSelectedMyActivityRow(row);
  };

  const handleEditMyActivity = () => {
    if (!selectedMyActivityRow?.activity) return;

    const { activity, entry } = selectedMyActivityRow;
    const isSessionCount = activity.title === 'Total No. of Sessions';
    const rowDate = activityDate(activity, entry);
    const startValue = entry?.punchIn || activity.startTime;
    const endValue = entry?.punchOut || activity.endTime;

    setEditMyActivityForm({
      id: activity.id || activity._id || '',
      title: activity.title || '',
      date: rowDate ? new Date(rowDate).toISOString().slice(0, 10) : myActivityDate,
      startTime: isSessionCount ? '' : toTimeInputValue(startValue),
      endTime: isSessionCount ? '' : toTimeInputValue(endValue),
      comment: entry?.comment || activity.comment || '',
      sessionType: activity.sessionType || 'Offline',
      institute: activity.institute ?? '',
      school: activity.school ?? '',
    });
    closeMyActivityMenu();
    setEditMyActivityOpen(true);
  };

  const handleSaveMyActivityEdit = async () => {
    const id = editMyActivityForm.id;
    if (!id) {
      setSnackbar({ open: true, message: 'Activity ID missing, cannot update.', severity: 'error' });
      return;
    }

    if (!editMyActivityForm.title) {
      setSnackbar({ open: true, message: 'Please select an activity template', severity: 'error' });
      return;
    }

    const isSessionCount = editMyActivityForm.title === 'Total No. of Sessions';
    if (isSessionCount) {
      if (editMyActivityForm.institute === '' || editMyActivityForm.school === '') {
        setSnackbar({ open: true, message: 'Enter institute and school counts', severity: 'error' });
        return;
      }
    } else {
      if (!editMyActivityForm.startTime || !editMyActivityForm.endTime) {
        setSnackbar({ open: true, message: 'Enter start and end time', severity: 'error' });
        return;
      }

      const duration = (new Date(`${editMyActivityForm.date}T${editMyActivityForm.endTime}`) - new Date(`${editMyActivityForm.date}T${editMyActivityForm.startTime}`)) / 60000;
      if (!Number.isFinite(duration) || duration <= 0) {
        setSnackbar({ open: true, message: 'End time must be after start time', severity: 'error' });
        return;
      }
    }

    const entries = isSessionCount
      ? [{
          duration: 0,
          description: editMyActivityForm.title,
          date: new Date(`${editMyActivityForm.date}T00:00:00`).toISOString(),
          comment: editMyActivityForm.comment,
        }]
      : [{
          duration: Math.max(0, (new Date(`${editMyActivityForm.date}T${editMyActivityForm.endTime}`) - new Date(`${editMyActivityForm.date}T${editMyActivityForm.startTime}`)) / 60000),
          punchIn: new Date(`${editMyActivityForm.date}T${editMyActivityForm.startTime}`).toISOString(),
          punchOut: new Date(`${editMyActivityForm.date}T${editMyActivityForm.endTime}`).toISOString(),
          description: editMyActivityForm.title,
          date: new Date(`${editMyActivityForm.date}T${editMyActivityForm.startTime}`).toISOString(),
          comment: editMyActivityForm.comment,
        }];

    setEditMyActivitySaving(true);
    try {
      await axios.patch(`${apiBaseUrl}/api/activities/${id}`, {
        title: editMyActivityForm.title,
        startTime: isSessionCount ? '' : editMyActivityForm.startTime,
        endTime: isSessionCount ? '' : editMyActivityForm.endTime,
        comment: editMyActivityForm.comment,
        timeEntries: entries,
        institute: isSessionCount ? Number(editMyActivityForm.institute || 0) : undefined,
        school: isSessionCount ? Number(editMyActivityForm.school || 0) : undefined,
        sessionType: isSessionCount ? editMyActivityForm.sessionType : undefined,
      }, { withCredentials: true });

      setSnackbar({ open: true, message: 'Activity updated', severity: 'success' });
      setEditMyActivityOpen(false);
      setSelectedMyActivityRow(null);
      await fetchMyActivityRows();
      await fetchDashboard();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to update activity', severity: 'error' });
    } finally {
      setEditMyActivitySaving(false);
    }
  };

  const handleDeleteMyActivity = () => {
    closeMyActivityMenu();
    setDeleteMyActivityOpen(true);
  };

  const handleConfirmDeleteMyActivity = async () => {
    const id = selectedMyActivityRow?.activity?.id || selectedMyActivityRow?.activity?._id;
    if (!id) {
      setSnackbar({ open: true, message: 'Activity ID missing, cannot delete.', severity: 'error' });
      return;
    }

    setDeleteMyActivityLoading(true);
    try {
      await axios.delete(`${apiBaseUrl}/api/activities/${id}`, { withCredentials: true });
      setSnackbar({ open: true, message: 'Activity deleted', severity: 'success' });
      setDeleteMyActivityOpen(false);
      setSelectedMyActivityRow(null);
      await fetchMyActivityRows();
      await fetchDashboard();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete activity', severity: 'error' });
    } finally {
      setDeleteMyActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendanceStatus(myActivityDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myActivityDate]);

  useEffect(() => {
    fetchMyActivityRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployeeAnalyticsData = async (employeeCode, date = getTodayDate()) => {
    if (!employeeCode) return;
    setEmployeeLoading((prev) => ({ ...prev, [employeeCode]: true }));
    try {
      const response = await axios.get(`${apiBaseUrl}/api/teamlead/employee/${employeeCode}/analytics`, {
        params: { date },
        withCredentials: true,
      });
      setEmployeeAnalytics((prev) => ({
        ...prev,
        [employeeCode]: response.data,
      }));
    } catch (err) {
      setEmployeeAnalytics((prev) => ({
        ...prev,
        [employeeCode]: { error: err.response?.data?.error || 'Failed to load analytics' },
      }));
    } finally {
      setEmployeeLoading((prev) => ({ ...prev, [employeeCode]: false }));
    }
  };

  const handleExpandEmployee = (employeeCode) => {
    setExpandedEmployee((prev) => {
      const willExpand = prev !== employeeCode;
      if (willExpand) {
        const targetDate = employeeDateFilters[employeeCode]?.selected || getTodayDate();
        setEmployeeDateFilters((curr) => ({
          ...curr,
          [employeeCode]: { selected: targetDate, pending: targetDate },
        }));
        fetchEmployeeAnalyticsData(employeeCode, targetDate);
      }
      return willExpand ? employeeCode : null;
    });
  };

  const handleEmployeeDateChange = (employeeCode, value) => {
    const normalized = value || getTodayDate();
    setEmployeeDateFilters((prev) => ({
      ...prev,
      [employeeCode]: {
        selected: prev[employeeCode]?.selected || getTodayDate(),
        pending: normalized,
      },
    }));
  };

  const handleApplyEmployeeDate = (employeeCode) => {
    const current = employeeDateFilters[employeeCode];
    const targetDate = current?.pending || current?.selected || getTodayDate();
    setEmployeeDateFilters((prev) => ({
      ...prev,
      [employeeCode]: {
        selected: targetDate,
        pending: targetDate,
      },
    }));
    fetchEmployeeAnalyticsData(employeeCode, targetDate);
  };

  const handleResetEmployeeDate = (employeeCode) => {
    const today = getTodayDate();
    setEmployeeDateFilters((prev) => ({
      ...prev,
      [employeeCode]: {
        selected: today,
        pending: today,
      },
    }));
    fetchEmployeeAnalyticsData(employeeCode, today);
  };

  const fetchDashboard = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const analyticsParams = new URLSearchParams();
      if (nextFilters.startDate) analyticsParams.append('startDate', nextFilters.startDate);
      if (nextFilters.endDate) analyticsParams.append('endDate', nextFilters.endDate);

      const [analyticsResponse, employeesResponse, activitiesResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/teamlead/analytics?${analyticsParams.toString()}`, { withCredentials: true }),
        axios.get(`${apiBaseUrl}/api/teamlead/employees`, { withCredentials: true }),
        axios.get(`${apiBaseUrl}/api/teamlead/activities?startDate=${nextFilters.startDate}&endDate=${nextFilters.endDate}`, {
          withCredentials: true,
        }),
      ]);

      setAnalytics(analyticsResponse.data);
      setEmployeesData(employeesResponse.data || { employees: [] });
      setActivitiesData(activitiesResponse.data || { activities: [] });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load team lead dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchActivityTemplates();
    fetchToolAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 7) {
      fetchCalendarData(calendarMonth.getFullYear(), calendarMonth.getMonth());
    }
  }, [tab, calendarMonth, fetchCalendarData]);

  const handleLogout = async () => {
    await axios.post(`${apiBaseUrl}/api/auth/logout`, {}, { withCredentials: true });
    dispatch(logout());
    navigate('/login');
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.post(`${apiBaseUrl}/api/auth/change-password`, {
        oldPassword,
        newPassword,
      }, { withCredentials: true });
      setPasswordSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetFilters = () => {
    const nextFilters = { startDate: getTodayDate(), endDate: getTodayDate(), employee: '' };
    setFilters(nextFilters);
    fetchActivities(nextFilters);
  };

  const resetActivityHistory = () => {
    setHistoryFilters({ date: getTodayDate(), employee: '' });
    setHistoryActivitiesData({ activities: [] });
    setHistorySearched(false);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#F9FAFB' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#F9FAFB' }}>
      <Sidebar
        items={sidebarItems}
        activeItem={activeTabId}
        onItemClick={handleDashboardNavigation}
        user={{ name: user?.name || 'Team Lead', role: 'Team Lead' }}
        onLogout={handleLogout}
      />

      <Box sx={{ flex: 1, ml: '240px', display: 'flex', flexDirection: 'column' }}>
        <Header
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          searchOptions={headerSearchOptions}
          onSearchSelect={(option) => handleDashboardNavigation(option.id)}
          user={{ name: user?.name || 'Team Lead' }}
        />

        <Box sx={{ flex: 1, p: 4 }}>
          <Breadcrumb
            items={[
              { label: 'Team Lead', active: false },
            ]}
            separator=">"
          />

          <Box sx={{ mb: 4 }}>
            <Typography sx={{ ...typography.subheadingS2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 0.5 }}>
              {tabLabels[tab]}
            </Typography>
            <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
              {analytics?.focusDepartment || employeesData.teamLeadDepartment || 'Department'} -{' '}
              {analytics?.branchInfo?.name || employeesData.branchName || 'Branch'} - Last modified:{' '}
              {new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              })}{' '}
              by {user?.name || 'Team Lead'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {tab === 0 && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ ...typography.paragraphMedium, fontWeight: 800, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
                      Overview Range
                    </Typography>
                    <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#D0D5DD' : '#667085' }}>
                      Cards and graphs are calculated for {analyticsRangeLabel}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      label="Start Date"
                      type="date"
                      size="small"
                      value={filters.startDate}
                      onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      size="small"
                      value={filters.endDate}
                      onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => fetchDashboard(filters)}
                      disabled={loading || !filters.startDate || !filters.endDate}
                    >
                      Refresh Overview
                    </Button>
                  </Box>
                </Box>
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 3,
                  mb: 3,
                  width: '100%',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <StatCard
                    title="Team Trainers"
                    value={totals.teamEmployees}
                    icon="users"
                    color="primary"
                    trendValue="Assigned to you"
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <StatCard
                    title="Team Productivity"
                    value={`${totals.teamProductivity}%`}
                    icon="utilization"
                    color="success"
                    trendValue={`Expected ${formatHours(analytics?.expectedHours || 0)}`}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <StatCard
                    title="Team Logged Hours"
                    value={formatHours(totals.teamHours)}
                    icon="session"
                    color="warning"
                    trendValue={`For ${analyticsRangeLabel}`}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <StatCard
                    title="Completed Activities"
                    value={totals.completedActivities}
                    icon="reports"
                    color="purple"
                    trendValue="For selected range"
                  />
                </Box>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ ...typography.subheadingS3, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
                      Activity Not Filled Today
                    </Typography>
                    <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#D0D5DD' : '#667085' }}>
                      {analytics?.missingActivityDate || getTodayDate()}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${employeesWithoutTodayActivity.length} pending`}
                    sx={{
                      bgcolor: employeesWithoutTodayActivity.length ? '#FEF3F2' : '#ECFDF3',
                      color: employeesWithoutTodayActivity.length ? '#B42318' : '#027A48',
                      fontWeight: 800,
                    }}
                  />
                </Box>
                {employeesWithoutTodayActivity.length > 0 ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                    {employeesWithoutTodayActivity.map((employee) => (
                      <Box
                        key={employee.employeeCode}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#EAECF0'}`,
                        }}
                      >
                        <Avatar sx={{ width: 34, height: 34, bgcolor: '#F04438', color: '#fff', fontSize: 13, fontWeight: 800 }}>
                          {getInitials(employee.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ ...typography.paragraphSmall, fontWeight: 800, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }} noWrap>
                            {employee.name}
                          </Typography>
                          <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#D0D5DD' : '#667085' }} noWrap>
                            {employee.employeeCode}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="success">All assigned employees have filled activity today.</Alert>
                )}
              </Paper>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    lg: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 3,
                  width: '100%',
                  alignItems: 'stretch',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      width: '100%',
                      minWidth: 0,
                      maxWidth: '100%',
                      height: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      borderRadius: 3,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                    }}
                  >
                    <Typography sx={{ ...typography.subheadingS3, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 2 }}>
                      Activity Status
                    </Typography>
                    <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%', height: { xs: 260, md: 320 }, overflow: 'hidden' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Pie
                            data={analytics?.activityStatusData || []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="72%"
                            labelLine={false}
                          >
                            {(analytics?.activityStatusData || []).map((entry, index) => (
                              <Cell key={entry.name} fill={entry.color || chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      width: '100%',
                      minWidth: 0,
                      maxWidth: '100%',
                      height: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      borderRadius: 3,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                    }}
                  >
                    <Typography sx={{ ...typography.subheadingS3, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 2 }}>
                      Day-wise Hours
                    </Typography>
                    <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%', height: { xs: 260, md: 320 }, overflow: 'hidden' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.daywiseHoursData || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" interval={0} />
                          <YAxis width={42} />
                          <Tooltip />
                          {(analytics?.departmentOptions || [analytics?.focusDepartment]).filter(Boolean).map((dept, index) => (
                            <Bar key={dept} dataKey={dept} fill={chartColors[index % chartColors.length]} radius={[6, 6, 0, 0]} maxBarSize={72} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Box>
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Grid container spacing={3}>
              {visibleEmployees.length > 0 ? (
                visibleEmployees.map((employee) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={employee.employeeCode}>
                    <EmployeeCard employee={employee} />
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info">No employees match the current search.</Alert>
                </Grid>
              )}
            </Grid>
          )}

          {tab === 2 && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                }}
              >
                <Typography sx={{ ...typography.subheadingS3, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 2 }}>
                  Team Members
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Search employees by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.5)' : '#F9FAFB',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      },
                    },
                  }}
                />
              </Paper>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visibleEmployees.length > 0 ? (
                  visibleEmployees.map((employee) => {
                    const departmentName = employee.department?.name || 'Unassigned';
                    const accent = departmentColors[departmentName] || '#0070F0';
                    const todayHours = toNumber(employee.todayActivityHours ?? employee.todayHours);
                    const isExpanded = expandedEmployee === employee.employeeCode;
                    const analyticsData = employeeAnalytics[employee.employeeCode];
                    const isLoading = employeeLoading[employee.employeeCode];
                    const filters = employeeDateFilters[employee.employeeCode] || {};
                    const selectedDate = filters.selected || getTodayDate();
                    const pendingDate = filters.pending || selectedDate;

                    return (
                      <Box key={employee.employeeCode}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.5)' : '#F9FAFB',
                            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.8)' : '#fff',
                              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#D0D5DD',
                            },
                          }}
                          onClick={() => handleExpandEmployee(employee.employeeCode)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                            <Avatar sx={{ bgcolor: accent, color: '#fff', fontWeight: 800, width: 48, height: 48 }}>
                              {getInitials(employee.name)}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ ...typography.paragraphMedium, fontWeight: 700, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }} noWrap>
                                {employee.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent }} />
                                <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }} noWrap>
                                  {departmentName}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 'fit-content' }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
                                {formatHours(todayHours)}
                              </Typography>
                              <Typography sx={{ ...typography.paragraphXS, color: todayHours >= 8 ? '#12B76A' : todayHours >= 4 ? '#F79009' : '#F04438', fontWeight: 600 }}>
                                {todayHours >= 8 ? 'Full Day' : todayHours >= 4 ? 'Half Day' : 'Part Day'}
                              </Typography>
                            </Box>
                            <IconButton size="small" sx={{ color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
                              <ArrowDropDown sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                            </IconButton>
                          </Box>
                        </Paper>

                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 3,
                              mt: 0.5,
                              mb: 2,
                              borderRadius: 2,
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.7)' : '#F9FAFB',
                              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                            }}
                          >
                            {isLoading ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                              </Box>
                            ) : analyticsData?.error ? (
                              <Alert severity="error">{analyticsData.error}</Alert>
                            ) : analyticsData ? (
                              <Box>
                                <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <TextField
                                    type="date"
                                    size="small"
                                    value={pendingDate}
                                    onChange={(e) => handleEmployeeDateChange(employee.employeeCode, e.target.value)}
                                    sx={{ minWidth: 160 }}
                                  />
                                  <Stack direction="row" spacing={1}>
                                    <Button variant="contained" size="small" onClick={() => handleApplyEmployeeDate(employee.employeeCode)}>
                                      Apply
                                    </Button>
                                    {selectedDate !== getTodayDate() && (
                                      <Button variant="outlined" size="small" onClick={() => handleResetEmployeeDate(employee.employeeCode)}>
                                        Reset
                                      </Button>
                                    )}
                                  </Stack>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#888' : '#666' }}>
                                      Total Hours
                                    </Typography>
                                    <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700 }}>
                                      {(toNumber(analyticsData.totalHours) || 0).toFixed(1)}h
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#888' : '#666' }}>
                                      Activities
                                    </Typography>
                                    <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700 }}>
                                      {(analyticsData.activities || []).length}
                                    </Typography>
                                  </Box>
                                </Box>

                                {(() => {
                                  const activities = analyticsData.activities || [];
                                  const totalMinutes = activities.reduce((sum, act) => sum + (act.totalMinutes || 0), 0);
                                  const totalHours = totalMinutes / 60;

                                  // Session counts from activities
                                  const sessionCounts = { offlineInstitute: 0, onlineInstitute: 0, school: 0 };
                                  activities.forEach((act) => {
                                    if (act.title === 'Total No. of Sessions') {
                                      const instituteCount = Number(act.institute || 0);
                                      const schoolCount = Number(act.school || 0);
                                      if (act.sessionType === 'Offline' && instituteCount > 0) sessionCounts.offlineInstitute += instituteCount;
                                      if (act.sessionType === 'Online' && instituteCount > 0) sessionCounts.onlineInstitute += instituteCount;
                                      if (schoolCount > 0) sessionCounts.school += schoolCount;
                                    }
                                  });

                                  return (
                                    <Grid container spacing={2}>
                                      <Grid item xs={12} sm={12} md={6} lg={3}>
                                        <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700, mb: 2 }}>Time Spent by Activity</Typography>
                                        <Box sx={{ width: '100%', height: { xs: 300, sm: 300, md: 340 }, overflowY: 'auto' }}>
                                          {activities.length > 0 ? (
                                            activities
                                              .filter((act) => act.totalMinutes > 0)
                                              .map((act, idx) => (
                                                <Box
                                                  key={`${act.title}-${idx}`}
                                                  sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    mb: 1.5,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                                                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7F0',
                                                  }}
                                                >
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: chartColors[idx % chartColors.length], flexShrink: 0 }} />
                                                    <Typography sx={{ ...typography.paragraphXS, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      {act.title}
                                                    </Typography>
                                                  </Box>
                                                  <Box sx={{ textAlign: 'right', minWidth: 50, flexShrink: 0, ml: 1 }}>
                                                    <Typography sx={{ ...typography.paragraphXS, fontWeight: 700 }}>{(act.totalMinutes / 60).toFixed(1)}h</Typography>
                                                    <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#888' : '#666' }}>
                                                      {totalHours > 0 ? Math.round((act.totalMinutes / (totalHours * 60)) * 100) : 0}%
                                                    </Typography>
                                                  </Box>
                                                </Box>
                                              ))
                                          ) : (
                                            <Typography sx={{ color: theme.palette.mode === 'dark' ? '#888' : '#999', fontSize: '0.85rem' }}>
                                              No activities logged
                                            </Typography>
                                          )}
                                        </Box>
                                      </Grid>

                                      <Grid item xs={12} sm={6} md={6} lg={3}>
                                        <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700, mb: 2, textAlign: 'center' }}>Activity Distribution</Typography>
                                        <Box sx={{ width: '100%', height: { xs: 280, sm: 280, md: 340 }, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                          <ResponsiveContainer width="100%" height="100%">
                                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                              <Pie
                                                data={activities
                                                  .filter((act) => act.totalMinutes > 0)
                                                  .map((act, idx) => ({
                                                    name: act.title,
                                                    value: act.totalMinutes,
                                                  }))}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={65}
                                                innerRadius={35}
                                                label={false}
                                              >
                                                {activities
                                                  .filter((act) => act.totalMinutes > 0)
                                                  .map((act, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={chartColors[idx % chartColors.length]} />
                                                  ))}
                                              </Pie>
                                              <Tooltip formatter={(value) => `${(value / 60).toFixed(2)}h`} />
                                            </PieChart>
                                          </ResponsiveContainer>
                                        </Box>
                                      </Grid>

                                      <Grid item xs={12} sm={6} md={6} lg={3}>
                                        <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700, mb: 2, textAlign: 'center' }}>Session Distribution</Typography>
                                        <Box sx={{ width: '100%', height: { xs: 280, sm: 280, md: 340 }, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                          <ResponsiveContainer width="100%" height="100%">
                                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                              <Pie
                                                data={[
                                                  { name: 'Offline Institute', value: sessionCounts.offlineInstitute },
                                                  { name: 'Online Institute', value: sessionCounts.onlineInstitute },
                                                  { name: 'School', value: sessionCounts.school },
                                                ].filter((item) => item.value > 0)}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={65}
                                                innerRadius={35}
                                                label={false}
                                              >
                                                {[
                                                  { color: '#00C49F' },
                                                  { color: '#FF8042' },
                                                  { color: '#0088FE' },
                                                ].map((entry, idx) => (
                                                  <Cell key={`cell-session-${idx}`} fill={entry.color} />
                                                ))}
                                              </Pie>
                                              <Tooltip />
                                            </PieChart>
                                          </ResponsiveContainer>
                                        </Box>
                                      </Grid>
                                    </Grid>
                                  );
                                })()}
                              </Box>
                            ) : null}
                          </Paper>
                        </Collapse>
                      </Box>
                    );
                  })
                ) : (
                  <Alert severity="info">No employees match the current search.</Alert>
                )}
              </Box>
            </Box>
          )}

          {tab === 3 && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                }}
              >
                <Grid container spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Date"
                      type="date"
                      value={historyFilters.date}
                      onChange={(event) => {
                        setHistoryFilters((current) => ({ ...current, date: event.target.value }));
                        setHistorySearched(false);
                        setHistoryActivitiesData({ activities: [] });
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={12} md={5} lg={4.5} sx={{ minWidth: { md: 420 } }}>
                    <FormControl fullWidth sx={{ minWidth: { xs: '100%', md: 420 } }}>
                      <InputLabel shrink>Employee</InputLabel>
                      <Select
                        label="Employee"
                        value={historyFilters.employee}
                        onChange={(event) => {
                          setHistoryFilters((current) => ({ ...current, employee: event.target.value }));
                          setHistorySearched(false);
                          setHistoryActivitiesData({ activities: [] });
                        }}
                        displayEmpty
                        notched
                        renderValue={(selected) => {
                          if (!selected) return 'Select employee';
                          if (selected === ALL_EMPLOYEES) return 'All Employees';
                          const employee = employees.find((item) => item.employeeCode === selected);
                          return employee ? `${employee.name} (${employee.employeeCode})` : selected;
                        }}
                        sx={{
                          minHeight: 56,
                          '& .MuiSelect-select': {
                            minWidth: { xs: '100%', md: 380 },
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        }}
                      >
                        <MenuItem value="" disabled>Select employee</MenuItem>
                        <MenuItem value={ALL_EMPLOYEES}>All Employees</MenuItem>
                        {employees.map((employee) => (
                          <MenuItem key={employee.employeeCode} value={employee.employeeCode}>
                            {employee.name} ({employee.employeeCode})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4} lg={4.5}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
                      <Button variant="outlined" onClick={resetFilters}>
                        Reset
                      </Button>
                      <Button variant="contained" onClick={() => fetchActivities(filters)} disabled={refreshingActivities}>
                        {refreshingActivities ? <CircularProgress size={20} /> : 'Refresh'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                  overflow: 'hidden',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#F9FAFB' }}>
                      <TableCell>Employee</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Comment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!historySearched ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Alert severity="info">Select an employee and date, then click Show to view activity history.</Alert>
                        </TableCell>
                      </TableRow>
                    ) : filteredHistoryActivities.length > 0 ? (
                      filteredHistoryActivities.flatMap((activity) => {
                        const entries = normalizeEntries(activity);
                        const rows = entries.length > 0 ? entries : [{ duration: activity.timeSpent, date: activity.createdAt }];

                        return rows.map((entry, index) => {
                          const date = activityDate(activity, entry);
                          return (
                            <TableRow key={`${activity.id}-${index}`} hover>
                              <TableCell>
                                <AvatarCell
                                  name={activity.assignedTo?.name || 'Unassigned'}
                                  email={activity.assignedTo?.employeeCode || activity.assignedToId || ''}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{date ? new Date(date).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell>
                                <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700 }}>
                                  {activity.title || 'Activity'}
                                </Typography>
                                <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
                                  {activity.description || ''}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{(toNumber(entry.duration) / 60).toFixed(2)}</TableCell>
                              <TableCell>
                                <StatusChip
                                  status={activity.status === 'completed' ? 'completed' : 'pending'}
                                  label={activity.status === 'completed' ? 'Completed' : 'In Progress'}
                                />
                              </TableCell>
                              <TableCell>{entry.comment || activity.comment || '-'}</TableCell>
                            </TableRow>
                          );
                        });
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Alert severity="info">No activity history found for the selected employee and date.</Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 4 && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 4 },
                  mb: 4,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                  boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  My Activity Logger
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                  Select a fixed activity template and log your daily work.
                </Typography>
                <Box
                  sx={{
                    borderRadius: 2,
                    p: { xs: 1.5, md: 2 },
                    mb: 2.5,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F6F9FF',
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E4E7F0'}`,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', md: 'center' },
                    gap: 2,
                  }}
                >
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Typography fontWeight={700}>Mark Login / Attendance</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <TextField
                        label="Attendance Date"
                        type="date"
                        size="small"
                        value={myActivityDate}
                        onChange={handleMyActivityDateChange}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayDate }}
                        sx={{ maxWidth: { sm: 220 } }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setMyActivityDate(todayDate)}
                        sx={{ textTransform: 'none' }}
                      >
                        Today
                      </Button>
                    </Stack>
                    {myAttendanceError && <Alert severity="error">{myAttendanceError}</Alert>}
                    <Typography variant="caption" color="text.secondary">
                      Selected Date: {selectedActivityDateLabel}
                    </Typography>
                  </Stack>

                  <Box sx={{ minWidth: { md: 280 } }}>
                    {myAttendanceLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, py: 1 }}>
                        <CircularProgress size={22} />
                      </Box>
                    ) : myAttendance.type ? (
                      <Stack spacing={0.5} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                        <Typography fontWeight={700} color="primary">{myAttendanceLabel}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Standard Hours: {myAttendance.standardHours ?? '--'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ pt: 0.5, flexWrap: 'wrap' }}>
                          <Button size="small" variant="outlined" disabled={myAttendanceMarking || isFutureActivityDate} onClick={() => handleMarkMyAttendance('full_day')}>
                            Full Day
                          </Button>
                          <Button size="small" variant="outlined" disabled={myAttendanceMarking || isFutureActivityDate} onClick={() => handleMarkMyAttendance('half_day')}>
                            Half Day
                          </Button>
                          <Button size="small" variant="outlined" color="error" disabled={myAttendanceMarking || isFutureActivityDate} onClick={() => handleMarkMyAttendance('leave')}>
                            Leave
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button
                          size="small"
                          fullWidth
                          variant="contained"
                          disabled={myAttendanceMarking || isFutureActivityDate}
                          onClick={() => handleMarkMyAttendance('full_day')}
                          sx={{ bgcolor: '#12B76A', '&:hover': { bgcolor: '#10A060' } }}
                        >
                          Full Day
                        </Button>
                        <Button
                          size="small"
                          fullWidth
                          variant="contained"
                          disabled={myAttendanceMarking || isFutureActivityDate}
                          onClick={() => handleMarkMyAttendance('half_day')}
                          sx={{ bgcolor: '#F79009', '&:hover': { bgcolor: '#E07F08' } }}
                        >
                          Half Day
                        </Button>
                        <Button
                          size="small"
                          fullWidth
                          variant="contained"
                          color="error"
                          disabled={myAttendanceMarking || isFutureActivityDate}
                          onClick={() => handleMarkMyAttendance('leave')}
                        >
                          Leave
                        </Button>
                      </Stack>
                    )}
                  </Box>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please enter start and end time in 24-hour format, for example 14:30.
                </Alert>
                {!canLogMyActivity && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Please mark Full Day or Half Day before logging an activity.
                  </Alert>
                )}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: myActivityDescription === 'Total No. of Sessions'
                      ? '170px minmax(220px, 1.4fr) 150px 120px 120px minmax(190px, 1fr) auto'
                      : '170px minmax(240px, 1.5fr) 150px 150px minmax(190px, 1fr) auto'
                  },
                  gap: 2,
                  alignItems: 'center',
                  '& > *': { minWidth: 0 }
                }}>
                  <TextField size="small" fullWidth label="Date" type="date" value={myActivityDate} onChange={handleMyActivityDateChange} InputLabelProps={{ shrink: true }} inputProps={{ max: todayDate }} />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Activity</InputLabel>
                    <Select value={myActivityDescription} label="Activity" onChange={(e) => setMyActivityDescription(e.target.value)}>
                      {activityTemplates.length === 0 ? (
                        <MenuItem value="" disabled>No activities available</MenuItem>
                      ) : (
                        activityTemplates.map((activity) => <MenuItem key={activity.id || activity.title} value={activity.title}>{activity.title}</MenuItem>)
                      )}
                    </Select>
                  </FormControl>
                  {myActivityDescription === 'Total No. of Sessions' ? (
                    <>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Session Type</InputLabel>
                        <Select value={myActivitySessionType} label="Session Type" onChange={(e) => setMyActivitySessionType(e.target.value)}>
                          <MenuItem value="Online">Online</MenuItem>
                          <MenuItem value="Offline">Offline</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField size="small" fullWidth label="Institute" type="number" value={myActivityInstitute} onChange={(e) => setMyActivityInstitute(e.target.value.replace(/^0+(?!$)/, ''))} inputProps={{ min: 0 }} />
                      <TextField size="small" fullWidth label="School" type="number" value={myActivitySchool} onChange={(e) => setMyActivitySchool(e.target.value.replace(/^0+(?!$)/, ''))} inputProps={{ min: 0 }} />
                    </>
                  ) : (
                    <>
                      <TextField size="small" fullWidth label="Start Time" type="time" value={myActivityStartTime} onChange={(e) => setMyActivityStartTime(e.target.value)} InputLabelProps={{ shrink: true }} />
                      <TextField size="small" fullWidth label="End Time" type="time" value={myActivityEndTime} onChange={(e) => setMyActivityEndTime(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </>
                  )}
                  <TextField size="small" fullWidth label="Comment" value={myActivityComment} onChange={(e) => setMyActivityComment(e.target.value)} placeholder="Optional comment" />
                  <Stack direction="row" spacing={1} sx={{ gridColumn: { xs: '1', sm: '1 / -1', lg: 'auto' }, justifyContent: { xs: 'stretch', lg: 'flex-end' } }}>
                    <Button size="small" variant="outlined" onClick={resetMyActivityForm} sx={{ minWidth: 82 }}>Reset</Button>
                    <Button size="small" variant="contained" onClick={handleTeamLeadActivitySubmit} disabled={myActivityLoading || !canLogMyActivity} sx={{ minWidth: 118, whiteSpace: 'nowrap' }}>
                      {myActivityLoading ? <CircularProgress size={18} /> : 'Add Activity'}
                    </Button>
                  </Stack>
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                  boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Recent Activities
                    </Typography>
                    <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#98A2B3' : '#667085' }}>
                      Your entries for {selectedActivityDateLabel}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={fetchMyActivityRows} disabled={myActivityRowsLoading} sx={{ textTransform: 'none' }}>
                    Refresh
                  </Button>
                </Box>

                {myActivityRowsError && <Alert severity="error" sx={{ mb: 2 }}>{myActivityRowsError}</Alert>}

                <TableContainer sx={{ overflowX: 'auto', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`, borderRadius: 2 }}>
                  <Table stickyHeader sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow>
                        {['Date', 'Activity', 'Duration / Count', 'Session / Time', 'Comment', 'Actions'].map((header) => (
                          <TableCell
                            key={header}
                            sx={{
                              fontWeight: 700,
                              color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.98)' : '#F9FAFB',
                              borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myActivityRowsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <CircularProgress size={24} />
                          </TableCell>
                        </TableRow>
                      ) : visibleMyActivityRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography sx={{ color: theme.palette.mode === 'dark' ? '#98A2B3' : '#667085' }}>
                              No activities logged for this date.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        visibleMyActivityRows.map(({ activity, entry, index }) => {
                          const isSessionActivity = activity.title === 'Total No. of Sessions';
                          const rowDate = activityDate(activity, entry);
                          const punchIn = entry.punchIn || activity.startTime;
                          const punchOut = entry.punchOut || activity.endTime;
                          const timeText = isSessionActivity
                            ? 'Sessions'
                            : `${formatActivityTime(punchIn)} - ${formatActivityTime(punchOut)}`;

                          return (
                            <TableRow key={`${activity.id || activity.title}-${index}-${rowDate}`} hover>
                              <TableCell>{rowDate ? new Date(rowDate).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell>
                                <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700 }}>
                                  {activity.title || 'Activity'}
                                </Typography>
                                <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#98A2B3' : '#667085' }}>
                                  {activity.description || ''}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {isSessionActivity
                                  ? `${activity.sessionType || '--'} | Institute: ${activity.institute || 0} | School: ${activity.school || 0}`
                                  : entry.duration ? `${(toNumber(entry.duration) / 60).toFixed(2)} h` : '--'}
                              </TableCell>
                              <TableCell>{timeText}</TableCell>
                              <TableCell sx={{ maxWidth: 260 }}>
                                <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#667085' }} noWrap>
                                  {entry.comment || activity.comment || '--'}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  aria-label="activity actions"
                                  onClick={(event) => handleOpenMyActivityMenu(event, { activity, entry, index })}
                                >
                                  <MoreVert fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {tab === 5 && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                }}
              >
                <Grid container spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={3}
                    sx={{ flex: { md: '0 0 180px' }, maxWidth: { md: 180 }, flexShrink: 0 }}
                  >
                    <TextField
                      fullWidth
                      label="Date"
                      type="date"
                      value={historyFilters.date}
                      onChange={(event) => {
                        setHistoryFilters((current) => ({ ...current, date: event.target.value }));
                        setHistorySearched(false);
                        setHistoryActivitiesData({ activities: [] });
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={5}
                    sx={{ flex: { md: '0 0 440px' }, maxWidth: { md: 440 }, flexShrink: 0 }}
                  >
                    <FormControl fullWidth sx={{ width: { xs: '100%', md: 440 } }}>
                      <InputLabel shrink>Employee</InputLabel>
                      <Select
                        label="Employee"
                        value={historyFilters.employee}
                        onChange={(event) => {
                          setHistoryFilters((current) => ({ ...current, employee: event.target.value }));
                          setHistorySearched(false);
                          setHistoryActivitiesData({ activities: [] });
                        }}
                        displayEmpty
                        notched
                        renderValue={(selected) => {
                          if (!selected) return 'Select employee';
                          if (selected === ALL_EMPLOYEES) return 'All Employees';
                          const employee = employees.find((item) => item.employeeCode === selected);
                          return employee ? `${employee.name} (${employee.employeeCode})` : selected;
                        }}
                        sx={{
                          minHeight: 56,
                          '& .MuiSelect-select': {
                            minWidth: { xs: '100%', md: 390 },
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        }}
                      >
                        <MenuItem value="" disabled>Select employee</MenuItem>
                        <MenuItem value={ALL_EMPLOYEES}>All Employees</MenuItem>
                        {employees.map((employee) => (
                          <MenuItem key={employee.employeeCode} value={employee.employeeCode}>
                            {employee.name} ({employee.employeeCode})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
                      <Button variant="outlined" onClick={resetActivityHistory}>
                        Reset
                      </Button>
                      <Button variant="contained" onClick={fetchActivityHistory} disabled={refreshingActivities || !historyFilters.employee || !historyFilters.date}>
                        {refreshingActivities ? <CircularProgress size={20} /> : 'Show'}
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        disabled={!historySearched || filteredHistoryActivities.length === 0}
                        onClick={() => {
                          const rows = [];
                          filteredHistoryActivities.forEach((activity) => {
                            const entries = normalizeEntries(activity);
                            const rowsFor = (entries.length > 0 ? entries : [{ duration: activity.timeSpent, date: activity.createdAt }])
                              .filter((entry) => isSameDateValue(activityDate(activity, entry), historyFilters.date));
                            rowsFor.forEach((entry) => {
                              rows.push({
                                employee: activity.assignedTo?.name || '',
                                employeeCode: activity.assignedTo?.employeeCode || activity.assignedToId || '',
                                date: activityDate(activity, entry),
                                activity: activity.title || activity.description || '',
                                hours: (toNumber(entry.duration) / 60).toFixed(2),
                                status: activity.status || '',
                                comment: entry.comment || activity.comment || '',
                              });
                            });
                          });
                          const header = ['Employee', 'EmployeeCode', 'Date', 'Activity', 'Hours', 'Status', 'Comment'];
                          const lines = [header.join(',')].concat(
                            rows.map((r) => [r.employee, r.employeeCode, new Date(r.date).toLocaleDateString(), `"${(r.activity || '').replace(/"/g, '""')}"`, r.hours, r.status, `"${(r.comment || '').replace(/"/g, '""')}"`].join(','))
                          );
                          const csv = lines.join('\n');
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          const employeeSegment = historyFilters.employee === ALL_EMPLOYEES ? 'all_employees' : historyFilters.employee;
                          a.download = `teamlead_activity_history_${employeeSegment}_${historyFilters.date || getTodayDate()}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download CSV
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                  overflow: 'hidden',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#F9FAFB' }}>
                      <TableCell>Employee</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Comment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!historySearched ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Alert severity="info">Select an employee or All Employees and date, then click Show to view activity history.</Alert>
                        </TableCell>
                      </TableRow>
                    ) : filteredHistoryActivities.length > 0 ? (
                      filteredHistoryActivities.flatMap((activity) => {
                        const entries = normalizeEntries(activity);
                        const rows = (entries.length > 0 ? entries : [{ duration: activity.timeSpent, date: activity.createdAt }])
                          .filter((entry) => isSameDateValue(activityDate(activity, entry), historyFilters.date));

                        return rows.map((entry, index) => {
                          const date = activityDate(activity, entry);
                          return (
                            <TableRow key={`${activity.id}-${index}`} hover>
                              <TableCell>
                                <AvatarCell
                                  name={activity.assignedTo?.name || 'Unassigned'}
                                  email={activity.assignedTo?.employeeCode || activity.assignedToId || ''}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{date ? new Date(date).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell>
                                <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700 }}>
                                  {activity.title || 'Activity'}
                                </Typography>
                                <Typography sx={{ ...typography.paragraphXS, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
                                  {activity.description || ''}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{(toNumber(entry.duration) / 60).toFixed(2)}</TableCell>
                              <TableCell>
                                <StatusChip status={activity.status === 'completed' ? 'completed' : 'pending'} label={activity.status === 'completed' ? 'Completed' : 'In Progress'} />
                              </TableCell>
                              <TableCell>{entry.comment || activity.comment || '-'}</TableCell>
                            </TableRow>
                          );
                        });
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Alert severity="info">No activity history found for the selected employee/date filter.</Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 6 && (
            <Box sx={{ width: '100%' }}>
              {selectedProjectId ? (
                <EmployeeProjectDetail
                  projectId={selectedProjectId}
                  onBack={() => setSelectedProjectId(null)}
                />
              ) : (
                <EmployeeProjects onSelectProject={setSelectedProjectId} />
              )}
            </Box>
          )}

          {tab === 7 && (
            <Box sx={{ width: '100%' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  Attendance & Session Calendar
                </Typography>
                <Box sx={{ width: '100%' }} className={theme.palette.mode === 'dark' ? 'dark-mode-calendar' : ''}>
                  {calendarLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {Object.keys(calendarData).length === 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          No attendance or activity data found for this month.
                        </Alert>
                      )}
                      <Calendar
                        value={calendarMonth}
                        onChange={(newValue) => setCalendarMonth(newValue)}
                        onActiveStartDateChange={({ activeStartDate }) => {
                          if (activeStartDate) setCalendarMonth(activeStartDate);
                        }}
                        view="month"
                        tileClassName={({ date, view }) => {
                          if (view !== 'month') return '';
                          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          const dayData = calendarData[dateStr];
                          if (dayData?.attendance === 'full_day' || dayData?.clockedIn) return 'calendar-day-full';
                          if (dayData?.attendance === 'half_day') return 'calendar-day-half';
                          if (dayData?.attendance === 'leave') return 'calendar-day-leave';
                          return '';
                        }}
                        tileContent={({ date, view }) => {
                          if (view !== 'month') return null;
                          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          const dayData = calendarData[dateStr];
                          if (!dayData) return null;

                          return (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, width: '100%', overflow: 'hidden' }}>
                              {dayData.attendance === 'full_day' && <Box className="calendar-event-bar calendar-event-full-day">Full Day</Box>}
                              {dayData.attendance === 'half_day' && <Box className="calendar-event-bar calendar-event-half-day">Half Day</Box>}
                              {dayData.attendance === 'leave' && <Box className="calendar-event-bar calendar-event-leave">Leave</Box>}
                              {(dayData.sessions?.activities || []).slice(0, 1).map((activity, index) => (
                                <Box
                                  key={`${activity.title}-${index}`}
                                  className={`calendar-event-bar ${String(activity.title).toLowerCase().includes('institute') ? 'calendar-event-institute' : String(activity.title).toLowerCase().includes('school') ? 'calendar-event-school' : 'calendar-event-generic'}`}
                                >
                                  {activity.title}
                                </Box>
                              ))}
                              {dayData.sessions?.activities?.length > 1 && (
                                <Box className="calendar-event-bar calendar-event-generic">
                                  +{dayData.sessions.activities.length - 1} more
                                </Box>
                              )}
                            </Box>
                          );
                        }}
                        tileDisabled={({ date, view }) => {
                          if (view !== 'month') return false;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date > today;
                        }}
                        onClickDay={(date) => {
                          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          const dayData = calendarData[dateStr];
                          if (dayData) {
                            setCalendarPopupDate(date);
                            setCalendarPopupData(dayData);
                            setCalendarPopupOpen(true);
                          }
                        }}
                      />
                    </>
                  )}
                </Box>
                <Box sx={{ mt: 4, display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[
                    ['#4CAF50', 'Full Day'],
                    ['#FF9800', 'Half Day'],
                    ['#F44336', 'Leave/Miss'],
                  ].map(([color, label]) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 18, height: 18, bgcolor: color, borderRadius: 1 }} />
                      <Typography sx={{ ...typography.paragraphSmall, fontWeight: 700 }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Dialog open={calendarPopupOpen} onClose={() => setCalendarPopupOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                  {calendarPopupDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </DialogTitle>
                <DialogContent>
                  {calendarPopupData && (
                    <Stack spacing={2} sx={{ pt: 1 }}>
                      {calendarPopupData.attendance && (
                        <Chip
                          label={calendarPopupData.attendance === 'full_day' ? 'Full Day' : calendarPopupData.attendance === 'half_day' ? 'Half Day' : 'Leave'}
                          sx={{
                            alignSelf: 'flex-start',
                            bgcolor: calendarPopupData.attendance === 'full_day' ? '#4CAF50' : calendarPopupData.attendance === 'half_day' ? '#FF9800' : '#F44336',
                            color: '#fff',
                            fontWeight: 700,
                          }}
                        />
                      )}
                      {toNumber(calendarPopupData.hours) > 0 && (
                        <Typography fontWeight={700}>Work Hours: {calendarPopupData.hours}h</Typography>
                      )}
                      {(calendarPopupData.sessions?.activities || []).map((activity, index) => (
                        <Paper key={`${activity.title}-${index}`} elevation={0} sx={{ p: 2, border: '1px solid #E4E7F0', borderRadius: 2 }}>
                          <Typography fontWeight={700}>{activity.title}</Typography>
                          <Typography variant="caption" color="text.secondary">Sessions: {activity.sessionsCount || 1}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </DialogContent>
              </Dialog>
            </Box>
          )}

          {tab === 8 && (
            <Box sx={{ width: '100%' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Tools
              </Typography>
              <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#98A2B3' : '#667085', mb: 3 }}>
                Access your workbook and report card tools.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {toolAssignments.workbook && (
                  <Paper elevation={0} sx={{ width: 240, minHeight: 180, p: 3, borderRadius: 3, border: '1px solid #E4E7F0' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Workbook</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Open your workbook portal.</Typography>
                    <Button variant="contained" href="https://time.onmyowntechnology.com/workbook/" target="_blank" rel="noopener noreferrer">
                      Open Workbook
                    </Button>
                  </Paper>
                )}
                {toolAssignments.reportCard && (
                  <Paper elevation={0} sx={{ width: 240, minHeight: 180, p: 3, borderRadius: 3, border: '1px solid #E4E7F0' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Report Card</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Open report card tools.</Typography>
                    <Button variant="contained" href="https://time.onmyowntechnology.com/report-card/" target="_blank" rel="noopener noreferrer">
                      Open Report Card
                    </Button>
                  </Paper>
                )}
                {!toolAssignments.workbook && !toolAssignments.reportCard && (
                  <Alert severity="info">No tools are assigned to your role right now.</Alert>
                )}
              </Box>
            </Box>
          )}

          {tab === 9 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 1100, mx: 'auto' }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? '#23272F' : '#FFFFFF',
                  border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}`,
                  boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(16,24,40,0.08)',
                }}
              >
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Employee information</Typography>
                  <Typography sx={{ mt: 0.4, fontSize: 13, color: 'text.secondary' }}>Your identity and workplace details.</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                  <Avatar sx={{ width: 64, height: 64, flexShrink: 0, fontSize: 26, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.18)' : '#EFF6FF', color: '#0070F0', border: '2px solid #D1E6FF' }}>
                    {getInitials(user?.name || 'Team Lead')}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{user?.name || 'Team Lead'}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: 13, overflowWrap: 'anywhere' }}>{user?.email || ''}</Typography>
                    <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, mt: 0.75, borderRadius: '999px', bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.14)' : '#EFF6FF', color: '#0070F0', fontSize: 12, fontWeight: 700 }}>
                      {user?.department?.name || employeesData.teamLeadDepartment || 'N/A'}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, columnGap: 4, borderTop: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}`, pt: 0.5 }}>
                  {[
                    ['Full Name', user?.name || ''],
                    ['Email Address', user?.email || ''],
                    ['Employee Code', user?.employeeCode || 'N/A'],
                    ['Department', user?.department?.name || employeesData.teamLeadDepartment || 'N/A'],
                    ['Branch', user?.branch?.name || user?.branch?.location || employeesData.branchName || (user?.branchId ? `Branch #${user.branchId}` : 'N/A')],
                    ['Role', user?.role || 'teamlead'],
                    ['Account Created', user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'],
                    ['Last Updated', user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'],
                  ].map(([label, value]) => (
                    <Box key={label} sx={{ display: 'grid', gridTemplateColumns: { xs: '120px 1fr', sm: '135px 1fr' }, gap: 2, alignItems: 'center', minWidth: 0, py: 1.15, borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}` }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Accordion
                elevation={0}
                disableGutters
                sx={{
                  borderRadius: '12px !important',
                  overflow: 'hidden',
                  bgcolor: theme.palette.mode === 'dark' ? '#23272F' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#DCE3F0'}`,
                  '&::before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />} sx={{ px: { xs: 2, sm: 2.5 }, minHeight: 72, '&.Mui-expanded': { minHeight: 72 }, '& .MuiAccordionSummary-content': { my: 1.5 }, '& .MuiAccordionSummary-content.Mui-expanded': { my: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.14)' : '#EFF6FF', color: '#0070F0' }}><HelpOutlineIcon sx={{ fontSize: 20 }} /></Box>
                    <Box>
                      <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Password security</Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>Expand to change your password</Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pt: 0, pb: 2.5, borderTop: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}` }}>
                  <Box component="form" onSubmit={handleChangePassword} sx={{ width: '100%' }}>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 2, mb: 2 }}>Enter your current password, then choose a new secure password.</Typography>
                  <Stack spacing={1.5}>
                    <TextField size="small" fullWidth label="Old Password" type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required />
                    <TextField size="small" fullWidth label="New Password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                    <TextField size="small" fullWidth label="Confirm New Password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                    {passwordError && <Alert severity="error">{passwordError}</Alert>}
                    {passwordSuccess && <Alert severity="success">{passwordSuccess}</Alert>}
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={passwordLoading}
                      sx={{
                        minHeight: 40,
                        mt: 0.5,
                        borderRadius: '10px',
                        bgcolor: '#0070F0',
                        boxShadow: 'none',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#0064D6', boxShadow: 'none' },
                      }}
                    >
                      {passwordLoading ? 'Changing...' : 'Update Password'}
                    </Button>
                  </Stack>
                  <Box sx={{ mt: 2.5, p: 1.5, display: 'flex', gap: 1.25, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.10)' : '#F5FAFF', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.30)' : '#D1E6FF'}` }}>
                    <HelpOutlineIcon sx={{ fontSize: 19, color: '#0070F0' }} />
                    <Typography sx={{ fontSize: 12, lineHeight: 1.5, color: 'text.secondary' }}>Use at least 8 characters with a mix of letters, numbers, and symbols.</Typography>
                  </Box>
                </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Box>
      </Box>

      <Menu
        anchorEl={myActivityMenuAnchor}
        open={Boolean(myActivityMenuAnchor)}
        onClose={closeMyActivityMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEditMyActivity}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteMyActivity} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={editMyActivityOpen} onClose={() => setEditMyActivityOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={editMyActivityForm.date}
              onChange={(event) => setEditMyActivityForm((current) => ({ ...current, date: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: todayDate }}
            />
            <FormControl fullWidth>
              <InputLabel>Activity</InputLabel>
              <Select
                value={editMyActivityForm.title}
                label="Activity"
                onChange={(event) => setEditMyActivityForm((current) => ({ ...current, title: event.target.value }))}
              >
                {activityTemplates.length === 0 ? (
                  <MenuItem value="" disabled>No activities available</MenuItem>
                ) : (
                  activityTemplates.map((activity) => (
                    <MenuItem key={activity.id || activity.title} value={activity.title}>
                      {activity.title}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {editMyActivityForm.title === 'Total No. of Sessions' ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Session Type</InputLabel>
                    <Select
                      value={editMyActivityForm.sessionType}
                      label="Session Type"
                      onChange={(event) => setEditMyActivityForm((current) => ({ ...current, sessionType: event.target.value }))}
                    >
                      <MenuItem value="Online">Online</MenuItem>
                      <MenuItem value="Offline">Offline</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    fullWidth
                    label="Institute"
                    type="number"
                    value={editMyActivityForm.institute}
                    onChange={(event) => setEditMyActivityForm((current) => ({ ...current, institute: event.target.value.replace(/^0+(?!$)/, '') }))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    fullWidth
                    label="School"
                    type="number"
                    value={editMyActivityForm.school}
                    onChange={(event) => setEditMyActivityForm((current) => ({ ...current, school: event.target.value.replace(/^0+(?!$)/, '') }))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={editMyActivityForm.startTime}
                    onChange={(event) => setEditMyActivityForm((current) => ({ ...current, startTime: event.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={editMyActivityForm.endTime}
                    onChange={(event) => setEditMyActivityForm((current) => ({ ...current, endTime: event.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            )}
            <TextField
              fullWidth
              label="Comment"
              value={editMyActivityForm.comment}
              onChange={(event) => setEditMyActivityForm((current) => ({ ...current, comment: event.target.value }))}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMyActivityOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveMyActivityEdit} disabled={editMyActivitySaving}>
            {editMyActivitySaving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteMyActivityOpen} onClose={() => setDeleteMyActivityOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Activity</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this activity log?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteMyActivityOpen(false)} disabled={deleteMyActivityLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDeleteMyActivity} disabled={deleteMyActivityLoading}>
            {deleteMyActivityLoading ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((current) => ({ ...current, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamLeadDashboard;
