import { Avatar, Box, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { AccessTime, BarChart, Group, TrendingUp } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
const COLORS = ['#4285F4', '#34A853', '#A142F4', '#fbc02d', '#e53935'];
const DEPT_COLORS = { Coding: '#4285F4', Mechatronics: '#34A853', Electronics: '#A142F4' };
const SESSION_COLORS = ['#FF8042', '#00C49F', '#0088FE'];
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


const DepartmentSummaryCard = ({ dept }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, minWidth: 0, minHeight: 220, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', bgcolor: isDark ? 'rgba(35,39,47,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
    <Typography fontWeight={700} fontSize={18} sx={{ pr: 8 }}>{dept.name}</Typography>
    <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
      <Box sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: dept.status === 'high' ? '#0a1929' : '#f3f6fa', color: dept.status === 'high' ? '#fff' : '#222', fontWeight: 700, fontSize: 13, textTransform: 'capitalize', display: 'inline-block' }}>{dept.status}</Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      <Avatar sx={{ width: 20, height: 20, bgcolor: '#e3e8f7', color: '#4285F4' }}><Group sx={{ fontSize: 14 }} /></Avatar>
      <Typography variant="body2">{dept.employees} employees</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TrendingUp sx={{ fontSize: 16, color: '#34A853' }} />
      <Typography variant="body2">{dept.productivity}% productivity</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <AccessTime sx={{ fontSize: 16, color: '#A142F4' }} />
      <Typography variant="body2">{dept.avgHours}h avg/week</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <BarChart sx={{ fontSize: 16, color: '#e67e22' }} />
      <Typography variant="body2">{dept.totalHours}h total</Typography>
    </Box>
  </Paper>
  );
};

const DepartmentSessionsCard = ({ dept }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const institute = dept.sessionStats?.institute || 0;
  const school = dept.sessionStats?.school || 0;
  const data = [
    { name: 'Institute Sessions', value: institute },
    { name: 'School Sessions', value: school },
  ].filter(d => d.value > 0);
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, minWidth: 0, minHeight: 220, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', bgcolor: isDark ? 'rgba(35,39,47,0.95)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
      <Typography fontWeight={700} fontSize={18} sx={{ mb: 1 }}>Session Stats</Typography>
      {data.length ? <PieChart width={140} height={140}>
        <Pie
          data={data.length ? data : [{ name: 'No Data', value: 1 }]}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={50}
          innerRadius={25}
          labelLine={false}
          label={data.length ? renderCustomizedLabel : false}
        >
          {(data.length ? data : [{ name: 'No Data', value: 1 }]).map((entry, idx) => (
            <Cell key={`cell-${entry.name}`} fill={data.length ? SESSION_COLORS[idx % SESSION_COLORS.length] : '#eee'} />
          ))}
        </Pie>
        <Tooltip formatter={v => v} />
        <Legend verticalAlign="bottom" height={24} />
      </PieChart> : <Typography variant="body2" color="text.secondary" sx={{ my: 'auto', textAlign: 'center', py: 3 }}>No sessions recorded for this week.</Typography>}
    </Paper>
  );
};


export default function DepartmentsDashboard({ analytics, availableWeeks, selectedWeekIndex, onWeekChange }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const darkCardBg = isDarkMode ? 'rgba(35,39,47,0.95)' : '#fff';
  const departmentSummaryCards = analytics?.departmentCards || [];
  const departmentPerformance = analytics?.departmentPerformance || departmentSummaryCards;
  const departmentSessionStats = (analytics?.sessionStatsPerDay || []).map(row => ({
    ...row, institute: Number(row.online || 0) + Number(row.offline || 0),
    total: Number(row.online || 0) + Number(row.offline || 0) + Number(row.school || 0),
  }));
  const handleWeekSelectionChange = onWeekChange;
  return (<Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="departments-week-filter-label">Select Week</InputLabel>
                <Select
                  labelId="departments-week-filter-label"
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
            {!departmentSummaryCards.length && <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3 }}><Typography color="text.secondary">No departments available for this scope.</Typography></Paper>}
            {/* Department Summary Cards + Session Stats */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3, mb: 4 }}>
              {departmentSummaryCards.map((dept) => (
                <Box key={dept.id || dept.name} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <DepartmentSummaryCard dept={dept} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <DepartmentSessionsCard dept={dept} />
                  </Box>
                </Box>
              ))}
            </Box>
            {/* Day-wise Hours by Department Bar Chart */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Day-wise Hours by Department</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <RechartsBarChart data={analytics?.daywiseHoursData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" style={{ fontWeight: 700 }} />
                  <YAxis />
                  <Tooltip />
                  {(analytics?.departmentOptions || []).map((dep, idx) => (
                    <Bar
                      key={dep || `department-${idx}`}
                      dataKey={dep}
                      name={dep}
                      fill={DEPT_COLORS[dep] || COLORS[idx % COLORS.length]}
                      radius={[8, 8, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1200}
                      maxBarSize={32}
                    />
                  ))}
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
            {/* Department Productivity Trend Line Chart */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Department Productivity Trend</Typography>
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Box sx={{ minWidth: 700, pr: 2 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={analytics?.departmentProductivityTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      {(analytics?.departmentOptions || []).map((dep, idx) => (
                        <Line key={dep || `department-${idx}`} type="monotone" dataKey={dep} stroke={DEPT_COLORS[dep] || COLORS[idx % COLORS.length]} strokeWidth={3} dot={{ r: 6 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </Paper>
            {/* Competition Contribution Index */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Competition Contribution Index</Typography>
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Box sx={{ minWidth: 700, pr: 2 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={analytics?.competitionContributionTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      {(analytics?.departmentOptions || []).map((dep, idx) => (
                        <Line key={dep || `department-${idx}`} type="monotone" dataKey={dep} stroke={DEPT_COLORS[dep] || COLORS[idx % COLORS.length]} strokeWidth={3} dot={{ r: 6 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </Paper>
            {/* Department Performance Summary Table */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 4, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: isDarkMode ? '#F2F4F7' : '#101828' }}>Department Performance Summary</Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      {['Department', 'Employees', 'Total Hours', 'Avg Hours/Employee', 'Productivity', 'Status'].map((header) => (
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
                    {departmentPerformance.map((row) => (
                      <TableRow
                        key={row.name}
                        sx={{
                          background: isDarkMode ? 'rgba(35,39,47,0.6)' : '#fff',
                          transition: 'background 0.15s ease',
                          '&:hover': { background: isDarkMode ? 'rgba(44,48,56,0.8)' : '#F9FAFB' },
                          '&:last-child td': { borderBottom: 'none' }
                        }}
                      >
                        <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 500, padding: '12px 16px' }}>
                          {row.name}
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px' }}>
                          {row.employees}
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px' }}>
                          {row.totalHours}h
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px' }}>
                          {row.avgHours}h
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, padding: '12px 16px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 60, height: 8, bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f6fa', borderRadius: 2 }}>
                              <Box sx={{ width: `${row.productivity}%`, height: 8, bgcolor: '#4285F4', borderRadius: 2 }} />
                            </Box>
                            <Typography variant="body2" fontWeight={700} color={isDarkMode ? '#F2F4F7' : '#101828'}>{row.productivity}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, padding: '12px 16px' }}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              color: row.status === 'high' ? '#12B76A' : row.status === 'medium' ? '#F79009' : '#F04438',
                              textTransform: 'capitalize'
                            }}
                          >
                            {row.status}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            {/* Session Stats Per Day Table */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 4, bgcolor: darkCardBg, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: isDarkMode ? '#F2F4F7' : '#101828' }}>Session Stats Per Day (Selected Week)</Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 500 }}>
                  <TableHead>
                    <TableRow>
                      {['Date', 'Institute Sessions', 'School Sessions', 'Total'].map((header) => (
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
                    {departmentSessionStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: isDarkMode ? '#9CA3AF' : '#667085', borderBottom: 'none' }}>
                          No session data found for this week.
                        </TableCell>
                      </TableRow>
                    ) : (
                      departmentSessionStats.map((row) => (
                        <TableRow
                          key={row.date}
                          sx={{
                            background: isDarkMode ? 'rgba(35,39,47,0.6)' : '#fff',
                            transition: 'background 0.15s ease',
                            '&:hover': { background: isDarkMode ? 'rgba(44,48,56,0.8)' : '#F9FAFB' },
                            '&:last-child td': { borderBottom: 'none' }
                          }}
                        >
                          <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 500, padding: '12px 16px' }}>
                            {row.date}
                          </TableCell>
                          <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px' }}>
                            {row.institute ?? 0}
                          </TableCell>
                          <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#D1D5DB' : '#667085', padding: '12px 16px' }}>
                            {row.school ?? 0}
                          </TableCell>
                          <TableCell sx={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`, color: isDarkMode ? '#F2F4F7' : '#101828', fontWeight: 600, padding: '12px 16px' }}>
                            {row.total ?? ((row.institute || 0) + (row.school || 0))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>);
}
