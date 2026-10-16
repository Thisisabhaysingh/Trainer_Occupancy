import { useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, Divider, Grid, Link, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Cancel, CheckCircle, RadioButtonUnchecked, Schedule } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../../core/auth/permissions';
import { useApproveInventoryRequest, useBatchApproveInventoryRequests, usePendingInventoryApprovals, useRejectInventoryRequest } from '../hooks/useInventory';
import ErrorState from '../../../components/states/ErrorState';
import LoadingState from '../../../components/states/LoadingState';
import InventoryPageHeading from '../components/InventoryPageHeading';

const money = (value) => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const isImageUrl = (value = '') => /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value);
const Detail = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Typography>
    <Typography sx={{ mt: 0.25, fontSize: 14, overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
  </Box>
);

const ItemDetails = ({ item }) => {
  const referenceUrl = item.referenceUrl?.trim();
  const mediaId = item.mediaId || item.catalogItem?.mediaId;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Grid container spacing={1.5}>
        {referenceUrl && isImageUrl(referenceUrl) && (
          <Grid size={{ xs: 12, sm: 3, md: 2 }}>
            <Box
              component="img"
              src={referenceUrl}
              alt={item.requestedItemName}
              loading="lazy"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
              sx={{ width: '100%', height: 110, objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover' }}
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: referenceUrl && isImageUrl(referenceUrl) ? 9 : 12, md: referenceUrl && isImageUrl(referenceUrl) ? 10 : 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{item.requestedItemName}</Typography>
            <Chip size="small" variant="outlined" label={item.itemType || 'item'} />
          </Box>
          {item.catalogItem?.description && <Typography sx={{ mt: 0.5, fontSize: 13, color: 'text.secondary' }}>{item.catalogItem.description}</Typography>}
          <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
            <Grid size={{ xs: 6, sm: 3 }}><Detail label="Quantity" value={`${item.quantity} ${item.unit}`} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Detail label="Unit price" value={money(item.estimatedPrice)} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Detail label="Total" value={money(Number(item.estimatedPrice || 0) * Number(item.quantity || 0))} /></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Detail label="SKU" value={item.catalogItem?.sku} /></Grid>
          </Grid>
          {item.notes && <Box sx={{ mt: 1 }}><Detail label="Item notes" value={item.notes} /></Box>}
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            {referenceUrl && <Link href={referenceUrl} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 13 }}>Open item link</Link>}
            {!referenceUrl && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Item link / image: Not provided</Typography>}
            {mediaId && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Media: {mediaId}</Typography>}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

const APPROVAL_LEVELS = [
  { level: 1, label: 'Branch Inventory Person' },
  { level: 2, label: 'Category Vice President' },
  { level: 3, label: 'Inventory Head' },
];

const ApprovalTimeline = ({ approvals }) => (
  <Box sx={{ mt: 2.5, mb: 1, px: { xs: 0, md: 2 }, overflowX: 'auto' }}>
    <Box sx={{ display: 'flex', minWidth: 620 }}>
      {APPROVAL_LEVELS.map((step, index) => {
        const approval = approvals.find((item) => Number(item.level) === step.level);
        const status = approval?.status || 'WAITING';
        const color = status === 'APPROVED' ? 'success.main' : status === 'REJECTED' ? 'error.main' : status === 'PENDING' ? 'warning.main' : 'text.disabled';
        const Icon = status === 'APPROVED' ? CheckCircle : status === 'REJECTED' ? Cancel : status === 'PENDING' ? Schedule : RadioButtonUnchecked;
        return <Box key={step.level} sx={{ position: 'relative', flex: 1, textAlign: 'center', px: 1 }}>
          {index > 0 && <Box sx={{ position: 'absolute', top: 15, right: '50%', width: '100%', height: 2, bgcolor: approvals.some((item) => Number(item.level) === step.level - 1 && item.status === 'APPROVED') ? 'success.main' : 'divider' }} />}
          <Box sx={{ position: 'relative', zIndex: 1, width: 32, height: 32, mx: 'auto', display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'background.paper', color }}><Icon /></Box>
          <Typography sx={{ mt: 0.75, fontSize: 13, fontWeight: 700 }}>{step.label}</Typography>
          <Typography sx={{ fontSize: 11, color }}>{status === 'WAITING' ? 'Waiting' : status.charAt(0) + status.slice(1).toLowerCase()}</Typography>
          {approval?.actedAt && <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{new Date(approval.actedAt).toLocaleDateString()}</Typography>}
        </Box>;
      })}
    </Box>
  </Box>
);

const ApprovalInbox = () => {
  const user = useSelector((state) => state.auth.user);
  const isAdmin = ['admin', 'inventory_admin'].includes(user?.role);
  const hasApprovalPermission = isAdmin || hasPermission(user, 'inventory.approve');
  const query = usePendingInventoryApprovals(true);
  const approve = useApproveInventoryRequest();
  const batchApprove = useBatchApproveInventoryRequests();
  const reject = useRejectInventoryRequest();
  const busy = approve.isPending || batchApprove.isPending || reject.isPending;
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState('requests');
  const [filters, setFilters] = useState({ branchId: '', departmentId: '', categoryId: '', from: '', to: '', item: '', priority: '' });
  const requestGroups = useMemo(() => {
    const groups = new Map();
    for (const approval of query.data || []) {
      const key = String(approval.requestId);
      if (!groups.has(key)) groups.set(key, { requestId: approval.requestId, request: approval.request, approvals: [] });
      const group = groups.get(key);
      group.approvals.push(approval);
      if (!group.request && approval.request) group.request = approval.request;
    }
    return [...groups.values()].map((group) => ({ ...group, approvals: group.approvals.sort((a, b) => Number(a.level) - Number(b.level)) }));
  }, [query.data]);
  const canDecide = hasApprovalPermission || requestGroups.some((group) => group.approvals.some((approval) => approval.status === 'PENDING' && approval.approverEmployeeCode === user?.employeeCode));
  const uniqueOptions = (field, labelField) => {
    const values = new Map();
    requestGroups.forEach(({ request }) => {
      const id = request?.[field];
      if (id != null) values.set(String(id), request?.[labelField]?.name || String(id));
    });
    return [...values.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  };
  const branchOptions = uniqueOptions('branchId', 'branch');
  const departmentOptions = uniqueOptions('departmentId', 'department');
  const categoryOptions = uniqueOptions('categoryId', 'category');
  const filteredGroups = useMemo(() => requestGroups.filter(({ request }) => {
    if (!request) return false;
    if (filters.branchId && String(request.branchId) !== filters.branchId) return false;
    if (filters.departmentId && String(request.departmentId) !== filters.departmentId) return false;
    if (filters.categoryId && String(request.categoryId) !== filters.categoryId) return false;
    if (filters.priority && request.priority !== filters.priority) return false;
    const createdDate = String(request.createdAt || '').slice(0, 10);
    if (filters.from && createdDate < filters.from) return false;
    if (filters.to && createdDate > filters.to) return false;
    if (filters.item) {
      const needle = filters.item.toLowerCase();
      const matchesItem = (request.items || []).some((item) => `${item.requestedItemName} ${item.catalogItem?.sku || ''}`.toLowerCase().includes(needle));
      if (!matchesItem) return false;
    }
    return true;
  }), [requestGroups, filters]);
  const actionableIds = filteredGroups.filter((group) => {
    const pending = group.approvals.find((approval) => approval.status === 'PENDING');
    return Number(pending?.level) === 3 && (isAdmin || pending.approverEmployeeCode === user?.employeeCode);
  }).map((group) => group.requestId);
  const inventoryHeadGroups = filteredGroups.filter((group) => Number(group.approvals.find((approval) => approval.status === 'PENDING')?.level) === 3);
  const demandBatches = useMemo(() => {
    const batches = new Map();
    inventoryHeadGroups.forEach((group) => {
      (group.request?.items || []).forEach((item) => {
        const itemKey = item.inventoryItemId || item.normalizedItemKey || item.requestedItemName?.toLowerCase();
        const key = `${group.request.categoryId}:${itemKey}`;
        if (!batches.has(key)) batches.set(key, { key, category: group.request.category?.name || group.request.categoryId, itemName: item.requestedItemName, sku: item.catalogItem?.sku, quantity: 0, requestIds: new Set(), branches: new Set(), earliestRequired: null, estimatedValue: 0 });
        const batch = batches.get(key);
        batch.quantity += Number(item.quantity || 0);
        batch.estimatedValue += Number(item.estimatedPrice || 0) * Number(item.quantity || 0);
        batch.requestIds.add(group.requestId);
        batch.branches.add(group.request.branch?.name || String(group.request.branchId));
        if (group.request.requiredFrom && (!batch.earliestRequired || group.request.requiredFrom < batch.earliestRequired)) batch.earliestRequired = group.request.requiredFrom;
      });
    });
    return [...batches.values()].sort((a, b) => String(a.category).localeCompare(String(b.category)) || a.itemName.localeCompare(b.itemName));
  }, [inventoryHeadGroups]);

  const approveRequest = async (requestId) => {
    setActionError('');
    try {
      await approve.mutateAsync({ id: requestId });
    } catch (error) {
      setActionError(error.message || 'The request could not be approved.');
    }
  };

  const rejectRequest = async (requestId) => {
    setActionError('');
    try {
      await reject.mutateAsync({ id: requestId, reason: 'Rejected by approver' });
    } catch (error) {
      setActionError(error.message || 'The request could not be rejected.');
    }
  };
  const approveSelected = async () => {
    const requestIds = selectedIds.filter((id) => actionableIds.includes(id));
    if (!requestIds.length) return;
    setActionError('');
    setActionNotice('');
    try {
      const result = await batchApprove.mutateAsync({ requestIds, reason: 'Approved in Inventory Head workbench batch' });
      setSelectedIds([]);
      setActionNotice(`${result.approved} request${result.approved === 1 ? '' : 's'} approved${result.failed ? `; ${result.failed} could not be processed.` : '.'}`);
    } catch (error) {
      setActionError(error.message || 'The selected requests could not be approved.');
    }
  };
  const setFilter = (name) => (event) => setFilters((current) => ({ ...current, [name]: event.target.value }));
  const toggleSelected = (requestId) => setSelectedIds((current) => current.includes(requestId) ? current.filter((id) => id !== requestId) : [...current, requestId]);

  return <>
    <InventoryPageHeading title="Inventory Approval Workbench" subtitle="Filter, review, consolidate, approve, and track incoming inventory demand at scale." />
    {actionError && <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert>}
    {actionNotice && <Alert severity="success" onClose={() => setActionNotice('')} sx={{ mb: 2 }}>{actionNotice}</Alert>}
    {!query.isLoading && !query.isError && <Paper elevation={0} sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField select fullWidth size="small" label="Branch" value={filters.branchId} onChange={setFilter('branchId')}><MenuItem value="">All branches</MenuItem>{branchOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField select fullWidth size="small" label="Department" value={filters.departmentId} onChange={setFilter('departmentId')}><MenuItem value="">All departments</MenuItem>{departmentOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField select fullWidth size="small" label="Category" value={filters.categoryId} onChange={setFilter('categoryId')}><MenuItem value="">All categories</MenuItem>{categoryOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField select fullWidth size="small" label="Priority" value={filters.priority} onChange={setFilter('priority')}><MenuItem value="">All priorities</MenuItem>{['low', 'normal', 'high', 'urgent'].map((priority) => <MenuItem key={priority} value={priority}>{priority.toUpperCase()}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth size="small" type="date" label="From date" value={filters.from} onChange={setFilter('from')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}><TextField fullWidth size="small" type="date" label="To date" value={filters.to} onChange={setFilter('to')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Item name or SKU" placeholder="Search Raspberry Pi, laptop, SKU…" value={filters.item} onChange={setFilter('item')} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Stack direction="row" spacing={1} justifyContent={{ md: 'flex-end' }} useFlexGap flexWrap="wrap"><Button variant={viewMode === 'requests' ? 'contained' : 'outlined'} disableElevation onClick={() => setViewMode('requests')}>Requests ({filteredGroups.length})</Button><Button variant={viewMode === 'batches' ? 'contained' : 'outlined'} disableElevation onClick={() => setViewMode('batches')}>Grouped demand ({demandBatches.length})</Button><Button variant="text" onClick={() => setFilters({ branchId: '', departmentId: '', categoryId: '', from: '', to: '', item: '', priority: '' })}>Reset</Button></Stack></Grid>
      </Grid>
      {canDecide && <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}><Checkbox size="small" checked={actionableIds.length > 0 && actionableIds.every((id) => selectedIds.includes(id))} indeterminate={actionableIds.some((id) => selectedIds.includes(id)) && !actionableIds.every((id) => selectedIds.includes(id))} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...actionableIds])] : selectedIds.filter((id) => !actionableIds.includes(id)))} /><Typography sx={{ fontSize: 13 }}>{selectedIds.filter((id) => actionableIds.includes(id)).length} selected</Typography><Button size="small" variant="contained" color="success" disableElevation disabled={busy || !selectedIds.some((id) => actionableIds.includes(id))} onClick={approveSelected}>{batchApprove.isPending ? 'Approving batch…' : 'Approve selected'}</Button><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Shortages are automatically consolidated into procurement batches after approval.</Typography></Stack>}
    </Paper>}
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState error={query.error} onRetry={query.refetch} /> : !requestGroups.length ? <Alert severity="info">{canDecide ? 'There are no requests awaiting your approval.' : 'You have not created any inventory requests yet.'}</Alert> : !filteredGroups.length ? <Alert severity="info">No requests match the selected filters.</Alert> : viewMode === 'batches' ? (
      <Grid container spacing={2}>{demandBatches.map((batch) => <Grid key={batch.key} size={{ xs: 12, md: 6 }}><Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, height: '100%', boxSizing: 'border-box' }}><Stack direction="row" justifyContent="space-between" spacing={1}><Box><Typography sx={{ fontSize: 16, fontWeight: 700 }}>{batch.itemName}</Typography><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{batch.category}{batch.sku ? ` · ${batch.sku}` : ''}</Typography></Box><Chip color="primary" label={`${batch.quantity} units`} /></Stack><Grid container spacing={1.5} sx={{ mt: 1 }}><Grid size={{ xs: 6 }}><Detail label="Requests" value={batch.requestIds.size} /></Grid><Grid size={{ xs: 6 }}><Detail label="Branches" value={batch.branches.size} /></Grid><Grid size={{ xs: 6 }}><Detail label="Earliest required" value={batch.earliestRequired} /></Grid><Grid size={{ xs: 6 }}><Detail label="Estimated batch value" value={money(batch.estimatedValue)} /></Grid></Grid><Typography sx={{ mt: 1.5, fontSize: 12, color: 'text.secondary' }}>{[...batch.branches].join(', ')}</Typography><Button size="small" sx={{ mt: 1 }} onClick={() => { setSelectedIds([...new Set([...selectedIds, ...batch.requestIds])]); setViewMode('requests'); }}>Select batch requests</Button></Paper></Grid>)}</Grid>
    ) : (
      <Stack spacing={2}>{filteredGroups.map((group) => {
        const request = group.request;
        const pendingApproval = group.approvals.find((item) => item.status === 'PENDING');
        const latestApproval = group.approvals[group.approvals.length - 1];
        return <Paper key={group.requestId} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              {Number(pendingApproval?.level) === 3 && (isAdmin || pendingApproval.approverEmployeeCode === user?.employeeCode) && <Checkbox size="small" checked={selectedIds.includes(group.requestId)} onChange={() => toggleSelected(group.requestId)} />}
              <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{request?.requestManifest || `Request #${group.requestId}`}</Typography>
              <Typography sx={{ mt: 0.25, fontSize: 14, color: 'text.secondary' }}>{request?.purpose || 'No purpose supplied'}</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={pendingApproval ? `Current level ${pendingApproval.level}` : 'Approval history'} />
              {request?.priority && <Chip size="small" color={request.priority === 'urgent' ? 'error' : request.priority === 'high' ? 'warning' : 'default'} label={request.priority.toUpperCase()} />}
            </Stack>
          </Box>

          <ApprovalTimeline approvals={group.approvals} />

          {request && <>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Requester" value={request.requester ? `${request.requester.name} (${request.requester.employeeCode})` : request.requesterEmployeeCode} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Branch" value={request.branch?.name || request.branchId} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Department" value={request.department?.name || request.departmentId} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Category" value={request.category?.name || request.categoryId} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Required from" value={request.requiredFrom} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Expected return" value={request.expectedReturnDate} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Estimated value" value={money(request.estimatedValue)} /></Grid>
              <Grid size={{ xs: 6, md: 3 }}><Detail label="Context" value={request.contextName || request.contextType} /></Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 700 }}>Requested items ({request.items?.length || 0})</Typography>
            <Stack spacing={1}>{request.items?.map((item) => <ItemDetails key={item.id} item={item} />)}</Stack>
          </>}

          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
            {pendingApproval && canDecide && (isAdmin || pendingApproval.approverEmployeeCode === user?.employeeCode) ? <>
              <Button size="small" variant="contained" color="success" disableElevation disabled={busy} onClick={() => approveRequest(group.requestId)}>
                {approve.isPending ? 'Approving...' : isAdmin ? `Admin override: approve level ${pendingApproval.level}` : 'Approve'}
              </Button>
              <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => rejectRequest(group.requestId)}>
                {reject.isPending ? 'Rejecting...' : isAdmin ? `Admin override: reject level ${pendingApproval.level}` : 'Reject'}
              </Button>
            </> : !pendingApproval ? (
              <Chip
                label={latestApproval?.status === 'APPROVED' ? 'Approval chain completed' : 'Request rejected'}
                color={latestApproval?.status === 'APPROVED' ? 'success' : 'error'}
                sx={{ fontWeight: 700 }}
              />
            ) : (
              <Chip label={`Awaiting level ${pendingApproval.level} approval`} color="warning" sx={{ fontWeight: 700 }} />
            )}
            {pendingApproval && canDecide && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Assigned to {pendingApproval.approverEmployeeCode || 'configured approver'}
                {isAdmin ? ' · Admin may override any assigned approver' : ''}
              </Typography>
            )}
          </Stack>
        </Paper>;
      })}</Stack>
    )}
  </>;
};

export default ApprovalInbox;
