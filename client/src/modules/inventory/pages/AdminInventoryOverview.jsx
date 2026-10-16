import { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { ApprovalOutlined, CurrencyRupeeOutlined, ErrorOutline, Inventory2Outlined, PendingActionsOutlined, RequestPageOutlined } from '@mui/icons-material';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useBranches } from '../../branches/hooks/useBranches';
import { useDepartments } from '../../departments/hooks/useDepartments';
import { useInventoryAdminOverview, useInventoryCategories } from '../hooks/useInventory';
import ErrorState from '../../../components/states/ErrorState';
import LoadingState from '../../../components/states/LoadingState';

const dateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const initialDates = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: dateValue(from), to: dateValue(to) };
};
const number = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const statusColor = (status) => status === 'REJECTED' ? 'error' : status?.includes('REQUIRED') || status === 'UNDER_APPROVAL' ? 'warning' : status === 'APPROVED' || status === 'FULFILLED' ? 'success' : 'default';

const MetricCard = ({ label, value, icon, color, subtitle }) => (
  <Paper elevation={0} sx={{ p: 2.25, height: '100%', minHeight: 150, boxSizing: 'border-box', overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Box><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{label}</Typography><Typography sx={{ mt: 0.5, fontSize: 26, fontWeight: 700 }}>{value}</Typography></Box>
      <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: `${color}14`, color }}>{icon}</Box>
    </Box>
    {subtitle && <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>{subtitle}</Typography>}
  </Paper>
);

const BreakdownTable = ({ title, rows, firstLabel }) => (
  <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, height: '100%', minHeight: 280, boxSizing: 'border-box', overflow: 'hidden' }}>
    <Typography sx={{ mb: 1.5, fontSize: 16, fontWeight: 700 }}>{title}</Typography>
    <Table size="small"><TableHead><TableRow><TableCell>{firstLabel}</TableCell><TableCell align="right">Requests</TableCell><TableCell align="right">Items</TableCell><TableCell align="right">Available</TableCell></TableRow></TableHead>
      <TableBody>{rows.slice(0, 8).map((row) => <TableRow key={`${title}-${row.id}`}><TableCell>{row.name}</TableCell><TableCell align="right">{number(row.requests)}</TableCell><TableCell align="right">{number(row.items)}</TableCell><TableCell align="right">{number(row.available)}</TableCell></TableRow>)}</TableBody>
    </Table>
    {!rows.length && <Typography sx={{ p: 2, textAlign: 'center', fontSize: 13, color: 'text.secondary' }}>No data for these filters.</Typography>}
  </Paper>
);

const AdminInventoryOverview = ({ departmentScope = null, categoryScope = null, inventoryHead = false }) => {
  const [filters, setFilters] = useState(() => ({
    ...initialDates(),
    branchId: '',
    departmentId: departmentScope ? String(departmentScope) : '',
    categoryId: '',
  }));
  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), [filters]);
  const overview = useInventoryAdminOverview(params);
  const branches = useBranches();
  const departments = useDepartments();
  const categories = useInventoryCategories();
  const data = overview.data;
  const metrics = data?.metrics || {};
  const update = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));
  const reset = () => setFilters({
    ...initialDates(),
    branchId: '',
    departmentId: departmentScope ? String(departmentScope) : '',
    categoryId: '',
  });
  const scopedDepartment = departmentScope
    ? (departments.data || []).find((item) => String(item.id) === String(departmentScope))
    : null;
  const allowedCategories = categoryScope?.length
    ? (categories.data || []).filter((item) => categoryScope.some((categoryId) => String(categoryId) === String(item.id)))
    : (categories.data || []).filter((item) => !item.parentId);

  return <Box>
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{inventoryHead ? 'Inventory Head Overview' : 'Inventory Control Overview'}</Typography>
      <Typography sx={{ mt: 0.25, fontSize: 14, color: 'text.secondary' }}>
        {inventoryHead
          ? 'Monitor historical, current, and upcoming requests, stock, approvals, and procurement for your assigned categories.'
          : departmentScope
          ? `Monitor requests, approvals, stock, branches, and categories for ${scopedDepartment?.name || 'your department'}.`
          : 'Monitor requests, approvals, stock, branches, departments, and categories across the organisation.'}
      </Typography>
    </Box>
    <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField type="date" size="small" label="From date" value={filters.from} onChange={update('from')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" size="small" label="To date" value={filters.to} onChange={update('to')} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField select size="small" label="Branch" value={filters.branchId} onChange={update('branchId')} sx={{ minWidth: 180 }}><MenuItem value="">All branches</MenuItem>{(branches.data || []).map((item) => <MenuItem key={item.id} value={item.id}>{String(item.id) === '1' ? 'Mumbai HQ' : item.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Department" value={filters.departmentId} onChange={update('departmentId')} disabled={Boolean(departmentScope)} sx={{ minWidth: 210 }}>
          {!departmentScope && <MenuItem value="">All departments</MenuItem>}
          {(departments.data || []).filter((item) => !departmentScope || String(item.id) === String(departmentScope)).map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Category" value={filters.categoryId} onChange={update('categoryId')} sx={{ minWidth: 190 }}><MenuItem value="">{inventoryHead ? 'All assigned categories' : 'All categories'}</MenuItem>{allowedCategories.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
        <Button variant="outlined" onClick={reset}>Reset</Button>
      </Box>
    </Paper>
    {overview.isLoading ? <LoadingState /> : overview.isError ? <ErrorState error={overview.error} onRetry={overview.refetch} /> : <>
      <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}><MetricCard label="Total requests" value={number(metrics.totalRequests)} color="#475467" icon={<RequestPageOutlined />} subtitle={`${filters.from} to ${filters.to}`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}><MetricCard label="Pending approval" value={number(metrics.pendingRequests)} color="#F79009" icon={<PendingActionsOutlined />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}><MetricCard label="Approved" value={number(metrics.approvedRequests)} color="#12B76A" icon={<ApprovalOutlined />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}><MetricCard label="Rejected" value={number(metrics.rejectedRequests)} color="#F04438" icon={<ErrorOutline />} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}><MetricCard label="Available stock" value={number(metrics.availableQuantity)} color="#0070F0" icon={<Inventory2Outlined />} subtitle={`${number(metrics.stockedItems)} stocked items`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}>{inventoryHead ? <MetricCard label="Upcoming requests" value={number(metrics.upcomingRequests)} color="#7F56D9" icon={<CurrencyRupeeOutlined />} subtitle={`${number(metrics.overdueReturns)} overdue returns`} /> : <MetricCard label="Estimated value" value="—" color="#7F56D9" icon={<CurrencyRupeeOutlined />} subtitle="Pricing calculation unavailable" />}</Grid>
      </Grid>
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, mb: 2.5, height: { xs: 330, md: 400 }, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography sx={{ mb: 0.5, fontSize: 16, fontWeight: 700 }}>Day-by-day request activity</Typography>
        <Typography sx={{ mb: 1.5, fontSize: 12, color: 'text.secondary' }}>Requests created, approved, and rejected during the selected period.</Typography>
        <Box sx={{ flex: 1, minHeight: 0 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.dailyActivity || []} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="requests" name="Requests" stroke="#0070F0" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="approved" name="Approved" stroke="#12B76A" strokeWidth={2.5} dot={{ r: 3 }} /><Line type="monotone" dataKey="rejected" name="Rejected" stroke="#F04438" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></Box>
      </Paper>
      <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}><BreakdownTable title="Branch control" firstLabel="Branch" rows={data.branchBreakdown || []} /></Grid>
        <Grid size={{ xs: 12, lg: 6 }}><BreakdownTable title="Category control" firstLabel="Category" rows={data.categoryBreakdown || []} /></Grid>
      </Grid>
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography sx={{ mb: 1.5, fontSize: 16, fontWeight: 700 }}>Requests by department</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{(data.departmentBreakdown || []).map((item) => <Chip key={item.id || 'none'} label={`${item.name}: ${number(item.requests)}`} variant="outlined" />)}</Box>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography sx={{ mb: 1.5, fontSize: 16, fontWeight: 700 }}>Recent inventory requests</Typography>
        <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Request</TableCell><TableCell>Requester</TableCell><TableCell>Branch</TableCell><TableCell>Department</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell align="right">Value</TableCell><TableCell>Date</TableCell></TableRow></TableHead>
          <TableBody>{(data.recentRequests || []).map((item) => <TableRow key={item.id}><TableCell sx={{ fontWeight: 600 }}>{item.requestManifest}</TableCell><TableCell>{item.requesterName || item.requesterEmployeeCode}</TableCell><TableCell>{item.branchName || item.branchId}</TableCell><TableCell>{item.departmentName || '—'}</TableCell><TableCell>{item.categoryName || '—'}</TableCell><TableCell><Chip size="small" color={statusColor(item.requestStatus)} label={item.requestStatus} /></TableCell><TableCell align="right">{currency(item.estimatedValue)}</TableCell><TableCell>{String(item.createdAt).slice(0, 10)}</TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>
        {!(data.recentRequests || []).length && <Alert severity="info">No requests match the selected filters.</Alert>}
      </Paper>
    </>}
  </Box>;
};

export default AdminInventoryOverview;
