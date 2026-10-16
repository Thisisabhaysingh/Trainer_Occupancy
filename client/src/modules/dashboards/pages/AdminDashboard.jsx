import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  Avatar,
  TextField,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  FormControl,
  OutlinedInput,
  IconButton,
  Collapse,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Checkbox,
  Autocomplete
} from '@mui/material';
import { Search, ArrowDropDown, ArrowUpward, ArrowDownward, ArrowForward, AccessTime, TrendingUp, GetApp, MenuBook as MenuBookIcon, Assessment as AssessmentIcon, People, School, MoreVert } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { logout } from '../../auth/state/authSlice';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useLocation, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Menu from '@mui/material/Menu';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarCustom.css';
import PMProjectsManagement from '../../../components/pm/ProjectsManagement';
import SchoolActivityMailSettings from '../../../components/dashboard/SchoolActivityMailSettings';
import SchoolReport from '../../../components/dashboard/SchoolReport';
import { StatCard, PageHeader, FilterBar, DataTable, TabNavigation, Pagination, StatusChip, AvatarCell, Sidebar, Header, Breadcrumb, typography } from '../../../components/dashboard/DashboardComponents';
import { getNavigationForRole } from '../../../core/navigation/roleNavigation';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const projectPageLabels = {
  'project management': 'Project Management',
  'all projects': 'Project Management',
  'create project': 'Project Management',
  'active projects': 'Project Management',
  'completed projects': 'Project Management',
  'job templates': 'Project Management',
  'create template': 'Project Management',
  'job progress': 'Project Management',
  'job analytics': 'Project Management'
};
const adminTabLabels = ['Overview', 'Departments', 'Employees', 'Calendar', 'Reports', 'Manage Employees', 'Manage Departments', 'Activity Templates', 'School Catalog', 'Trainer Occupancy', 'Team Lead Management', 'Tools', 'Project Management', 'Mail Automation', 'School Report'];
const getInitialAdminTab = (search) => {
  const section = new URLSearchParams(search).get('section');
  const tabIndex = adminTabLabels.findIndex((label) => label.toLowerCase() === section);
  return tabIndex >= 0 ? tabIndex : section && projectPageLabels[section] ? 12 : 0;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
};

import { DEPT_COLORS, FALLBACK_COLORS } from '../../../utils/departmentColors';

const COLORS = FALLBACK_COLORS;
const ALL_EMPLOYEES_ID = 'ALL_EMPLOYEES';
const REPORTCARD_ADMIN_URL = import.meta.env.VITE_REPORTCARD_ADMIN_URL || 'https://reports.onmyowntechnology.com/login';

const EmployeeCard = memo(({ employee, expanded, onExpand, analyticsData, sessionDistributionData, loading, departments }) => {
  const theme = useTheme()
  // Get department color from departments array
  const deptColor = departments?.find(d => d.name === employee.department)?.color || '#4285F4'
  let todayHours = analyticsData ? analyticsData.totalHours || 0 : 0;

  let todayWorkday = null;
  if (analyticsData && analyticsData.workdays) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayWorkdayObj = analyticsData.workdays.find(w => {
      const d = new Date(w.date); d.setHours(0, 0, 0, 0); return d.getTime() === today.getTime()
    })
    todayWorkday = todayWorkdayObj;
  }

  let todayActivities = [];
  if (analyticsData && analyticsData.activities) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    todayActivities = analyticsData.activities.map(act => {
      const todaysEntries = (act.timeEntries || []).filter(te => {
        const d = new Date(te.date); d.setHours(0, 0, 0, 0); return d.getTime() === today.getTime()
      })
      return {
        ...act,
        totalMinutes: todaysEntries.reduce((sum, te) => sum + te.duration, 0),
        timeEntries: todaysEntries
      };
    }).filter(act => act.timeEntries.length > 0)
  }

  let arrow = null, arrowColor = '#888';
  if (todayHours > 9) {
    arrow = <ArrowUpward sx={{ fontSize: 16 }} />;
    arrowColor = '#34A853';
  } else if (todayHours === 9) {
    arrow = <ArrowDownward sx={{ fontSize: 16, transform: 'rotate(-90deg)' }} />;
    arrowColor = '#888';
  } else if (todayHours < 9 && todayHours > 0) {
    arrow = <ArrowDownward sx={{ fontSize: 16 }} />;
    arrowColor = '#e53935';
  } else { // todayHours <= 0
    arrow = <AccessTime sx={{ fontSize: 16 }} />;
    arrowColor = '#888';
  }

  const [leaves, setLeaves] = useState(null)
  useEffect(() => {
    // Leaves endpoint not available; keep as null to avoid failing requests
    setLeaves(null)
  }, [expanded, employee.employeeCode || employee._id])

  // Calculate today's session distribution from today's activities
  const todaySessionCounts = { offlineInstitute: 0, onlineInstitute: 0, school: 0 };
  (todayActivities || []).forEach(act => {
    const instituteCount = Number(act.institute || 0)
    const schoolCount = Number(act.school || 0)
    const isSessionActivity = act.title === 'Total No. of Sessions' || act.sessionType;
    if (!isSessionActivity) return;
    if (act.sessionType === 'Offline' && instituteCount > 0) {
      todaySessionCounts.offlineInstitute += instituteCount;
    }
    if (act.sessionType === 'Online' && instituteCount > 0) {
      todaySessionCounts.onlineInstitute += instituteCount;
    }
    if (schoolCount > 0) {
      todaySessionCounts.school += schoolCount;
    }
  })

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          mb: 2,
          borderRadius: 3,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
          color: theme.palette.mode === 'dark' ? '#fff' : '#222',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.2)'
            : '0 2px 8px #f0f4fa',
          gap: 2,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(35,39,47,0.98)'
              : '#f8fbff'
          }
        }}
        onClick={onExpand}
      >
        <Avatar sx={{
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.2)' : '#e3e8f7',
          color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#222',
          fontWeight: 700,
          width: 48,
          height: 48,
          fontSize: 20
        }}>
          {employee.initials}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700}>{employee.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: deptColor, mr: 1 }} />
            <Typography
              variant="caption"
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(243,246,250,0.1)' : '#f3f6fa',
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                px: 1,
                borderRadius: 1
              }}
            >
              {employee.department}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right', minWidth: 90 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}>
            <AccessTime sx={{ fontSize: 18, color: theme.palette.mode === 'dark' ? '#888' : '#666' }} />
            {analyticsData ? `${todayHours.toFixed(1)}h` : '—'}
          </Typography>
          <Typography variant="body2" sx={{ color: arrowColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {analyticsData ? arrow : <AccessTime sx={{ fontSize: 16 }} />}
          </Typography>
        </Box>
        <IconButton
          size="small"
          sx={{
            ml: 1,
            color: theme.palette.mode === 'dark' ? '#fff' : 'inherit'
          }}
        >
          <ArrowDropDown sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
        </IconButton>
      </Paper>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 2,
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#f8fbff',
            color: theme.palette.mode === 'dark' ? '#fff' : 'inherit'
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
              <CircularProgress />
            </Box>
          ) : analyticsData && analyticsData.employee ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 180 }}>
                  <Typography fontWeight={700}>{analyticsData.employee.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="#888">Shift Type</Typography>
                    <Typography fontWeight={700}>
                      {todayWorkday?.attendanceType === 'full_day' ? 'Full Day' :
                        todayWorkday?.attendanceType === 'half_day' ? 'Half Day' :
                          todayWorkday?.attendanceType === 'leave' ? 'Leave' : '--'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="#888">Total Hours</Typography>
                    <Typography fontWeight={700}>{todayHours.toFixed(1)}h</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="#888">Productivity</Typography>
                    <Typography fontWeight={700}>
                      {todayWorkday?.attendanceType === 'leave' ? 'On Leave' :
                        todayWorkday?.standardHours > 0 ?
                          `${Math.round((todayHours / todayWorkday.standardHours) * 100)}%` : '--'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="#888">Status</Typography>
                    <Typography fontWeight={700} sx={{
                      color: todayWorkday ? (todayWorkday.clockOut ? '#888' : '#34A853') : '#888',
                      bgcolor: todayWorkday ? (todayWorkday.clockOut ? '#f3f6fa' : '#e3fbe3') : '#f0f0f0',
                      px: 2, borderRadius: 2, display: 'inline-block'
                    }}>
                      {todayWorkday ? (todayWorkday.clockOut ? 'inactive' : 'active') : 'no log'}
                    </Typography>
                    {leaves !== null && (
                      <Typography variant="caption" color="#e53935" sx={{ ml: 2, fontWeight: 700 }}>
                        Leaves: {leaves}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <Grid container spacing={3} alignItems="flex-start" sx={{ mt: 1 }}>
                <Grid item xs={12} md={3}>
                  <Typography fontWeight={700} sx={{ mb: 2 }}>Time Spent by Activity</Typography>
                  {(todayActivities || []).map((act, idx) => (
                    <Box key={act.title + idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, p: 1.5, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.95)' : '#fff' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                        <Typography fontWeight={600} sx={{ whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.title}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', minWidth: 60 }}>
                        <Typography fontWeight={700}>{(act.totalMinutes / 60).toFixed(1)}h</Typography>
                        <Typography variant="caption" color="#888">{todayHours > 0 ? Math.round((act.totalMinutes / (todayHours * 60)) * 100) : 0}%</Typography>
                      </Box>
                    </Box>
                  ))}
                </Grid>
                <Grid item xs={12} md={9}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: 'stretch',
                      width: '100%',
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        p: 1,
                        minWidth: { xs: 260, sm: 280 },
                        maxWidth: 500,
                        overflowX: 'auto',
                        mb: { xs: 2, sm: 0 },
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.95)' : '#fff',
                        borderRadius: 2,
                        boxShadow: 1,
                      }}
                    >
                      <Typography fontWeight={700} sx={{ mb: 2, textAlign: 'center', color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>Activity Distribution</Typography>
                      <ResponsiveContainer width="100%" height={300} minWidth={260}>
                        <PieChart>
                          <Pie
                            data={(todayActivities || []).filter(act => act.totalMinutes > 0)}
                            dataKey="totalMinutes"
                            nameKey="title"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={50}
                            labelLine={false}
                            label={renderCustomizedLabel}
                          >
                            {(todayActivities || []).filter(act => act.totalMinutes > 0).map((act) => {
                              const originalIndex = (todayActivities || []).findIndex(a => a.title === act.title)
                              return <Cell key={`cell-act-${act.title}`} fill={COLORS[originalIndex % COLORS.length]} />;
                            })}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.98)' : '#fff',
                              color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                              border: theme.palette.mode === 'dark' ? '1px solid #333' : undefined
                            }}
                            formatter={(value) => `${(value / 60).toFixed(2)} hours`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        p: 1,
                        minWidth: { xs: 260, sm: 280 },
                        maxWidth: 500,
                        overflowX: 'auto',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.95)' : '#fff',
                        borderRadius: 2,
                        boxShadow: 1,
                      }}
                    >
                      <Typography fontWeight={700} sx={{ mb: 2, textAlign: 'center', color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>Session Distribution</Typography>
                      <ResponsiveContainer width="100%" height={300} minWidth={260}>
                        <PieChart>
                          <Pie
                            data={(() => {
                              if (sessionDistributionData) {
                                return [
                                  { name: 'Offline Institute Session', value: sessionDistributionData.offlineInstitute || 0 },
                                  { name: 'Online Institute Session', value: sessionDistributionData.onlineInstitute || 0 },
                                  { name: 'School Session', value: sessionDistributionData.school || 0 },
                                ].filter(item => item.value > 0)
                              } else {
                                return [
                                  { name: 'Offline Institute Session', value: todaySessionCounts.offlineInstitute || 0 },
                                  { name: 'Online Institute Session', value: todaySessionCounts.onlineInstitute || 0 },
                                  { name: 'School Session', value: todaySessionCounts.school || 0 },
                                ].filter(item => item.value > 0)
                              }
                            })()}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={50}
                            label={false}
                          >
                            {(() => {
                              if (sessionDistributionData) {
                                return [
                                  { name: 'Offline Institute Session', value: sessionDistributionData.offlineInstitute || 0, color: '#00C49F' },
                                  { name: 'Online Institute Session', value: sessionDistributionData.onlineInstitute || 0, color: '#FF8042' },
                                  { name: 'School Session', value: sessionDistributionData.school || 0, color: '#0088FE' },
                                ].filter(item => item.value > 0).map((entry, index) => (
                                  <Cell key={`cell-session-${index}`} fill={entry.color} />
                                ))
                              } else {
                                return [
                                  { name: 'Offline Institute Session', value: todaySessionCounts.offlineInstitute || 0, color: '#00C49F' },
                                  { name: 'Online Institute Session', value: todaySessionCounts.onlineInstitute || 0, color: '#FF8042' },
                                  { name: 'School Session', value: todaySessionCounts.school || 0, color: '#0088FE' },
                                ].filter(item => item.value > 0).map((entry, index) => (
                                  <Cell key={`cell-session-${index}`} fill={entry.color} />
                                ))
                              }
                            })()}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                              color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                              border: theme.palette.mode === 'dark' ? '1px solid #333' : undefined
                            }}
                            formatter={value => `${value} sessions`}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={32}
                            formatter={value => (
                              <span style={{ color: theme.palette.mode === 'dark' ? '#fff' : '#222', fontWeight: 600, fontSize: 12 }}>{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ) : null}
        </Paper>
      </Collapse>
    </Box>
  )
})

const DepartmentCard = ({ dept }) => {
  const theme = useTheme()
  const [showAll, setShowAll] = useState(false)
  // Safely format numbers with fallback to 0
  const formatNumber = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(1)
    }
    return '0.0';
  };
  const hasMoreActivities = dept.topActivities.length > 1
  const displayActivities = showAll ? dept.topActivities : dept.topActivities.slice(0, 1)
  const isDark = theme.palette.mode === 'dark'

  return (
    <Paper elevation={0} sx={{
      p: 2,
      borderRadius: 2,
      width: '100%',
      boxSizing: 'border-box',
      height: 260,
      minHeight: 260,
      maxHeight: 260,
      display: 'flex',
      flexDirection: 'column',
      mb: 2,
      bgcolor: isDark ? 'rgba(35,39,47,0.95)' : '#fff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: dept.color || '#4285F4', mr: 1.5, flexShrink: 0 }} />
        <Typography fontWeight={700} fontSize={16} color={isDark ? '#F2F4F7' : '#101828'} sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dept.name}
        </Typography>
        <Typography variant="body2" sx={{ ml: 1.5, color: isDark ? '#94969C' : '#475467', whiteSpace: 'nowrap', fontWeight: 500, fontSize: '13px', flexShrink: 0 }}>
          {dept.employees} employees
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 4, mb: 2, flexShrink: 0 }}>
        <Box>
          <Typography variant="caption" sx={{ color: isDark ? '#94969C' : '#475467', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '11px' }}>
            Total Hours
          </Typography>
          <Typography fontWeight={700} fontSize={15} color={isDark ? '#F2F4F7' : '#101828'}>
            {formatNumber(dept.totalHours)}h
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: isDark ? '#94969C' : '#475467', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '11px' }}>
            Avg Productivity
          </Typography>
          <Typography fontWeight={700} fontSize={15} color={isDark ? '#F2F4F7' : '#101828'}>
            {formatNumber(dept.avgProductivity)}%
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography variant="caption" sx={{ color: isDark ? '#94969C' : '#475467', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '11px' }}>
          Productivity Score
        </Typography>
        <Box sx={{
          width: '100%',
          height: 8,
          bgcolor: isDark ? 'rgba(255,255,255,0.15)' : '#E4E7EC',
          borderRadius: 4,
          mt: 0.75,
          overflow: 'hidden'
        }}>
          <Box sx={{
            width: `${Math.min(Math.max(dept.avgProductivity || 0, 0), 100)}%`,
            height: '100%',
            bgcolor: dept.color || '#4285F4',
            borderRadius: 4,
            transition: 'width 0.3s ease',
            minWidth: dept.avgProductivity > 0 ? '2%' : '0%'
          }} />
        </Box>
      </Box>

      <Box sx={{ mt: 'auto', pt: 1, flexShrink: 0, minHeight: 0, overflow: 'hidden' }}>
        <Typography variant="caption" sx={{ color: isDark ? '#94969C' : '#475467', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '11px' }}>
          Top Activities
        </Typography>
        <Box sx={{ mt: 0.5, maxHeight: showAll ? 60 : 22, overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
          {displayActivities.map((act, i) => (
            <Typography key={i} variant="body2" sx={{
              color: isDark ? '#F2F4F7' : '#344054',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
              maxWidth: '100%'
            }}>
              {act}
            </Typography>
          ))}
          {showAll && displayActivities.length > 1 && (
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#4f6ef7' : '#1976d2',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'block',
                mt: 0.5,
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={(e) => { e.stopPropagation(); setShowAll(false); }}
            >
              Show Less
            </Typography>
          )}
        </Box>
        {!showAll && hasMoreActivities && (
          <Typography
            variant="caption"
            sx={{
              color: isDark ? '#4f6ef7' : '#1976d2',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'block',
              mt: 0.5,
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
          >
            View {dept.topActivities.length - 1} More
          </Typography>
        )}
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: isDark ? '#94969C' : '#475467', fontWeight: 500, fontSize: '12px' }}>
          Avg: {formatNumber(dept.avgHours)}/employee
        </Typography>
      </Box>
    </Paper>
  )
};

const getDayOfWeek = date => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(date).getDay()];
};

const CustomBarTooltip = ({ active, payload, label }) => {
  const theme = useTheme()
  if (!active || !payload || !payload.length) return null;
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'
      }}
    >
      <Typography variant="subtitle2" sx={{ color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>
            {p.name}: {p.value}h
          </Typography>
        </Box>
      ))}
    </Paper>
  )
};

const AddUserDialog = ({ open, onClose, departments, branches, onAdd, initialRole = 'employee' }) => {
  const theme = useTheme()
  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    email: '',
    role: initialRole,
    managerType: 'department', // Default to department manager
    departmentId: '',
    branchId: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, role: initialRole }))
    }
  }, [initialRole, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await axios.post(`${apiBaseUrl}/api/employees`, {
        ...formData
      }, { withCredentials: true })
      onAdd(response.data)
      onClose()
      setFormData({
        employeeCode: '',
        name: '',
        email: '',
        role: initialRole,
        managerType: 'department',
        departmentId: '',
        branchId: ''
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add user')
    } finally {
      setLoading(false)
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
          color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
          minWidth: { xs: '90%', sm: 400 }
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>{initialRole === 'manager' ? 'Add Manager' : 'Add Employee'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Employee Code"
            name="employeeCode"
            required
            value={formData.employeeCode}
            onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
              }
            }}
          />
          <TextField
            fullWidth
            label="Name"
            name="name"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
              }
            }}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
              }
            }}
          />
          <FormControl
            fullWidth
            required
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
              },
              '& .MuiSelect-select': {
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
              }
            }}
          >
            <InputLabel>Department</InputLabel>
            <Select name="departmentId" label="Department" value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
              {departments.map(dept => (
                <MenuItem key={dept.id ?? dept._id} value={dept.id ?? dept._id}>{dept.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            fullWidth
            required
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
              },
              '& .MuiSelect-select': {
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
              }
            }}
          >
            <InputLabel>Branch</InputLabel>
            <Select name="branchId" label="Branch" value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })}>
              {branches.map(branch => (
                <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            fullWidth
            required
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
              },
              '& .MuiSelect-select': {
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
              }
            }}
          >
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              label="Role"
              value={formData.role}
              onChange={e => setFormData({
                ...formData,
                role: e.target.value,
                managerType: e.target.value === 'manager' ? (formData.managerType || 'department') : ''
              })}
            >
              <MenuItem value="employee">Employee</MenuItem>
              <MenuItem value="teamlead">Team Lead</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="senior_manager">Senior Manager</MenuItem>
            </Select>
          </FormControl>

          {formData.role === 'manager' && (
            <FormControl
              fullWidth
              required
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
                },
                '& .MuiSelect-select': {
                  color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                }
              }}
            >
              <InputLabel>Manager Type</InputLabel>
              <Select
                name="managerType"
                label="Manager Type"
                value={formData.managerType}
                onChange={e => setFormData({ ...formData, managerType: e.target.value })}
              >
                <MenuItem value="department">Department Manager</MenuItem>
                <MenuItem value="branch">Branch Manager</MenuItem>
              </Select>
            </FormControl>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            Default password will be password123. A welcome email will ask the user to change it before using MIS.
          </Alert>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={onClose} fullWidth disabled={loading}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
              {loading ? <CircularProgress size={24} /> : (initialRole === 'manager' ? 'Add Manager' : 'Add Employee')}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
};

const DownloadExcelDialog = ({ open, onClose, items, itemLabel, itemKey, onDownload }) => {
  const [selectedId, setSelectedId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setSelectedId(''); setStartDate(''); setEndDate(''); setError('') }, [open])

  const handleDownload = async () => {
    setError('')
    if (!selectedId || !startDate || !endDate) {
      setError('Please select employee and date range.')
      return;
    }
    setDownloading(true)
    try {
      await onDownload(selectedId, startDate, endDate)
      onClose()
    } catch (err) {
      setError('Failed to download Excel.')
    } finally {
      setDownloading(false)
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Download Excel</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="excel-item-label">{itemLabel}</InputLabel>
          <Select
            labelId="excel-item-label"
            value={selectedId}
            label={itemLabel}
            onChange={e => setSelectedId(e.target.value)}
          >
            {items.map(item => {
              const key = item[itemKey] || item.id || item._id;
              return (
                <MenuItem key={key} value={key}>{item.name}</MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          sx={{ mb: 2 }}
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          fullWidth
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
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
  )
};

const DateRangeDownloadDialog = ({ open, onClose, defaultStart = '', defaultEnd = '', title = 'Select Date Range', confirmLabel = 'Download', onDownload }) => {
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStartDate(defaultStart || '')
    setEndDate(defaultEnd || '')
    setError('')
    setDownloading(false)
  }, [open, defaultStart, defaultEnd])

  const handleDownload = async () => {
    setError('')
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.')
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date.')
      return;
    }
    setDownloading(true)
    try {
      await onDownload(startDate, endDate)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to download.')
    } finally {
      setDownloading(false)
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          sx={{ mb: 2 }}
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          fullWidth
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<GetApp />}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
};

const DownloadSessionsDialog = ({ open, onClose, items, itemLabel, itemKey, defaultId, defaultStart, defaultEnd, onDownload }) => {
  const [selectedId, setSelectedId] = useState(defaultId || '')
  const [startDate, setStartDate] = useState(defaultStart || '')
  const [endDate, setEndDate] = useState(defaultEnd || '')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSelectedId(defaultId || '')
    setStartDate(defaultStart || '')
    setEndDate(defaultEnd || '')
    setError('')
  }, [open, defaultId, defaultStart, defaultEnd])

  const handleDownload = async () => {
    setError('')
    if (!selectedId || !startDate || !endDate) {
      setError('Please select employee and date range.')
      return;
    }
    setDownloading(true)
    try {
      await onDownload(selectedId, startDate, endDate)
      onClose()
    } catch (err) {
      setError('Failed to download Excel.')
    } finally {
      setDownloading(false)
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Download Sessions (Date Range)</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="sessions-employee-label">{itemLabel}</InputLabel>
          <Select
            labelId="sessions-employee-label"
            value={selectedId}
            label={itemLabel}
            onChange={e => setSelectedId(e.target.value)}
          >
            {items.map(item => {
              const key = item[itemKey] || item.id || item._id;
              return (
                <MenuItem key={key} value={key}>{item.name}</MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          sx={{ mb: 2 }}
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          fullWidth
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<GetApp />}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  )
};

const AddDepartmentDialog = ({ open, onClose, onCreated }) => {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [color, setColor] = useState('#4285F4')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setName(''); setCode(''); setDescription(''); setLocation(''); setColor('#4285F4'); setError('') } }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !location.trim()) { setError('Name and location are required'); return; }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${apiBaseUrl}/api/departments`, { name: name.trim(), code: code.trim() || undefined, description, location: location.trim(), color }, { withCredentials: true })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add department')
    } finally {
      setLoading(false)
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff', color: theme.palette.mode === 'dark' ? '#fff' : 'inherit' } }}
    >
      <DialogTitle>Add Department</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField label="Department Name" fullWidth required value={name} onChange={e => setName(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Department Code (optional)" fullWidth value={code} onChange={e => setCode(e.target.value)} sx={{ mb: 2 }} placeholder="e.g., HR, IT, FIN" />
          <TextField label="Location" fullWidth required value={location} onChange={e => setLocation(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Description (optional)" fullWidth multiline minRows={2} value={description} onChange={e => setDescription(e.target.value)} sx={{ mb: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mb: 1, display: 'block' }}>
              Department Color
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: color,
                  border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    background: 'transparent',
                    padding: 0,
                    opacity: 0
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#475467' }}>
                {color.toUpperCase()}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={onClose} fullWidth>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading} fullWidth>{loading ? 'Adding...' : 'Add Department'}</Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
};
const AdminDashboard = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [selectedTab, setSelectedTab] = useState(() => getInitialAdminTab(location.search))
  const [projectPage, setProjectPage] = useState(() => {
    const section = new URLSearchParams(location.search).get('section');
    return section && projectPageLabels[section] ? section : 'all projects';
  })
  const [analytics, setAnalytics] = useState(null)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [branches, setBranches] = useState([])
  const [activityTemplates, setActivityTemplates] = useState([])
  // Removed: activities state - was unused, data now comes from optimized endpoints
  const [search, setSearch] = useState('')
  const [headerSearch, setHeaderSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedEmployee, setExpandedEmployee] = useState(null)
  const [selectedDepartmentForLead, setSelectedDepartmentForLead] = useState('')
  const [selectedTeamLeadCode, setSelectedTeamLeadCode] = useState('')
  const [teamLeadEmployeeSearch, setTeamLeadEmployeeSearch] = useState('')
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [employeeAnalytics, setEmployeeAnalytics] = useState({})
  const [employeeLoading, setEmployeeLoading] = useState({})
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [reportData, setReportData] = useState([])
  const [reportError, setReportError] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [showNoActivityReport, setShowNoActivityReport] = useState(false)
  const [noActivityData, setNoActivityData] = useState([])
  const [employeesWithActivityToday, setEmployeesWithActivityToday] = useState([])
  const [employeeExcelDialogOpen, setEmployeeExcelDialogOpen] = useState(false)
  const [sessionsExcelDialogOpen, setSessionsExcelDialogOpen] = useState(false)
  const [departmentExcelDialogOpen, setDepartmentExcelDialogOpen] = useState(false)
  const [noActivityExcelDialogOpen, setNoActivityExcelDialogOpen] = useState(false)
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)
  const menuOpen = Boolean(menuAnchorEl)
  const [menuExpanded, setMenuExpanded] = useState(false)
  const [selectedEmployeeAnalytics, setSelectedEmployeeAnalytics] = useState(null)
  const [sessionDistribution, setSessionDistribution] = useState(null)
  const [loadingEmployee, setLoadingEmployee] = useState(false)
  const [errorSnackbar, setErrorSnackbar] = useState({ open: false, message: '' })
  const [holidays, setHolidays] = useState([])
  const [holidayDate, setHolidayDate] = useState(null)
  const [holidayReason, setHolidayReason] = useState('')
  const [holidayLoading, setHolidayLoading] = useState(false)
  const [showSessionsTable, setShowSessionsTable] = useState(false)
  const [sessionDistributionTable, setSessionDistributionTable] = useState(null)
  const [sessionDistributionDatewise, setSessionDistributionDatewise] = useState([])
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [addManagerOpen, setAddManagerOpen] = useState(false)
  const [addDepartmentOpen, setAddDepartmentOpen] = useState(false)
  const [displayedEmployeesCount, setDisplayedEmployeesCount] = useState(10)
  const EMPLOYEES_PER_PAGE = 10;
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [passwordFormData, setPasswordFormData] = useState({ employeeId: '', newPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false)
  const [editEmployeeData, setEditEmployeeData] = useState({ employeeId: '', name: '', email: '', departmentId: '', branchId: '', role: '', managerType: '' })
  const [editEmployeeError, setEditEmployeeError] = useState('')
  const [editEmployeeLoading, setEditEmployeeLoading] = useState(false)
  const [employeeMenuAnchor, setEmployeeMenuAnchor] = useState(null)
  const [selectedEmployeeForMenu, setSelectedEmployeeForMenu] = useState(null)
  const [deleteDepartmentOpen, setDeleteDepartmentOpen] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [deleteDepartmentLoading, setDeleteDepartmentLoading] = useState(false)
  const [deleteDepartmentError, setDeleteDepartmentError] = useState('')
  const [departmentMenuAnchor, setDepartmentMenuAnchor] = useState(null)
  const [selectedDepartmentForMenu, setSelectedDepartmentForMenu] = useState(null)
  const [editDepartmentOpen, setEditDepartmentOpen] = useState(false)
  const [editDepartmentData, setEditDepartmentData] = useState({ departmentId: '', name: '', code: '', description: '' })
  const [editDepartmentLoading, setEditDepartmentLoading] = useState(false)
  const [editDepartmentError, setEditDepartmentError] = useState('')
  const [manageEmployeesSearch, setManageEmployeesSearch] = useState('')
  const [displayedManageEmployeesCount, setDisplayedManageEmployeesCount] = useState(10)
  const MANAGE_EMPLOYEES_PER_PAGE = 10;
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateTitle, setTemplateTitle] = useState('')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [selectedDepartmentForTemplates, setSelectedDepartmentForTemplates] = useState('')
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState(null)
  const [selectedTemplateForMenu, setSelectedTemplateForMenu] = useState(null)

  const [schoolCatalog, setSchoolCatalog] = useState([])
  const [schoolCatalogLoading, setSchoolCatalogLoading] = useState(false)
  const [schoolCatalogError, setSchoolCatalogError] = useState('')
  const [schoolSessionStats, setSchoolSessionStats] = useState(null)
  const [schoolSessionStatsLoading, setSchoolSessionStatsLoading] = useState(false)
  const [schoolSessionStatsError, setSchoolSessionStatsError] = useState('')
  const [schoolSessionStartDate, setSchoolSessionStartDate] = useState('')
  const [schoolSessionEndDate, setSchoolSessionEndDate] = useState('')
  const [schoolSessionSchoolFilter, setSchoolSessionSchoolFilter] = useState('')
  const [schoolSessionEmployeeFilter, setSchoolSessionEmployeeFilter] = useState('')
  const [schoolSessionFilterError, setSchoolSessionFilterError] = useState('')
  const [schoolSessionAppliedRange, setSchoolSessionAppliedRange] = useState(null)
  const [schoolSessionHasFetched, setSchoolSessionHasFetched] = useState(false)
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)
  const [schoolMenuAnchor, setSchoolMenuAnchor] = useState(null)
  const [selectedSchoolForMenu, setSelectedSchoolForMenu] = useState(null)
  const [schoolNameInput, setSchoolNameInput] = useState('')
  const [schoolDialogError, setSchoolDialogError] = useState('')
  const [schoolSaving, setSchoolSaving] = useState(false)
  const [deleteSchoolConfirm, setDeleteSchoolConfirm] = useState({ open: false, school: null })
  const [deleteSchoolLoading, setDeleteSchoolLoading] = useState(false)

  // Tools assignment state - now department-based (keyed by departmentId)
  const [toolAssignments, setToolAssignments] = useState({})
  const [toolAssignmentsLoading, setToolAssignmentsLoading] = useState(false)
  const [toolAssignmentsSearch, setToolAssignmentsSearch] = useState('')
  const [selectedDeptForTools, setSelectedDeptForTools] = useState('')

  // Trainer occupancy state
  const [selectedTrainerForOccupancy, setSelectedTrainerForOccupancy] = useState('')
  const [occupancyWeekStart, setOccupancyWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  })
  const [trainerOccupancy, setTrainerOccupancy] = useState({}) // { 'YYYY-MM-DD': schoolId }
  const [occupancyLoading, setOccupancyLoading] = useState(false)
  const [occupancySaving, setOccupancySaving] = useState(false)
  const [occupancyEmployeeSearch, setOccupancyEmployeeSearch] = useState('')
  const [occupancyDepartmentFilter, setOccupancyDepartmentFilter] = useState('all')
  const [occupancyBranchFilter, setOccupancyBranchFilter] = useState('all')

  const adminOccupancyTrainers = useMemo(() => employees.filter(employee => employee.role === 'employee'), [employees])
  const adminOccupancyDepartments = useMemo(() => [...new Set(adminOccupancyTrainers.map(employee => typeof employee.department === 'string' ? employee.department : employee.department?.name).filter(Boolean))].sort(), [adminOccupancyTrainers])
  const adminOccupancyBranches = useMemo(() => [...new Set(adminOccupancyTrainers.map(employee => typeof employee.branch === 'string' ? employee.branch : employee.branch?.name).filter(Boolean))].sort(), [adminOccupancyTrainers])
  const filteredAdminOccupancyTrainers = useMemo(() => {
    const query = occupancyEmployeeSearch.trim().toLowerCase()
    return adminOccupancyTrainers.filter(employee => {
      const department = typeof employee.department === 'string' ? employee.department : employee.department?.name || ''
      const branch = typeof employee.branch === 'string' ? employee.branch : employee.branch?.name || ''
      const matchesSearch = !query || `${employee.name || ''} ${employee.employeeCode || employee._id || ''}`.toLowerCase().includes(query)
      return matchesSearch && (occupancyDepartmentFilter === 'all' || department === occupancyDepartmentFilter) && (occupancyBranchFilter === 'all' || branch === occupancyBranchFilter)
    })
  }, [adminOccupancyTrainers, occupancyEmployeeSearch, occupancyDepartmentFilter, occupancyBranchFilter])
  const [availableWeeks, setAvailableWeeks] = useState([])
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  })

  // Calendar state for Overview tab
  const [calendarEmployee, setCalendarEmployee] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [employeeCalendarData, setEmployeeCalendarData] = useState({}) // { 'YYYY-MM-DD': { schoolId, schoolName } }

  // Time formatting function to match other dashboards
  const formatTime = (value) => {
    if (!value) return '--';

    let dateValue = null;

    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'number') {
      dateValue = new Date(value)
    } else if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return '--';

      if (trimmed.includes('T') || trimmed.includes('Z')) {
        dateValue = new Date(trimmed)
      } else if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
        const [hours, minutes] = trimmed.split(':').map(Number)
        const base = new Date() // Use current date as base for Admin Dashboard
        dateValue = new Date(base)
        dateValue.setHours(hours, minutes, 0, 0)
      } else {
        const parsed = new Date(trimmed)
        if (!Number.isNaN(parsed.getTime())) {
          dateValue = parsed;
        }
      }
    }

    if (!dateValue || Number.isNaN(dateValue.getTime())) {
      return '--';
    }

    return dateValue.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  };

  // Memoize filtered employees for better performance
  const filteredManageEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(manageEmployeesSearch.toLowerCase())
    )
  }, [employees, manageEmployeesSearch])

  // Memoize displayed employees with pagination
  const displayedManageEmployees = useMemo(() => {
    return filteredManageEmployees.slice(0, displayedManageEmployeesCount)
  }, [filteredManageEmployees, displayedManageEmployeesCount])

  // Reset displayed count when search changes
  useEffect(() => {
    setDisplayedManageEmployeesCount(MANAGE_EMPLOYEES_PER_PAGE)
  }, [manageEmployeesSearch])

  const loadMoreManageEmployees = useCallback(() => {
    setDisplayedManageEmployeesCount(prev => prev + MANAGE_EMPLOYEES_PER_PAGE)
  }, [])

  const templatesDepartmentsForSelectedBranch = useMemo(() => departments, [departments])

  const fetchActivityTemplatesAdmin = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedDepartmentForTemplates) {
        params.append('departmentId', selectedDepartmentForTemplates)
      }

      const url = `${apiBaseUrl}/api/activities/templates/admin${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await axios.get(url, { withCredentials: true })
      setActivityTemplates(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setActivityTemplates([])
    }
  }, [apiBaseUrl, selectedDepartmentForTemplates])

  const fetchToolAssignments = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/admin/tool-assignments`, { withCredentials: true })
      setToolAssignments(res.data)
    } catch (err) {
      // Error handled silently
    }
  }, [apiBaseUrl])

  useEffect(() => {
    if (selectedTab === 7) {
      fetchActivityTemplatesAdmin()
    }
  }, [selectedTab, fetchActivityTemplatesAdmin])

  useEffect(() => {
    if (selectedTab === 10) {
      fetchToolAssignments()
    }
  }, [selectedTab, fetchToolAssignments])

  useEffect(() => {
    if (selectedTab === 7) {
      fetchActivityTemplatesAdmin()

    }
  }, [selectedDepartmentForTemplates, selectedTab, fetchActivityTemplatesAdmin])

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateTitle('')
    setTemplateDialogOpen(true)
  };

  const handleOpenEditTemplate = (template) => {
    if (!template) return;
    setEditingTemplate(template)
    setTemplateTitle(template.title || '')
    setTemplateDialogOpen(true)
  };

  const handleSaveTemplateAdmin = async () => {
    try {
      const trimmedTitle = templateTitle.trim()
      if (!trimmedTitle) {
        setSnackbar({ open: true, message: 'Template title is required', severity: 'error' })
        return;
      }

      if (!editingTemplate && !selectedDepartmentForTemplates) {
        setSnackbar({ open: true, message: 'Please select a department to add a template', severity: 'error' })
        return;
      }

      if (editingTemplate) {
        await axios.put(
          `${apiBaseUrl}/api/activities/templates/admin/${editingTemplate.id || editingTemplate._id}`,
          { title: trimmedTitle },
          { withCredentials: true }
        )
        setSnackbar({ open: true, message: 'Template updated successfully!', severity: 'success' })
      } else {
        await axios.post(
          `${apiBaseUrl}/api/activities/templates/admin`,
          { title: trimmedTitle, departmentId: selectedDepartmentForTemplates },
          { withCredentials: true }
        )
        setSnackbar({ open: true, message: 'Template created successfully!', severity: 'success' })
      }

      setTemplateDialogOpen(false)
      setTemplateTitle('')
      setEditingTemplate(null)
      fetchActivityTemplatesAdmin()
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || 'Failed to save template',
        severity: 'error'
      })
    }
  };

  const handleDeleteTemplateAdmin = async (templateId) => {
    try {
      if (!templateId) return;
      await axios.delete(`${apiBaseUrl}/api/activities/templates/admin/${templateId}`, { withCredentials: true })
      setSnackbar({ open: true, message: 'Template deleted successfully!', severity: 'success' })
      fetchActivityTemplatesAdmin()
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.response?.data?.error || 'Failed to delete template',
        severity: 'error'
      })
    }
  };

  const fetchSchoolCatalog = useCallback(async () => {
    setSchoolCatalogLoading(true)
    setSchoolCatalogError('')
    try {
      const res = await axios.get(`${apiBaseUrl}/api/catalog/schools`, { withCredentials: true })
      setSchoolCatalog(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setSchoolCatalogError(err.response?.data?.error || 'Failed to load school catalog')
      setSchoolCatalog([])
    } finally {
      setSchoolCatalogLoading(false)
    }
  }, [apiBaseUrl])

  const fetchSchoolSessionStats = useCallback(async (rangeOverride = undefined) => {
    setSchoolSessionStatsLoading(true)
    setSchoolSessionStatsError('')
    try {
      const params = new URLSearchParams()
      const rangeToUse = rangeOverride === undefined ? schoolSessionAppliedRange : rangeOverride
      if (rangeToUse?.start) {
        params.append('startDate', rangeToUse.start)
      }
      if (rangeToUse?.end) {
        params.append('endDate', rangeToUse.end)
      }
      if (rangeToUse?.schoolId) {
        params.append('schoolId', rangeToUse.schoolId)
      } else if (rangeToUse?.schoolName) {
        params.append('schoolName', rangeToUse.schoolName)
      }
      if (rangeToUse?.employeeId) {
        params.append('employeeId', rangeToUse.employeeId)
      } else if (rangeToUse?.employeeName) {
        params.append('employeeName', rangeToUse.employeeName)
      }

      const res = await axios.get(
        `${apiBaseUrl}/api/catalog/schools/session-stats${params.toString() ? `?${params.toString()}` : ''}`,
        { withCredentials: true }
      )
      setSchoolSessionStats(res.data || { totalSessions: 0, schools: [] })
      setSchoolSessionHasFetched(true)
    } catch (err) {
      setSchoolSessionStatsError(err.response?.data?.error || 'Failed to load school session stats')
      setSchoolSessionStats(null)
    } finally {
      setSchoolSessionStatsLoading(false)
    }
  }, [apiBaseUrl, schoolSessionAppliedRange])

  const refreshSchoolCatalogData = useCallback(
    async (rangeOverride = undefined, forceStats = false) => {
      const requests = [fetchSchoolCatalog()]
      if (forceStats || schoolSessionHasFetched || rangeOverride !== undefined) {
        requests.push(fetchSchoolSessionStats(rangeOverride))
      }
      await Promise.allSettled(requests)
    },
    [fetchSchoolCatalog, fetchSchoolSessionStats, schoolSessionHasFetched]
  )

  const handleApplySchoolSessionFilter = useCallback(() => {
    if (
      !schoolSessionStartDate &&
      !schoolSessionEndDate &&
      !schoolSessionSchoolFilter &&
      !schoolSessionEmployeeFilter
    ) {
      setSchoolSessionFilterError('Select at least one filter before applying.')
      return;
    }

    if (schoolSessionStartDate && schoolSessionEndDate && schoolSessionStartDate > schoolSessionEndDate) {
      setSchoolSessionFilterError('Start date cannot be after end date.')
      return;
    }

    setSchoolSessionFilterError('')
    const selectedSchool = schoolCatalog.find(
      (school) => String(school.id ?? school._id) === String(schoolSessionSchoolFilter)
    )
    const derivedSchoolId = selectedSchool?.id ?? null
    const selectedEmployee = employees.find(
      (emp) => String(emp.employeeCode ?? emp._id) === String(schoolSessionEmployeeFilter)
    )
    const derivedEmployeeId = selectedEmployee?.employeeCode ?? selectedEmployee?._id ?? null

    const rangeToApply = {
      start: schoolSessionStartDate || null,
      end: schoolSessionEndDate || null,
      schoolId: derivedSchoolId,
      schoolName: selectedSchool ? selectedSchool.name : schoolSessionSchoolFilter || null,
      employeeId: derivedEmployeeId || null,
      employeeName: selectedEmployee ? selectedEmployee.name : null
    }
    setSchoolSessionAppliedRange(rangeToApply)
    fetchSchoolSessionStats(rangeToApply)
  }, [
    schoolSessionStartDate,
    schoolSessionEndDate,
    schoolSessionSchoolFilter,
    schoolSessionEmployeeFilter,
    schoolCatalog,
    employees,
    fetchSchoolSessionStats
  ])

  const handleResetSchoolSessionFilter = useCallback(() => {
    setSchoolSessionStartDate('')
    setSchoolSessionEndDate('')
    setSchoolSessionSchoolFilter('')
    setSchoolSessionEmployeeFilter('')
    setSchoolSessionFilterError('')
    setSchoolSessionAppliedRange(null)
    fetchSchoolSessionStats(null)
  }, [fetchSchoolSessionStats])

  useEffect(() => {
    if (selectedTab === 3 || selectedTab === 8 || selectedTab === 9) {
      fetchSchoolCatalog()
    }
    if (selectedTab === 8 && schoolSessionHasFetched && schoolSessionAppliedRange) {
      fetchSchoolSessionStats()
    }
  }, [
    selectedTab,
    fetchSchoolCatalog,
    fetchSchoolSessionStats,
    schoolSessionHasFetched,
    schoolSessionAppliedRange
  ])

  const handleOpenSchoolDialog = (school = null) => {
    setEditingSchool(school)
    setSchoolNameInput(school ? school.name : '')
    setSchoolDialogError('')
    setSchoolDialogOpen(true)
  };

  const handleCloseSchoolDialog = () => {
    setSchoolDialogOpen(false)
    setEditingSchool(null)
    setSchoolNameInput('')
    setSchoolDialogError('')
  };

  const handleSaveSchool = async () => {
    const trimmedName = schoolNameInput.trim()
    if (!trimmedName) {
      setSchoolDialogError('School name is required')
      return;
    }

    setSchoolSaving(true)
    setSchoolDialogError('')
    try {
      if (editingSchool) {
        await axios.put(
          `${apiBaseUrl}/api/catalog/schools/${editingSchool.id || editingSchool._id}`,
          { name: trimmedName },
          { withCredentials: true }
        )
        setSnackbar({ open: true, message: 'School updated successfully!', severity: 'success' })
      } else {
        await axios.post(
          `${apiBaseUrl}/api/catalog/schools`,
          { name: trimmedName },
          { withCredentials: true }
        )
        setSnackbar({ open: true, message: 'School added successfully!', severity: 'success' })
      }
      handleCloseSchoolDialog()
      fetchSchoolCatalog()
    } catch (err) {
      setSchoolDialogError(err.response?.data?.error || 'Failed to save school')
    } finally {
      setSchoolSaving(false)
    }
  };

  const handleConfirmDeleteSchool = (school) => {
    setDeleteSchoolConfirm({ open: true, school })
  };

  const handleDeleteSchool = async () => {
    if (!deleteSchoolConfirm.school) return;

    setDeleteSchoolLoading(true)
    try {
      await axios.delete(
        `${apiBaseUrl}/api/catalog/schools/${deleteSchoolConfirm.school.id || deleteSchoolConfirm.school._id}`,
        { withCredentials: true }
      )
      setSnackbar({ open: true, message: 'School deleted successfully!', severity: 'success' })
      setDeleteSchoolConfirm({ open: false, school: null })
      fetchSchoolCatalog()
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete school', severity: 'error' })
    } finally {
      setDeleteSchoolLoading(false)
    }
  };

  useEffect(() => {
    fetchData()
    fetchEmployeesWithActivityToday()
  }, [])

  // REMOVED: Bulk analytics fetching on mount - now lazy-loaded when expanding employee cards
  // This was causing 200+ concurrent API calls and slow initial load
  // Analytics are now fetched on-demand in handleExpandEmployee

  const getCurrentWeekDays = () => {
    // Get current date
    const today = new Date()
    // Find Monday of the current week
    const first = today.getDate() - today.getDay() + 1; // Monday
    // If today is Sunday, move to previous Monday
    const monday = new Date(today.setDate(first))
    // Build array for Mon-Sat
    const days = [];
    for (let i = 0; i < 6; i++) { // 0: Mon, 5: Sat
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push({
        date: d,
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]
      })
    }
    return days;
  };

  const fetchData = async () => {
    setLoading(true)
    const startTime = performance.now()

    // Removed /api/activities call - now using optimized endpoints
    const [analyticsRes, branchesRes, deptsRes, empsRes, weeklyRes, schoolsRes] = await Promise.all([
      axios.get(`${apiBaseUrl}/api/analytics`, { withCredentials: true }),
      axios.get(`${apiBaseUrl}/api/branches`, { withCredentials: true }),
      axios.get(`${apiBaseUrl}/api/branches/departments`, { withCredentials: true }),
      axios.get(`${apiBaseUrl}/api/employees`, { withCredentials: true }),
      axios.get(`${apiBaseUrl}/api/analytics/weekly-summary`, { withCredentials: true }),
      axios.get(`${apiBaseUrl}/api/catalog/schools`, { withCredentials: true }),
    ])

    const endTime = performance.now()

    setAnalytics(analyticsRes.data)
    setBranches(branchesRes.data)
    // Sort departments alphabetically by name
    setDepartments(deptsRes.data.sort((a, b) => a.name.localeCompare(b.name)))
    // Sort employees alphabetically by name
    setEmployees(empsRes.data.map(emp => normalizeEmployeeForAdmin(emp, deptsRes.data)).sort((a, b) => a.name.localeCompare(b.name)))
    // Use server-calculated weekly data instead of processing all activities client-side
    setWeeklyData(weeklyRes.data)
    setLoading(false)
  };

  const fetchEmployeesWithActivityToday = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/manager/employees/with-activity-today`, { withCredentials: true })
      setEmployeesWithActivityToday(res.data)
    } catch (error) {
      setEmployeesWithActivityToday([])
    }
  };

  const teamLeads = useMemo(() => employees.filter(emp => emp.role === 'teamlead'), [employees])
  const normalizeEmployeeForAdmin = (employee, departmentList = departments) => {
    const matchedDepartment = departmentList.find(dept => String(dept.id ?? dept._id) === String(employee.departmentId || ''))
    const departmentName = employee.department?.name || employee.departmentName || matchedDepartment?.name || (typeof employee.department === 'string' ? employee.department : '') || 'Unknown'
    return {
      ...employee,
      _id: employee.employeeCode || employee._id || employee.id,
      initials: employee.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '',
      department: departmentName,
    }
  }
  const teamLeadsByDepartment = useMemo(() => {
    return departments.reduce((map, dept) => {
      map[dept.id] = teamLeads.filter(lead => String(lead.departmentId) === String(dept.id))
      return map
    }, {})
  }, [departments, teamLeads])

  const updateEmployeeTeamLead = async (employee, newTeamLeadId) => {
    setAssignmentError('')
    setAssignmentLoading(true)
    try {
      const payload = {
        name: employee.name,
        email: employee.email,
        departmentId: employee.departmentId,
        branchId: employee.branchId,
        role: 'employee',
        teamLeadId: newTeamLeadId || null
      }
      await axios.put(`${apiBaseUrl}/api/employees/${employee.employeeCode}`, payload, { withCredentials: true })
      setSnackbar({ open: true, message: newTeamLeadId ? 'Employee assigned to team lead.' : 'Employee removed from team lead.', severity: 'success' })
      await fetchData()
    } catch (err) {
      setAssignmentError(err.response?.data?.error || 'Failed to update team lead assignment')
    } finally {
      setAssignmentLoading(false)
    }
  }

  // Pie chart data from analytics.departmentStats
  const pieData = analytics && analytics.departmentStats ? analytics.departmentStats.map(dept => ({
    name: dept.name,
    value: dept.totalHours || 0,
  })) : [];

  // Department cards from analytics.departmentStats
  const departmentCards = analytics && analytics.departmentStats ? analytics.departmentStats.map(dept => {
    // Find matching department to get stored color
    const deptData = departments.find(d => d.name === dept.name);
    return {
      name: dept.name,
      employees: employees.filter(e => e.department === dept.name).length,
      totalHours: dept.totalHours,
      avgProductivity: dept.productivityScore || dept.completionRate || 0,
      topActivities: dept.topActivity && dept.topActivity !== 'N/A' ? [dept.topActivity] : ['N/A'],
      avgHours: (typeof dept.avgHours === 'number' && !isNaN(dept.avgHours)) ? dept.avgHours : (parseFloat(dept.avgHours) || 0.0),
      offlineInstitute: dept.offlineInstitute || 0,
      onlineInstitute: dept.onlineInstitute || 0,
      school: dept.school || 0,
      color: deptData?.color || '#4285F4',
    };
  }) : [];

  // Bar chart: weeklyData (remains as is, but only for the three departments)
  // ... keep as is ...

  // Line chart: productivity trend (use real analytics data if available)
  const lineData = analytics && analytics.departmentProductivityTrend ? analytics.departmentProductivityTrend : [];

  // Employee cards from analytics.employeeDepartmentStats
  const employeeStats = analytics && analytics.employeeDepartmentStats ? analytics.employeeDepartmentStats.map(emp => {
    // Find the department with the most hours for this employee
    let mainDept = 'Unknown';
    let maxHours = 0;
    let hours = 0;
    let productivity = 0;
    Object.entries(emp.departments).forEach(([dept, stats]) => {
      if (stats.hours > maxHours) {
        mainDept = dept;
        maxHours = stats.hours;
        hours = stats.hours;
        productivity = stats.completed && stats.hours ? Math.round((stats.completed / stats.hours) * 100) : 0;
      }
    })
    // Find the matching employee in the employees array to get the _id
    const empObj = employees.find(e => e.name === emp.name)
    return {
      _id: empObj?._id,
      name: emp.name,
      initials: emp.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      department: empObj?.department?.name || mainDept,
      totalHours: hours ? hours.toFixed(1) : '0',
      productivity,
    };
  }) : [];

  // Department filter options (only Coding, Mechatronics, Electronics)
  const departmentOptions = ['Coding', 'Mechatronics', 'Electronics'];

  // Memoized employees list with "All Employees" option for downloads
  const employeesWithAllOption = useMemo(() => [
    { _id: ALL_EMPLOYEES_ID, name: 'All Employees' },
    ...employees
  ], [employees])

  const trainerSessionRows = useMemo(() => {
    return Array.isArray(schoolSessionStats?.trainers) ? schoolSessionStats.trainers : []
  }, [schoolSessionStats])

  const trainerSessionTotal = useMemo(() => {
    return trainerSessionRows.reduce((sum, trainer) => sum + (trainer.sessionCount || 0), 0)
  }, [trainerSessionRows])

  const schoolSessionRangeLabel = useMemo(() => {
    if (
      !schoolSessionAppliedRange?.start &&
      !schoolSessionAppliedRange?.end &&
      !schoolSessionAppliedRange?.schoolName &&
      !schoolSessionAppliedRange?.employeeName
    ) {
      return 'All time • All schools • All employees'
    }
    const startLabel = schoolSessionAppliedRange?.start || 'Beginning'
    const endLabel = schoolSessionAppliedRange?.end || 'Present'
    const schoolLabel = schoolSessionAppliedRange?.schoolName || 'All schools'
    const employeeLabel = schoolSessionAppliedRange?.employeeName || 'All employees'
    return `${startLabel} → ${endLabel} • ${schoolLabel} • ${employeeLabel}`
  }, [schoolSessionAppliedRange])

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      (deptFilter === 'All' || (emp.department && (emp.department.name || emp.department) === deptFilter)) &&
      emp.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [employees, search, deptFilter])

  // Reset displayed count when filters change or when switching to Employees tab
  useEffect(() => {
    setDisplayedEmployeesCount(EMPLOYEES_PER_PAGE)
  }, [search, deptFilter, selectedTab])

  const displayedEmployees = useMemo(() => {
    return filteredEmployees.slice(0, displayedEmployeesCount)
  }, [filteredEmployees, displayedEmployeesCount])

  const loadMoreEmployees = useCallback(() => {
    setDisplayedEmployeesCount(prev => prev + EMPLOYEES_PER_PAGE)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  };

  const handleExpandEmployee = useCallback(async (empId) => {
    const isExpanding = expandedEmployee !== empId;
    setExpandedEmployee(prev => (prev === empId ? null : empId));

    if (isExpanding) {
      // Check if we already have cached analytics for this employee
      if (employeeAnalytics[empId]) {
        setSelectedEmployeeAnalytics(employeeAnalytics[empId]);
        return;
      }

      setLoadingEmployee(true);
      try {
        const emp = employees.find(e => (e._id || e.id) === empId);
        if (emp && emp.role && emp.role !== 'employee') {
          setSelectedEmployeeAnalytics(null);
          setSessionDistribution(null);
          setLoadingEmployee(false);
          return;
        }
        const analyticsRes = await axios.get(`${apiBaseUrl}/api/manager/employee/${empId}/analytics?today=true`, { withCredentials: true });

        // Cache the analytics data
        setEmployeeAnalytics(prev => ({ ...prev, [empId]: analyticsRes.data }));
        setSelectedEmployeeAnalytics(analyticsRes.data);
        setSessionDistribution(null);
      } catch (err) {
        setErrorSnackbar({ open: true, message: 'Failed to load employee data.' });
        setSelectedEmployeeAnalytics(null);
        setSessionDistribution(null);
      } finally {
        setLoadingEmployee(false);
      }
    }
  }, [expandedEmployee, employees, employeeAnalytics])

  const handleAddUser = (newUser) => {
    const normalized = normalizeEmployeeForAdmin(newUser)
    setEmployees(prev => [...prev, normalized])
    setSnackbar({ open: true, message: 'User added successfully!', severity: 'success' })
  };

  const handleShowReport = async () => {
    setLoadingReport(true)
    setReportError('')
    try {
      const res = await axios.get(`${apiBaseUrl}/api/manager/employee/${selectedEmployee}/activities-by-date?startDate=${selectedStartDate}&endDate=${selectedEndDate}`, { withCredentials: true })
      setReportData(res.data)
    } catch (err) {
      setReportError(err.response?.data?.error || 'Failed to load report')
    } finally {
      setLoadingReport(false)
    }
  };

  const handleShowNoActivityReport = async () => {
    setLoadingReport(true)
    setReportError('')
    setShowNoActivityReport(true)
    setShowSessionsTable(false)
    try {
      const res = await axios.get(`${apiBaseUrl}/api/manager/employees/no-activity-report?startDate=${selectedStartDate}&endDate=${selectedEndDate}`, { withCredentials: true })
      setNoActivityData(res.data)
    } catch (err) {
      setReportError(err.response?.data?.error || 'Failed to load no activity report')
    } finally {
      setLoadingReport(false)
    }
  };

  const handleDownloadEmployeeSessionsExcel = async (employeeId, startDate, endDate) => {
    if (employeeId === ALL_EMPLOYEES_ID) {
      // Download all employees sessions
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employees/sessions-excel?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob', withCredentials: true }
      )
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url;
      link.setAttribute('download', `all_employees_sessions_${startDate}_to_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } else {
      // Download individual employee sessions
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employee/${employeeId}/sessions-excel?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob', withCredentials: true }
      )
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url;
      link.setAttribute('download', `employee_sessions_${startDate}_to_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }
  };

  const handleDownloadEmployeeExcel = async (employeeId, startDate, endDate) => {
    if (employeeId === ALL_EMPLOYEES_ID) {
      // Download all employees activities
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employees/activities-excel?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob', withCredentials: true }
      )
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url;
      link.setAttribute('download', `all_employees_activities_${startDate}_to_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } else {
      // Download individual employee activities
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employee/${employeeId}/activities-excel?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob', withCredentials: true }
      )
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url;
      link.setAttribute('download', `employee_activities_${startDate}_to_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }
  };

  const handleDownloadDepartmentExcel = async (departmentId, startDate, endDate) => {
    const res = await axios.get(
      `${apiBaseUrl}/api/manager/department/${departmentId}/activities-excel?startDate=${startDate}&endDate=${endDate}`,
      { responseType: 'blob', withCredentials: true }
    )
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url;
    link.setAttribute('download', `department_activities_${startDate}_to_${endDate}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  };

  const handleDownloadNoActivityExcel = async (startDate, endDate) => {
    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employees/no-activity-report-excel?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob', withCredentials: true }
      )
      const url = window.URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `no_activity_employees_${startDate}_to_${endDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        const responseText = await error.response.data.text()
        let payload = {}
        try {
          payload = JSON.parse(responseText)
        } catch {
          payload = {}
        }
        throw new Error(payload.error || payload.details || 'Failed to download no activity report')
      }
      throw error
    }
  };

  const handleDepartmentCreated = async () => {
    // Re-fetch to reflect new department across tabs
    await fetchData()
    setSnackbar({ open: true, message: 'Department added!', severity: 'success' })
  };

  // Fetch holidays
  const fetchHolidays = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/holidays`, { withCredentials: true })
      setHolidays(res.data)
    } catch (err) {
      setHolidays([])
    }
  };
  useEffect(() => { fetchHolidays() }, [])

  const handleAddHoliday = async () => {
    if (!holidayDate) return;
    setHolidayLoading(true)
    try {
      await axios.post(`${apiBaseUrl}/api/holidays`, {
        date: holidayDate,
        reason: holidayReason
      }, { withCredentials: true })
      setHolidayDate(null)
      setHolidayReason('')
      fetchHolidays()
      setSnackbar({ open: true, message: 'Holiday added!', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to add holiday', severity: 'error' })
    }
    setHolidayLoading(false)
  };
  const handleDeleteHoliday = async (id) => {
    setHolidayLoading(true)
    try {
      await axios.delete(`${apiBaseUrl}/api/holidays/${id}`, { withCredentials: true })
      fetchHolidays()
      setSnackbar({ open: true, message: 'Holiday removed!', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to remove holiday', severity: 'error' })
    }
    setHolidayLoading(false)
  };

  const handleShowSessions = async () => {
    setShowSessionsTable(true)
    setLoadingReport(true)
    try {
      // Fetch activities-by-date and compute date-wise session distribution locally
      const res = await axios.get(
        `${apiBaseUrl}/api/manager/employee/${selectedEmployee}/activities-by-date?startDate=${selectedStartDate}&endDate=${selectedEndDate}`,
        { withCredentials: true }
      )
      const rowsMap = new Map()
        ; (res.data || [])
          .filter(act => act.title?.toLowerCase().includes('session') || act.sessionType || act.isSessionActivity)
          .forEach(act => {
            // Get session counts from various possible field names
            const instituteCount = Number(act.institute || act.instituteCount || act.instituteSessions || act.institute_session || act.sessions || 0)
            const schoolCount = Number(act.school || act.schoolCount || act.schoolSessions || act.school_session || 0)
            const sessionType = act.sessionType || (act.title?.toLowerCase().includes('institute') ? 'Offline' : 'Online')

            // If activity has timeEntries, use those; otherwise use activity's own date
            const timeEntries = act.timeEntries?.length > 0 ? act.timeEntries : [{ date: act.date || act.workDate || act.createdAt }];

            timeEntries.forEach(te => {
              const rawDate = te.date || act.date || act.workDate || act.createdAt;
              let dateKey = 'Unknown';
              try {
                if (rawDate) {
                  dateKey = new Date(rawDate).toISOString().slice(0, 10);
                }
              } catch (e) { /* Invalid date - skip */ }

              const prev = rowsMap.get(dateKey) || { date: dateKey, offlineInstitute: 0, onlineInstitute: 0, school: 0 };

              if (sessionType === 'Offline' && instituteCount > 0) prev.offlineInstitute += instituteCount;
              if (sessionType === 'Online' && instituteCount > 0) prev.onlineInstitute += instituteCount;
              if (schoolCount > 0) prev.school += schoolCount;

              rowsMap.set(dateKey, prev)
            })
          })
      const rows = Array.from(rowsMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      setSessionDistributionDatewise(rows)
    } catch (err) {
      setSessionDistributionDatewise([])
    } finally {
      setLoadingReport(false)
    }
  };

  const handleEditEmployee = (employee) => {
    setEditEmployeeData({
      employeeId: employee._id || employee.id,
      name: employee.name,
      email: employee.email,
      departmentId: employee.department?.id || employee.departmentId || '',
      branchId: employee.branch?.id || employee.branchId || '',
      role: employee.role || 'employee',
      managerType: employee.managerType || ''
    })
    setEditEmployeeOpen(true)
  };

  const handleUpdateEmployee = async () => {
    setEditEmployeeError('')
    setEditEmployeeLoading(true)
    try {
      const response = await axios.put(
        `${apiBaseUrl}/api/employees/${editEmployeeData.employeeId}`,
        {
          name: editEmployeeData.name,
          email: editEmployeeData.email,
          departmentId: editEmployeeData.departmentId,
          branchId: editEmployeeData.branchId,
          role: editEmployeeData.role,
          managerType: editEmployeeData.managerType
        },
        { withCredentials: true }
      )

      // Update employees list
      setEmployees(prev => prev.map(emp =>
        (emp._id || emp.id) === editEmployeeData.employeeId
          ? normalizeEmployeeForAdmin({ ...emp, ...response.data })
          : emp
      ))

      setSnackbar({ open: true, message: 'Employee updated successfully!', severity: 'success' })
      setEditEmployeeOpen(false)
      setEditEmployeeData({ employeeId: '', name: '', email: '', departmentId: '', branchId: '', role: '', managerType: '' })
    } catch (err) {
      setEditEmployeeError(err.response?.data?.error || 'Failed to update employee')
    } finally {
      setEditEmployeeLoading(false)
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${apiBaseUrl}/api/employees/${employeeId}`, { withCredentials: true })
      setEmployees(prev => prev.filter(emp => (emp._id || emp.id) !== employeeId))
      setSnackbar({ open: true, message: 'Employee deleted successfully!', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete employee', severity: 'error' })
    }
  };

  const handleDeleteDepartment = async () => {
    setDeleteDepartmentError('')
    setDeleteDepartmentLoading(true)
    try {
      await axios.delete(`${apiBaseUrl}/api/departments/${selectedDepartmentId}`, { withCredentials: true })
      setDepartments(prev => prev.filter(dept => (dept.id || dept._id) !== selectedDepartmentId))
      setSnackbar({ open: true, message: 'Department deleted successfully!', severity: 'success' })
      setDeleteDepartmentOpen(false)
      setSelectedDepartmentId('')
      await fetchData() // Refresh data
    } catch (err) {
      setDeleteDepartmentError(err.response?.data?.error || 'Failed to delete department')
    } finally {
      setDeleteDepartmentLoading(false)
    }
  };

  // Helper function to get weeks of a month
  const getWeeksOfMonth = (year, month) => {
    const weeks = []
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    let current = new Date(firstDay)
    // Find first Monday
    while (current.getDay() !== 1) {
      current.setDate(current.getDate() + 1)
    }

    while (current <= lastDay) {
      const weekStart = new Date(current)
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)

      weeks.push({
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      })

      current.setDate(current.getDate() + 7)
    }

    return weeks
  }

  // Fetch available weeks when month changes
  useEffect(() => {
    const today = new Date(selectedWeekStart)
    const weeks = getWeeksOfMonth(today.getFullYear(), today.getMonth())
    setAvailableWeeks(weeks)
  }, [selectedWeekStart])

  // Fetch occupancy data when trainer or week changes
  useEffect(() => {
    if (selectedTrainerForOccupancy && selectedWeekStart) {
      fetchTrainerOccupancy()
    }
  }, [selectedTrainerForOccupancy, selectedWeekStart])

  const fetchTrainerOccupancy = async () => {
    if (!selectedTrainerForOccupancy || !selectedWeekStart) return

    setOccupancyLoading(true)
    try {
      const res = await axios.get(
        `${apiBaseUrl}/api/trainer-occupancy?employeeId=${selectedTrainerForOccupancy}&weekStart=${selectedWeekStart}`,
        { withCredentials: true }
      )
      // Transform data to { 'YYYY-MM-DD': schoolId }
      const occupancy = {}
      Object.entries(res.data).forEach(([date, data]) => {
        if (data.schoolId) {
          occupancy[date] = data.schoolId
        }
      })
      setTrainerOccupancy(occupancy)
    } catch (err) {
      console.error('Error fetching trainer occupancy:', err)
      setSnackbar({ open: true, message: 'Failed to load occupancy data', severity: 'error' })
    } finally {
      setOccupancyLoading(false)
    }
  }

  const saveTrainerOccupancy = async () => {
    if (!selectedTrainerForOccupancy || !selectedWeekStart) return

    setOccupancySaving(true)
    try {
      // Build assignments object { 'YYYY-MM-DD': schoolId }
      const assignments = {}
      const start = new Date(selectedWeekStart)
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        const dateStr = d.toISOString().split('T')[0]
        assignments[dateStr] = trainerOccupancy[dateStr] || null
      }

      const res = await axios.post(
        `${apiBaseUrl}/api/trainer-occupancy`,
        {
          employeeId: selectedTrainerForOccupancy,
          weekStart: selectedWeekStart,
          assignments
        },
        { withCredentials: true }
      )

      if (res.data.success) {
        setSnackbar({ open: true, message: 'Occupancy saved successfully!', severity: 'success' })
        // Refresh data
        await fetchTrainerOccupancy()
      }
    } catch (err) {
      console.error('Error saving trainer occupancy:', err)
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to save occupancy', severity: 'error' })
    } finally {
      setOccupancySaving(false)
    }
  }

  const fetchCalendarOccupancy = useCallback(async (employeeId) => {
    if (!employeeId) return

    console.log('Fetching calendar occupancy for:', employeeId)
    setCalendarLoading(true)
    try {
      const year = calendarMonth.getFullYear()
      const month = calendarMonth.getMonth()

      // Get first and last day of the month
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      // Use local date formatting to avoid timezone issues
      const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

      const res = await axios.get(
        `${apiBaseUrl}/api/trainer-occupancy?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
        { withCredentials: true }
      )

      console.log('Calendar occupancy data:', res.data)
      setEmployeeCalendarData(res.data)
    } catch (err) {
      console.error('Error fetching calendar occupancy:', err)
      setEmployeeCalendarData({})
    } finally {
      setCalendarLoading(false)
    }
  }, [apiBaseUrl, calendarMonth])

  // Fetch calendar data when month changes or employee changes
  useEffect(() => {
    if (calendarEmployee) {
      fetchCalendarOccupancy(calendarEmployee)
    }
  }, [calendarEmployee, calendarMonth, fetchCalendarOccupancy])

  const handleEditDepartment = async () => {
    setEditDepartmentError('')
    setEditDepartmentLoading(true)
    try {
      const res = await axios.put(
        `${apiBaseUrl}/api/departments/${editDepartmentData.departmentId}`,
        {
          name: editDepartmentData.name.trim(),
          code: editDepartmentData.code.trim() || undefined,
          description: editDepartmentData.description.trim() || undefined,
          color: editDepartmentData.color
        },
        { withCredentials: true }
      )
      setDepartments(prev => prev.map(dept =>
        (dept._id || dept.id) === editDepartmentData.departmentId ? res.data : dept
      ))
      setSnackbar({ open: true, message: 'Department updated successfully!', severity: 'success' })
      setEditDepartmentOpen(false)
      await fetchData() // Refresh data
    } catch (err) {
      setEditDepartmentError(err.response?.data?.error || 'Failed to update department')
    } finally {
      setEditDepartmentLoading(false)
    }
  };

  const sidebarItems = getNavigationForRole('admin');
  const tabLabels = adminTabLabels;

  // const activeTabId = tabLabels[selectedTab]?.toLowerCase() || 'overview';
  const activeTabId = selectedTab === 12 ? projectPage : tabLabels[selectedTab]?.toLowerCase() || 'overview';
  const handleDashboardNavigation = (id) => {
    const navigationItem = sidebarItems.flatMap(section => section.items).find(item => item.id === id);
    if (navigationItem?.route && !navigationItem.route.startsWith('/admin?')) {
      navigate(navigationItem.route);
      return;
    }
    const tabIndex = tabLabels.findIndex(t => t.toLowerCase() === id);
    if (tabIndex >= 0) {
      setSelectedTab(tabIndex);
      setProjectPage('all projects');
      return;
    }
    if (id === 'project management') {
      setSelectedTab(12);
      setProjectPage('create project');
      return;
    }
    setSelectedTab(12);
    setProjectPage(id);
  };
  const headerSearchOptions = sidebarItems.flatMap(section =>
    section.items.flatMap(item => [
      { id: item.id, label: item.label, group: section.title },
      ...(item.children || []).map(child => ({
        id: child.id,
        label: child.label,
        group: item.label,
        keywords: [section.title]
      }))
    ])
  );


  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#F9FAFB' }}>
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeItem={activeTabId}
        onItemClick={handleDashboardNavigation}
        user={{ name: user?.name || 'Admin', role: user?.role || 'Administrator' }}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          ml: '240px',
          width: 'calc(100vw - 240px)',
          maxWidth: 'none',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <Header
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          searchOptions={headerSearchOptions}
          onSearchSelect={(option) => handleDashboardNavigation(option.id)}
          user={{ name: user?.name || 'Admin' }}
        />

        {/* Main Content Area */}
        <Box sx={{ flex: 1, p: 4 }}>
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { label: 'Admin', active: false }
            ]}
            separator="›"
          />

          {/* Page Title */}
          {![1, 4, 5, 6, 7].includes(selectedTab) && <Box sx={{ mb: 4 }}>
            <Typography sx={{ ...typography.subheadingS2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', mb: 0.5 }}>
              {selectedTab === 12 ? projectPageLabels[projectPage] : tabLabels[selectedTab]}
            </Typography>
            <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
              Last modified: {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })} by {user?.name || 'Admin'}
            </Typography>
          </Box>}

          {selectedTab === 0 && (
            <Box>
              {/* Metrics Cards Row */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1f r',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(6, 1fr)'
                  },
                  gap: 3,
                  width: '100%',
                  mb: 4
                }}
              >
                <StatCard
                  title="Total Employees"
                  value={employees.length}
                  icon="people"
                  color="primary"
                  trend="up"
                  trendValue="12%"
                />
                <StatCard
                  title="Active Today"
                  value={employeesWithActivityToday?.length || 0}
                  icon="check"
                  color="success"
                  trend="up"
                  trendValue="8%"
                />
                <StatCard
                  title="Departments"
                  value={departments.length}
                  icon="trainer"
                  color="purple"
                />
                <StatCard
                  title="Branches"
                  value={branches.length}
                  icon="school"
                  color="warning"
                />
                <StatCard
                  title="Activity Templates"
                  value={activityTemplates.length}
                  icon="documents"
                  color="primary"
                />
                <StatCard
                  title="Total Schools"
                  value={schoolCatalog?.length || 0}
                  icon="school"
                  color="success"
                />
              </Box>

              <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, mb: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Weekly Hours by Department</Typography>
                <Box sx={{ width: '100%', overflowX: { xs: 'auto', md: 'unset' } }}>
                  <ResponsiveContainer width="100%" height={240} minWidth={320}>
                    <BarChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barGap={6}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" style={{ fontWeight: 700 }} />
                      <YAxis />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f3f6fa' }} />
                      {departmentOptions.map((dep, idx) => {
                        const deptColor = departments?.find(d => d.name === dep)?.color || COLORS[idx % COLORS.length];
                        return (
                          <Bar
                            key={dep}
                            dataKey={dep}
                            name={dep}
                            fill={deptColor}
                            radius={[8, 8, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={1200}
                            maxBarSize={32}
                          />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: { xs: 2, md: 3 },
                  width: '100%',
                  justifyContent: { xs: 'center', md: 'space-between' },
                  alignItems: 'stretch',
                  mb: 4,
                }}
              >
                {/* Three Department Session Distribution PieCharts */}
                {['Coding', 'Mechatronics', 'Electronics'].map((deptName, idx) => {
                  const dept = departmentCards.find((d) => d.name === deptName) || {
                    offlineInstitute: 0,
                    onlineInstitute: 0,
                    school: 0,
                  };
                  const sessionData = [
                    { name: 'Offline Institute', value: dept.offlineInstitute || 0, color: '#00C49F' },
                    { name: 'Online Institute', value: dept.onlineInstitute || 0, color: '#FF8042' },
                    { name: 'School', value: dept.school || 0, color: '#0088FE' },
                  ];
                  return (
                    <Paper
                      key={deptName}
                      elevation={0}
                      sx={{
                        flex: 1,
                        minWidth: { xs: '100%', md: 220 },
                        height: { xs: 260, md: 280 },
                        p: 2,
                        borderRadius: 3,
                        boxShadow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                        border: theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #f0f0f0',
                        mb: { xs: 2, md: 0 },
                      }}
                    >
                      <Typography fontWeight={700} fontSize={17} sx={{ mb: 1, color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>
                        {deptName}
                      </Typography>
                      <ResponsiveContainer width="100%" height={150} minWidth={150}>
                        <PieChart>
                          <Pie
                            data={sessionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={55}
                            innerRadius={28}
                            labelLine={false}
                            label={props => renderCustomizedLabel({ ...props, fill: theme.palette.mode === 'dark' ? '#fff' : '#222' })}
                          >
                            {sessionData.map((entry, i) => (
                              <Cell key={`cell-session-${i}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                              color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                              border: theme.palette.mode === 'dark' ? '1px solid #333' : undefined
                            }}
                            formatter={value => `${value} sessions`}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={32}
                            formatter={value => (
                              <span style={{ color: theme.palette.mode === 'dark' ? '#fff' : '#222', fontWeight: 600, fontSize: 12 }}>{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  )
                })}
              </Box>
              {/* Restore Department Productivity Trend Line Chart */}
              <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Department Productivity Trend</Typography>
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 700, pr: 2 }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        {departmentOptions.map((dep, idx) => {
                          const deptColor = departments?.find(d => d.name === dep)?.color || COLORS[idx % COLORS.length];
                          return (
                            <Line key={dep} type="monotone" dataKey={dep} stroke={deptColor} strokeWidth={3} dot={{ r: 6 }} />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </Paper>
              {lineData.length > 0 && (
                <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Competition Contribution Index</Typography>
                  <Box sx={{ width: '100%', overflowX: 'auto' }}>
                    <Box sx={{ minWidth: 700, pr: 2 }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={analytics.competitionContributionTrend || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          {departmentOptions.map((dep, idx) => {
                            const deptColor = departments?.find(d => d.name === dep)?.color || COLORS[idx % COLORS.length];
                            return (
                              <Line key={dep} type="monotone" dataKey={dep} stroke={deptColor} strokeWidth={3} dot={{ r: 6 }} />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                </Paper>
              )}

            </Box>
          )}
          {selectedTab === 1 && (
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 4, color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>Departments</Typography>
              <Box
                sx={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                  gap: 3,
                  alignItems: 'start'
                }}
              >
                {departmentCards.map((dept) => (
                  <Box key={dept.name} sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <DepartmentCard dept={dept} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          {selectedTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                  variant="outlined"
                  placeholder="Search employees..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: 280 },
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#f3f6fa',
                    borderRadius: 2,
                    input: { color: theme.palette.mode === 'dark' ? '#fff' : '#222' },
                    label: { color: theme.palette.mode === 'dark' ? '#888' : '#666' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: theme.palette.mode === 'dark' ? '#888' : '#666' }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl sx={{ minWidth: { xs: '100%', sm: 180 } }} size="small">
                  <Select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    displayEmpty
                    input={<OutlinedInput />}
                    sx={{
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                      '.MuiSelect-icon': { color: theme.palette.mode === 'dark' ? '#fff' : '#222' },
                    }}
                    IconComponent={ArrowDropDown}
                  >
                    <MenuItem value="All">All Departments</MenuItem>
                    {departments.map(dep => (
                      <MenuItem key={dep.name} value={dep.name}>{dep.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {displayedEmployees.map(emp => (
                <EmployeeCard
                  key={emp.employeeCode || emp._id}
                  employee={emp}
                  expanded={expandedEmployee === (emp.employeeCode || emp._id)}
                  onExpand={() => handleExpandEmployee(emp.employeeCode || emp._id)}
                  analyticsData={expandedEmployee === (emp.employeeCode || emp._id) ? selectedEmployeeAnalytics : employeeAnalytics[emp.employeeCode || emp._id]}
                  sessionDistributionData={expandedEmployee === (emp.employeeCode || emp._id) ? sessionDistribution : null}
                  loading={loadingEmployee && expandedEmployee === (emp.employeeCode || emp._id)}
                  departments={departments}
                />
              ))}
              {displayedEmployeesCount < filteredEmployees.length && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={loadMoreEmployees}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: 15
                    }}
                  >
                    Load More ({filteredEmployees.length - displayedEmployeesCount} remaining)
                  </Button>
                </Box>
              )}
              <AddUserDialog
                open={addEmployeeOpen}
                onClose={() => setAddEmployeeOpen(false)}
                departments={departments}
                branches={branches}
                onAdd={handleAddUser}
                initialRole="employee"
              />
              <AddUserDialog
                open={addManagerOpen}
                onClose={() => setAddManagerOpen(false)}
                departments={departments}
                branches={branches}
                onAdd={handleAddUser}
                initialRole="manager"
              />
            </Box>
          )}
          {selectedTab === 3 && (
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 4, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Trainer School Calendar</Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mb: 1, display: 'block' }}>
                  Select Employee
                </Typography>
                <Autocomplete
                  fullWidth
                  options={employees.filter(e => e.role === 'employee')}
                  value={employees.find(e => (e.employeeCode || e._id) === calendarEmployee) || null}
                  onChange={async (_, selectedEmployee) => {
                    const empId = selectedEmployee ? (selectedEmployee.employeeCode || selectedEmployee._id) : ''
                    console.log('Calendar employee selected:', empId)
                    setCalendarEmployee(empId)
                    if (empId) {
                      await fetchCalendarOccupancy(empId)
                    } else {
                      setEmployeeCalendarData({})
                    }
                  }}
                  getOptionLabel={(option) => option ? `${option.name || 'Unknown'} (${option.employeeCode || 'No Code'})` : ''}
                  isOptionEqualToValue={(option, value) => (option.employeeCode || option._id) === (value.employeeCode || value._id)}
                  filterOptions={(options, state) => {
                    const query = state.inputValue.trim().toLowerCase()
                    if (!query) return options
                    return options.filter(emp =>
                      (emp.name || '').toLowerCase().includes(query) ||
                      (emp.employeeCode || '').toLowerCase().includes(query)
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search by name or employee code"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                          borderRadius: 2,
                          color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                          '& fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                          }
                        }
                      }}
                    />
                  )}
                />
              </Box>

              {calendarEmployee ? (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
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
                          if (activeStartDate) setCalendarMonth(activeStartDate)
                        }}
                        view="month"
                        tileContent={({ date, view }) => {
                          if (view !== 'month') return null
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const dateStr = `${year}-${month}-${day}`
                          const dayData = employeeCalendarData[dateStr]

                          if (!dayData?.schoolId) return null

                          const school = schoolCatalog.find(s => String(s.id || s._id) === String(dayData.schoolId))
                          if (!school) return null

                          // Use same bar styling as Employee Dashboard
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
                              <Box className="calendar-event-bar calendar-event-school">
                                {school.name}
                              </Box>
                            </Box>
                          )
                        }}
                        tileClassName={({ date, view }) => {
                          if (view !== 'month') return ''
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const dateStr = `${year}-${month}-${day}`
                          const dayData = employeeCalendarData[dateStr]
                          return dayData?.schoolId ? 'calendar-day-with-school' : ''
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
          {selectedTab === 4 && (
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 4, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Reports & Downloads</Typography>

              {/* Download Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Export Data</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="contained"
                      startIcon={<GetApp />}
                      onClick={() => setEmployeeExcelDialogOpen(true)}
                      fullWidth
                      sx={{
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        bgcolor: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? '#6b85f7' : '#1565c0',
                        }
                      }}
                    >
                      Employee Activities
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="contained"
                      startIcon={<GetApp />}
                      onClick={() => setSessionsExcelDialogOpen(true)}
                      fullWidth
                      sx={{
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        bgcolor: theme.palette.mode === 'dark' ? '#34A853' : '#2e7d32',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? '#4caf50' : '#1b5e20',
                        }
                      }}
                    >
                      Employee Sessions
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="contained"
                      startIcon={<GetApp />}
                      onClick={() => setDepartmentExcelDialogOpen(true)}
                      fullWidth
                      sx={{
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        bgcolor: theme.palette.mode === 'dark' ? '#A142F4' : '#7b1fa2',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? '#b366f7' : '#6a1b9a',
                        }
                      }}
                    >
                      Department Activities
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="contained"
                      startIcon={<GetApp />}
                      onClick={() => setNoActivityExcelDialogOpen(true)}
                      fullWidth
                      sx={{
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        bgcolor: theme.palette.mode === 'dark' ? '#f57c00' : '#ed6c02',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? '#ff9800' : '#e65100',
                        }
                      }}
                    >
                      No Activity Employees
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Report Generation Section */}
              <Box sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Generate Activity Report</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="employee-select-label">Employee</InputLabel>
                      <Select
                        labelId="employee-select-label"
                        value={selectedEmployee || ''}
                        label="Employee"
                        onChange={e => setSelectedEmployee(e.target.value)}
                        sx={{
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                          color: theme.palette.mode === 'dark' ? '#fff' : '#222'
                        }}
                      >
                        {employees.map(emp => (
                          <MenuItem key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      value={selectedStartDate}
                      onChange={e => setSelectedStartDate(e.target.value)}
                      label="Start Date"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                        '& .MuiOutlinedInput-input': { color: theme.palette.mode === 'dark' ? '#fff' : '#222' }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      value={selectedEndDate}
                      onChange={e => setSelectedEndDate(e.target.value)}
                      label="End Date"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                        '& .MuiOutlinedInput-input': { color: theme.palette.mode === 'dark' ? '#fff' : '#222' }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        bgcolor: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? '#6b85f7' : '#1565c0',
                        }
                      }}
                      onClick={() => { setShowSessionsTable(false); handleShowReport(); }}
                      disabled={!selectedEmployee || !selectedStartDate || !selectedEndDate || loadingReport}
                    >
                      {loadingReport ? <CircularProgress size={22} /> : 'Show Activity'}
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        borderColor: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2',
                        color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2',
                        '&:hover': {
                          borderColor: theme.palette.mode === 'dark' ? '#6b85f7' : '#1565c0',
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.1)' : 'rgba(25,118,210,0.04)'
                        }
                      }}
                      onClick={handleShowSessions}
                      disabled={!selectedEmployee || !selectedStartDate || !selectedEndDate || loadingReport}
                    >
                      No. of Sessions
                    </Button>
                  </Grid>
                </Grid>
              </Box>
              {reportError && <Alert severity="error" sx={{ mb: 2 }}>{reportError}</Alert>}
              {reportData && reportData.length > 0 && !showSessionsTable && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Activities for selected employee on {selectedStartDate} to {selectedEndDate}</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Date', 'Time', 'Activity Title', 'Time Spent (h)', 'Comment'].map((header) => (
                            <TableCell
                              key={header}
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085',
                                background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                                borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E4E7F0'
                              }}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.filter(act => act.title !== 'Total No. of Sessions').map(act => act.timeEntries.map((te, idx) => (
                          <TableRow
                            key={act._id + '-' + idx}
                            sx={{
                              background: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.7)' : '#fff',
                              '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.7)' : '#F9FAFB' }
                            }}
                          >
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontWeight: 500 }}>
                              {new Date(te.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>
                              {formatTime(te.punchIn)} - {formatTime(te.punchOut)}
                            </TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontWeight: 500 }}>
                              {act.title}
                            </TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: (te.duration / 60) > 0 ? (theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2') : theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085', fontWeight: (te.duration / 60) > 0 ? 700 : 400 }}>
                              {(te.duration / 60).toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>
                              {act.comment || '-'}
                            </TableCell>
                          </TableRow>
                        )))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              {showSessionsTable && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Session Distribution (Date-wise) for selected employee</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Date', 'Offline Institute', 'Online Institute', 'School'].map((header) => (
                            <TableCell
                              key={header}
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085',
                                background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                                borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E4E7F0'
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
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>
                              No activities found for this employee on the selected date range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sessionDistributionDatewise.map((row, idx) => (
                            <TableRow
                              key={row.date}
                              sx={{
                                background: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.7)' : '#fff',
                                '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.7)' : '#F9FAFB' }
                              }}
                            >
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontWeight: 500 }}>{row.date}</TableCell>
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{row.offlineInstitute}</TableCell>
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{row.onlineInstitute}</TableCell>
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{row.school}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              {showNoActivityReport && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Employees with No Activity from {selectedStartDate} to {selectedEndDate} (Excluding Leave)</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Employee Name', 'Employee Code', 'Department', 'Email'].map((header) => (
                            <TableCell
                              key={header}
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085',
                                background: theme.palette.mode === 'dark' ? '#23272f' : '#F9FAFB',
                                borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #E4E7F0'
                              }}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {noActivityData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>
                              All employees have filled activities or are on leave during the selected period.
                            </TableCell>
                          </TableRow>
                        ) : (
                          noActivityData.map((emp, idx) => (
                            <TableRow
                              key={emp.employeeCode}
                              sx={{
                                background: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.7)' : '#fff',
                                '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.7)' : '#F9FAFB' }
                              }}
                            >
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontWeight: 500 }}>{emp.name}</TableCell>
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{emp.employeeCode}</TableCell>
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{emp.department?.name || emp.department || 'Unknown'}</TableCell>
                              <TableCell sx={{ borderBottom: theme.palette.mode === 'dark' ? '1px solid #374151' : '1px solid #F2F4F7', color: theme.palette.mode === 'dark' ? '#9CA3AF' : '#667085' }}>{emp.email}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              <DownloadExcelDialog
                open={employeeExcelDialogOpen}
                onClose={() => setEmployeeExcelDialogOpen(false)}
                items={employeesWithAllOption}
                itemLabel="Employee"
                itemKey="_id"
                onDownload={handleDownloadEmployeeExcel}
              />
              <DownloadSessionsDialog
                open={sessionsExcelDialogOpen}
                onClose={() => setSessionsExcelDialogOpen(false)}
                items={employeesWithAllOption}
                itemLabel="Employee"
                itemKey="_id"
                defaultId={selectedEmployee}
                defaultStart={selectedStartDate}
                defaultEnd={selectedEndDate}
                onDownload={handleDownloadEmployeeSessionsExcel}
              />
              <DownloadExcelDialog
                open={departmentExcelDialogOpen}
                onClose={() => setDepartmentExcelDialogOpen(false)}
                items={departments}
                itemLabel="Department"
                itemKey="id"
                onDownload={handleDownloadDepartmentExcel}
              />
              <DateRangeDownloadDialog
                open={noActivityExcelDialogOpen}
                onClose={() => setNoActivityExcelDialogOpen(false)}
                defaultStart={selectedStartDate}
                defaultEnd={selectedEndDate}
                title="Download No Activity Report"
                confirmLabel="Download"
                onDownload={handleDownloadNoActivityExcel}
              />
            </Paper>
          )}
          {selectedTab === 5 && (
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 4, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Manage Employees</Typography>
              <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 4 }}>
                {/* Add Employee Card */}
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 10px)', md: '1 1 calc(33.333% - 14px)', lg: '1 1 calc(20% - 16px)' }, minWidth: { xs: '100%', sm: 'calc(50% - 10px)', md: 'calc(33.333% - 14px)', lg: 'calc(20% - 16px)' } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      minHeight: 180,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                    onClick={() => setAddEmployeeOpen(true)}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.15)' : '#e3f2fd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5
                      }}
                    >
                      <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2' }}>+</Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontSize: '1rem' }}>Add Employee</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mt: 0.5, textAlign: 'center', fontSize: '0.8rem' }}>Create new employee account</Typography>
                  </Paper>
                </Box>

                {/* Add Manager Card */}
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 10px)', md: '1 1 calc(33.333% - 14px)', lg: '1 1 calc(20% - 16px)' }, minWidth: { xs: '100%', sm: 'calc(50% - 10px)', md: 'calc(33.333% - 14px)', lg: 'calc(20% - 16px)' } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      minHeight: 180,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                    onClick={() => setAddManagerOpen(true)}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(156,39,176,0.15)' : '#f3e5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5
                      }}
                    >
                      <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ab47bc' : '#9c27b0' }}>+</Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontSize: '1rem' }}>Add Manager</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mt: 0.5, textAlign: 'center', fontSize: '0.8rem' }}>Create new manager account</Typography>
                  </Paper>
                </Box>

                {/* Change Password Card */}
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 10px)', md: '1 1 calc(33.333% - 14px)', lg: '1 1 calc(20% - 16px)' }, minWidth: { xs: '100%', sm: 'calc(50% - 10px)', md: 'calc(33.333% - 14px)', lg: 'calc(20% - 16px)' } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      minHeight: 180,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                    onClick={() => setChangePasswordOpen(true)}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,152,0,0.15)' : '#fff3e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5
                      }}
                    >
                      <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffa726' : '#f57c00' }}>🔑</Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontSize: '1rem' }}>Change Password</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mt: 0.5, textAlign: 'center', fontSize: '0.8rem' }}>Update employee password</Typography>
                  </Paper>
                </Box>

              </Box>

              {/* Employee List Section */}
              <Box sx={{ mt: 6 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 3
                }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', width: { xs: '100%', sm: 'auto' } }}>All Employees</Typography>
                  <TextField
                    variant="outlined"
                    placeholder="Search employees..."
                    value={manageEmployeesSearch}
                    onChange={e => setManageEmployeesSearch(e.target.value)}
                    size="small"
                    sx={{
                      width: { xs: '100%', sm: 300, md: 350 },
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      input: { color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {displayedManageEmployees.map(emp => (
                    <Paper
                      key={emp._id || emp.id}
                      elevation={0}
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                        transition: 'all 0.2s',
                        minHeight: 90,
                        '&:hover': {
                          boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                        minHeight: 70
                      }}>
                        {/* Left Side - Avatar, Name, ID */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                          <Avatar sx={{
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.15)' : '#e3f2fd',
                            color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2',
                            fontWeight: 700,
                            width: 48,
                            height: 48
                          }}>
                            {emp.initials}
                          </Avatar>
                          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontSize: '1rem', lineHeight: 1.3 }}>{emp.name}</Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', fontSize: '0.875rem', lineHeight: 1.3 }}>
                              ID: {emp.employeeCode || emp._id}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Middle - Email */}
                        <Box sx={{
                          minWidth: 200,
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignSelf: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', lineHeight: 1.5, fontWeight: 500 }}>Email</Typography>
                          <Typography variant="body2" fontWeight={500} sx={{
                            color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                            fontSize: '0.875rem',
                            wordBreak: 'break-word',
                            lineHeight: 1.4
                          }}>{emp.email}</Typography>
                        </Box>

                        {/* Right Side - Department and Actions */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          {/* Department */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', lineHeight: 1.5, fontWeight: 500 }}>Department</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{
                              color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.1)' : '#e3f2fd',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              display: 'inline-block',
                              fontSize: '0.875rem',
                              mt: 0.5,
                              lineHeight: 1.4
                            }}>
                              {emp.department?.name || emp.department || 'N/A'}
                            </Typography>
                          </Box>

                          {/* Action Menu Button */}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setEmployeeMenuAnchor(e.currentTarget);
                                setSelectedEmployeeForMenu(emp);
                              }}
                              sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', '&:hover': { color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2' } }}
                            >
                              <MoreVert sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>

                {/* Load More Button */}
                {displayedManageEmployeesCount < filteredManageEmployees.length && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={loadMoreManageEmployees}
                      sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        borderColor: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2',
                        color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2',
                        '&:hover': {
                          borderColor: theme.palette.mode === 'dark' ? '#6b85f7' : '#1565c0',
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.1)' : 'rgba(25,118,210,0.04)'
                        }
                      }}
                    >
                      Load More ({filteredManageEmployees.length - displayedManageEmployeesCount} remaining)
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Employee Actions Menu */}
              <Menu
                anchorEl={employeeMenuAnchor}
                open={Boolean(employeeMenuAnchor)}
                onClose={() => setEmployeeMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: 120
                  }
                }}
              >
                <MenuItem
                  onClick={() => {
                    if (selectedEmployeeForMenu) handleEditEmployee(selectedEmployeeForMenu);
                    setEmployeeMenuAnchor(null);
                  }}
                  sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}
                >
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    if (selectedEmployeeForMenu) handleDeleteEmployee(selectedEmployeeForMenu._id || selectedEmployeeForMenu.id);
                    setEmployeeMenuAnchor(null);
                  }}
                  sx={{ fontSize: '14px', color: theme.palette.error.main }}
                >
                  Delete
                </MenuItem>
              </Menu>

              {/* Dialogs */}
              <AddUserDialog
                open={addEmployeeOpen}
                onClose={() => setAddEmployeeOpen(false)}
                departments={departments}
                branches={branches}
                onAdd={handleAddUser}
                initialRole="employee"
              />
              <AddUserDialog
                open={addManagerOpen}
                onClose={() => setAddManagerOpen(false)}
                departments={departments}
                branches={branches}
                onAdd={handleAddUser}
                initialRole="manager"
              />
              <AddDepartmentDialog open={addDepartmentOpen} onClose={() => setAddDepartmentOpen(false)} onCreated={handleDepartmentCreated} />

              {/* Change Password Dialog */}
              <Dialog
                open={changePasswordOpen}
                onClose={() => {
                  setChangePasswordOpen(false)
                  setPasswordFormData({ employeeId: '', newPassword: '' })
                  setPasswordError('')
                }}
                PaperProps={{
                  sx: {
                    bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                    color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                    minWidth: { xs: '90%', sm: 400 }
                  }
                }}
              >
                <DialogTitle sx={{ pb: 1 }}>Change Employee Password</DialogTitle>
                <DialogContent>
                  <Box sx={{ pt: 1 }}>
                    <FormControl
                      fullWidth
                      required
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                          '&:hover fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
                        },
                        '& .MuiSelect-select': {
                          color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                        }
                      }}
                    >
                      <InputLabel>Select Employee</InputLabel>
                      <Select
                        value={passwordFormData.employeeId}
                        label="Select Employee"
                        onChange={e => setPasswordFormData({ ...passwordFormData, employeeId: e.target.value })}
                      >
                        {employees.map(emp => (
                          <MenuItem key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="New Password"
                      type="password"
                      required
                      value={passwordFormData.newPassword}
                      onChange={e => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                          '&:hover fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
                        },
                        '& .MuiOutlinedInput-input': {
                          color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                        }
                      }}
                    />
                    {passwordError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {passwordError}
                      </Alert>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setChangePasswordOpen(false)
                          setPasswordFormData({ employeeId: '', newPassword: '' })
                          setPasswordError('')
                        }}
                        fullWidth
                        disabled={passwordLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={passwordLoading || !passwordFormData.employeeId || !passwordFormData.newPassword}
                        onClick={async () => {
                          setPasswordError('')
                          setPasswordLoading(true)
                          try {
                            await axios.put(
                              `${apiBaseUrl}/api/employees/${passwordFormData.employeeId}/password`,
                              { password: passwordFormData.newPassword },
                              { withCredentials: true }
                            )
                            setSnackbar({ open: true, message: 'Password updated successfully!', severity: 'success' })
                            setChangePasswordOpen(false)
                            setPasswordFormData({ employeeId: '', newPassword: '' })
                          } catch (err) {
                            setPasswordError(err.response?.data?.error || 'Failed to update password')
                          } finally {
                            setPasswordLoading(false)
                          }
                        }}
                      >
                        {passwordLoading ? <CircularProgress size={24} /> : 'Update Password'}
                      </Button>
                    </Box>
                  </Box>
                </DialogContent>
              </Dialog>

              {/* Edit Employee Dialog */}
              <Dialog
                open={editEmployeeOpen}
                onClose={() => {
                  setEditEmployeeOpen(false)
                  setEditEmployeeData({ employeeId: '', name: '', email: '', departmentId: '', branchId: '', role: '', managerType: '' })
                  setEditEmployeeError('')
                }}
                PaperProps={{
                  sx: {
                    bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                    color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                    minWidth: { xs: '90%', sm: 480 }
                  }
                }}
              >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 24 }}>Edit Employee</DialogTitle>
                <DialogContent>
                  <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                    {editEmployeeError && (
                      <Alert severity="error">{editEmployeeError}</Alert>
                    )}
                    <TextField
                      label="Name"
                      required
                      fullWidth
                      value={editEmployeeData.name}
                      onChange={(e) => setEditEmployeeData(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <TextField
                      label="Email"
                      type="email"
                      required
                      fullWidth
                      value={editEmployeeData.email}
                      onChange={(e) => setEditEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <FormControl fullWidth required>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={editEmployeeData.departmentId}
                        label="Department"
                        onChange={(e) => setEditEmployeeData(prev => ({ ...prev, departmentId: e.target.value }))}
                      >
                        {departments.map(dept => (
                          <MenuItem key={dept.id ?? dept._id} value={dept.id ?? dept._id}>{dept.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth required>
                      <InputLabel>Branch</InputLabel>
                      <Select
                        value={editEmployeeData.branchId}
                        label="Branch"
                        onChange={(e) => setEditEmployeeData(prev => ({ ...prev, branchId: e.target.value }))}
                      >
                        {branches.map(branch => (
                          <MenuItem key={branch.id ?? branch._id} value={branch.id ?? branch._id}>{branch.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth required>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={editEmployeeData.role}
                        label="Role"
                        onChange={(e) => setEditEmployeeData(prev => ({
                          ...prev,
                          role: e.target.value,
                          managerType: e.target.value === 'manager' ? (prev.managerType || 'department') : ''
                        }))}
                      >
                        <MenuItem value="employee">Employee</MenuItem>
                        <MenuItem value="teamlead">Team Lead</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                        <MenuItem value="senior_manager">Senior Manager</MenuItem>
                      </Select>
                    </FormControl>
                    {editEmployeeData.role === 'manager' && (
                      <FormControl fullWidth required>
                        <InputLabel>Manager Type</InputLabel>
                        <Select
                          value={editEmployeeData.managerType}
                          label="Manager Type"
                          onChange={(e) => setEditEmployeeData(prev => ({ ...prev, managerType: e.target.value }))}
                        >
                          <MenuItem value="department">Department Manager</MenuItem>
                          <MenuItem value="branch">Branch Manager</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                  <Button
                    onClick={() => {
                      setEditEmployeeOpen(false)
                      setEditEmployeeData({ employeeId: '', name: '', email: '', departmentId: '', branchId: '', role: '', managerType: '' })
                      setEditEmployeeError('')
                    }}
                    sx={{ fontWeight: 700 }}
                    disabled={editEmployeeLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleUpdateEmployee}
                    sx={{ fontWeight: 700 }}
                    disabled={editEmployeeLoading}
                  >
                    {editEmployeeLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Save Changes'}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Delete Department Dialog */}
              <Dialog
                open={deleteDepartmentOpen}
                onClose={() => {
                  setDeleteDepartmentOpen(false)
                  setSelectedDepartmentId('')
                  setDeleteDepartmentError('')
                }}
                PaperProps={{
                  sx: {
                    bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                    color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                    minWidth: { xs: '90%', sm: 400 }
                  }
                }}
              >
                <DialogTitle sx={{ pb: 1 }}>Remove Department</DialogTitle>
                <DialogContent>
                  <Box sx={{ pt: 1 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Warning: This action cannot be undone. Make sure no employees are assigned to this department.
                    </Alert>
                    <FormControl
                      fullWidth
                      required
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                          '&:hover fieldset': {
                            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: theme.palette.mode === 'dark' ? '#888' : 'inherit',
                        },
                        '& .MuiSelect-select': {
                          color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                        }
                      }}
                    >
                      <InputLabel>Select Department</InputLabel>
                      <Select
                        value={selectedDepartmentId}
                        label="Select Department"
                        onChange={e => setSelectedDepartmentId(e.target.value)}
                      >
                        {departments.map(dept => (
                          <MenuItem key={dept.id ?? dept._id} value={dept.id ?? dept._id}>{dept.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {deleteDepartmentError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {deleteDepartmentError}
                      </Alert>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setDeleteDepartmentOpen(false)
                          setSelectedDepartmentId('')
                          setDeleteDepartmentError('')
                        }}
                        fullWidth
                        disabled={deleteDepartmentLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        disabled={deleteDepartmentLoading || !selectedDepartmentId}
                        onClick={handleDeleteDepartment}
                      >
                        {deleteDepartmentLoading ? <CircularProgress size={24} /> : 'Delete Department'}
                      </Button>
                    </Box>
                  </Box>
                </DialogContent>
              </Dialog>
            </Box>
          )}
          {selectedTab === 6 && (
            <Box>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mb: 4
              }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Manage Departments</Typography>
                <Button
                  variant="contained"
                  onClick={() => setAddDepartmentOpen(true)}
                  startIcon={<Typography sx={{ fontSize: '1.2rem', fontWeight: 700 }}>+</Typography>}
                  sx={{
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    fontSize: '0.875rem'
                  }}
                >
                  Add Department
                </Button>
              </Box>

              {/* Department List Section */}
              <Box sx={{ mt: 6 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 3
                }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', width: { xs: '100%', sm: 'auto' } }}>All Departments</Typography>
                  <TextField
                    variant="outlined"
                    placeholder="Search departments..."
                    value={''}
                    onChange={() => { }}
                    size="small"
                    sx={{
                      width: { xs: '100%', sm: 300, md: 350 },
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      input: { color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {departments.map(dept => {
                    // Calculate employee count from employees array
                    const employeeCount = employees.filter(e =>
                      e.department?.name === dept.name ||
                      e.department === dept.name ||
                      e.departmentId === (dept._id || dept.id)
                    ).length;
                    return (
                      <Paper
                        key={dept._id || dept.id}
                        elevation={0}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: 2,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                          boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 2,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            bgcolor: dept.color || '#4285F4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                          }}>
                            {dept.name?.charAt(0)?.toUpperCase() || 'D'}
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
                                {dept.name}
                              </Typography>
                              <Box sx={{
                                px: 1.5,
                                py: 0.3,
                                borderRadius: 1,
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.15)' : '#e3f2fd',
                                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(79,110,247,0.3)' : '#bbdefb'}`
                              }}>
                                <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2', fontWeight: 600, fontSize: '0.75rem' }}>
                                  {dept.code || dept.departmentCode || dept.name?.split(' ').map(w => w[0]).join('').toUpperCase() || 'N/A'}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467' }}>
                              {dept.description || 'No description'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-end' } }}>
                          <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', fontWeight: 500 }}>
                            {employeeCount} employees
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setDepartmentMenuAnchor(e.currentTarget);
                              setSelectedDepartmentForMenu(dept);
                            }}
                            sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', '&:hover': { color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2' } }}
                          >
                            <MoreVert sx={{ fontSize: 20 }} />
                          </IconButton>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>

              {/* Add Department Dialog */}
              <AddDepartmentDialog
                open={addDepartmentOpen}
                onClose={() => setAddDepartmentOpen(false)}
                onCreated={handleDepartmentCreated}
              />

              {/* Delete Department Dialog */}
              <Dialog open={deleteDepartmentOpen} onClose={() => { setDeleteDepartmentOpen(false); setSelectedDepartmentId(''); setDeleteDepartmentError(''); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Remove Department</DialogTitle>
                <DialogContent>
                  {deleteDepartmentError && <Alert severity="error" sx={{ mb: 2 }}>{deleteDepartmentError}</Alert>}
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel id="delete-dept-label">Select Department</InputLabel>
                    <Select
                      labelId="delete-dept-label"
                      value={selectedDepartmentId}
                      label="Select Department"
                      onChange={e => setSelectedDepartmentId(e.target.value)}
                    >
                      {departments.map(dept => (
                        <MenuItem key={dept._id || dept.id} value={dept._id || dept.id}>{dept.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    This action cannot be undone. Make sure no employees are assigned to this department before deleting.
                  </Alert>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setDeleteDepartmentOpen(false)
                        setSelectedDepartmentId('')
                        setDeleteDepartmentError('')
                      }}
                      fullWidth
                      disabled={deleteDepartmentLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      disabled={deleteDepartmentLoading || !selectedDepartmentId}
                      onClick={handleDeleteDepartment}
                    >
                      {deleteDepartmentLoading ? <CircularProgress size={24} /> : 'Delete Department'}
                    </Button>
                  </Box>
                </DialogActions>
              </Dialog>

              {/* Department Actions Menu */}
              <Menu
                anchorEl={departmentMenuAnchor}
                open={Boolean(departmentMenuAnchor)}
                onClose={() => setDepartmentMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: 120
                  }
                }}
              >
                <MenuItem
                  onClick={() => {
                    if (selectedDepartmentForMenu) {
                      setEditDepartmentData({
                        departmentId: selectedDepartmentForMenu._id || selectedDepartmentForMenu.id,
                        name: selectedDepartmentForMenu.name,
                        code: selectedDepartmentForMenu.code || selectedDepartmentForMenu.departmentCode || '',
                        description: selectedDepartmentForMenu.description || '',
                        color: selectedDepartmentForMenu.color || '#4285F4'
                      });
                      setEditDepartmentOpen(true);
                    }
                    setDepartmentMenuAnchor(null);
                  }}
                  sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}
                >
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    if (selectedDepartmentForMenu) {
                      setSelectedDepartmentId(selectedDepartmentForMenu._id || selectedDepartmentForMenu.id);
                      setDeleteDepartmentOpen(true);
                    }
                    setDepartmentMenuAnchor(null);
                  }}
                  sx={{ fontSize: '14px', color: theme.palette.error.main }}
                >
                  Delete
                </MenuItem>
              </Menu>

              {/* Edit Department Dialog */}
              <Dialog open={editDepartmentOpen} onClose={() => { setEditDepartmentOpen(false); setEditDepartmentError(''); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Edit Department</DialogTitle>
                <DialogContent>
                  {editDepartmentError && <Alert severity="error" sx={{ mb: 2 }}>{editDepartmentError}</Alert>}
                  <Box component="form" onSubmit={(e) => { e.preventDefault(); handleEditDepartment(); }} sx={{ pt: 1 }}>
                    <TextField
                      label="Department Name"
                      fullWidth
                      required
                      value={editDepartmentData.name}
                      onChange={e => setEditDepartmentData({ ...editDepartmentData, name: e.target.value })}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Department Code"
                      fullWidth
                      value={editDepartmentData.code}
                      onChange={e => setEditDepartmentData({ ...editDepartmentData, code: e.target.value })}
                      sx={{ mb: 2 }}
                      placeholder="e.g., HR, IT, FIN"
                    />
                    <TextField
                      label="Description"
                      fullWidth
                      multiline
                      minRows={2}
                      value={editDepartmentData.description}
                      onChange={e => setEditDepartmentData({ ...editDepartmentData, description: e.target.value })}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mb: 1, display: 'block' }}>
                        Department Color
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            bgcolor: editDepartmentData.color || '#4285F4',
                            border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <input
                            type="color"
                            value={editDepartmentData.color || '#4285F4'}
                            onChange={(e) => setEditDepartmentData({ ...editDepartmentData, color: e.target.value })}
                            style={{
                              width: 32,
                              height: 32,
                              border: 'none',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              background: 'transparent',
                              padding: 0,
                              opacity: 0
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#475467' }}>
                          {(editDepartmentData.color || '#4285F4').toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setEditDepartmentOpen(false);
                          setEditDepartmentError('');
                        }}
                        fullWidth
                        disabled={editDepartmentLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={editDepartmentLoading || !editDepartmentData.name.trim()}
                      >
                        {editDepartmentLoading ? <CircularProgress size={24} /> : 'Save Changes'}
                      </Button>
                    </Box>
                  </Box>
                </DialogContent>
              </Dialog>
            </Box>
          )}
          {selectedTab === 7 && (
            <Box>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mb: 4
              }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Activity Templates</Typography>
                <Button
                  variant="contained"
                  onClick={handleOpenCreateTemplate}
                  startIcon={<Typography sx={{ fontSize: '1.2rem', fontWeight: 700 }}>+</Typography>}
                  sx={{
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    fontSize: '0.875rem'
                  }}
                >
                  Add Template
                </Button>
              </Box>

              <Box>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 3
                }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', width: { xs: '100%', sm: 'auto' } }}>All Templates</Typography>
                  <FormControl sx={{ width: { xs: '100%', sm: 300 } }} size="small">
                    <Select
                      value={selectedDepartmentForTemplates}
                      onChange={(e) => setSelectedDepartmentForTemplates(e.target.value)}
                      displayEmpty
                      renderValue={(value) => {
                        if (!value) return 'All Departments';
                        const dept = departments.find(d => String(d.id ?? d._id) === String(value))
                        return dept?.name || 'All Departments';
                      }}
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                        color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828'
                      }}
                    >
                      <MenuItem value="">All Departments</MenuItem>
                      {departments.map(dept => (
                        <MenuItem key={dept.id ?? dept._id} value={dept.id ?? dept._id}>{dept.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {activityTemplates.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No activity templates found for the current selection.
                    </Alert>
                  ) : (
                    activityTemplates.map((template, idx) => (
                      <Paper
                        key={template.id || template._id || idx}
                        elevation={0}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: 2,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                          boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 2,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontSize: '1rem', mb: 0.5 }}>
                            {template.title || 'Untitled Template'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467' }}>
                            {(template.department?.branch?.name || template.department?.branch?.location || '')
                              ? `${template.department?.branch?.name || 'Branch'}${template.department?.name ? ` • ${template.department.name}` : ''}`
                              : (template.department?.name || '')}
                          </Typography>
                        </Box>

                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setTemplateMenuAnchor(e.currentTarget);
                            setSelectedTemplateForMenu(template);
                          }}
                          sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', '&:hover': { color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2' } }}
                        >
                          <MoreVert sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Paper>
                    ))
                  )}
                </Box>

                {/* Template Actions Menu */}
                <Menu
                  anchorEl={templateMenuAnchor}
                  open={Boolean(templateMenuAnchor)}
                  onClose={() => setTemplateMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      minWidth: 120
                    }
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      if (selectedTemplateForMenu) handleOpenEditTemplate(selectedTemplateForMenu);
                      setTemplateMenuAnchor(null);
                    }}
                    sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      if (selectedTemplateForMenu) handleDeleteTemplateAdmin(selectedTemplateForMenu.id || selectedTemplateForMenu._id);
                      setTemplateMenuAnchor(null);
                    }}
                    sx={{ fontSize: '14px', color: theme.palette.error.main }}
                  >
                    Delete
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          )}
          {selectedTab === 8 && (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 4,
                  mb: 4,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(26,32,44,0.95), rgba(17,25,40,0.95))'
                    : 'linear-gradient(135deg, #f6f9ff, #fbfcff)',
                  border: theme.palette.mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.05)'
                    : '1px solid rgba(15,23,42,0.08)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 20px 40px rgba(0,0,0,0.35)'
                    : '0 20px 45px rgba(15,23,42,0.08)'
                }}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: theme.palette.text.secondary }}>
                        Sessions Report
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        School Session Overview
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Track how many sessions have been conducted per school across the catalog.
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleResetSchoolSessionFilter}
                        disabled={schoolSessionStatsLoading}
                        sx={{ fontWeight: 700 }}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => refreshSchoolCatalogData()}
                        disabled={schoolSessionStatsLoading}
                        sx={{ fontWeight: 700 }}
                      >
                        {schoolSessionStatsLoading ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: 3,
                        background: theme.palette.mode === 'dark' ? 'rgba(15,23,42,0.8)' : '#fff'
                      }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Start date"
                            type="date"
                            value={schoolSessionStartDate}
                            onChange={(e) => setSchoolSessionStartDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="End date"
                            type="date"
                            value={schoolSessionEndDate}
                            onChange={(e) => setSchoolSessionEndDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth>
                            <Select
                              value={schoolSessionSchoolFilter}
                              onChange={(e) => {
                                const value = e.target.value === '__all__' ? '' : e.target.value
                                setSchoolSessionSchoolFilter(value)
                              }}
                              displayEmpty
                              renderValue={(selected) => {
                                if (!selected) {
                                  return <Typography color="text.secondary">School</Typography>
                                }
                                const school = schoolCatalog.find(
                                  sch => String(sch.id ?? sch._id) === String(selected)
                                )
                                return school?.name || 'School'
                              }}
                              sx={{
                                '& .MuiSelect-select': { py: 1.5 },
                                minWidth: 160
                              }}
                            >
                              <MenuItem value="" disabled sx={{ display: 'none' }}>
                                placeholder
                              </MenuItem>
                              <MenuItem value="__all__">
                                <em>All schools</em>
                              </MenuItem>
                              {schoolCatalog.map((school) => (
                                <MenuItem key={school.id || school._id} value={school.id || school._id}>
                                  {school.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth>
                            <Select
                              value={schoolSessionEmployeeFilter}
                              onChange={e => {
                                const value = e.target.value === '__all__' ? '' : e.target.value
                                setSchoolSessionEmployeeFilter(value)
                              }}
                              displayEmpty
                              renderValue={(selected) => {
                                if (!selected) {
                                  return <Typography color="text.secondary">Employee</Typography>
                                }
                                const employee = employees.find(
                                  emp => String(emp.employeeCode ?? emp._id) === String(selected)
                                )
                                return employee?.name || 'Employee'
                              }}
                              sx={{
                                '& .MuiSelect-select': { py: 1.5 },
                                minWidth: 160
                              }}
                            >
                              <MenuItem value="" disabled sx={{ display: 'none' }}>
                                placeholder
                              </MenuItem>
                              <MenuItem value="__all__">
                                <em>All employees</em>
                              </MenuItem>
                              {employees.map(emp => (
                                <MenuItem key={emp.employeeCode || emp._id} value={emp.employeeCode || emp._id}>
                                  {emp.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={handleApplySchoolSessionFilter}
                          disabled={schoolSessionStatsLoading}
                          sx={{ fontWeight: 700 }}
                        >
                          Apply Filter
                        </Button>
                      </Box>
                      {schoolSessionAppliedRange && (
                        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
                          Showing data for {schoolSessionRangeLabel}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>

                {schoolSessionStatsError && (
                  <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
                    {schoolSessionStatsError}
                  </Alert>
                )}

                <Box sx={{ mt: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: theme.palette.mode === 'dark' ? 'rgba(17,25,40,0.9)' : '#fff',
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(17, 17, 26, 0.08)'
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          Trainer Sessions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          List of trainers who conducted sessions in the selected window.
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Total Sessions (filtered)
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {schoolSessionStatsLoading ? '—' : trainerSessionTotal.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {schoolSessionRangeLabel}
                        </Typography>
                      </Box>
                    </Box>

                    {schoolSessionStatsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                      </Box>
                    ) : trainerSessionRows.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        No trainer session records found for the selected filters.
                      </Alert>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Trainer</TableCell>
                              <TableCell>Branch</TableCell>
                              <TableCell align="right">Sessions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {trainerSessionRows.map((trainer, idx) => (
                              <TableRow key={trainer.id || trainer.name || idx}>
                                <TableCell>
                                  <Typography fontWeight={600}>{trainer.name || 'Unassigned Trainer'}</Typography>
                                  {trainer.schools?.length > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                      {trainer.schools
                                        .map((school) => `${school.name} (${school.sessionCount})`)
                                        .join(', ')}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography>
                                    {trainer.branchName ? trainer.branchName : '—'}
                                  </Typography>
                                  {trainer.branchLocation && (
                                    <Typography variant="caption" color="text.secondary">
                                      {trainer.branchLocation}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                  {trainer.sessionCount?.toLocaleString() ?? 0}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Box>
              </Paper>

              <Box>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 4
                }}>
                  <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>School Catalog</Typography>
                  <Button
                    variant="contained"
                    onClick={() => handleOpenSchoolDialog()}
                    startIcon={<Typography sx={{ fontSize: '1.2rem', fontWeight: 700 }}>+</Typography>}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      fontSize: '0.875rem'
                    }}
                  >
                    Add School
                  </Button>
                </Box>

                {schoolCatalogError && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                    {schoolCatalogError}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {schoolCatalogLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : schoolCatalog.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                      No schools found in the catalog. Click "Add School" to get started.
                    </Alert>
                  ) : (
                    schoolCatalog.map((school, idx) => (
                      <Paper
                        key={school.id || school._id || idx}
                        elevation={0}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: 2,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                          boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 2,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828', fontSize: '1rem', mb: 0.5 }}>
                            {school.name || 'Unnamed School'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467' }}>
                            ID: {school.id || school._id || 'N/A'}
                          </Typography>
                        </Box>

                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setSchoolMenuAnchor(e.currentTarget);
                            setSelectedSchoolForMenu(school);
                          }}
                          sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', '&:hover': { color: theme.palette.mode === 'dark' ? '#4f6ef7' : '#1976d2' } }}
                        >
                          <MoreVert sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Paper>
                    ))
                  )}
                </Box>

                {/* School Actions Menu */}
                <Menu
                  anchorEl={schoolMenuAnchor}
                  open={Boolean(schoolMenuAnchor)}
                  onClose={() => setSchoolMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      minWidth: 120
                    }
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      if (selectedSchoolForMenu) handleOpenSchoolDialog(selectedSchoolForMenu);
                      setSchoolMenuAnchor(null);
                    }}
                    sx={{ fontSize: '14px', color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      if (selectedSchoolForMenu) handleConfirmDeleteSchool(selectedSchoolForMenu);
                      setSchoolMenuAnchor(null);
                    }}
                    sx={{ fontSize: '14px', color: theme.palette.error.main }}
                  >
                    Delete
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          )}
          {selectedTab === 9 && (
            <Box>
              <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#EAECF0'}` }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>Find a trainer</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>Search by employee name or ID, then narrow the list by department or branch.</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                  <TextField
                    size="small"
                    label="Search employee"
                    placeholder="Name or employee ID"
                    value={occupancyEmployeeSearch}
                    onChange={(event) => setOccupancyEmployeeSearch(event.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment> }}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select label="Department" value={occupancyDepartmentFilter} onChange={(event) => setOccupancyDepartmentFilter(event.target.value)}>
                      <MenuItem value="all">All departments</MenuItem>
                      {adminOccupancyDepartments.map(department => <MenuItem key={department} value={department}>{department}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Branch</InputLabel>
                    <Select label="Branch" value={occupancyBranchFilter} onChange={(event) => setOccupancyBranchFilter(event.target.value)}>
                      <MenuItem value="all">All branches</MenuItem>
                      {adminOccupancyBranches.map(branch => <MenuItem key={branch} value={branch}>{branch}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>

              <FormControl fullWidth>
                <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mb: 1 }}>Select Trainer</Typography>
                <Select
                  value={selectedTrainerForOccupancy}
                  onChange={(e) => setSelectedTrainerForOccupancy(e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) return <em>Choose a trainer</em>;
                    const trainer = employees.find(e => e.employeeCode === selected || e._id === selected);
                    return trainer?.name || 'Unknown Trainer';
                  }}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828'
                  }}
                >
                  <MenuItem value=""><em>Choose a trainer</em></MenuItem>
                  {filteredAdminOccupancyTrainers.map((trainer) => (
                    <MenuItem key={trainer.employeeCode || trainer._id} value={trainer.employeeCode || trainer._id}>
                      {trainer.name} ({trainer.employeeCode || 'No Code'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>{filteredAdminOccupancyTrainers.length} trainer{filteredAdminOccupancyTrainers.length === 1 ? '' : 's'} found</Typography>
              </Paper>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#94969C' : '#475467', mb: 1 }}>Select Week</Typography>
                <Select
                  value={selectedWeekStart}
                  onChange={(e) => setSelectedWeekStart(e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) return <em>Select a week</em>
                    const week = availableWeeks.find(w => w.start === selected)
                    return week?.label || selected
                  }}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828'
                  }}
                >
                  <MenuItem value=""><em>Select a week</em></MenuItem>
                  {availableWeeks.map((week) => (
                    <MenuItem key={week.start} value={week.start}>
                      {week.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!selectedTrainerForOccupancy || !selectedWeekStart ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Please select a trainer and week to view and manage the weekly occupancy schedule.</Alert>
              ) : (
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>Weekly Schedule</Typography>
                  <Paper elevation={0} sx={{ borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff', border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, overflow: 'hidden', mb: 3 }}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8f9fa' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>School</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                            const date = new Date(selectedWeekStart)
                            date.setDate(date.getDate() + index)
                            const dateStr = date.toISOString().split('T')[0]
                            const assignedSchoolId = trainerOccupancy[dateStr]
                            return (
                              <TableRow key={day}>
                                <TableCell sx={{ fontWeight: 600 }}>{day}</TableCell>
                                <TableCell>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</TableCell>
                                <TableCell>
                                  <Select
                                    value={assignedSchoolId || ''}
                                    onChange={(e) => setTrainerOccupancy(prev => ({ ...prev, [dateStr]: e.target.value || null }))}
                                    displayEmpty
                                    size="small"
                                    fullWidth
                                    disabled={schoolCatalogLoading}
                                    renderValue={(s) => !s ? <Typography sx={{ color: 'text.secondary' }}>Not Assigned</Typography> : (schoolCatalog.find(x => String(x.id || x._id) === String(s))?.name || 'Unknown')}
                                  >
                                    <MenuItem value=""><em>Not Assigned</em></MenuItem>
                                    {schoolCatalog.map(s => <MenuItem key={s.id || s._id} value={s.id || s._id}>{s.name}</MenuItem>)}
                                  </Select>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={saveTrainerOccupancy}
                      disabled={occupancySaving || schoolCatalogLoading}
                      startIcon={occupancySaving ? <CircularProgress size={16} /> : null}
                      sx={{ fontWeight: 600 }}
                    >
                      {occupancySaving ? 'Saving...' : 'Save Assignments'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}




          {/* School Dialog */}
          <Dialog
            open={schoolDialogOpen}
            onClose={handleCloseSchoolDialog}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit'
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, fontSize: 24 }}>
              {editingSchool ? 'Edit School' : 'Add School'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="School Name"
                  required
                  fullWidth
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  placeholder="Enter school name Weekend name"
                  autoFocus
                  error={!!schoolDialogError}
                  helperText={schoolDialogError}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                onClick={handleCloseSchoolDialog}
                sx={{ fontWeight: 700 }}
                disabled={schoolSaving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveSchool}
                sx={{ fontWeight: 700 }}
                disabled={schoolSaving}
              >
                {schoolSaving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                {editingSchool ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete School Confirmation Dialog */}
          <Dialog
            open={deleteSchoolConfirm.open}
            onClose={() => setDeleteSchoolConfirm({ open: false, school: null })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit'
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, fontSize: 24, color: 'error.main' }}>
              Delete School
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Are you sure you want to delete this school? This action cannot be undone.
                </Alert>
                <Typography variant="body1" fontWeight={600}>
                  {deleteSchoolConfirm.school?.name || 'Unnamed School'}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                onClick={() => setDeleteSchoolConfirm({ open: false, school: null })}
                sx={{ fontWeight: 700 }}
                disabled={deleteSchoolLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteSchool}
                sx={{ fontWeight: 700 }}
                disabled={deleteSchoolLoading}
              >
                {deleteSchoolLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={templateDialogOpen}
            onClose={() => {
              setTemplateDialogOpen(false)
              setTemplateTitle('')
              setEditingTemplate(null)
            }}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                color: theme.palette.mode === 'dark' ? '#fff' : 'inherit'
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, fontSize: 24 }}>
              {editingTemplate ? 'Edit Activity Template' : 'Add Activity Template'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                {!editingTemplate && (
                  <FormControl fullWidth required>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={selectedDepartmentForTemplates}
                      label="Department"
                      onChange={(e) => setSelectedDepartmentForTemplates(e.target.value)}
                    >
                      {templatesDepartmentsForSelectedBranch.map(dept => (
                        <MenuItem key={dept.id ?? dept._id} value={dept.id ?? dept._id}>{dept.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <TextField
                  label="Template Title"
                  required
                  fullWidth
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="Enter activity template title"
                  autoFocus
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                onClick={() => {
                  setTemplateDialogOpen(false)
                  setTemplateTitle('')
                  setEditingTemplate(null)
                }}
                sx={{ fontWeight: 700 }}
              >
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveTemplateAdmin} sx={{ fontWeight: 700 }}>
                Save
              </Button>
            </DialogActions>
          </Dialog>

          {selectedTab === 11 && (
            <Box>
              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, mb: 4, background: theme.palette.mode === 'dark' ? 'linear-gradient(135deg, rgba(26,32,44,0.95), rgba(17,25,40,0.95))' : 'linear-gradient(135deg, #f6f9ff, #fbfcff)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(15,23,42,0.08)', boxShadow: theme.palette.mode === 'dark' ? '0 20px 40px rgba(0,0,0,0.35)' : '0 20px 45px rgba(15,23,42,0.08)' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: theme.palette.text.secondary }}>Feature Management</Typography>
                  <Typography variant="h4" fontWeight={800}>Department Tool Access</Typography>
                  <Typography variant="body1" color="text.secondary">Configure which tools are available to each department</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Button
                      component="a"
                      href={REPORTCARD_ADMIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      endIcon={<ArrowForward />}
                      sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                      Open OMO Report Admin
                    </Button>
                  </Box>
                </Box>

                <TextField fullWidth placeholder="Search departments..." value={toolAssignmentsSearch} onChange={(e) => setToolAssignmentsSearch(e.target.value)} sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2, background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' } }} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: theme.palette.mode === 'dark' ? '#888' : '#666' }} /></InputAdornment> }} />

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Select Department</InputLabel>
                  <Select value={selectedDeptForTools} onChange={(e) => setSelectedDeptForTools(e.target.value)} label="Select Department" sx={{ borderRadius: 2 }}>
                    <MenuItem value=""><em>Choose a department to configure...</em></MenuItem>
                    {Object.entries(toolAssignments).sort(([, a], [, b]) => (a.departmentName || '').localeCompare(b.departmentName || '')).map(([deptId, dept]) => <MenuItem key={deptId} value={deptId}>{dept.departmentName || `Department ${deptId}`}</MenuItem>)}
                  </Select>
                </FormControl>

                {selectedDeptForTools && toolAssignments[selectedDeptForTools] && (() => {
                  const deptId = selectedDeptForTools; const dept = toolAssignments[deptId]; const colors = ['#8a64ff', '#38f9d7', '#f093fb', '#4facfe', '#f6d365']; const color = colors[parseInt(deptId) % colors.length]; const roleLabels = { employee: 'Employee', teamlead: 'Team Lead', manager: 'Manager', admin: 'Admin' }; const roleColors = { employee: '#8a64ff', teamlead: '#38f9d7', manager: '#f093fb', admin: '#4facfe' };
                  return (
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, background: theme.palette.mode === 'dark' ? 'rgba(17,25,40,0.8)' : '#fff', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                        <Typography variant="h6" fontWeight={700}>{dept.departmentName || `Department ${deptId}`}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {['employee', 'teamlead', 'manager', 'admin'].map((role) => (
                          <Paper key={role} elevation={0} sx={{ p: 2, borderRadius: 2, background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: roleColors[role] }} />
                                <Typography fontWeight={600} sx={{ fontSize: 14 }}>{roleLabels[role]}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Checkbox checked={dept?.[role]?.workbook ?? true} onChange={(e) => { setToolAssignments(prev => ({ ...prev, [deptId]: { ...prev[deptId], [role]: { ...prev[deptId]?.[role], workbook: e.target.checked } } })) }} sx={{ color: '#8a64ff', '&.Mui-checked': { color: '#8a64ff' } }} />
                                  <Typography variant="body2">Workbook</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Checkbox checked={dept?.[role]?.reportCard ?? true} onChange={(e) => { setToolAssignments(prev => ({ ...prev, [deptId]: { ...prev[deptId], [role]: { ...prev[deptId]?.[role], reportCard: e.target.checked } } })) }} sx={{ color: '#38f9d7', '&.Mui-checked': { color: '#38f9d7' } }} />
                                  <Typography variant="body2">Report Card</Typography>
                                </Box>
                              </Box>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    </Paper>
                  );
                })()}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                  <Button variant="outlined" onClick={async () => { setToolAssignmentsLoading(true); try { const res = await axios.post(`${apiBaseUrl}/api/admin/tool-assignments/reset`, {}, { withCredentials: true }); setToolAssignments(res.data.assignments); setSnackbar({ open: true, message: 'Settings reset to defaults for all departments', severity: 'info' }); } catch (err) { setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to reset tool assignments', severity: 'error' }); } finally { setToolAssignmentsLoading(false); } }} sx={{ fontWeight: 700, borderRadius: 2 }} disabled={toolAssignmentsLoading}>Reset Defaults</Button>
                  <Button variant="contained" onClick={async () => { setToolAssignmentsLoading(true); try { await axios.post(`${apiBaseUrl}/api/admin/tool-assignments`, toolAssignments, { withCredentials: true }); setSnackbar({ open: true, message: 'Tool assignments saved successfully!', severity: 'success' }); } catch (err) { setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to save tool assignments', severity: 'error' }); } finally { setToolAssignmentsLoading(false); } }} sx={{ fontWeight: 700, borderRadius: 2 }} disabled={toolAssignmentsLoading}>{toolAssignmentsLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}Save Changes</Button>
                </Box>
              </Paper>
            </Box>
          )}

          {selectedTab === 10 && (
            <Box>
              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, mb: 4, background: theme.palette.mode === 'dark' ? 'linear-gradient(135deg, rgba(26,32,44,0.95), rgba(17,25,40,0.95))' : 'linear-gradient(135deg, #f6f9ff, #fbfcff)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(15,23,42,0.08)', boxShadow: theme.palette.mode === 'dark' ? '0 20px 40px rgba(0,0,0,0.35)' : '0 20px 45px rgba(15,23,42,0.08)' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: theme.palette.text.secondary }}>Team Lead Administration</Typography>
                  <Typography variant="h4" fontWeight={800}>Assign Employees to Team Leads</Typography>
                  <Typography variant="body1" color="text.secondary">Select a department, choose a team lead, and assign employees from that department.</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md="auto">
                    <FormControl sx={{ mb: 2, width: 100 }}>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={selectedDepartmentForLead}
                        label="Department"
                        onChange={(e) => {
                          setSelectedDepartmentForLead(e.target.value)
                          setSelectedTeamLeadCode('')
                          setTeamLeadEmployeeSearch('')
                        }}
                      >
                        <MenuItem value=""><em>Select department</em></MenuItem>
                        {departments.filter(dept => (teamLeadsByDepartment[dept.id] || []).length > 0).map(dept => (
                          <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md="auto">
                    <FormControl sx={{ mb: 2, width: 400 }}>
                      <InputLabel>Team Lead</InputLabel>
                      <Select
                        value={selectedTeamLeadCode}
                        label="Team Lead"
                        onChange={(e) => setSelectedTeamLeadCode(e.target.value)}
                      >
                        <MenuItem value=""><em>Select a team lead</em></MenuItem>
                        {(teamLeadsByDepartment[selectedDepartmentForLead] || []).map(lead => (
                          <MenuItem key={lead.employeeCode} value={lead.employeeCode}>{lead.name} ({lead.employeeCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {assignmentError && (
                  <Alert severity="error" sx={{ mt: 2 }}>{assignmentError}</Alert>
                )}
                {/* Changes here */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        background:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.03)'
                            : '#fff',
                        border:
                          theme.palette.mode === 'dark'
                            ? '1px solid rgba(255,255,255,0.08)'
                            : '1px solid rgba(15,23,42,0.08)'
                      }}
                    >
                      <Box
                        sx={{
                          px: 3,
                          py: 2.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            Department Employees
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            Assign or remove employees from the selected team lead
                          </Typography>
                        </Box>

                        <TextField
                          size="small"
                          placeholder="Search name or code"
                          value={teamLeadEmployeeSearch}
                          onChange={(e) => setTeamLeadEmployeeSearch(e.target.value)}
                          sx={{ width: { xs: '100%', sm: 280 } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search fontSize="small" />
                              </InputAdornment>
                            )
                          }}
                        />

                        <Typography
                          variant="body2"
                          sx={{
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            bgcolor: 'primary.main',
                            color: '#fff',
                            fontWeight: 600
                          }}
                        >
                          {
                            employees.filter(
                              emp =>
                                emp.role === 'employee' &&
                                String(emp.departmentId) ===
                                String(selectedDepartmentForLead) &&
                                (`${emp.name || ''} ${emp.employeeCode || ''}`.toLowerCase().includes(teamLeadEmployeeSearch.toLowerCase()))
                            ).length
                          } Employees
                        </Typography>
                      </Box>

                      <TableContainer sx={{ maxHeight: 650 }}>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>Employee Name</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Employee Code</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Current Team Lead</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                              <TableCell
                                align="center"
                                sx={{ fontWeight: 700, width: 150 }}
                              >
                                Action
                              </TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {employees
                              .filter(
                                emp =>
                                  emp.role === 'employee' &&
                                  String(emp.departmentId) ===
                                  String(selectedDepartmentForLead) &&
                                  emp.employeeCode !== selectedTeamLeadCode &&
                                  (`${emp.name || ''} ${emp.employeeCode || ''}`.toLowerCase().includes(teamLeadEmployeeSearch.toLowerCase()))
                              )
                              .map(emp => {
                                const isAssignedToCurrentLead =
                                  emp.teamLeadId === selectedTeamLeadCode

                                return (
                                  <TableRow hover key={emp.employeeCode}>
                                    <TableCell>
                                      <Typography fontWeight={600}>
                                        {emp.name}
                                      </Typography>
                                    </TableCell>

                                    <TableCell>{emp.employeeCode}</TableCell>

                                    <TableCell>{emp.email}</TableCell>

                                    <TableCell>
                                      {emp.teamLeadId ? `${employees.find(
                                        lead => lead.employeeCode === emp.teamLeadId
                                      )?.name || 'Unknown'} (${emp.teamLeadId})` : 'Unassigned'}
                                    </TableCell>

                                    <TableCell>
                                      <Typography
                                        sx={{
                                          display: 'inline-block',
                                          px: 1.5,
                                          py: 0.5,
                                          borderRadius: 5,
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          bgcolor: isAssignedToCurrentLead
                                            ? 'success.light'
                                            : 'warning.light',
                                          color: isAssignedToCurrentLead
                                            ? 'success.dark'
                                            : 'warning.dark'
                                        }}
                                      >
                                        {isAssignedToCurrentLead
                                          ? 'Assigned'
                                          : 'Available'}
                                      </Typography>
                                    </TableCell>

                                    <TableCell align="center">
                                      {isAssignedToCurrentLead ? (
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          size="small"
                                          disabled={
                                            !selectedTeamLeadCode ||
                                            assignmentLoading
                                          }
                                          onClick={() =>
                                            updateEmployeeTeamLead(emp, null)
                                          }
                                        >
                                          Remove
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="contained"
                                          size="small"
                                          disabled={
                                            !selectedTeamLeadCode ||
                                            assignmentLoading
                                          }
                                          onClick={() =>
                                            updateEmployeeTeamLead(
                                              emp,
                                              selectedTeamLeadCode
                                            )
                                          }
                                        >
                                          Assign
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}

                            {employees.filter(
                              emp =>
                                emp.role === 'employee' &&
                                String(emp.departmentId) ===
                                String(selectedDepartmentForLead) &&
                                emp.employeeCode !== selectedTeamLeadCode &&
                                (`${emp.name || ''} ${emp.employeeCode || ''}`.toLowerCase().includes(teamLeadEmployeeSearch.toLowerCase()))
                            ).length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={6}
                                    align="center"
                                    sx={{ py: 5 }}
                                  >
                                    No employees found in this department.
                                  </TableCell>
                                </TableRow>
                              )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}

          {selectedTab === 13 && <SchoolActivityMailSettings isAdmin />}

          {selectedTab === 14 && <SchoolReport isAdmin />}

          {selectedTab === 12 && (
            <Box>
              <PMProjectsManagement page={projectPage} />
            </Box>
          )}

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard; 
