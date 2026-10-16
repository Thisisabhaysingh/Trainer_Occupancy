import { employeeActivityTemplates } from '../../../utils/activityTemplates.mjs';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Box,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tabs,
  Tab,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  Tooltip,
  Checkbox,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { Search, ArrowDropDown, ArrowUpward, ArrowDownward, ArrowForward, AccessTime, TrendingUp, GetApp, MenuBook as MenuBookIcon, Assessment as AssessmentIcon, People, School, FilterList, MoreVert, Close } from '@mui/icons-material';
import Menu from '@mui/material/Menu';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarCustom.css';
import { MdAccessTime, MdAssessment, MdHistory, MdMenuBook } from 'react-icons/md';
import { reportcardSsoUrl } from '../../../core/integrations/reportcard';
import { FaUsers, FaHourglassHalf } from 'react-icons/fa';

import { logout } from '../../auth/state/authSlice';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { StatCard, PageHeader, FilterBar, DataTable, TabNavigation, Pagination, StatusChip, AvatarCell, Sidebar, Header, Breadcrumb, typography } from '../../../components/dashboard/DashboardComponents';
import EmployeeProjects from '../../../components/pm/employee/EmployeeProjects';
import EmployeeProjectDetail from '../../../components/pm/employee/EmployeeProjectDetail';
import TrainerSchoolActivities from '../../../components/dashboard/TrainerSchoolActivities';
import TrainerLeaderboard from '../../../components/dashboard/TrainerLeaderboard';
import AutoCarousel from '../../../components/dashboard/AutoCarousel';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const getMinimalCardStyle = (isDarkMode) => ({
  background: isDarkMode ? 'rgba(35,39,47,0.95)' : '#fff',
  boxShadow: isDarkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
  borderRadius: 3,
  border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #EAECF0',
  boxSizing: 'border-box'
});

const getTodayDateString = () => {
  const now = new Date();
  const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10);
};

const safeBuildDate = (dateString) => {
  if (!dateString) return null;
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const EmployeeDashboard = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [headerSearch, setHeaderSearch] = useState('');
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceType, setAttendanceType] = useState(null);
  const [standardHours, setStandardHours] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [activity, setActivity] = useState({ description: '', hours: '', department: '', comment: '' });
  const [activities, setActivities] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [departmentMembersCount, setDepartmentMembersCount] = useState(0);
  const [totalUserWorkHours, setTotalUserWorkHours] = useState(0);
  const initialActivityState = {
    description: '',
    timeSpent: 0,
    department: '',
    startTime: '',
    endTime: '',
    comment: '',
    institute: '',
    school: '',
    sessionType: 'Offline',
    schoolName: '',
    branchLocation: '',
    schoolCatalogId: null,
    branchId: null,
    sessionsCount: '',
  };

  const [newActivity, setNewActivity] = useState(initialActivityState);

  const [user, setUser] = useState(null);
  const [toolAssignments, setToolAssignments] = useState({
    workbook: true,
    reportCard: true
  });
  const [historicalActivities, setHistoricalActivities] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(getTodayDateString());
  const [selectedEndDate, setSelectedEndDate] = useState(getTodayDateString());
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [departmentActivities, setDepartmentActivities] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteActivity, setDeleteActivity] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [selectedWorkDate, setSelectedWorkDate] = useState(getTodayDateString());
  const [pendingWorkDate, setPendingWorkDate] = useState(getTodayDateString());
  const [schoolCatalog, setSchoolCatalog] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [activityMenuAnchor, setActivityMenuAnchor] = useState(null);
  const [selectedActivityForMenu, setSelectedActivityForMenu] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [activityFilter, setActivityFilter] = useState('all');
  const [calendarPopupOpen, setCalendarPopupOpen] = useState(false);
  const [calendarPopupDate, setCalendarPopupDate] = useState(null);
  const [calendarPopupData, setCalendarPopupData] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();

  // Driver.js tour for activity filling guidance
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
      stageBackground: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
      popoverClass: theme.palette.mode === 'dark' ? 'driverjs-dark-theme' : '',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Finish',
      steps: [
        {
          element: '#attendance-card',
          popover: {
            title: '📍 Step 1: Mark Attendance',
            description: 'First, select your attendance type for the day. Choose "Full Day" (9 hours), "Half Day" (4.5 hours), or "Leave" if you are on leave. This is required before logging activities.',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: '#activity-logger',
          popover: {
            title: '📝 Step 2: Activity Logger',
            description: 'After marking attendance, use this form to log your daily activities. Select an activity type from the dropdown first.',
            side: 'top',
            align: 'center',
          }
        },
        {
          element: '#activity-select',
          popover: {
            title: '🎯 Step 3: Select Activity',
            description: 'Choose the type of activity you performed. Options include School Session, Institute Session, Total No. of Sessions, and other department-specific activities.',
            side: 'bottom',
            align: 'start',
          }
        },
        {
          element: '#school-branch-field',
          popover: {
            title: '🏫 Step 4: Location Details',
            description: 'For School/Institute sessions, select the school name or branch location where you conducted the session.',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: '#sessions-count-field',
          popover: {
            title: '🔢 Step 5: Number of Sessions',
            description: 'Enter the number of sessions you conducted. This helps track your daily session count.',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: '#start-time-field',
          popover: {
            title: '⏰ Step 6: Start Time',
            description: 'Enter the start time of your activity in 24-hour format (e.g., 09:00 for 9 AM, 14:30 for 2:30 PM).',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: '#end-time-field',
          popover: {
            title: '⏱️ Step 7: End Time',
            description: 'Enter the end time of your activity in 24-hour format. The system will automatically calculate the duration.',
            side: 'bottom',
            align: 'center',
          }
        },
        {
          element: '#add-activity-btn',
          popover: {
            title: '✅ Step 8: Add Activity',
            description: 'Click this button to save your activity. You can add multiple activities throughout the day to track all your work.',
            side: 'top',
            align: 'center',
          }
        },
        {
          element: '#activities-table',
          popover: {
            title: '📊 Step 9: View Your Activities',
            description: 'All your logged activities appear here. You can edit or delete activities if needed. The total work hours are calculated automatically.',
            side: 'top',
            align: 'center',
          }
        },
        {
          popover: {
            title: '🎉 Tour Complete!',
            description: 'You now know how to log your daily activities! Remember to mark attendance first, then add your activities with start/end times. If you need help again, click the "Take Tour" button.',
          }
        }
      ]
    });

    driverObj.drive();
  }, [theme.palette.mode]);

  const todayDateString = useMemo(() => getTodayDateString(), []);
  const selectedWorkDateObj = useMemo(() => safeBuildDate(selectedWorkDate), [selectedWorkDate]);
  const formatBranchLabel = useCallback((branch) => {
    if (!branch || typeof branch !== 'object') return '';
    const location = branch.location ? branch.location.trim() : '';
    return location ? `${branch.name} (${location})` : (branch.name || '');
  }, []);

  const defaultBranchLabel = useMemo(
    () => formatBranchLabel(user?.branch || null),
    [formatBranchLabel, user?.branch?.name, user?.branch?.location]
  );

  const selectedSchoolOption = useMemo(() => {
    if (!Array.isArray(schoolCatalog) || schoolCatalog.length === 0) return null;
    if (newActivity.schoolCatalogId) {
      return schoolCatalog.find(option => String(option.id) === String(newActivity.schoolCatalogId)) || null;
    }
    if (newActivity.schoolName) {
      return schoolCatalog.find(option => option.name === newActivity.schoolName) || null;
    }
    return null;
  }, [schoolCatalog, newActivity.schoolCatalogId, newActivity.schoolName]);

  const selectedBranchOption = useMemo(() => {
    if (!Array.isArray(branchOptions) || branchOptions.length === 0) return null;
    if (newActivity.branchId) {
      return branchOptions.find(option => String(option.id) === String(newActivity.branchId)) || null;
    }
    if (newActivity.branchLocation) {
      return branchOptions.find(option => formatBranchLabel(option) === newActivity.branchLocation) || null;
    }
    return null;
  }, [branchOptions, newActivity.branchId, newActivity.branchLocation, formatBranchLabel]);

  const formattedSelectedDate = useMemo(() => selectedWorkDateObj
    ? selectedWorkDateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Invalid date'
  , [selectedWorkDateObj]);
  const isSelectedDateToday = useMemo(() => selectedWorkDate === todayDateString, [selectedWorkDate, todayDateString]);
  const isFutureSelectedDate = useMemo(() => {
    if (!selectedWorkDateObj) return false;
    const today = safeBuildDate(todayDateString);
    return today ? selectedWorkDateObj > today : false;
  }, [selectedWorkDateObj, todayDateString]);
  const isDarkMode = theme.palette.mode === 'dark';
  const hasLoggedActivity = activities.length > 0;
  const canLogActivities = attendanceType && attendanceType !== 'leave' && !isSelectedDateToday;
  const pendingWorkDateObj = useMemo(() => safeBuildDate(pendingWorkDate), [pendingWorkDate]);
  const isPendingDateValid = useMemo(() => {
    if (!pendingWorkDate) return false;
    const pending = safeBuildDate(pendingWorkDate);
    const today = safeBuildDate(todayDateString);
    return !!pending && !!today && pending <= today;
  }, [pendingWorkDate, todayDateString]);

  const selectedTemplateTitle = (newActivity.description || '').trim();

  const isSchoolSessionTemplate = selectedTemplateTitle === 'School Session';
  const isInstituteSessionTemplate = selectedTemplateTitle === 'Institute Session';
  const isCustomSessionTemplate = isSchoolSessionTemplate || isInstituteSessionTemplate;
  const isOfflineSessionDescription = selectedTemplateTitle === 'Total No. of Sessions';

  const attendanceLabel = isSelectedDateToday ? 'today' : formattedSelectedDate;
  const activitiesHeading = isSelectedDateToday ? "Today's Activities" : `Activities on ${formattedSelectedDate}`;
  const noActivitiesMessage = isSelectedDateToday ? 'No activities logged today.' : `No activities logged on ${formattedSelectedDate}.`;
  const visibleActivities = useMemo(() => {
    if (activityFilter === 'institute') return activities.filter(activity => activity.title === 'Institute Session');
    if (activityFilter === 'school') return activities.filter(activity => activity.title === 'School Session');
    return activities;
  }, [activities, activityFilter]);
  const statusHeading = isSelectedDateToday ? "Today's Status" : `Status on ${formattedSelectedDate}`;
  const workHoursHeading = isSelectedDateToday ? "Today's Work Hours" : `Work Hours on ${formattedSelectedDate}`;

  const parseTimeToSelectedDate = useCallback((timeStr) => {
    if (!timeStr) return null;

    const normalized = String(timeStr).trim();
    if (!normalized) return null;

    let hours = null;
    let minutes = null;

    const amPmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
    if (amPmMatch) {
      hours = Number(amPmMatch[1]);
      minutes = Number(amPmMatch[2]);
      const period = amPmMatch[3].toLowerCase();
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
      }
    }

    if (hours === null || minutes === null) {
      const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
      if (twentyFourHourMatch) {
        hours = Number(twentyFourHourMatch[1]);
        minutes = Number(twentyFourHourMatch[2]);
      }
    }

    if ((hours === null || minutes === null) && !Number.isNaN(Number(normalized))) {
      const numericValue = Number(normalized);
      if (Number.isFinite(numericValue)) {
        hours = Math.floor(numericValue / 60);
        minutes = numericValue % 60;
      }
    }

    if (hours === null || minutes === null || Number.isNaN(hours) || Number.isNaN(minutes)) {
      const parsedDate = new Date(normalized);
      if (!Number.isNaN(parsedDate.getTime())) {
        hours = parsedDate.getHours();
        minutes = parsedDate.getMinutes();
      }
    }

    if (hours === null || minutes === null || Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    const base = selectedWorkDateObj || new Date();
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0, 0);
  }, [selectedWorkDateObj]);

  const formatTime12 = useCallback((value) => {
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
        const base = selectedWorkDateObj || new Date();
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

    const hours24 = dateValue.getHours();
    const minutes = dateValue.getMinutes();
    const suffix = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const paddedMinutes = String(minutes).padStart(2, '0');

    return `${hours12}:${paddedMinutes} ${suffix}`;
  }, [selectedWorkDateObj]);

  const deriveSchoolName = useCallback((activity, fallbackName = '') => {
    if (!activity) return fallbackName;

    const stringCandidates = [
      activity.displaySchoolName,
      activity.display_school_name,
      activity.schoolName,
      activity.school_name,
      activity.schoolNameDisplay,
      activity.schoolDisplayName,
      activity.schoolLabel,
      activity.schoolSessionName,
      activity.school_session_name,
      activity.sessionSchoolName,
      activity.session_school_name,
      activity.schoolSession?.name,
      activity.schoolSession?.schoolName,
      activity.school_session?.name,
      activity.school_session?.schoolName,
      activity.sessionDetails?.schoolName,
      activity.sessionDetails?.school?.name,
      activity.school?.name,
      activity.school?.schoolName,
      activity.schoolCatalog?.name,
      activity.schoolCatalog?.schoolName,
      activity.schoolCatalogName,
      activity.schoolDetails?.name,
      activity.schoolDetails?.schoolName,
      activity.metadata?.schoolName,
      activity.metadata?.school?.name,
      activity.customFields?.schoolName,
      activity.details?.schoolName,
      activity.trainingDetails?.schoolName,
      activity._timeEntry?.schoolName,
      activity._timeEntry?.school,
      activity.school_info?.name,
      activity.schoolInfo?.name,
      typeof activity.school === 'string' && activity.school.trim() && Number.isNaN(Number(activity.school.trim()))
        ? activity.school.trim()
        : null,
      typeof activity._timeEntry?.school === 'string' && activity._timeEntry.school.trim() && Number.isNaN(Number(activity._timeEntry.school.trim()))
        ? activity._timeEntry.school.trim()
        : null,
      fallbackName,
    ];

    for (const candidate of stringCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    const candidateIds = [];
    const pushCandidate = (value) => {
      if (value === null || value === undefined) return;
      const stringValue = String(value).trim();
      if (!stringValue) return;
      const numericValue = Number(stringValue);
      if (Number.isFinite(numericValue) && numericValue <= 0) return;
      candidateIds.push(stringValue);
    };

    pushCandidate(activity.schoolCatalogId);
    pushCandidate(activity.schoolCatalog?._id);
    pushCandidate(activity.schoolCatalog?.id);
    pushCandidate(activity.schoolId);
    pushCandidate(activity.school_id);
    pushCandidate(activity.schoolDetails?._id);
    pushCandidate(activity.schoolDetails?.id);
    pushCandidate(activity.sessionDetails?.schoolId);
    pushCandidate(activity.sessionDetails?.school_id);
    pushCandidate(activity.customFields?.schoolId);
    pushCandidate(activity.trainingDetails?.schoolId);
    pushCandidate(activity._timeEntry?.schoolId);

    if (typeof activity.school === 'number' && activity.school > 0) {
      pushCandidate(activity.school);
    } else if (typeof activity.school === 'string') {
      const trimmed = activity.school.trim();
      if (trimmed) {
        const numericValue = Number(trimmed);
        if (!Number.isNaN(numericValue) && numericValue > 0) {
          pushCandidate(trimmed);
        }
      }
    }

    for (const candidateId of candidateIds) {
      const match = schoolCatalog.find((option) => {
        const optionId = option?.id ?? option?._id ?? option?.value;
        return optionId !== undefined && optionId !== null && String(optionId) === candidateId;
      });
      if (match?.name) {
        return match.name;
      }
    }

    return fallbackName;
  }, [schoolCatalog]);

  useEffect(() => {
    if (!Array.isArray(schoolCatalog) || schoolCatalog.length === 0) {
      return;
    }

    setActivities(prevActivities => (
      Array.isArray(prevActivities)
        ? prevActivities.map((activity) => {
            if (!activity) return activity;
            const derivedName = deriveSchoolName(activity, activity.schoolName);
            if (derivedName && derivedName !== activity.schoolName) {
              return { ...activity, schoolName: derivedName };
            }
            return activity;
          })
        : prevActivities
    ));

    setHistoricalActivities(prevActivities => (
      Array.isArray(prevActivities)
        ? prevActivities.map((activity) => {
            if (!activity) return activity;
            const derivedName = deriveSchoolName(activity, activity.schoolName);
            if (derivedName && derivedName !== activity.schoolName) {
              return { ...activity, schoolName: derivedName };
            }
            return activity;
          })
        : prevActivities
    ));
  }, [schoolCatalog, deriveSchoolName]);

  const getSchoolName = useCallback((activity) => {
    if (!activity) return '-';

    const title = (activity.title || '').toLowerCase();
    if (title === 'total no. of sessions') {
      const numericValue = activity.school ?? activity.sessionsCount ?? activity.schoolCount;
      if (numericValue !== null && numericValue !== undefined && numericValue !== '') {
        return String(numericValue);
      }
    }

    const derived = deriveSchoolName(activity);
    return derived && derived.trim() ? derived : '-';
  }, [deriveSchoolName]);

  const handlePendingWorkDateChange = useCallback((event) => {
    const nextValue = event.target.value;
    setPendingWorkDate(nextValue);

    if (!nextValue) {
      return;
    }

    const normalized = safeBuildDate(nextValue);
    const today = safeBuildDate(todayDateString);

    if (normalized && today && normalized <= today) {
      setSelectedWorkDate(nextValue);
    }
  }, [todayDateString]);

  const toTimeString = (dateValue) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
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

  const formatPunchToTime = (punch) => {
    if (!punch) return '';
    const date = new Date(punch);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const hasTimeOverlap = useCallback((startTime, endTime, excludeActivityId = null) => {
    const newStart = parseTimeToSelectedDate(startTime);
    const newEnd = parseTimeToSelectedDate(endTime);
    if (!newStart || !newEnd) return false;

    return activities.some(activity => {
      const activityId = activity.id ?? activity._id;
      if (excludeActivityId && activityId === excludeActivityId) return false;

      const { start, end } = extractActivityTimeWindow(activity);
      const existingStart = parseTimeToSelectedDate(start);
      const existingEnd = parseTimeToSelectedDate(end);

      if (!existingStart || !existingEnd) return false;

      return newStart < existingEnd && newEnd > existingStart;
    });
  }, [activities, parseTimeToSelectedDate]);

  // Set a shared card height variable
  const CARD_HEIGHT = 650;

  // Calculate session counts for current month from calendar data
  const monthlySessionCounts = useMemo(() => {
    let instituteSessions = 0;
    let schoolSessions = 0;
    
    // Sum up all sessions from calendar data
    Object.entries(calendarData).forEach(([date, dayData]) => {
      if (dayData?.sessions) {
        const inst = dayData.sessions.institute || 0;
        const sch = dayData.sessions.school || 0;
        instituteSessions += inst;
        schoolSessions += sch;
      }
    });
    
    return { instituteSessions, schoolSessions };
  }, [calendarData]);

  // Calculate attendance statistics from calendar data
  const attendanceStats = useMemo(() => {
    let fullDays = 0;
    let halfDays = 0;
    let leaves = 0;
    let totalHours = 0;
    
    Object.values(calendarData).forEach(dayData => {
      if (dayData?.attendance === 'full_day') {
        fullDays++;
      } else if (dayData?.attendance === 'half_day') {
        halfDays++;
      } else if (dayData?.attendance === 'leave') {
        leaves++;
      }
      
      if (dayData?.hours) {
        totalHours += parseFloat(dayData.hours) || 0;
      }
    });
    
    return { fullDays, halfDays, leaves, totalHours: totalHours.toFixed(1) };
  }, [calendarData]);

  // Calculate today's statistics
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = calendarData[today] || {};
    
    return {
      totalHours: todayData.hours ? parseFloat(todayData.hours).toFixed(1) : '0.0',
      instituteSessions: todayData.sessions?.institute || 0,
      schoolSessions: todayData.sessions?.school || 0
    };
  }, [calendarData]);

  // Theme-aware helpers
  const darkCardBg = isDarkMode ? 'rgba(35,39,47,0.95)' : '#fff';
  const todaysHeaderBackground = isDarkMode
    ? 'linear-gradient(135deg, rgba(92,108,255,0.28) 0%, rgba(56,249,215,0.18) 100%)'
    : '#ffffff';
  const todaysHeaderTextColor = isDarkMode ? '#f5f7ff' : '#1f1b2e';
  const todaysHeaderBorder = isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(79,140,255,0.22)';
  const todaysHeaderCellBase = {
    fontWeight: 700,
    color: todaysHeaderTextColor,
    fontSize: 15,
    background: todaysHeaderBackground,
    borderBottom: todaysHeaderBorder,
    padding: '16px 14px',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  };
  const profileCardBackground = isDarkMode
    ? 'linear-gradient(165deg, rgba(44,48,56,0.96) 0%, rgba(25,29,38,0.92) 100%)'
    : 'linear-gradient(145deg, #f6f1ff 0%, #e5f6ff 60%, #fff6f2 100%)';
  const profileCardBorder = isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(138, 100, 255, 0.18)';
  const profileCardShadow = isDarkMode ? '0 18px 40px rgba(0,0,0,0.45)' : '0 14px 40px rgba(138, 100, 255, 0.18)';
  const profileTextPrimary = isDarkMode ? '#f1f5ff' : '#5635d6';
  const profileTextSecondary = isDarkMode ? '#b9c2ff' : '#6a6f85';
  const profileMetricText = isDarkMode ? '#dbe4ff' : '#4c35bf';
  const profileAccent = isDarkMode ? '#93a7ff' : '#8a64ff';
  const profileAccentSoft = isDarkMode ? 'rgba(147,167,255,0.22)' : 'rgba(138,100,255,0.12)';
  const profileAvatarBg = isDarkMode ? 'rgba(147,167,255,0.18)' : '#f1ecff';
  const profileAvatarColor = isDarkMode ? '#e3e9ff' : '#7455d8';
  const profileStatLabelColor = isDarkMode ? '#9ba3cc' : '#7c8099';
  const profileChangePasswordBg = isDarkMode ? 'rgba(22, 26, 35, 0.92)' : 'rgba(255,255,255,0.92)';
  const profileChangePasswordBorder = isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(138,100,255,0.16)';
  const profileChangePasswordShadow = isDarkMode ? '0 10px 26px rgba(0,0,0,0.45)' : '0 10px 26px rgba(138, 100, 255, 0.12)';
  const profileInputBg = isDarkMode ? 'rgba(24, 28, 37, 0.95)' : 'rgba(255,255,255,0.85)';
  const profileInputBorder = isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(138,100,255,0.25)';
  const profileInputBorderHover = isDarkMode ? 'rgba(147,167,255,0.45)' : 'rgba(138,100,255,0.55)';
  const profileInputFocus = isDarkMode ? '#7f96ff' : '#8a64ff';
  const profileInputFocusShadow = isDarkMode ? '0 0 0 3px rgba(127,150,255,0.22)' : '0 0 0 3px rgba(138,100,255,0.18)';
  const profileButtonGradient = isDarkMode
    ? 'linear-gradient(90deg, #7f96ff 0%, #58c0ff 100%)'
    : 'linear-gradient(90deg, #8a64ff 0%, #77d3ff 100%)';
  const profileButtonHoverGradient = isDarkMode
    ? 'linear-gradient(90deg, #58c0ff 0%, #7f96ff 100%)'
    : 'linear-gradient(90deg, #77d3ff 0%, #8a64ff 100%)';
  const tableHeaderGradient = isDarkMode
    ? 'linear-gradient(135deg, rgba(94,121,255,0.9) 0%, rgba(163,99,255,0.92) 100%)'
    : 'linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%)';

  const fetchCatalogData = useCallback(async () => {
    try {
      const [schoolsRes, branchesRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/catalog/schools`, { withCredentials: true }),
        axios.get(`${apiBaseUrl}/api/catalog/branches`, { withCredentials: true })
      ]);

      const schools = Array.isArray(schoolsRes.data)
        ? [...schoolsRes.data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];
      const branches = Array.isArray(branchesRes.data)
        ? [...branchesRes.data].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];

      setSchoolCatalog(schools);
      setBranchOptions(branches);
    } catch (error) {
      console.error('Error fetching catalog data:', error);
      setSchoolCatalog([]);
      setBranchOptions([]);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/departments`, {
        withCredentials: true,
      });
      setDepartments(res.data);
    } catch (error) {
      setDepartments([]);
    }
  }, []);

  const fetchDepartmentActivities = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/activities/department`, { withCredentials: true });
      setDepartmentActivities(employeeActivityTemplates(res.data));
    } catch {
      setDepartmentActivities(employeeActivityTemplates([]));
    }
  }, []);

  const fetchActivitiesForDate = useCallback(async (dateString) => {
    if (!dateString) {
      setActivities([]);
      return;
    }

    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/activities/employee/history`,
        {
          withCredentials: true,
          params: {
            startDate: dateString,
            endDate: dateString,
          },
        }
      );

      const start = new Date(dateString);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateString);
      end.setHours(23, 59, 59, 999);

      const filtered = (res.data || [])
        .flatMap((act) => {
          const entries = (act.timeEntries || []).filter((te) => {
            const entryDate = new Date(te.date);
            return entryDate >= start && entryDate <= end;
          });

          const schoolName = deriveSchoolName(act);
          return entries.map((entry, entryIndex) => ({
            ...act,
            schoolName,
            timeEntries: [entry],
            _timeEntry: entry,
            _rowKey: `${act.id || act._id || 'activity'}-${entry.date || entryIndex}-${entryIndex}`
          }));
        })
        .filter(Boolean);

      setActivities(filtered);
    } catch (error) {
      console.error('Error fetching activities for date:', error);
      setActivities([]);
    }
  }, [deriveSchoolName]);

  const fetchClockStatus = useCallback(async (dateString) => {
    if (!dateString) {
      setClockedIn(false);
      setClockInTime(null);
      setClockOutTime(null);
      setAttendanceType(null);
      setStandardHours(null);
      return;
    }

    try {
      const res = await axios.get(`${apiBaseUrl}/api/workday/status`, {
        withCredentials: true,
        params: { date: dateString },
      });
      setClockedIn(res.data.clockedIn);
      setClockInTime(res.data.clockInTime ? new Date(res.data.clockInTime) : null);
      setClockOutTime(res.data.clockOutTime ? new Date(res.data.clockOutTime) : null);
      setAttendanceType(res.data.attendanceType);
      setStandardHours(res.data.standardHours);
    } catch (error) {
      setClockedIn(false);
      setClockInTime(null);
      setClockOutTime(null);
      setAttendanceType(null);
      setStandardHours(null);
    }
  }, []);

  const fetchCalendarData = useCallback(async (year, month) => {
    setCalendarLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // Format dates as YYYY-MM-DD in local timezone
      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const data = {};

      // Fetch attendance data for the month
      try {
        const attendanceRes = await axios.get(`${apiBaseUrl}/api/workday/history`, {
          withCredentials: true,
          params: { startDate: startStr, endDate: endStr }
        });
        
        // Process attendance data
        attendanceRes.data.forEach(record => {
          const date = record.date?.split('T')[0];
          if (date) {
            data[date] = {
              ...data[date],
              attendance: record.attendanceType,
              clockedIn: record.clockedIn,
              hours: record.hours
            };
          }
        });
      } catch (attendanceError) {
        console.warn('Error fetching attendance history:', attendanceError);
      }

      // Fetch activities for the month
      try {
        const activitiesRes = await axios.get(`${apiBaseUrl}/api/activities/employee/history`, {
          withCredentials: true,
          params: { startDate: startStr, endDate: endStr }
        });

        // Process activities data - extract dates from timeEntries
        activitiesRes.data.forEach(act => {
          // Get dates from timeEntries array
          const timeEntries = act.timeEntries || [];
          if (timeEntries.length === 0) {
            return;
          }
          
          timeEntries.forEach(te => {
            const date = te.date?.split('T')[0];
            const durationHours = te.duration ? (te.duration / 60).toFixed(2) : 0;
            
            if (date) {
              if (!data[date]) data[date] = {};
              if (!data[date].sessions) data[date].sessions = { institute: 0, school: 0, activities: [] };
              if (!data[date].sessions.activities) data[date].sessions.activities = [];
              
              // Accumulate hours from activity duration
              const currentHours = parseFloat(data[date].hours || 0);
              const newHours = currentHours + parseFloat(durationHours);
              data[date].hours = newHours.toFixed(1);
              
              const title = (act.title || '').toLowerCase();
              
              // Add activity to the list
              if (act.title) {
                data[date].sessions.activities.push({
                  title: act.title,
                  sessionsCount: act.sessionsCount || 1
                });
              }
              
              if (title.includes('institute session')) {
                data[date].sessions.institute += (act.sessionsCount || 1);
              } else if (title.includes('school session')) {
                data[date].sessions.school += (act.sessionsCount || 1);
              }
            }
          });
        });
      } catch (activitiesError) {
        console.error('🔥 ERROR fetching activities history:', activitiesError);
        console.error('🔥 Error response:', activitiesError.response?.data);
        console.error('🔥 Error status:', activitiesError.response?.status);
      }

      // Load recurring school timetable sessions for the trainer's calendar.
      try {
        const schoolScheduleRes = await axios.get(`${apiBaseUrl}/api/school-curriculum/calendar`, {
          withCredentials: true,
          params: { startDate: startStr, endDate: endStr }
        });
        (Array.isArray(schoolScheduleRes.data) ? schoolScheduleRes.data : []).forEach(schedule => {
          const date = String(schedule.date || '').slice(0, 10);
          if (!date) return;
          if (!data[date]) data[date] = {};
          if (!data[date].schoolSchedules) data[date].schoolSchedules = [];
          data[date].schoolSchedules.push({
            schoolName: schedule.schoolName,
            className: schedule.className,
            courseName: schedule.curriculumSession?.course?.courseName || schedule.courseName,
            activityTitle: schedule.curriculumSession?.title || schedule.activityTitle,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            completionStatus: schedule.completionStatus || 'pending',
          });
        });
      } catch (schoolScheduleError) {
        console.warn('Error fetching school schedule for calendar:', schoolScheduleError);
      }

      setCalendarData(data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setCalendarData({});
    } finally {
      setCalendarLoading(false);
    }
  }, []);

    
  const fetchUserProfileData = useCallback(async (employeeCode) => {
    if (!employeeCode) return;

    try {
      const profileRes = await axios.get(`${apiBaseUrl}/api/employees/analytics`, { withCredentials: true });
      setDepartmentMembersCount(profileRes.data.departmentMembers || 0);
      setTotalUserWorkHours(profileRes.data.todayHours || 0);
    } catch (error) {
      console.error('Error fetching user profile data:', error);
      setDepartmentMembersCount(0);
      setTotalUserWorkHours(0);
    }
  }, []);

  const fetchToolAssignments = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/admin/tool-assignments/me`, { withCredentials: true });
      setToolAssignments({
        workbook: res.data.workbook ?? true,
        reportCard: res.data.reportCard ?? true
      });
    } catch (error) {
      console.error('Error fetching tool assignments:', error);
      // Keep defaults on error
      setToolAssignments({
        workbook: true,
        reportCard: true
      });
    }
  }, [apiBaseUrl]);

  const initializeData = useCallback(async () => {
    try {
      await Promise.all([
        fetchCatalogData(),
        fetchDepartments(),
        fetchDepartmentActivities()
      ]);
    } catch (error) {
      console.error('Error during initial data fetch:', error);
    }
  }, [fetchCatalogData, fetchDepartments, fetchDepartmentActivities]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      await initializeData();
      try {
        const response = await axios.get(`${apiBaseUrl}/api/auth/me`, { withCredentials: true });
        if (!isMounted) return;
        setUser(response.data);
        if (response.data?.employeeCode) {
          await fetchUserProfileData(response.data.employeeCode);
          await fetchToolAssignments();
        }
      } catch (error) {
        if (!isMounted) return;
        setUser(null);
      }
    };

    initialize();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [initializeData, fetchUserProfileData, fetchToolAssignments]);

  useEffect(() => {
    if (!selectedWorkDate) return;
    fetchActivitiesForDate(selectedWorkDate);
    fetchClockStatus(selectedWorkDate);
  }, [selectedWorkDate, fetchActivitiesForDate, fetchClockStatus]);

  useEffect(() => {
    if (user?.employeeCode) {
      fetchUserProfileData(user.employeeCode);
    }
  }, [user, fetchUserProfileData]);

  useEffect(() => {
    // Fetch calendar data for both Overview (stats) and Calendar tabs
    if (selectedTab === 0 || selectedTab === 1) {
      fetchCalendarData(calendarMonth.getFullYear(), calendarMonth.getMonth());
    }
    if (selectedTab === 0 && selectedWorkDate) {
      fetchActivitiesForDate(selectedWorkDate);
    }
  }, [selectedTab, calendarMonth, fetchCalendarData, selectedWorkDate, fetchActivitiesForDate]);


  const handleMarkAttendance = async (type) => {
    if (!selectedWorkDate) {
      setSnackbar({ open: true, message: 'Please select a date to mark attendance.', severity: 'warning' });
      return;
    }
    if (isFutureSelectedDate) {
      setSnackbar({ open: true, message: 'Cannot mark attendance for a future date.', severity: 'warning' });
      return;
    }
    if (hasLoggedActivity) {
      setSnackbar({ open: true, message: 'Attendance cannot be changed after logging an activity.', severity: 'warning' });
      return;
    }
    try {
      const res = await axios.post(`${apiBaseUrl}/api/workday/mark-attendance`, {
        attendanceType: type,
        date: selectedWorkDate,
      }, { withCredentials: true });
      setAttendanceType(res.data.attendanceType);
      setStandardHours(res.data.standardHours);
      setSnackbar({ open: true, message: res.data.message, severity: 'success' });
      await fetchClockStatus(selectedWorkDate);
      await fetchActivitiesForDate(selectedWorkDate);
    } catch (error) {
      setSnackbar({ open: true, message: error?.response?.data?.error || 'Failed to mark attendance', severity: 'error' });
    }
  };

  const handleResetAttendance = () => {
    if (!selectedWorkDate) {
      setSnackbar({ open: true, message: 'Please select a date to reset attendance.', severity: 'warning' });
      return;
    }
    if (hasLoggedActivity) {
      setSnackbar({ open: true, message: 'Attendance cannot be changed after logging an activity.', severity: 'warning' });
      return;
    }
    setAttendanceType(null);
    setStandardHours(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSessionError('');

    const trimmedSchool = (newActivity.schoolName || '').trim();
    const trimmedBranch = (newActivity.branchLocation || '').trim();

    if (isCustomSessionTemplate) {
      const sessionsCountNum = parseInt(newActivity.sessionsCount, 10);

      if (isSchoolSessionTemplate && !trimmedSchool) {
        setSessionError('School name is required for School Session.');
        return;
      }

      if (isInstituteSessionTemplate && !trimmedBranch) {
        setSessionError('Branch location is required for Institute Session.');
        return;
      }

      if (!Number.isFinite(sessionsCountNum) || sessionsCountNum <= 0) {
        setSessionError('Number of sessions must be greater than zero.');
        return;
      }

      setSessionError('');
    } else if (isOfflineSessionDescription) {
      // Validate offline session specific fields
      if (newActivity.institute === '' || newActivity.school === '' || !newActivity.sessionType) {
        setSessionError('Institute, School, and Session Type fields are required for offline sessions.');
        return;
      }
    } else {
      if (!newActivity.startTime || !newActivity.endTime) {
        setSessionError('Start and end time are required for regular activities.');
        return;
      }

      if (hasTimeOverlap(newActivity.startTime, newActivity.endTime)) {
        setSessionError('Selected time overlaps with an existing activity.');
        return;
      }
    }

    const workDate = selectedWorkDateObj ? new Date(selectedWorkDateObj) : new Date();
    let timeEntry;

    if (isCustomSessionTemplate) {
      const punchIn = parseTimeToSelectedDate(newActivity.startTime);
      const punchOut = parseTimeToSelectedDate(newActivity.endTime);
      if (!punchIn || !punchOut) {
        setSessionError('Start and end time are required for custom sessions.');
        return;
      }
      const duration = (punchOut - punchIn) / (1000 * 60);
      if (!Number.isFinite(duration) || duration <= 0) {
        setSessionError('End time must be after start time for custom sessions.');
        return;
      }
      timeEntry = {
        date: punchIn,
        duration,
        punchIn,
        punchOut,
        description: newActivity.description
      };
    } else if (isOfflineSessionDescription) {
      // For offline sessions, create a time entry with 0 hours duration on the selected work date
      const entryDate = new Date(workDate.getTime());
      timeEntry = {
        date: entryDate,
        duration: 0,
        punchIn: entryDate,
        punchOut: entryDate,
        description: newActivity.description
      };
    } else {
      // For regular activities, calculate duration from start/end time anchored to the selected work date
      try {
        const punchIn = parseTimeToSelectedDate(newActivity.startTime);
        const punchOut = parseTimeToSelectedDate(newActivity.endTime);

        if (!punchIn || !punchOut) {
          throw new Error('Invalid time format. Please use HH:MM format (e.g., 09:00)');
        }

        const duration = (punchOut - punchIn) / (1000 * 60); // in minutes

        if (Number.isNaN(duration) || duration <= 0) {
          throw new Error('End time must be after start time');
        }

        timeEntry = {
          date: punchIn,
          duration,
          punchIn,
          punchOut,
          description: newActivity.description
        };
      } catch (timeError) {
        console.error('Error processing time entry:', timeError);
        throw new Error(timeError?.message || 'Invalid time format. Please use HH:MM format (e.g., 09:00)');
      }
    }

    // Prepare the activity data with proper defaults
    const activityData = {
      title: newActivity.description,
      description: newActivity.description,
      department: (user?.department && (user.department.id || user.department._id)) || user?.departmentId || newActivity.department,
      comment: newActivity.comment || '',
      timeEntries: [timeEntry]
    };

    // Add fields based on activity type
    if (isCustomSessionTemplate) {
      if (isSchoolSessionTemplate) {
        activityData.schoolName = trimmedSchool;
        activityData.branchLocation = null;
      }
      if (isInstituteSessionTemplate) {
        activityData.branchLocation = trimmedBranch;
        activityData.schoolName = null;
      }
      activityData.sessionsCount = parseInt(newActivity.sessionsCount, 10) || 0;
      activityData.startTime = newActivity.startTime || '';
      activityData.endTime = newActivity.endTime || '';
      activityData.institute = null;
      activityData.school = null;
      activityData.sessionType = null;
    } else if (isOfflineSessionDescription) {
      // Ensure numeric values for institute and school
      activityData.institute = parseInt(newActivity.institute, 10) || 0;
      activityData.school = parseInt(newActivity.school, 10) || 0;
      activityData.sessionType = newActivity.sessionType || 'Offline';
      activityData.schoolName = null;
      activityData.branchLocation = null;
      activityData.sessionsCount = null;
      activityData.hoursSpent = null;
    } else {
      // Ensure time fields are properly formatted
      activityData.startTime = newActivity.startTime || '';
      activityData.endTime = newActivity.endTime || '';
      activityData.schoolName = null;
      activityData.branchLocation = null;
      activityData.sessionsCount = null;
      activityData.hoursSpent = null;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/api/activities`, activityData, { withCredentials: true });
      const newActivity = response.data;
      setActivities(prevActivities => [...prevActivities, newActivity]);
      setNewActivity(initialActivityState);
      setSnackbar({ open: true, message: 'Activity logged!', severity: 'success' });
      
      // Refresh calendar data to update stats immediately
      fetchCalendarData(calendarMonth.getFullYear(), calendarMonth.getMonth());
    } catch (err) {
      console.error('Error logging activity:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack
      });
      setSnackbar({ open: true, message: err.response?.data?.error || err.message || 'Failed to log activity', severity: 'error' });
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const fetchHistoricalActivities = async () => {
    if (!selectedStartDate || !selectedEndDate || !user || !user.employeeCode) return;
    setLoadingHistory(true);
    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/activities/employee/history?startDate=${selectedStartDate}&endDate=${selectedEndDate}`,
        { withCredentials: true }
      );
      // Flatten per time entry within the selected range for accurate rendering
      const start = new Date(selectedStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(selectedEndDate);
      end.setHours(23,59,59,999);
      const flattened = (res.data || []).flatMap(act =>
        (act.timeEntries || [])
          .filter(te => {
            const d = new Date(te.date);
            return d >= start && d <= end;
          })
          .map(te => ({ ...act, _timeEntry: te }))
      );
      setHistoricalActivities(flattened);
    } catch (error) {
      console.error('Error fetching historical activities:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch historical activities',
        severity: 'error'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshActivitySummary = useCallback(async () => {
    if (selectedWorkDate) {
      await fetchActivitiesForDate(selectedWorkDate);
    }
    await fetchCalendarData(calendarMonth.getFullYear(), calendarMonth.getMonth());
    if (selectedStartDate && selectedEndDate) {
      await fetchHistoricalActivities();
    }
    if (user?.employeeCode) {
      await fetchUserProfileData(user.employeeCode);
    }
  }, [
    selectedWorkDate,
    fetchActivitiesForDate,
    fetchCalendarData,
    calendarMonth,
    selectedStartDate,
    selectedEndDate,
    user?.employeeCode,
    fetchUserProfileData
  ]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
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
        newPassword
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

  // Handler to open edit dialog
  const handleEditActivity = (activity) => {
    // Ensure we have both id and _id set to the same value for consistency
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

    if (activity.title === 'School Session') {
      const derivedName = deriveSchoolName(activity, activity.schoolName || '');
      normalizedActivity.schoolName = typeof activity.schoolName === 'string' && activity.schoolName.trim()
        ? activity.schoolName
        : derivedName;
    }

    if (activity.title === 'Institute Session') {
      const branchName = typeof activity.branchLocation === 'string' && activity.branchLocation.trim()
        ? activity.branchLocation
        : activity.branch?.name;
      normalizedActivity.branchLocation = branchName || '';
    }

    setEditActivity(normalizedActivity);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editActivity) {
      return;
    }

    try {
      const activityId = editActivity.id || editActivity._id;
      if (!activityId) {
        setSnackbar({ open: true, message: 'Activity ID missing, cannot update.', severity: 'error' });
        return;
      }

      const isOfflineSession = editActivity.title === 'Total No. of Sessions';
      const isSchoolSession = editActivity.title === 'School Session';
      const isInstituteSession = editActivity.title === 'Institute Session';
      const isCustomSession = isSchoolSession || isInstituteSession;

      const payload = {
        title: editActivity.title,
        comment: editActivity.comment || '',
        timeEntries: editActivity.timeEntries || []
      };

      if (isOfflineSession) {
        payload.sessionType = editActivity.sessionType || 'Offline';
        payload.institute = parseInt(editActivity.institute, 10) || 0;
        payload.school = parseInt(editActivity.school, 10) || 0;
        payload.sessionsCount = null;
        payload.schoolName = null;
        payload.branchLocation = null;
        payload.startTime = '';
        payload.endTime = '';
      } else {
        payload.startTime = editActivity.startTime || '';
        payload.endTime = editActivity.endTime || '';

        if (!payload.startTime || !payload.endTime) {
          setSnackbar({ open: true, message: 'Start and end time are required to update this activity.', severity: 'warning' });
          return;
        }

        if (hasTimeOverlap(payload.startTime, payload.endTime, activityId)) {
          setSnackbar({ open: true, message: 'Selected time overlaps with an existing activity.', severity: 'warning' });
          return;
        }

        if (isCustomSession) {
          const trimmedSchool = (editActivity.schoolName || '').trim();
          const trimmedBranch = (editActivity.branchLocation || '').trim();
          const sessionsCountNumber = parseInt(editActivity.sessionsCount, 10);

          if (isSchoolSession && !trimmedSchool) {
            setSnackbar({ open: true, message: 'Please enter a school name before saving.', severity: 'warning' });
            return;
          }

          if (isInstituteSession && !trimmedBranch) {
            setSnackbar({ open: true, message: 'Please enter a branch location before saving.', severity: 'warning' });
            return;
          }

          if (!Number.isFinite(sessionsCountNumber) || sessionsCountNumber <= 0) {
            setSnackbar({ open: true, message: 'Number of sessions must be greater than zero.', severity: 'warning' });
            return;
          }

          payload.sessionsCount = sessionsCountNumber;
          payload.schoolName = isSchoolSession ? trimmedSchool : null;
          payload.branchLocation = isInstituteSession ? trimmedBranch : null;
          payload.institute = null;
          payload.school = null;
          payload.sessionType = null;
        } else {
          payload.sessionsCount = null;
          payload.schoolName = null;
          payload.branchLocation = null;
          payload.institute = null;
          payload.school = null;
          payload.sessionType = null;
        }
      }

      try {
        const response = await axios.patch(
          `${apiBaseUrl}/api/activities/${activityId}`,
          payload,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const updatedActivity = response.data;

        if (!isOfflineSession) {
          const resolvedStart = payload.startTime || (updatedActivity.startTime 
            ? updatedActivity.startTime 
            : formatPunchToTime(updatedActivity.timeEntries?.[0]?.punchIn));
          const resolvedEnd = payload.endTime || (updatedActivity.endTime 
            ? updatedActivity.endTime 
            : formatPunchToTime(updatedActivity.timeEntries?.[0]?.punchOut));

          updatedActivity.startTime = resolvedStart;
          updatedActivity.endTime = resolvedEnd;
        }

        // Update the activities state with the updated activity
        setActivities(prevActivities =>
          prevActivities.map(activity =>
            (activity.id === activityId || activity._id === activityId) ? updatedActivity : activity
          )
        );

        setEditDialogOpen(false);
        setEditActivity(null);

        // Refresh the activities list to ensure everything is in sync
        await fetchActivitiesForDate(selectedWorkDate);

        setSnackbar({
          open: true,
          message: 'Activity updated!',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error updating activity:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          config: {
            url: err.config?.url,
            method: err.config?.method,
            data: err.config?.data
          }
        });

        setSnackbar({
          open: true,
          message: err.response?.data?.error || 'Failed to update activity',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error updating activity:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update activity',
        severity: 'error'
      });
    }
  };

  // Handler to open delete dialog
  const handleDeleteActivity = (activity) => {
    setDeleteActivity(activity);
    setDeleteDialogOpen(true);
  };

  // Handler to confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteActivity) return;
    try {
      const activityId = deleteActivity?.id || deleteActivity?._id;
      if (!activityId) {
        setSnackbar({ open: true, message: 'Activity ID missing, cannot delete.', severity: 'error' });
        return;
      }

      await axios.delete(`${apiBaseUrl}/api/activities/${activityId}`, { withCredentials: true });
      setSnackbar({ open: true, message: 'Activity deleted!', severity: 'success' });
      setDeleteDialogOpen(false);
      setDeleteActivity(null);
      await fetchActivitiesForDate(selectedWorkDate);
      if (user?.employeeCode) {
        await fetchUserProfileData(user.employeeCode);
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
      setSnackbar({ open: true, message: 'Failed to delete activity', severity: 'error' });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteActivity(null);
  };

  const getActivityHours = (activity) => {
    if (!activity) return '';

    const entryDurationMinutes = activity._timeEntry?.duration;
    const entryDurationNumber = Number(entryDurationMinutes);
    if (Number.isFinite(entryDurationNumber) && !Number.isNaN(entryDurationNumber)) {
      return (entryDurationNumber / 60).toFixed(2);
    }

    const coarseHours = activity.hours ?? activity.timeSpent ?? activity.timeSpentHours;
    const hoursNumber = Number(coarseHours);
    if (Number.isFinite(hoursNumber) && !Number.isNaN(hoursNumber)) {
      return hoursNumber.toFixed(2);
    }

    const durationMinutes = activity.timeEntries?.[0]?.duration;
    const durationNumber = Number(durationMinutes);
    if (Number.isFinite(durationNumber) && !Number.isNaN(durationNumber)) {
      return (durationNumber / 60).toFixed(2);
    }

    if (activity.startTime && activity.endTime) {
      const start = new Date(`1970-01-01T${activity.startTime}`);
      const end = new Date(`1970-01-01T${activity.endTime}`);
      const diffMinutes = (end - start) / (1000 * 60);
      if (Number.isFinite(diffMinutes) && diffMinutes >= 0) {
        return (diffMinutes / 60).toFixed(2);
      }
    }

    return '';
  };

  const isEditSchoolSession = editActivity?.title === 'School Session';
  const isEditInstituteSession = editActivity?.title === 'Institute Session';
  const isEditCustomSession = isEditSchoolSession || isEditInstituteSession;
  const isEditOfflineSession = editActivity?.title === 'Total No. of Sessions';
  const editSessionsCountValue = editActivity?.sessionsCount !== undefined && editActivity?.sessionsCount !== null
    ? String(editActivity.sessionsCount)
    : '';
  const editSchoolNameValue = typeof editActivity?.schoolName === 'string' ? editActivity.schoolName : '';
  const editBranchLocationValue = typeof editActivity?.branchLocation === 'string'
    ? editActivity.branchLocation
    : (editActivity?.branch?.name ?? '');

  const instituteBranchFieldWidth = useMemo(() => {
    if (!isInstituteSessionTemplate) return 320;
    const label = selectedBranchOption
      ? formatBranchLabel(selectedBranchOption)
      : (newActivity.branchLocation || '');
    const length = Math.max(label.length, 14);
    return Math.min(480, Math.max(320, length * 11));
  }, [isInstituteSessionTemplate, selectedBranchOption, formatBranchLabel, newActivity.branchLocation]);

  const instituteSessionsFieldWidth = useMemo(() => {
    if (!isInstituteSessionTemplate) return 200;
    const valueLength = String(newActivity.sessionsCount ?? '').trim().length || 1;
    return Math.min(280, Math.max(200, valueLength * 22));
  }, [isInstituteSessionTemplate, newActivity.sessionsCount]);

  const editBranchFieldWidth = useMemo(() => {
    if (!isEditInstituteSession) return 320;
    const length = Math.max(editBranchLocationValue.trim().length, 14);
    return Math.min(480, Math.max(320, length * 11));
  }, [isEditInstituteSession, editBranchLocationValue]);

  const editSessionsFieldWidth = useMemo(() => {
    if (!isEditCustomSession) return 200;
    const length = Math.max(String(editSessionsCountValue || '').trim().length, 1);
    return Math.min(280, Math.max(200, length * 22));
  }, [isEditCustomSession, editSessionsCountValue]);

  // Sidebar navigation items
  const sidebarItems = [
    {
      title: 'GENERAL',
      items: [
        { id: 'overview', label: 'Activity Log', icon: 'dashboard' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar' },
        { id: 'projects', label: 'My Projects', icon: 'projects' },
        { id: 'inventory', label: 'Inventory', icon: 'documents', route: '/inventory' },
        { id: 'tools', label: 'Tools', icon: 'settings' },
        { id: 'history', label: 'Activity History', icon: 'history' },
        { id: 'profile', label: 'Profile', icon: 'profile' }
      ]
    }
  ];

  const tabLabels = ['Activity Log', 'Calendar', 'My Projects', 'Tools', 'Activity History', 'Profile'];
  const activeTabId = selectedTab === 0
    ? 'overview'
    : selectedTab === 1
      ? 'calendar'
      : selectedTab === 2
        ? 'projects'
        : selectedTab === 3
          ? 'tools'
          : selectedTab === 4
            ? 'history'
            : selectedTab === 5
              ? 'profile'
              : 'overview';
  const handleDashboardNavigation = (id) => {
    if (id === 'inventory') {
      navigate('/inventory');
      return;
    }
    if (id === 'overview') setSelectedTab(0);
    else if (id === 'calendar') setSelectedTab(1);
    else if (id === 'projects') {
      setSelectedProjectId(null);
      setSelectedTab(2);
    } else if (id === 'tools') {
      if (toolAssignments.workbook || toolAssignments.reportCard) setSelectedTab(3);
      else setSnackbar({ open: true, message: 'Tools not available', severity: 'info' });
    } else if (id === 'history') setSelectedTab(4);
    else if (id === 'profile') setSelectedTab(5);
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
        user={{ name: user?.name || 'Employee', role: user?.role || 'Employee' }}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, ml: { xs: 0, md: '240px' }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Header
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          searchOptions={headerSearchOptions}
          onSearchSelect={(option) => handleDashboardNavigation(option.id)}
          rightContent={(
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="Take a guided tour of activity logging">
                <Button
                  onClick={startTour}
                  variant="outlined"
                  startIcon={<HelpOutlineIcon />}
                  sx={{
                    ...typography.paragraphSmall,
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 2.5,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.12)' : 'rgba(255,255,255,0.5)',
                    border: '1px solid #0070F0',
                    color: '#0070F0',
                    '&:hover': { bgcolor: '#0070F0', color: '#fff' }
                  }}
                >
                  TAKE TOUR
                </Button>
              </Tooltip>
            </Box>
          )}
          user={{ name: user?.name || 'Employee' }}
        />

        {/* Main Content Area */}
          <Box sx={{ flex: 1, p: { xs: 2, sm: 2.5, md: 3 }, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { label: 'Dashboard', active: false }
            ]}
            separator="›"
          />

          {/* Page Title */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ ...typography.subheadingS2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 0.5 }}>
              {tabLabels[selectedTab]}
            </Typography>
            <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
              Welcome back, {user?.name || 'Employee'}
            </Typography>
          </Box>

          {/* Content */}
      <Box sx={{ pb: 4, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
        {/* Warning if attendance not marked */}
        {!attendanceType && (
          <Alert severity="warning" sx={{ mb: 3, fontWeight: 700, fontSize: 16 }}>
            Please mark your attendance to add activities.
          </Alert>
        )}
        {attendanceType === 'leave' && (
          <Alert severity="info" sx={{ mb: 3, fontWeight: 700, fontSize: 16 }}>
            You are on leave today. Activity tracking is disabled.
          </Alert>
        )}
        {selectedTab === 0 && (
          <>
            {/* Attendance Summary Stats */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
              <StatCard
                title="Full Days"
                value={attendanceStats.fullDays}
                icon="check"
                color="success"
                compact
              />
              <StatCard
                title="Half Days"
                value={attendanceStats.halfDays}
                icon="warning"
                color="warning"
                compact
              />
              <StatCard
                title="Leaves"
                value={attendanceStats.leaves}
                icon="error"
                color="error"
                compact
              />
              <StatCard
                title="Total Hours"
                value={attendanceStats.totalHours}
                icon="calendar"
                color="primary"
                compact
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 2,
                width: '100%',
                mb: 3,
                boxSizing: 'border-box',
              }}
            >
                {/* Attendance Card */}
                <Box sx={{ display: 'flex', minHeight: '100%', boxSizing: 'border-box' }}>
                  <Paper
                    id="attendance-card"
                    elevation={0}
                    sx={{
                      ...getMinimalCardStyle(isDarkMode),
                      p: 2.5,
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                  <Typography sx={{ ...typography.subheadingS3, color: 'text.primary', display: 'flex', alignItems: 'center', mb: 1, zIndex: 2, position: 'relative' }}>
                    <MdAccessTime style={{ marginRight: 8, fontSize: 21 }} /> Mark Attendance
                  </Typography>
                    <Typography color="text.secondary" sx={{ mb: 2, zIndex: 2, position: 'relative', fontSize: 14 }}>
                    Select your attendance type for {attendanceLabel}
                  </Typography>
                    <Box sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 1.5, sm: 1 },
                      alignItems: { xs: 'stretch', sm: 'center' },
                      mb: 2,
                      zIndex: 2
                    }}>
                      <TextField
                        size="small"
                        type="date"
                        label="Attendance Date"
                        value={pendingWorkDate}
                        onChange={handlePendingWorkDateChange}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayDateString }}
                        sx={{
                          flexGrow: 1,
                          background: darkCardBg,
                          borderRadius: 1,
                          '& .MuiInputLabel-root': {
                            color: theme.palette.text.secondary
                          },
                          '& .MuiInputBase-input': { color: theme.palette.text.primary }
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: isPendingDateValid ? 'text.secondary' : 'error.main', mb: 2, zIndex: 2 }}>
                      {isPendingDateValid ? (isFutureSelectedDate ? 'Future dates cannot be marked until the day arrives.' : `Viewing data for ${formattedSelectedDate}`) : 'Please choose a date that is today or earlier.'}
                    </Typography>
                    
                    {attendanceType ? (
                      <Box sx={{ zIndex: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700} sx={{ mb: 1, fontSize: 20, color: attendanceType === 'full_day' ? 'success.main' : attendanceType === 'half_day' ? 'warning.main' : 'error.main' }}>
                          {attendanceType === 'full_day' ? '✓ Full Day' : attendanceType === 'half_day' ? '⚡ Half Day' : '🏖️ Leave'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Standard Hours: {standardHours}h
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleResetAttendance}
                          disabled={hasLoggedActivity}
                          sx={{ borderRadius: 2 }}
                        >
                          Change Attendance
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', zIndex: 2 }}>
                        <Button
                          variant="contained"
                          onClick={() => handleMarkAttendance('full_day')}
                          sx={{ 
                            flex: 1,
                            height: { xs: '48px', md: '50px' }, 
                            fontWeight: 600, 
                            fontSize: { xs: '0.85rem', md: '0.9rem' }, 
                            borderRadius: 1, 
                            backgroundColor: theme.palette.success.main,
                            color: '#fff',
                            textTransform: 'none',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            '&:hover': { 
                              backgroundColor: theme.palette.success.dark,
                              boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                            }
                          }}
                        >
                          Full Day (9h)
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => handleMarkAttendance('half_day')}
                          sx={{ 
                            flex: 1,
                            height: { xs: '48px', md: '50px' }, 
                            fontWeight: 600, 
                            fontSize: { xs: '0.85rem', md: '0.9rem' }, 
                            borderRadius: 1, 
                            backgroundColor: theme.palette.warning.main,
                            color: '#fff',
                            textTransform: 'none',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            '&:hover': { 
                              backgroundColor: theme.palette.warning.dark,
                              boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                            }
                          }}
                        >
                          Half Day (4.5h)
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleMarkAttendance('leave')}
                          sx={{ 
                            flex: 1,
                            height: { xs: '48px', md: '50px' }, 
                            fontWeight: 600, 
                            fontSize: { xs: '0.85rem', md: '0.9rem' }, 
                            borderRadius: 1, 
                            borderColor: theme.palette.error.main,
                            color: theme.palette.error.main,
                            textTransform: 'none',
                            '&:hover': { 
                              backgroundColor: 'rgba(240, 68, 56, 0.08)',
                              borderColor: theme.palette.error.dark
                            }
                          }}
                        >
                          Leave (0h)
                        </Button>
                      </Box>
                    )}
                </Paper>
              </Box>

                {/* Current Time + Leaderboard carousel */}
                <Box sx={{ display: 'flex', minHeight: '100%', boxSizing: 'border-box' }}>
                  <AutoCarousel
                    interval={6000}
                    slides={[
                      { key: 'time', label: 'current time', content: (
                  <Paper
                    elevation={0}
                    sx={{
                      ...getMinimalCardStyle(isDarkMode),
                      p: 2.5,
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}
                  >
                  <Typography sx={{ ...typography.subheadingS3, color: 'text.primary', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, zIndex: 2, position: 'relative' }}>
                    <MdAccessTime style={{ marginRight: 8, fontSize: 21 }} /> Current Time
                  </Typography>
                    <Typography
                      variant="h3"
                      fontWeight={700}
                      color={theme.palette.mode === 'dark' ? '#fff' : '#111'}
                      sx={{
                        letterSpacing: 2,
                        mb: 1,
                        transition: 'color 0.3s',
                        zIndex: 2,
                        position: 'relative',
                        fontSize: { xs: '1.65rem', md: '1.9rem' },
                        textShadow: 'none'
                      }}
                    >
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 14, fontWeight: 500, zIndex: 2, position: 'relative' }}>
                    {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </Typography>
                    <Typography sx={{ mt: 1.5, px: 2, py: 0.75, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F9FAFB', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#EAECF0'}`, color: 'text.secondary', fontSize: 12, fontWeight: 600, zIndex: 2 }}>
                      {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                    {/* Current Time content end */}
                </Paper>
                      ) },
                      { key: 'leaderboard', label: 'leaderboard', content: (
                        <TrainerLeaderboard cardSx={getMinimalCardStyle(isDarkMode)} titleSx={typography.subheadingS3} />
                      ) },
                    ]}
                  />
              </Box>

                {/* Session Stats Card */}
                <Box sx={{ display: 'flex', minHeight: '100%', boxSizing: 'border-box' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      ...getMinimalCardStyle(isDarkMode),
                      p: 2.5,
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                  <Typography sx={{ ...typography.subheadingS3, color: 'text.primary', display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MdAccessTime style={{ marginRight: 8, fontSize: 21 }} /> Today's Summary
                  </Typography>
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', gap: 2 }}>
                    {/* Total Working Hours */}
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Typography
                        variant="h2"
                        sx={{
                          fontSize: { xs: 28, md: 30 },
                          fontWeight: 700,
                          color: theme.palette.mode === 'dark' ? '#fff' : '#101828',
                          lineHeight: 1.1,
                          mb: 0.5
                        }}
                      >
                        {todayStats.totalHours}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.palette.mode === 'dark' ? '#888' : '#667085',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        Total Working Hours
                      </Typography>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ width: '1px', height: '52px', background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0' }} />

                    {/* Institute Sessions */}
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Typography
                        variant="h2"
                        sx={{
                          fontSize: { xs: 28, md: 30 },
                          fontWeight: 700,
                          color: theme.palette.primary.main,
                          lineHeight: 1.1,
                          mb: 0.5
                        }}
                      >
                        {todayStats.instituteSessions}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.palette.mode === 'dark' ? '#888' : '#667085',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        Institute Sessions
                      </Typography>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ width: '1px', height: '52px', background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0' }} />

                    {/* School Sessions */}
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Typography
                        variant="h2"
                        sx={{
                          fontSize: { xs: 28, md: 30 },
                          fontWeight: 700,
                          color: theme.palette.success.main,
                          lineHeight: 1.1,
                          mb: 0.5
                        }}
                      >
                        {todayStats.schoolSessions}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.palette.mode === 'dark' ? '#888' : '#667085',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        School Sessions
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </Box>

            <TrainerSchoolActivities />

            {/* Activity Logger Section */}
            <Box sx={{ width: '100%', mb: 3, boxSizing: 'border-box' }}>
              <Paper
                id="activity-logger"
                elevation={0}
                sx={{
                  ...getMinimalCardStyle(isDarkMode),
                  p: { xs: 2, md: 4 },
                  width: '100%'
                }}
              >
                <Typography variant="h6" fontWeight={700} sx={{ 
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: '1.1rem', md: '1.25rem' }
                }}>
                  Activity Logger
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                  Log your daily activities and time spent
                </Typography>
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  Please enter start and end time in 24-hour format (e.g., 14:30).
                </Alert>
                <Tabs
                  value={selectedTemplateTitle === 'School Session' ? 'school' : 'institute'}
                  onChange={(event, value) => {
                    setSessionError('');
                    setNewActivity(prev => ({
                      ...initialActivityState,
                      department: prev.department,
                      description: value === 'school' ? 'School Session' : 'Institute Session',
                    }));
                  }}
                  aria-label="Activity session type"
                  sx={{ mb: 2, minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 } }}
                >
                  <Tab value="school" label="School" />
                  <Tab value="institute" label="Institute" />
                </Tabs>
                {sessionError && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    {sessionError}
                  </Alert>
                )}

                  {/* Template detection logic */}
                  {(() => {
                    const selectedTemplateTitle = (newActivity.description || '').trim();
                    const isSchoolSessionTemplate = selectedTemplateTitle === 'School Session';
                    const isInstituteSessionTemplate = selectedTemplateTitle === 'Institute Session';
                    const isCustomSessionTemplate = isSchoolSessionTemplate || isInstituteSessionTemplate;
                    const isOfflineSessionDescription = selectedTemplateTitle === 'Total No. of Sessions';
                    const customTemplateNameLabel = isSchoolSessionTemplate ? 'School Name' : 'Branch Location';
                    const customTemplateNamePlaceholder = isSchoolSessionTemplate ? 'Enter school name' : 'Enter branch location';
                    
                    return (
                      <Grid container spacing={2} sx={{ mb: { xs: 2, md: 3 }, '& .MuiFormControl-root': { minHeight: { xs: '45px', md: '56px' } }, pointerEvents: !clockedIn ? 'none' : 'auto', opacity: !clockedIn ? 0.5 : 1 }}>
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl id="activity-select" fullWidth sx={{ minWidth: 200 }}>
                            <InputLabel>Activity</InputLabel>
                            <Select
                              value={newActivity.description}
                              onChange={e => {
                                const value = e.target.value;
                                setNewActivity(prev => ({
                                  ...initialActivityState,
                                  department: prev.department,
                                  description: value,
                                  sessionType: value === 'Total No. of Sessions' ? 'Offline' : prev.sessionType
                                }));
                              }}
                              label="Activity"
                              fullWidth
                              sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary } }}
                            >
                              {departmentActivities.length === 0 ? (
                                <MenuItem value="" disabled>No activities available</MenuItem>
                              ) : (
                                departmentActivities.map(act => (
                                  <MenuItem key={act.id ?? act._id} value={act.title}>{act.title}</MenuItem>
                                ))
                              )}
                            </Select>
                          </FormControl>
                        </Grid>
                        {isCustomSessionTemplate ? (
                          <>
                            <Grid
                              id="school-branch-field"
                              item
                              xs={12}
                              md={3}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                height: '56px',
                                ...(isInstituteSessionTemplate ? {
                                  flexBasis: { md: `${instituteBranchFieldWidth}px` },
                                  maxWidth: { md: `${instituteBranchFieldWidth}px` }
                                } : {})
                              }}
                            >
                              {isSchoolSessionTemplate ? (
                                <Autocomplete
                                  fullWidth
                                  options={schoolCatalog}
                                  value={selectedSchoolOption}
                                  loading={schoolCatalog.length === 0}
                                  onChange={(event, newValue) => {
                                    setNewActivity(prev => ({
                                      ...prev,
                                      schoolName: newValue?.name || '',
                                      schoolCatalogId: newValue?.id || null,
                                    }));
                                  }}
                                  getOptionLabel={(option) => {
                                    if (!option) return '';
                                    if (typeof option === 'string') return option;
                                    return option.name || '';
                                  }}
                                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                                  noOptionsText={schoolCatalog.length === 0 ? 'No schools found' : 'No matches'}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="School Name"
                                      required
                                      placeholder="Search school"
                                      sx={{
                                        background: darkCardBg,
                                        borderRadius: 1,
                                        input: { color: theme.palette.text.primary },
                                        label: { color: theme.palette.text.secondary },
                                        minWidth: { xs: '100%', md: 260 },
                                        maxWidth: { xs: '100%', md: 360 },
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 1,
                                          minHeight: 56,
                                          paddingRight: 1,
                                        },
                                        '& .MuiOutlinedInput-input': {
                                          padding: '16.5px 14px',
                                        },
                                      }}
                                    />
                                  )}
                                />
                              ) : (
                                <Autocomplete
                                  fullWidth
                                  options={branchOptions}
                                  value={selectedBranchOption}
                                  loading={branchOptions.length === 0}
                                  onChange={(event, newValue) => {
                                    setNewActivity(prev => ({
                                      ...prev,
                                      branchLocation: newValue ? formatBranchLabel(newValue) : '',
                                      branchId: newValue?.id || null,
                                    }));
                                  }}
                                  getOptionLabel={(option) => {
                                    if (!option) return '';
                                    if (typeof option === 'string') return option;
                                    return formatBranchLabel(option);
                                  }}
                                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                                  noOptionsText={branchOptions.length === 0 ? 'No branches found' : 'No matches'}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Branch"
                                      required
                                      placeholder="Search branch"
                                      sx={{
                                        background: darkCardBg,
                                        borderRadius: 1,
                                        input: { color: theme.palette.text.primary },
                                        label: { color: theme.palette.text.secondary },
                                        minWidth: { xs: '100%', md: `${instituteBranchFieldWidth}px` },
                                        maxWidth: { xs: '100%', md: `${instituteBranchFieldWidth}px` },
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 1,
                                          minHeight: 56,
                                          paddingRight: 1,
                                        },
                                        '& .MuiOutlinedInput-input': {
                                          padding: '16.5px 14px',
                                        },
                                      }}
                                    />
                                  )}
                                />
                              )}
                            </Grid>
                            <Grid
                              item
                              xs={6}
                              md={2}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                height: '56px',
                                ...(isInstituteSessionTemplate ? {
                                  flexBasis: { md: `${instituteSessionsFieldWidth}px` },
                                  maxWidth: { md: `${instituteSessionsFieldWidth}px` }
                                } : {})
                              }}
                            >
                              <TextField
                                label="Number of Sessions"
                                type="number"
                                required
                                value={newActivity.sessionsCount || ''}
                                onChange={e => {
                                  const value = e.target.value;
                                  setNewActivity(prev => ({
                                    ...prev,
                                    sessionsCount: value === '' ? '' : value.replace(/[^0-9]/g, ''),
                                  }));
                                }}
                                fullWidth
                                sx={{
                                  background: darkCardBg,
                                  borderRadius: 1,
                                  input: { color: theme.palette.text.primary },
                                  label: { color: theme.palette.text.secondary },
                                  height: '56px',
                                  minWidth: { xs: '100%', md: `${instituteSessionsFieldWidth}px` },
                                  maxWidth: { xs: '100%', md: `${instituteSessionsFieldWidth}px` }
                                }}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 1 }}
                              />
                            </Grid>
                            <Grid
                              item
                              xs={6}
                              md={2}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="Start Time"
                                type="time"
                                required
                                value={newActivity.startTime}
                                onChange={e => setNewActivity(prev => ({ ...prev, startTime: e.target.value }))}
                                fullWidth
                                sx={{
                                  background: darkCardBg,
                                  borderRadius: 1,
                                  input: { color: theme.palette.text.primary },
                                  label: { color: theme.palette.text.secondary },
                                  height: '56px',
                                  '& .MuiInputBase-input': {
                                    padding: '14px 18px',
                                  },
                                }}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>
                            <Grid
                              item
                              xs={6}
                              md={2}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="End Time"
                                type="time"
                                required
                                value={newActivity.endTime}
                                onChange={e => setNewActivity(prev => ({ ...prev, endTime: e.target.value }))}
                                fullWidth
                                sx={{
                                  background: darkCardBg,
                                  borderRadius: 1,
                                  input: { color: theme.palette.text.primary },
                                  label: { color: theme.palette.text.secondary },
                                  height: '56px',
                                  '& .MuiInputBase-input': {
                                    padding: '14px 18px',
                                  },
                                }}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>
                            <Grid
                              item
                              xs={12}
                              md={3}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="Notes (optional)"
                                fullWidth
                                value={newActivity.comment || ''}
                                onChange={e => setNewActivity(prev => ({ ...prev, comment: e.target.value }))}
                                placeholder="Add any extra context"
                                sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                              />
                            </Grid>
                          </>
                        ) : isOfflineSessionDescription ? (
                          <>
                            <Grid
                              item
                              xs={6}
                              md={3}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <FormControl
                                fullWidth
                                required
                                sx={{ minWidth: 200 }}
                              >
                                <InputLabel id="session-type-label">Session Type</InputLabel>
                                <Select
                                  labelId="session-type-label"
                                  value={newActivity.sessionType}
                                  label="Session Type"
                                  onChange={e => setNewActivity({ ...newActivity, sessionType: e.target.value })}
                                  fullWidth
                                  sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                                >
                                  <MenuItem value="Online">Online</MenuItem>
                                  <MenuItem value="Offline">Offline</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid
                              item
                              xs={6}
                              md={2}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="Institute"
                                type="number"
                                required
                                value={newActivity.institute}
                                onChange={e => setNewActivity({ ...newActivity, institute: e.target.value.replace(/^0+(?!$)/, '') })}
                                fullWidth
                                sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 0 }}
                              />
                            </Grid>
                            <Grid
                              item
                              xs={6}
                              md={2}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="School"
                                type="number"
                                required
                                value={newActivity.school}
                                onChange={e => setNewActivity({ ...newActivity, school: e.target.value.replace(/^0+(?!$)/, '') })}
                                fullWidth
                                sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 0 }}
                              />
                            </Grid>
                            <Grid
                              item
                              xs={12}
                              md={4}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="School name"
                                fullWidth
                                value={newActivity.comment}
                                onChange={e => setNewActivity({ ...newActivity, comment: e.target.value })}
                                placeholder="School name"
                                sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                              />
                            </Grid>
                          </>
                        ) : (
                          <>
                            <Grid
                              item
                              xs={12}
                              md={4}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="Comment"
                                fullWidth
                                value={newActivity.comment}
                                onChange={e => setNewActivity({ ...newActivity, comment: e.target.value })}
                                placeholder="Optional comment"
                                sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, transition: 'box-shadow 0.2s', '&:focus-within': { boxShadow: 4 }, height: '56px' }}
                              />
                            </Grid>
                            <Grid
                              item
                              xs={4}
                              md={3}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="Start Time"
                                type="time"
                                value={newActivity.startTime}
                                onChange={e => setNewActivity({ ...newActivity, startTime: e.target.value })}
                                fullWidth
                                sx={{
                                  background: darkCardBg,
                                  borderRadius: 1,
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
                            <Grid
                              item
                              xs={4}
                              md={2}
                              sx={{ display: 'flex', alignItems: 'center', height: '56px' }}
                            >
                              <TextField
                                label="End Time"
                                type="time"
                                value={newActivity.endTime}
                                onChange={e => setNewActivity({ ...newActivity, endTime: e.target.value })}
                                fullWidth
                                sx={{
                                  background: darkCardBg,
                                  borderRadius: 1,
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
                          </>
                        )}
                        <Grid
                          item
                          xs={12}
                          md={2}
                          sx={{ display: 'flex', alignItems: 'flex-end' }}
                        >
                          <Button
                            id="add-activity-btn"
                            variant="contained"
                            fullWidth
                            onClick={handleSubmit}
                            disabled={!clockedIn}
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
                            + ADD ACTIVITY
                          </Button>
                        </Grid>
                      </Grid>
                    );
                  })()}
                </Paper>
              </Box>

            <Box sx={{ mt: 4 }}>
              {/* Table Header with working activity filter */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: 1 }}>
                  {activitiesHeading}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FilterList sx={{ fontSize: 18 }} />}
                    onClick={(e) => setFilterAnchor(e.currentTarget)}
                    sx={{
                      textTransform: 'none',
                      borderColor: '#E4E7F0',
                      color: '#667085',
                      fontSize: '13px',
                      fontWeight: 500,
                      '&:hover': { borderColor: '#0070F0', color: '#0070F0' }
                    }}
                  >
                    {activityFilter === 'all' ? 'Filter' : activityFilter === 'institute' ? 'Institute Sessions' : 'School Sessions'}
                  </Button>
                </Box>
              </Box>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: theme.palette.mode === 'dark' ? '1px solid #23272f' : '1px solid #E4E7F0',
                  borderRadius: 2,
                  overflowX: 'auto',
                  background: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff'
                }}
              >
                <Table stickyHeader sx={{ minWidth: 700 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB', borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E4E7F0' }}>
                        <Checkbox size="small" sx={{ color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }} />
                      </TableCell>
                      {['Activity', 'Start Time', 'End Time', 'Institute', 'School', 'Session Type', 'Sessions', 'Hours', 'Comment'].map((header) => (
                        <TableCell
                          key={header}
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054',
                            fontSize: '13px',
                            background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                            borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E4E7F0',
                            padding: '12px 16px',
                            textTransform: 'none',
                            cursor: 'pointer',
                            '&:hover': { color: theme.palette.primary.main }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {header}
                            <ArrowUpward sx={{ fontSize: 14, color: theme.palette.mode === 'dark' ? '#6B7280' : '#98A2B3' }} />
                          </Box>
                        </TableCell>
                      ))}
                      <TableCell sx={{ background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB', borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E4E7F0', width: 60 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 4, color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>
                          {activityFilter === 'all' ? noActivitiesMessage : 'No activities match the selected filter.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleActivities.map((act, idx) => {
                        const isOfflineSession = act.title === 'Total No. of Sessions';
                        const isSchoolSession = act.title === 'School Session';
                        const isInstituteSession = act.title === 'Institute Session';

                        const instituteDisplay = isOfflineSession
                          ? (act.institute ?? '-')
                          : isInstituteSession
                            ? (act.branchLocation || act.branch?.name || '-')
                            : '-';
                        const schoolDisplay = isOfflineSession
                          ? (act.school ?? '-')
                          : isSchoolSession
                            ? (deriveSchoolName(act, act.schoolName || '') || '-')
                            : '-';
                        const sessionTypeDisplay = isOfflineSession ? (act.sessionType || '-') : '-';
                        const sessionsCountDisplay = (isSchoolSession || isInstituteSession)
                          ? (act.sessionsCount ?? '-')
                          : '-';

                        return (
                          <TableRow
                            key={act._rowKey || act._id || act.id || idx}
                            sx={{
                              background: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.7)' : '#fff',
                              transition: 'background 0.15s ease',
                              '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(55,65,81,0.7)' : '#F9FAFB' },
                              '&:last-child td': { borderBottom: 'none' }
                            }}
                          >
                            <TableCell padding="checkbox" sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7' }}>
                              <Checkbox size="small" sx={{ color: theme.palette.mode === 'dark' ? '#6B7280' : '#D0D5DD' }} />
                            </TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontWeight: 500 }}>{act.title}</TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{isOfflineSession ? '-' : formatTime12(act._timeEntry?.punchIn || act.startTime)}</TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{isOfflineSession ? '-' : formatTime12(act._timeEntry?.punchOut || act.endTime)}</TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{instituteDisplay}</TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{schoolDisplay}</TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{sessionTypeDisplay}</TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{sessionsCountDisplay}</TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{getActivityHours(act)}</TableCell>
                            <TableCell sx={{
                              borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7',
                              maxWidth: 200,
                              color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085',
                              fontSize: '0.875rem'
                            }}>
                              <Box sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {act.comment || act._timeEntry?.description || '-'}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7' }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setActivityMenuAnchor(e.currentTarget);
                                  setSelectedActivityForMenu(act);
                                }}
                                sx={{ color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085', '&:hover': { color: theme.palette.primary.main } }}
                              >
                                <MoreVert sx={{ fontSize: 20 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {visibleActivities.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 1 }}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085', fontSize: '14px' }}>
                    Showing {visibleActivities.length} {visibleActivities.length === 1 ? 'activity' : 'activities'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled
                      sx={{
                        textTransform: 'none',
                        borderColor: theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0',
                        color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085',
                        fontSize: '13px'
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        textTransform: 'none',
                        bgcolor: theme.palette.primary.main,
                        color: '#fff',
                        fontSize: '13px',
                        minWidth: 32,
                        px: 1
                      }}
                    >
                      1
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled
                      sx={{
                        textTransform: 'none',
                        borderColor: theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0',
                        color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085',
                        fontSize: '13px'
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Activity Menu */}
              <Menu
                anchorEl={activityMenuAnchor}
                open={Boolean(activityMenuAnchor)}
                onClose={() => setActivityMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    borderRadius: 2,
                    minWidth: 120,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff'
                  }
                }}
              >
                <MenuItem
                  onClick={() => {
                    if (selectedActivityForMenu) handleEditActivity(selectedActivityForMenu);
                    setActivityMenuAnchor(null);
                  }}
                  sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}
                >
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    if (selectedActivityForMenu) handleDeleteActivity(selectedActivityForMenu);
                    setActivityMenuAnchor(null);
                  }}
                  sx={{ fontSize: '14px', color: theme.palette.error.main }}
                >
                  Delete
                </MenuItem>
              </Menu>

              {/* Filter Menu */}
              <Menu
                anchorEl={filterAnchor}
                open={Boolean(filterAnchor)}
                onClose={() => setFilterAnchor(null)}
                PaperProps={{
                  sx: {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    borderRadius: 2,
                    minWidth: 180,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff'
                  }
                }}
              >
                <MenuItem selected={activityFilter === 'all'} onClick={() => { setActivityFilter('all'); setFilterAnchor(null); }} sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}>
                  All Activities
                </MenuItem>
                <MenuItem selected={activityFilter === 'institute'} onClick={() => { setActivityFilter('institute'); setFilterAnchor(null); }} sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}>
                  Institute Sessions
                </MenuItem>
                <MenuItem selected={activityFilter === 'school'} onClick={() => { setActivityFilter('school'); setFilterAnchor(null); }} sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}>
                  School Sessions
                </MenuItem>
              </Menu>
            </Box>
          </>
        )}

        {selectedTab === 1 && (
          <Box sx={{ width: '100%' }}>
            <Paper sx={{ ...getMinimalCardStyle(isDarkMode), p: { xs: 2, md: 4 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
                Attendance & Session Calendar
              </Typography>
              <Box sx={{ width: '100%' }} className={theme.palette.mode === 'dark' ? 'dark-mode-calendar' : ''}>
                {calendarLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                )}
                {!calendarLoading && Object.keys(calendarData).length === 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No attendance or session data found for the selected month. Mark your attendance and log activities to see them here.
                  </Alert>
                )}
                {!calendarLoading && (
                  <Calendar
                  value={calendarMonth}
                  onChange={(newValue) => setCalendarMonth(newValue)}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    // Fetch data when navigating to different months
                    if (activeStartDate) {
                      setCalendarMonth(activeStartDate);
                    }
                  }}
                  view="month"
                  tileClassName={({ date, view }) => {
                    if (view !== 'month') return '';
                    // Format date as YYYY-MM-DD in local timezone
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const dayData = calendarData[dateStr];
                    
                    const classes = [];
                    // Keep attendance and school schedule markers visible together.
                    if (dayData?.attendance === 'full_day') {
                      classes.push('calendar-day-full');
                    } else if (dayData?.attendance === 'half_day') {
                      classes.push('calendar-day-half');
                    } else if (dayData?.attendance === 'leave') {
                      classes.push('calendar-day-leave');
                    } else if (dayData?.clockedIn) {
                      // Default to full day if only clocked in without explicit attendance type
                      classes.push('calendar-day-full');
                    }
                    if (dayData?.schoolSchedules?.length) classes.push('calendar-day-with-school');
                    return classes.join(' ');
                  }}
                  tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    // Format date as YYYY-MM-DD in local timezone
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const dayData = calendarData[dateStr];
                    
                    if (!dayData) return null;
                    
                    return (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start', 
                        gap: 0.5, 
                        mt: 0.5, 
                        width: '100%',
                        overflow: 'hidden'
                      }}>
                        {/* Attendance Status Bar - shown first like reference image */}
                        {dayData?.attendance === 'full_day' && (
                          <Box className="calendar-event-bar calendar-event-full-day">
                            Full Day
                          </Box>
                        )}
                        {dayData?.attendance === 'half_day' && (
                          <Box className="calendar-event-bar calendar-event-half-day">
                            Half Day
                          </Box>
                        )}
                        {dayData?.attendance === 'leave' && (
                          <Box className="calendar-event-bar calendar-event-leave">
                            Leave
                          </Box>
                        )}

                        {dayData?.schoolSchedules?.slice(0, 1).map((schedule, index) => (
                          <Box key={`school-${index}`} className="calendar-event-bar calendar-event-school" title={`${schedule.schoolName} · ${schedule.className} · ${schedule.activityTitle}`}>
                            {schedule.schoolName} · {schedule.className} · {schedule.startTime}
                          </Box>
                        ))}
                        {dayData?.schoolSchedules?.length > 1 && (
                          <Box className="calendar-event-bar calendar-event-school">+{dayData.schoolSchedules.length - 1} more school session(s)</Box>
                        )}
                        
                        {/* Activity/Event Bars - show max 1 activity */}
                        {dayData?.sessions?.activities?.slice(0, 1).map((activity, index) => (
                          <Box
                            key={index}
                            className={`calendar-event-bar ${activity.title.toLowerCase().includes('institute') ? 'calendar-event-institute' : activity.title.toLowerCase().includes('school') ? 'calendar-event-school' : 'calendar-event-generic'}`}
                          >
                            {activity.title}
                          </Box>
                        ))}
                        {dayData?.sessions?.activities && dayData.sessions.activities.length > 1 && (
                          <Box className="calendar-event-bar calendar-event-generic">
                            +{dayData.sessions.activities.length - 1} more...
                          </Box>
                        )}
                        
                        {/* Fallback: Show counts if no activities array */}
                        {!dayData?.sessions?.activities && dayData?.sessions && dayData.sessions.institute > 0 && (
                          <Box className="calendar-event-bar calendar-event-institute">
                            Inst: {dayData.sessions.institute}
                          </Box>
                        )}
                        {!dayData?.sessions?.activities && dayData?.sessions && dayData.sessions.school > 0 && (
                          <Box className="calendar-event-bar calendar-event-school">
                            School: {dayData.sessions.school}
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
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const dayData = calendarData[dateStr];
                    if (dayData) {
                      setCalendarPopupDate(date);
                      setCalendarPopupData(dayData);
                      setCalendarPopupOpen(true);
                    }
                  }}
                  sx={{ width: '100%' }}
                />
                )}
              </Box>

              <Box sx={{ mt: 4, display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', p: 3, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(138, 100, 255, 0.1)' : 'rgba(138, 100, 255, 0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: '#4CAF50', borderRadius: 4, border: '2px solid #4CAF50' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Full Day</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: '#FF9800', borderRadius: 4, border: '2px solid #FF9800' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Half Day</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: '#F44336', borderRadius: 4, border: '2px solid #F44336' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Leave/Miss</Typography>
                </Box>
              </Box>

              {/* Calendar Popup Dialog */}
              <Dialog
                open={calendarPopupOpen}
                onClose={() => setCalendarPopupOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : '#fff',
                    color: theme.palette.mode === 'dark' ? '#f2f4f7' : '#101828',
                    borderRadius: 3
                  }
                }}
              >
                <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#374151' : '#e5e7eb'}`, pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight={700}>
                      {calendarPopupDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </Typography>
                    <IconButton onClick={() => setCalendarPopupOpen(false)} sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280' }}>
                      <Close sx={{ fontSize: 24 }} />
                    </IconButton>
                  </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                  {calendarPopupData && (
                    <Box>
                      {/* Attendance Status */}
                      {calendarPopupData.attendance && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280', mb: 1 }}>
                            Attendance
                          </Typography>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 2,
                              py: 0.5,
                              borderRadius: 1,
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              bgcolor: calendarPopupData.attendance === 'full_day' ? '#4caf50' : calendarPopupData.attendance === 'half_day' ? '#ff9800' : '#f44336',
                              color: '#fff'
                            }}
                          >
                            {calendarPopupData.attendance === 'full_day' ? 'Full Day' : calendarPopupData.attendance === 'half_day' ? 'Half Day' : 'Leave'}
                          </Box>
                        </Box>
                      )}
                      {calendarPopupData.schoolSchedules?.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280', mb: 1 }}>
                            School schedule ({calendarPopupData.schoolSchedules.length})
                          </Typography>
                          <Stack spacing={1}>
                            {calendarPopupData.schoolSchedules.map((schedule, index) => (
                              <Box key={`school-schedule-${index}`} sx={{ p: 1.5, borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 131, 143, 0.18)' : '#e0f7fa', borderLeft: '4px solid #00838f' }}>
                                <Typography variant="body2" fontWeight={600}>{schedule.schoolName} · {schedule.className}</Typography>
                                <Typography variant="body2">{schedule.activityTitle}</Typography>
                                <Typography variant="caption" color="text.secondary">{schedule.startTime}–{schedule.endTime} · {schedule.courseName} · {({ completed: 'Done', not_completed: 'Not completed', cancelled: 'Class cancelled' })[schedule.completionStatus] || 'Pending'}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Work Hours */}
                      {calendarPopupData.hours > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280', mb: 1 }}>
                            Work Hours
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {calendarPopupData.hours}h
                          </Typography>
                        </Box>
                      )}

                      {/* Activities */}
                      {calendarPopupData.sessions?.activities && calendarPopupData.sessions.activities.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280', mb: 2 }}>
                            Activities ({calendarPopupData.sessions.activities.length})
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {calendarPopupData.sessions.activities.map((activity, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#f9fafb',
                                  border: `1px solid ${theme.palette.mode === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  borderLeft: `4px solid ${activity.title.toLowerCase().includes('institute') ? '#7b1fa2' : activity.title.toLowerCase().includes('school') ? '#00838f' : '#9e9e9e'}`
                                }}
                              >
                                <Typography fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#f2f4f7' : '#101828' }}>
                                  {activity.title}
                                </Typography>
                                {activity.sessionsCount > 1 && (
                                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280' }}>
                                    Sessions: {activity.sessionsCount}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Session Counts */}
                      {(calendarPopupData.sessions?.institute > 0 || calendarPopupData.sessions?.school > 0) && (
                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                          {calendarPopupData.sessions?.institute > 0 && (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280' }}>Institute Sessions</Typography>
                              <Typography variant="h6" fontWeight={700} color="#7b1fa2">
                                {calendarPopupData.sessions.institute}
                              </Typography>
                            </Box>
                          )}
                          {calendarPopupData.sessions?.school > 0 && (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280' }}>School Sessions</Typography>
                              <Typography variant="h6" fontWeight={700} color="#00838f">
                                {calendarPopupData.sessions.school}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </DialogContent>
              </Dialog>
            </Paper>
          </Box>
        )}

        {selectedTab === 5 && (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 1100, mx: 'auto' }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 3,
                textAlign: 'left',
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
                <Avatar sx={{ width: 64, height: 64, flexShrink: 0, fontSize: 28, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.18)' : '#EFF6FF', color: '#0070F0', border: '2px solid #D1E6FF' }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{user?.name || 'Employee'}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: 13, overflowWrap: 'anywhere' }}>{user?.email || ''}</Typography>
                  <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, mt: 0.75, borderRadius: '999px', bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.14)' : '#EFF6FF', color: '#0070F0', fontSize: 12, fontWeight: 700 }}>
                    {user?.department?.name || 'N/A'}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, columnGap: 4, borderTop: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}`, pt: 0.5 }}>
                {[
                  ['Full Name', user?.name || ''],
                  ['Email Address', user?.email || ''],
                  ['Employee Code', user?.employeeCode || 'N/A'],
                  ['Department', user?.department?.name || 'N/A'],
                  ['Branch', user?.branch?.name || user?.branch?.location || (user?.branchId ? `Branch #${user.branchId}` : 'N/A')],
                  ['Role', user?.role || 'employee'],
                  ['Reporting Team Lead', user?.teamLead?.name || user?.teamLeadId || 'Not assigned'],
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

            <Box>
              <Accordion
                elevation={0}
                disableGutters
                sx={{
                  borderRadius: '12px !important',
                  overflow: 'hidden',
                  bgcolor: theme.palette.mode === 'dark' ? '#23272F' : '#fff',
                  border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#DCE3F0'}`,
                  '&::before': { display: 'none' }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    minHeight: 72,
                    '&.Mui-expanded': { minHeight: 72 },
                    '& .MuiAccordionSummary-content': { my: 1.5 },
                    '& .MuiAccordionSummary-content.Mui-expanded': { my: 1.5 }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: '10px', bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.14)' : '#EFF6FF', color: '#0070F0' }}>
                      <HelpOutlineIcon sx={{ fontSize: 20 }} />
                    </Box>
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
                    <TextField size="small" fullWidth label="Old Password" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                    <TextField size="small" fullWidth label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    <TextField size="small" fullWidth label="Confirm New Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    {passwordError && <Alert severity="error">{passwordError}</Alert>}
                    {passwordSuccess && <Alert severity="success">{passwordSuccess}</Alert>}
                    <Button type="submit" variant="contained" disabled={passwordLoading} sx={{ minHeight: 40, mt: 0.5, borderRadius: '10px', bgcolor: '#0070F0', boxShadow: 'none', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#0064D6', boxShadow: 'none' } }}>
                      {passwordLoading ? 'Changing...' : 'Update Password'}
                    </Button>
                  </Stack>
                  <Box sx={{ mt: 2.5, p: 1.5, display: 'flex', gap: 1.25, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.10)' : '#F5FAFF', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.30)' : '#D1E6FF'}` }}>
                    <Box sx={{ color: '#0070F0', lineHeight: 0 }}><HelpOutlineIcon sx={{ fontSize: 19 }} /></Box>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.5, color: 'text.secondary' }}>Use at least 8 characters with a mix of letters, numbers, and symbols.</Typography>
                  </Box>
                </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
            </Box>
          </Box>
        )}

        {selectedTab === 2 && (
          <Box sx={{ width: '100%' }}>
            {selectedProjectId ? (
              <EmployeeProjectDetail
                projectId={selectedProjectId}
                onBack={() => setSelectedProjectId(null)}
                onTimeLogSaved={refreshActivitySummary}
              />
            ) : (
              <EmployeeProjects onSelectProject={setSelectedProjectId} />
            )}
          </Box>
        )}

        {selectedTab === 3 && (
          <Box sx={{ width: '100%' }}>
            {/* Tools Grid - Square cards aligned top-left */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
              {/* Workbook Card */}
              {toolAssignments.workbook && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    width: 280,
                    background: theme.palette.mode === 'dark' ? '#23272F' : '#ffffff',
                    border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      borderColor: '#0070F0'
                    }
                  }}
                  component="a"
                  href="https://time.onmyowntechnology.com/workbook/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: '#0070F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff'
                    }}>
                      <MdMenuBook style={{ fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 0.5 }}>Workbook</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>Track learning progress</Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              {/* Report Card */}
              {toolAssignments.reportCard && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    width: 280,
                    background: theme.palette.mode === 'dark' ? '#23272F' : '#ffffff',
                    border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  component="a"
                  href={reportcardSsoUrl('/trainer/dashboard')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: '#0070F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff'
                    }}>
                      <MdAssessment style={{ fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 0.5 }}>Report Card</Typography>
                      <Typography variant="caption" sx={{ color: '#667085', fontWeight: 700 }}>Open with MIS</Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, width: 280, opacity: 0.72, background: theme.palette.mode === 'dark' ? '#23272F' : '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, background: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><AssessmentIcon /></Box>
                  <Box><Typography variant="subtitle1" fontWeight={600}>Employee Assessment</Typography><Typography variant="caption" sx={{ color: '#667085', fontWeight: 700 }}>Coming soon</Typography></Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {selectedTab === 4 && (
          <Box sx={{ width: '100%' }}>
            <Paper
              elevation={0}
              sx={{
                ...getMinimalCardStyle(isDarkMode),
                p: { xs: 2, md: 3 }
              }}
            >
              {/* Date Filters */}
              <Box sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                p: { xs: 2, md: 2.5 },
                flexWrap: 'wrap',
                alignItems: 'center',
                bgcolor: isDarkMode ? '#111827' : '#F9FAFB',
                border: `1px solid ${isDarkMode ? '#344054' : '#EAECF0'}`,
                borderRadius: '16px'
              }}>
                <Box sx={{ width: { xs: '100%', md: 'auto' }, mr: { md: 1 } }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#101828' }}>
                    Date range
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: isDarkMode ? '#98A2B3' : '#667085', mt: 0.25 }}>
                    Select dates to view logged work
                  </Typography>
                </Box>
                <TextField
                  type="date"
                  size="small"
                  value={selectedStartDate}
                  onChange={e => setSelectedStartDate(e.target.value)}
                  label="Start Date"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    minWidth: { xs: '100%', sm: 180 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      bgcolor: isDarkMode ? '#1F2937' : '#FFFFFF'
                    },
                    '& input::-webkit-calendar-picker-indicator': { filter: isDarkMode ? 'invert(1)' : 'none' }
                  }}
                />
                <TextField
                  type="date"
                  size="small"
                  value={selectedEndDate}
                  onChange={e => setSelectedEndDate(e.target.value)}
                  label="End Date"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    minWidth: { xs: '100%', sm: 180 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      bgcolor: isDarkMode ? '#1F2937' : '#FFFFFF'
                    },
                    '& input::-webkit-calendar-picker-indicator': { filter: isDarkMode ? 'invert(1)' : 'none' }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={fetchHistoricalActivities}
                  disabled={!selectedStartDate || !selectedEndDate || loadingHistory}
                  sx={{
                    minWidth: 140,
                    minHeight: 40,
                    fontWeight: 700,
                    bgcolor: '#0070F0',
                    color: '#fff',
                    borderRadius: '10px',
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#005AD6', boxShadow: 'none' }
                  }}
                >
                  {loadingHistory ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Show History'}
                </Button>
              </Box>

              {/* Activity History Table */}
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  bgcolor: isDarkMode ? '#111827' : '#FFFFFF',
                  border: `1px solid ${isDarkMode ? '#344054' : '#E4E7F0'}`,
                  borderRadius: '16px',
                  overflowX: 'auto'
                }}
              >
                <Table stickyHeader sx={{ minWidth: 700 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>Date</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>Activity</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>Start Time</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>End Time</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>Institute</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>School</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>Session Type</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>Sessions</TableCell>
                      <TableCell sx={{
                        fontWeight: 700,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                        fontSize: 14,
                        background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                        borderBottom: `2px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E4E7F0'}`
                      }}>Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingHistory ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : historicalActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{
                          borderBottom: 0,
                          py: { xs: 5, md: 6 }
                        }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Box sx={{
                              width: 44,
                              height: 44,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: '12px',
                              bgcolor: isDarkMode ? 'rgba(0,112,240,0.16)' : '#EFF6FF',
                              color: '#0070F0',
                              mb: 1.5
                            }}>
                              <MdHistory style={{ fontSize: 24 }} />
                            </Box>
                            <Typography sx={{ color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 700, fontSize: 14 }}>
                              No activity records found
                            </Typography>
                            <Typography sx={{ color: isDarkMode ? '#98A2B3' : '#667085', fontSize: 13, mt: 0.5 }}>
                              Try selecting a different date range.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      historicalActivities.map((activity, index) => {
                        const isOfflineSession = activity.title === 'Total No. of Sessions';
                        const isSchoolSession = activity.title === 'School Session';
                        const isInstituteSession = activity.title === 'Institute Session';

                        const instituteDisplay = isOfflineSession
                          ? (activity.institute ?? '-')
                          : isInstituteSession
                            ? (activity.branchLocation || activity.branch?.name || '-')
                            : '-';
                        const schoolDisplay = isOfflineSession
                          ? (activity.school ?? '-')
                          : isSchoolSession
                            ? (deriveSchoolName(activity, activity.schoolName || '') || '-')
                            : '-';
                        const sessionTypeDisplay = isOfflineSession ? (activity.sessionType || '-') : '-';
                        const sessionsCountDisplay = (isSchoolSession || isInstituteSession)
                          ? (activity.sessionsCount ?? '-')
                          : '-';
                        const hoursDisplay = activity._timeEntry
                          ? (Number.isFinite(Number(activity._timeEntry.duration))
                            ? (Number(activity._timeEntry.duration) / 60).toFixed(2)
                            : '')
                          : getActivityHours(activity);
                        return (
                          <TableRow
                            key={activity._id || index}
                            sx={{
                              background: theme.palette.mode === 'dark'
                                ? (index % 2 === 0 ? '#1F2937' : '#111827')
                                : (index % 2 === 0 ? '#FAFBFC' : '#FFFFFF'),
                              '&:hover': { background: theme.palette.mode === 'dark' ? '#374151' : '#F3F4F6' }
                            }}
                          >
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13 }}>
                              {new Date(activity._timeEntry?.date || activity.timeEntries?.[0]?.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13, fontWeight: 500 }}>
                              {activity.title}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13 }}>
                              {isOfflineSession ? '-' : formatTime12(activity._timeEntry?.punchIn || activity.startTime)}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13 }}>
                              {isOfflineSession ? '-' : formatTime12(activity._timeEntry?.punchOut || activity.endTime)}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13 }}>
                              {instituteDisplay}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13 }}>
                              {schoolDisplay}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13 }}>
                              {sessionTypeDisplay}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13 }}>
                              {sessionsCountDisplay}
                            </TableCell>
                            <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#D1D5DB' : '#344054', fontSize: 13, fontWeight: 600 }}>
                              {hoursDisplay}
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

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogContent>
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel id="edit-activity-dropdown-label">Activity</InputLabel>
              <Select
                labelId="edit-activity-dropdown-label"
                value={editActivity?.title || ''}
                label="Activity"
                onChange={e => setEditActivity({ ...editActivity, title: e.target.value })}
                fullWidth
                sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary } }}
              >
                {departmentActivities.length === 0 ? (
                  <MenuItem value="" disabled>No activities available</MenuItem>
                ) : (
                  departmentActivities.map(act => (
                    <MenuItem key={act._id} value={act.title}>{act.title}</MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Grid container spacing={2} alignItems="center">
              {isEditOfflineSession ? (
                <>
                  <Grid item xs={6} md={3} sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                    <FormControl fullWidth required sx={{ minWidth: 200 }}>
                      <InputLabel id="edit-session-type-label">Session Type</InputLabel>
                      <Select
                        labelId="edit-session-type-label"
                        value={editActivity?.sessionType || 'Offline'}
                        label="Session Type"
                        onChange={e => setEditActivity({ ...editActivity, sessionType: e.target.value })}
                        fullWidth
                        sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px', minWidth: 200 }}
                      >
                        <MenuItem value="Online">Online</MenuItem>
                        <MenuItem value="Offline">Offline</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={3} sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                    <TextField
                      label="Institute"
                      type="number"
                      value={editActivity?.institute || 0}
                      onChange={e => setEditActivity({ ...editActivity, institute: parseInt(e.target.value) || 0 })}
                      fullWidth
                      sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={6} md={3} sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                    <TextField
                      label="School"
                      type="number"
                      value={editActivity?.school || 0}
                      onChange={e => setEditActivity({ ...editActivity, school: parseInt(e.target.value) || 0 })}
                      fullWidth
                      sx={{ background: darkCardBg, borderRadius: 2, input: { color: theme.palette.text.primary }, label: { color: theme.palette.text.secondary }, height: '56px' }}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </>
              ) : (
                <>
                  {isEditCustomSession && (
                    <>
                      <Grid
                        item
                        xs={12}
                        md={4}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          height: '56px',
                          ...(isEditInstituteSession ? {
                            flexBasis: { md: `${editBranchFieldWidth}px` },
                            maxWidth: { md: `${editBranchFieldWidth}px` }
                          } : {})
                        }}
                      >
                        <TextField
                          label={isEditSchoolSession ? 'School Name' : 'Branch Location'}
                          value={isEditSchoolSession ? editSchoolNameValue : editBranchLocationValue}
                          onChange={e => {
                            const value = e.target.value;
                            setEditActivity(prev => ({
                              ...prev,
                              ...(isEditSchoolSession ? { schoolName: value } : { branchLocation: value })
                            }));
                          }}
                          fullWidth
                          sx={{
                            background: darkCardBg,
                            borderRadius: 1,
                            input: { color: theme.palette.text.primary },
                            label: { color: theme.palette.text.secondary },
                            minWidth: { xs: '100%', md: isEditInstituteSession ? `${editBranchFieldWidth}px` : 280 },
                            maxWidth: { xs: '100%', md: isEditInstituteSession ? `${editBranchFieldWidth}px` : 360 }
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid
                        item
                        xs={12}
                        md={3}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          height: '56px',
                          ...(isEditCustomSession ? {
                            flexBasis: { md: `${editSessionsFieldWidth}px` },
                            maxWidth: { md: `${editSessionsFieldWidth}px` }
                          } : {})
                        }}
                      >
                        <TextField
                          label="Number of Sessions"
                          type="number"
                          value={editSessionsCountValue}
                          onChange={e => {
                            const value = e.target.value;
                            setEditActivity(prev => ({ ...prev, sessionsCount: value }));
                          }}
                          fullWidth
                          sx={{
                            background: darkCardBg,
                            borderRadius: 1,
                            input: { color: theme.palette.text.primary },
                            label: { color: theme.palette.text.secondary },
                            minWidth: { xs: '100%', md: `${editSessionsFieldWidth}px` },
                            maxWidth: { xs: '100%', md: `${editSessionsFieldWidth}px` }
                          }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12} md={isEditCustomSession ? 2 : 3} sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                    <TextField
                      label="Start Time"
                      type="time"
                      value={editActivity?.startTime}
                      onChange={e => {
                        const timeStr = e.target.value ? e.target.value : '';
                        setEditActivity({ ...editActivity, startTime: timeStr });
                      }}
                      fullWidth
                      sx={{
                        background: darkCardBg,
                        borderRadius: 1,
                        input: { color: theme.palette.text.primary },
                        label: { color: theme.palette.text.secondary },
                        height: '56px',
                        '& .MuiInputBase-input': {
                          fontSize: '1rem',
                          padding: '14px 18px'
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '1rem',
                          transform: 'translate(14px, 12px) scale(1)'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -6px) scale(0.75)'
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={isEditCustomSession ? 2 : 3} sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                    <TextField
                      label="End Time"
                      type="time"
                      value={editActivity?.endTime}
                      onChange={e => {
                        const timeStr = e.target.value ? e.target.value : '';
                        setEditActivity({ ...editActivity, endTime: timeStr });
                      }}
                      fullWidth
                      sx={{
                        background: darkCardBg,
                        borderRadius: 1,
                        input: { color: theme.palette.text.primary },
                        label: { color: theme.palette.text.secondary },
                        height: '56px',
                        '& .MuiInputBase-input': {
                          fontSize: '1rem',
                          padding: '14px 18px'
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '1rem',
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
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Please enter start and end time in 24-hour format (e.g., 14:30).
                    </Alert>
                  </Grid>
                </>
              )}
              <Grid item xs={12} md={4}>
                <TextField
                  label="Comment"
                  fullWidth
                  value={editActivity?.comment || ''}
                  onChange={e => setEditActivity({ ...editActivity, comment: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Activity</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this activity?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EmployeeDashboard; 
