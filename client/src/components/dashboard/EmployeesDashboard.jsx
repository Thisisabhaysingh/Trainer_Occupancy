import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AutoCarousel from './AutoCarousel';
import TrainerLeaderboard from './TrainerLeaderboard';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Collapse, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { AccessTime, ArrowDropDown, ArrowUpward, ArrowDownward, Login, MoreTime, Search as SearchIcon, Schedule as ClockIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import axios from 'axios';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const COLORS = ['#4285F4', '#34A853', '#A142F4', '#fbc02d', '#e53935'];
const DEPT_COLORS = { Coding: '#4285F4', Mechatronics: '#34A853', Electronics: '#A142F4' };
const getTodayDateString = () => { const date=new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
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


const EmployeeCard = ({
  employee,
  expanded,
  onExpand,
  analyticsData,
  sessionDistributionData,
  loading,
  selectedDate,
  pendingDate,
  onDateChange,
  onApplyDate,
  onResetDate
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const resolvedDate = selectedDate || getTodayDateString();

  const targetDate = useMemo(() => {
    const [year, month, day] = (resolvedDate || '').split('-').map(Number);

    if (!year || !month || !day) return null;
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }, [resolvedDate]);

  const isSameDay = useCallback((value) => {
    if (!targetDate) return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    date.setHours(0, 0, 0, 0);
    return date.getTime() === targetDate.getTime();
  }, [targetDate]);

  let todayWorkday = null;
  if (analyticsData && analyticsData.workdays) {
    todayWorkday = analyticsData.workdays.find(w => isSameDay(w.date));
  }

  let filteredActivities = [];
  let todayHours = 0;
  if (analyticsData && Array.isArray(analyticsData.activities)) {
    filteredActivities = analyticsData.activities.map(act => {
      const todaysEntries = (act.timeEntries || []).filter(te => isSameDay(te.date));

      const totalMinutes = todaysEntries.reduce((sum, te) => sum + (te?.duration || 0), 0);
      return {
        ...act,
        totalMinutes,
        timeEntries: todaysEntries
      };
    }).filter(act => act.timeEntries.length > 0);
    todayHours = filteredActivities.reduce((sum, act) => sum + act.totalMinutes, 0) / 60;
  } else if (analyticsData && typeof analyticsData.totalHours === 'number') {
    todayHours = analyticsData.totalHours;
  }

  const todayActivities = filteredActivities;

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

  const formattedTargetDate = useMemo(() => {
    if (!targetDate) return '';
    return targetDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [targetDate]);

  const inputDateValue = pendingDate ?? resolvedDate;
  const canApply = Boolean(inputDateValue);
  const isCustomDateSelected = selectedDate && selectedDate !== getTodayDateString();

  // Calculate today's session distribution from today's activities
  const todaySessionCounts = { offlineInstitute: 0, onlineInstitute: 0, school: 0 };
  (todayActivities || []).forEach(act => {
    if (act.title === 'Total No. of Sessions') {

      const instituteCount = Number(act.institute || 0);
      const schoolCount = Number(act.school || 0);
      if (act.sessionType === 'Offline' && instituteCount > 0) todaySessionCounts.offlineInstitute += instituteCount;
      if (act.sessionType === 'Online' && instituteCount > 0) todaySessionCounts.onlineInstitute += instituteCount;
      if (schoolCount > 0) todaySessionCounts.school += schoolCount;
    }
  });

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
          gap: 2,
          cursor: 'pointer',
          bgcolor: isDarkMode ? 'rgba(35,39,47,0.95)' : '#fff',
          color: isDarkMode ? '#fff' : '#222',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: isDarkMode ? 'rgba(44,48,56,0.95)' : '#f8fbff'
          }
        }}
        role="button" tabIndex={0} aria-expanded={expanded} aria-label={`View activities for ${employee.name}`}
        onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onExpand(); } }}
        onClick={onExpand}
      >
        <Avatar sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(56,249,215,0.15)' : '#e3e8f7', 
          color: theme.palette.mode === 'dark' ? '#38f9d7' : '#4f6ef7', 
          fontWeight: 700, 
          width: 48, 
          height: 48, 
          fontSize: 20 
        }}>
          {employee.initials}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} color="inherit">{employee.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DEPT_COLORS[employee.department] || '#34A853', mr: 1 }} />
            <Typography 
              variant="caption" 
              sx={{ 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f6fa', 
                px: 1, 
                borderRadius: 1,
                color: theme.palette.mode === 'dark' ? '#fff' : '#222'
              }}
            >
              {employee.department}
            </Typography>
            {employee.branch && (
              <Typography 
                variant="caption" 
                sx={{ 
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#e3f2fd', 
                  px: 1, 
                  borderRadius: 1,
                  color: theme.palette.mode === 'dark' ? '#fff' : '#1565c0',
                  fontWeight: 600
                }}
              >
                {employee.branch.name}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right', minWidth: 90 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme.palette.mode === 'dark' ? '#888' : '#666' }}>
            <AccessTime sx={{ fontSize: 18, color: 'inherit' }} /> {analyticsData ? `${todayHours.toFixed(1)}h` : '--'}
          </Typography>
          <Typography variant="body2" sx={{ color: arrowColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {arrow}
          </Typography>
        </Box>
        <IconButton aria-label={`Toggle activities for ${employee.name}`} size="small" sx={{ ml: 1, color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>
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
            bgcolor: isDarkMode ? 'rgba(35,39,47,0.95)' : '#f8fbff',
            color: isDarkMode ? '#fff' : '#222',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
              <CircularProgress />
            </Box>
          ) : analyticsData?.error ? (
            <Alert severity="error">{analyticsData.error}</Alert>
          ) : analyticsData && analyticsData.employee ? (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  gap: 2,
                  mb: 3
                }}
              >
                <TextField
                  type="date"
                  size="small"
                  value={inputDateValue || ''}
                  onChange={e => onDateChange?.(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  label="Select Date"
                  sx={{ minWidth: { xs: '100%', sm: 200 } }}
                  disabled={loading}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onApplyDate?.()}
                    disabled={!canApply || loading}
                    sx={{ fontWeight: 600 }}
                  >
                    Apply
                  </Button>
                  {isCustomDateSelected && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onResetDate?.()}
                      disabled={loading}
                      sx={{ fontWeight: 600 }}
                    >
                      Reset
                    </Button>
                  )}
                </Stack>
                <Chip
                  color="primary"
                  variant="outlined"
                  label={`Showing data for ${formattedTargetDate || 'selected date'}`}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 180 }}>
                  <Typography fontWeight={700} color="inherit">{analyticsData.employee.name}</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color={theme.palette.mode === 'dark' ? '#888' : '#666'}>Shift Type</Typography>
                    <Typography fontWeight={700} color="inherit">
                      {todayWorkday?.attendanceType === 'full_day' ? 'Full Day' : 
                       todayWorkday?.attendanceType === 'half_day' ? 'Half Day' : 
                       todayWorkday?.attendanceType === 'leave' ? 'Leave' : '--'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color={theme.palette.mode === 'dark' ? '#888' : '#666'}>Total Hours</Typography>
                    <Typography fontWeight={700} color="inherit">{todayHours.toFixed(1)}h</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color={theme.palette.mode === 'dark' ? '#888' : '#666'}>Productivity</Typography>
                    <Typography fontWeight={700} color="inherit">
                      {todayWorkday?.attendanceType === 'leave' ? 'On Leave' : 
                       todayWorkday?.standardHours > 0 ? 
                       `${Math.round((todayHours / todayWorkday.standardHours) * 100)}%` : '--'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color={theme.palette.mode === 'dark' ? '#888' : '#666'}>Branch</Typography>
                    <Typography fontWeight={700} color="inherit">
                      {employee.branch ? employee.branch.name : 'Not Assigned'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(180px, 1fr) minmax(0, 3fr)' }, gap: 3, mt: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} color="inherit" sx={{ mb: 2 }}>Time Spent by Activity</Typography>
                  {(todayActivities || []).map((act, idx) => (
                    <Box 
                      key={act.title + idx} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        mb: 2, 
                        p: 1.5, 
                        borderRadius: 2, 
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                        <Typography 
                          fontWeight={600} 
                          color="inherit"
                          sx={{ 
                            whiteSpace: 'nowrap', 
                            maxWidth: 160, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                          }}
                        >
                          {act.title}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', minWidth: 60 }}>
                        <Typography fontWeight={700} color="inherit">{(act.totalMinutes / 60).toFixed(1)}h</Typography>
                        <Typography variant="caption" color={theme.palette.mode === 'dark' ? '#888' : '#666'}>
                          {todayHours > 0 ? Math.round((act.totalMinutes / (todayHours * 60)) * 100) : 0}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ minWidth: 0 }}>
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
                        p: 3,
                        minWidth: { xs: 260, sm: 280 },
                        maxWidth: 500,
                        overflowX: 'auto',
                        mb: { xs: 2, sm: 0 },
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                        borderRadius: 2,
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        boxShadow: theme.palette.mode === 'dark' ? 'none' : 1
                      }}
                    >
                      <Typography fontWeight={700} color="inherit" sx={{ mb: 2, textAlign: 'center' }}>Activity Distribution</Typography>
                      <ResponsiveContainer width="100%" height={250} minWidth={260}>
                        <PieChart>
                          <Pie
                            data={(todayActivities || []).filter(act => act.totalMinutes > 0)}
                            dataKey="totalMinutes"
                            nameKey="title"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
                            labelLine={false}
                            label={renderCustomizedLabel}
                          >
                            {(todayActivities || []).filter(act => act.totalMinutes > 0).map((act) => {
                              const originalIndex = (todayActivities || []).findIndex(a => a.title === act.title);
                              return <Cell key={`cell-act-${act.title}`} fill={COLORS[originalIndex % COLORS.length]} />;
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              color: theme.palette.mode === 'dark' ? '#fff' : '#222'
                            }} 
                            formatter={(value) => `${(value / 60).toFixed(2)} hours`} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        p: 3,
                        minWidth: { xs: 260, sm: 280 },
                        maxWidth: 500,
                        overflowX: 'auto',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                        borderRadius: 2,
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        boxShadow: theme.palette.mode === 'dark' ? 'none' : 1
                      }}
                    >
                      <Typography fontWeight={700} color="inherit" sx={{ mb: 2, textAlign: 'center' }}>Session Distribution</Typography>
                      <ResponsiveContainer width="100%" height={250} minWidth={260}>
                        <PieChart>
                          <Pie
                            data={(() => {
                              if (sessionDistributionData) {
                                return [
                                  { name: 'Offline Institute Session', value: sessionDistributionData.offlineInstitute || 0 },
                                  { name: 'Online Institute Session', value: sessionDistributionData.onlineInstitute || 0 },
                                  { name: 'School Session', value: sessionDistributionData.school || 0 },
                                ].filter(item => item.value > 0);
                              } else {
                                return [
                                  { name: 'Offline Institute Session', value: todaySessionCounts.offlineInstitute || 0 },
                                  { name: 'Online Institute Session', value: todaySessionCounts.onlineInstitute || 0 },
                                  { name: 'School Session', value: todaySessionCounts.school || 0 },
                                ].filter(item => item.value > 0);
                              }
                            })()}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
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
                                ));
                              } else {
                                return [
                                  { name: 'Offline Institute Session', value: todaySessionCounts.offlineInstitute || 0, color: '#00C49F' },
                                  { name: 'Online Institute Session', value: todaySessionCounts.onlineInstitute || 0, color: '#FF8042' },
                                  { name: 'School Session', value: todaySessionCounts.school || 0, color: '#0088FE' },
                                ].filter(item => item.value > 0).map((entry, index) => (
                                  <Cell key={`cell-session-${index}`} fill={entry.color} />
                                ));
                              }
                            })()}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: theme.palette.mode === 'dark' ? '#23272f' : '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              color: theme.palette.mode === 'dark' ? '#fff' : '#222'
                            }} 
                            formatter={(value) => `${value} sessions`} 
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => (
                              <span style={{ color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : null}
        </Paper>
      </Collapse>
    </Box>
  );
};



export default function EmployeesDashboard({ analytics }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const darkCardBg = isDarkMode ? 'rgba(35,39,47,0.95)' : '#fff';
  const [search, setSearch] = useState('');
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState({});
  const [employeeLoading, setEmployeeLoading] = useState({});
  const [employeeDateFilters, setEmployeeDateFilters] = useState({});
  const controllers = useRef(new Map());
  const fetchEmployee = useCallback(async (code, date = getTodayDateString()) => {
    controllers.current.get(code)?.abort();
    const controller = new AbortController();
    controllers.current.set(code, controller);
    setEmployeeLoading(previous => ({ ...previous, [code]: true }));
    try {
      const {data} = await axios.get(`${apiBaseUrl}/api/manager/employee/${encodeURIComponent(code)}/analytics`, {params:{date}, withCredentials:true, signal:controller.signal});
      if (!controller.signal.aborted) setEmployeeAnalytics(previous => ({...previous, [code]:data}));
    } catch (error) {
      if (!controller.signal.aborted) setEmployeeAnalytics(previous => ({...previous, [code]:{error:error.response?.data?.error || 'Could not load employee activities'}}));
    } finally {
      if (!controller.signal.aborted) setEmployeeLoading(previous => ({...previous,[code]:false}));
    }
  }, []);
  useEffect(() => { const current = controllers.current; return () => { current.forEach(controller => controller.abort()); current.clear(); }; }, []);
  const initialEmployees = (analytics?.employees || []).slice(0,5).map(employee=>employee.employeeCode).filter(Boolean).join(',');
  useEffect(() => { initialEmployees.split(',').filter(Boolean).forEach(code => fetchEmployee(code)); }, [initialEmployees, fetchEmployee]);
  const handleExpandEmployee = code => {
    setExpandedEmployee(previous => previous === code ? null : code);
    if (expandedEmployee !== code && (!employeeAnalytics[code] || employeeAnalytics[code].error)) fetchEmployee(code, employeeDateFilters[code]?.selected);
  };
  const handleEmployeeDateChange = (code, value) => setEmployeeDateFilters(previous => ({...previous,[code]:{selected:previous[code]?.selected || getTodayDateString(),pending:value}}));
  const handleApplyEmployeeDate = code => { const date=employeeDateFilters[code]?.pending || getTodayDateString(); setEmployeeDateFilters(previous => ({...previous,[code]:{selected:date,pending:date}})); fetchEmployee(code,date); };
  const handleResetEmployeeDate = code => { const date=getTodayDateString(); setEmployeeDateFilters(previous => ({...previous,[code]:{selected:date,pending:date}})); fetchEmployee(code,date); };
  return (<Box>
            {/* Employee Summary Cards - Styled like Overview Stats Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
              {/* Card 1: Clocked In Today + trainer leaderboard carousel */}
              <AutoCarousel
                interval={6000}
                slides={[
                  { key: 'clockedin', label: 'clocked in today', content: (
                    <Paper
                      elevation={0}
                      sx={{
                        width: '100%',
                        borderRadius: 3,
                        overflow: 'hidden',
                        bgcolor: darkCardBg,
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#D1E6FF'}`,
                        boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                      }}
                    >
                      {/* Top colored border with arc effect - Blue */}
                      <Box sx={{
                        height: 4,
                        bgcolor: '#0070F0',
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
                          bgcolor: '#0070F0',
                          borderRadius: '0 0 16px 16px'
                        }
                      }} />
                      <Box sx={{ p: 3, pt: 2.5 }}>
                        <Typography variant="body2" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', fontSize: '14px', fontWeight: 500, mb: 1.5 }}>
                          Clocked In Today
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                            <Typography variant="h3" sx={{ fontSize: '36px', fontWeight: 700, color: isDarkMode ? '#F2F4F7' : '#101828', lineHeight: 1.2 }}>
                              {analytics?.clockedInToday || 0}
                            </Typography>
                            <Typography variant="h5" sx={{ fontSize: '20px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#667085' }}>
                              / {analytics?.totalExpectedEmployees || 0}
                            </Typography>
                          </Box>
                          <Avatar sx={{ width: 44, height: 44, bgcolor: '#F5FAFF', color: '#0070F0' }}>
                            <Login />
                          </Avatar>
                        </Box>
                        {/* Full/Half/Leave row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                          <Box sx={{ textAlign: 'center', flex: 1 }}>
                            <Typography variant="caption" sx={{ color: '#12B76A', fontWeight: 600, display: 'block', mb: 0.5 }}>Full Day</Typography>
                            <Typography fontWeight={700} sx={{ color: isDarkMode ? '#F2F4F7' : '#101828' }}>{analytics?.clockedInFullDayToday ?? 0}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center', flex: 1 }}>
                            <Typography variant="caption" sx={{ color: '#F79009', fontWeight: 600, display: 'block', mb: 0.5 }}>Half Day</Typography>
                            <Typography fontWeight={700} sx={{ color: isDarkMode ? '#F2F4F7' : '#101828' }}>{analytics?.clockedInHalfDayToday ?? 0}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center', flex: 1 }}>
                            <Typography variant="caption" sx={{ color: '#F04438', fontWeight: 600, display: 'block', mb: 0.5 }}>On Leave</Typography>
                            <Typography fontWeight={700} sx={{ color: isDarkMode ? '#F2F4F7' : '#101828' }}>{analytics?.onLeaveToday ?? 0}</Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#0070F0', textAlign: 'center', fontWeight: 500 }}>
                          {analytics?.attendanceRate ? `${analytics.attendanceRate}% attendance rate` : ''}
                        </Typography>
                      </Box>
                    </Paper>
                  ) },
                  { key: 'leaderboard', label: 'trainer leaderboard', content: (
                    <TrainerLeaderboard
                      viewerMode="manager"
                      accentColor="#D4AF37"
                      cardSx={{ borderRadius: 3, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#FEF0C7'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}
                      titleSx={{ fontSize: '14px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#667085' }}
                    />
                  ) },
                ]}
              />

              {/* Card 2: Avg Check-in Time */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: darkCardBg,
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#FEF0C7'}`,
                  boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                }}
              >
                {/* Top colored border with arc effect - Orange */}
                <Box sx={{
                  height: 4,
                  bgcolor: '#F79009',
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
                    bgcolor: '#F79009',
                    borderRadius: '0 0 16px 16px'
                  }
                }} />
                <Box sx={{ p: 3, pt: 2.5 }}>
                  <Typography variant="body2" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', fontSize: '14px', fontWeight: 500, mb: 1.5 }}>
                    Avg Check-in Time
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h3" sx={{ fontSize: '36px', fontWeight: 700, color: isDarkMode ? '#F2F4F7' : '#101828', lineHeight: 1.2 }}>
                      {analytics?.avgCheckInTime || '--'}
                    </Typography>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: '#FFFCF5', color: '#F79009' }}>
                      <ClockIcon />
                    </Avatar>
                  </Box>
                  <Typography variant="body2" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', mt: 2, fontWeight: 500 }}>
                    {analytics?.checkInDelta || ''}
                  </Typography>
                </Box>
              </Paper>

              {/* Card 3: Overtime Hours */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: darkCardBg,
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#D1FADF'}`,
                  boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
                }}
              >
                {/* Top colored border with arc effect - Green */}
                <Box sx={{
                  height: 4,
                  bgcolor: '#12B76A',
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
                    bgcolor: '#12B76A',
                    borderRadius: '0 0 16px 16px'
                  }
                }} />
                <Box sx={{ p: 3, pt: 2.5 }}>
                  <Typography variant="body2" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', fontSize: '14px', fontWeight: 500, mb: 1.5 }}>
                    Overtime Hours
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h3" sx={{ fontSize: '36px', fontWeight: 700, color: isDarkMode ? '#F2F4F7' : '#101828', lineHeight: 1.2 }}>
                      {analytics?.overtimeHours || 0}h
                    </Typography>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: '#F6FEF9', color: '#12B76A' }}>
                      <MoreTime />
                    </Avatar>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#0070F0', mt: 2, fontWeight: 500 }}>
                    This week total
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* Employee List */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Team Members</Typography>
                <TextField
                  fullWidth
                  placeholder="Search employees by name, code, department or branch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    bgcolor: darkCardBg,
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      color: theme.palette.text.primary,
                      '& fieldset': {
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                      }
                    }
                  }}
                />
              </Box>

              {!(analytics?.employees || []).some(employee => `${employee.name || ''} ${employee.employeeCode || ''} ${typeof employee.department === 'string' ? employee.department : employee.department?.name || ''} ${typeof employee.branch === 'string' ? employee.branch : employee.branch?.name || ''}`.toLowerCase().includes(search.toLowerCase())) && <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No employees found.</Typography>}
              {/* Existing Employee Cards */}
              <Box>
                {(analytics?.employees || [])
                  .filter(emp => `${emp.name || ''} ${emp.employeeCode || ''} ${typeof emp.department === 'string' ? emp.department : emp.department?.name || ''} ${typeof emp.branch === 'string' ? emp.branch : emp.branch?.name || ''}`.toLowerCase().includes(search.toLowerCase()))
                  .map((emp, idx) => (
                    <EmployeeCard
                      key={emp.employeeCode || emp.id || emp._id || `employee-${idx}`}
                      employee={{
                        ...emp,
                        initials: (emp.name || '').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase(),
                        branch: typeof emp.branch === 'string' ? { name: emp.branch } : emp.branch,
                        department: typeof emp.department === 'string' ? emp.department : emp.department?.name || analytics?.department || '',
                      }}
                      expanded={expandedEmployee === emp.employeeCode}
                      onExpand={() => handleExpandEmployee(emp.employeeCode)}
                      analyticsData={employeeAnalytics[emp.employeeCode]}
                      sessionDistributionData={null}
                      loading={employeeLoading[emp.employeeCode]}
                      selectedDate={employeeDateFilters[emp.employeeCode]?.selected}
                      pendingDate={employeeDateFilters[emp.employeeCode]?.pending}
                      onDateChange={(value) => handleEmployeeDateChange(emp.employeeCode, value)}
                      onApplyDate={() => handleApplyEmployeeDate(emp.employeeCode)}
                      onResetDate={() => handleResetEmployeeDate(emp.employeeCode)}
                    />
                  ))}
              </Box>
            </Paper>
          </Box>);
}
