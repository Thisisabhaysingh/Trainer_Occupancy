import { useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, IconButton, MenuItem, Paper, TextField, Tooltip, Typography } from '@mui/material';
import { DeleteOutline, EditOutlined } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../../core/auth/permissions';
import { useBranches } from '../../branches/hooks/useBranches';
import { useDepartments } from '../../departments/hooks/useDepartments';
import {
  useInventoryApproverOptions,
  useInventoryBranchApprovers,
  useInventoryCategories,
  useInventoryResponsibilities,
  useDeleteInventoryBranchApprover,
  useDeleteInventoryResponsibility,
  useSaveInventoryBranchApprover,
  useSaveInventoryResponsibility,
} from '../hooks/useInventory';
import InventoryPageHeading from '../components/InventoryPageHeading';

const SetupCard = ({ title, description, children }) => (
  <Paper elevation={0} sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2, height: '100%', boxSizing: 'border-box' }}>
    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{title}</Typography>
    <Typography sx={{ mt: 0.25, mb: 2, fontSize: 13, color: 'text.secondary' }}>{description}</Typography>
    {children}
  </Paper>
);

const EmployeeSelect = ({ options, value, onChange, loading = false }) => (
  <Autocomplete
    fullWidth
    size="small"
    options={options}
    loading={loading}
    openOnFocus
    autoHighlight
    value={options.find((option) => option.employeeCode === value) || null}
    onChange={(_event, option) => onChange(option?.employeeCode || '')}
    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} — ${option.employeeCode}`}
    isOptionEqualToValue={(option, selected) => option.employeeCode === (typeof selected === 'string' ? selected : selected.employeeCode)}
    renderOption={(props, option) => (
      <Box component="li" {...props} key={option.employeeCode}>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{option.name}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{option.employeeCode} · {option.role}</Typography>
        </Box>
      </Box>
    )}
    renderInput={(params) => <TextField {...params} label="Employee" placeholder="Select a saved employee" />}
  />
);

const InventoryApprovalSetup = () => {
  const user = useSelector((state) => state.auth.user);
  const allowed = hasPermission(user, 'inventory.configure');
  const branches = useBranches();
  const departments = useDepartments();
  const categories = useInventoryCategories();
  const responsibilities = useInventoryResponsibilities(allowed);
  const branchApprovers = useInventoryBranchApprovers(allowed);
  const approverOptions = useInventoryApproverOptions(allowed);
  const saveResponsibility = useSaveInventoryResponsibility();
  const saveBranchApprover = useSaveInventoryBranchApprover();
  const deleteResponsibility = useDeleteInventoryResponsibility();
  const deleteBranchApprover = useDeleteInventoryBranchApprover();
  const [branchForm, setBranchForm] = useState({ branchId: '', employeeCode: '' });
  const [vpForm, setVpForm] = useState({ employeeCode: '', categoryIds: [] });
  const [headForm, setHeadForm] = useState({ employeeCode: '', categoryIds: [] });
  const [notice, setNotice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const employees = approverOptions.data || [];
  const categoryOptions = categories.data || [];
  const branchName = (id) => String(id) === '1' ? 'Mumbai HQ' : (branches.data || []).find((branch) => String(branch.id) === String(id))?.name || `Branch ${id}`;
  const departmentName = (id) => (departments.data || []).find((department) => String(department.id) === String(id))?.name || `Department ${id}`;
  const employeeLabel = (code) => {
    const employee = employees.find((item) => item.employeeCode === code);
    return employee ? `${employee.name} — ${employee.employeeCode}` : code;
  };
  const categoryName = (id) => categoryOptions.find((category) => String(category.id) === String(id))?.name || `Category ${id}`;
  const groupedCategoryAssignments = (responsibilityType) => Object.values((responsibilities.data || [])
    .filter((item) => item.responsibilityType === responsibilityType && item.categoryId)
    .reduce((groups, item) => {
      if (!groups[item.employeeCode]) groups[item.employeeCode] = { employeeCode: item.employeeCode, categoryIds: [], ids: [] };
      groups[item.employeeCode].categoryIds.push(item.categoryId);
      groups[item.employeeCode].ids.push(item.id);
      return groups;
    }, {}));
  const headAssignments = groupedCategoryAssignments('INVENTORY_HEAD');
  const vpAssignments = groupedCategoryAssignments('CATEGORY_VP');
  const departmentOverviewAssignments = (responsibilities.data || []).filter((item) => item.responsibilityType === 'DEPARTMENT_VP');

  if (!allowed) return <><InventoryPageHeading title="Approval Setup" /><Alert severity="warning">Inventory configuration permission is required.</Alert></>;

  const saveBranch = async () => {
    try {
      await saveBranchApprover.mutateAsync(branchForm);
      setNotice({ severity: 'success', message: 'Branch Inventory Person updated.' });
    } catch (error) { setNotice({ severity: 'error', message: error.message }); }
  };
  const saveVp = async () => {
    try {
      await saveResponsibility.mutateAsync({
        responsibilityType: 'CATEGORY_VP',
        departmentId: null,
        employeeCode: vpForm.employeeCode,
        categoryIds: vpForm.categoryIds.map(Number),
        replaceEmployeeCategories: true,
        isActive: true,
      });
      setVpForm({ employeeCode: '', categoryIds: [] });
      setNotice({ severity: 'success', message: 'Category Vice President assignments updated.' });
    } catch (error) { setNotice({ severity: 'error', message: error.message }); }
  };
  const saveHead = async () => {
    try {
      const savedRows = await saveResponsibility.mutateAsync({
        responsibilityType: 'INVENTORY_HEAD',
        departmentId: null,
        employeeCode: headForm.employeeCode,
        categoryIds: headForm.categoryIds.map(Number),
        replaceEmployeeCategories: true,
        isActive: true,
      });
      if (!Array.isArray(savedRows) || savedRows.length !== headForm.categoryIds.length) throw new Error('The Inventory Head assignment was not fully saved. Please try again.');
      const refreshed = await responsibilities.refetch();
      const persistedCategoryIds = new Set((refreshed.data || []).filter((item) => item.responsibilityType === 'INVENTORY_HEAD' && item.employeeCode === headForm.employeeCode && item.isActive).map((item) => String(item.categoryId)));
      const missingCategories = headForm.categoryIds.filter((categoryId) => !persistedCategoryIds.has(String(categoryId)));
      if (missingCategories.length) throw new Error('The server did not persist every selected category assignment.');
      setHeadForm({ employeeCode: '', categoryIds: [] });
      setNotice({ severity: 'success', message: 'Inventory Head category assignments updated.' });
    } catch (error) { setNotice({ severity: 'error', message: error.message }); }
  };
  const editBranch = (item) => {
    setBranchForm({ branchId: String(item.branchId), employeeCode: item.employeeCode });
    setNotice({ severity: 'info', message: `Editing the Branch Inventory Person for ${branchName(item.branchId)}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const editVp = (assignment) => {
    setVpForm({ employeeCode: assignment.employeeCode, categoryIds: assignment.categoryIds.map(String) });
    setNotice({ severity: 'info', message: `Editing Category VP assignments for ${employeeLabel(assignment.employeeCode)}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const editHead = (assignment) => {
    setHeadForm({ employeeCode: assignment.employeeCode, categoryIds: assignment.categoryIds.map(String) });
    setNotice({ severity: 'info', message: `Editing category assignments for ${employeeLabel(assignment.employeeCode)}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'branch') await deleteBranchApprover.mutateAsync(deleteTarget.id);
      else if (deleteTarget.ids) await Promise.all(deleteTarget.ids.map((id) => deleteResponsibility.mutateAsync(id)));
      else await deleteResponsibility.mutateAsync(deleteTarget.id);
      setNotice({ severity: 'success', message: `${deleteTarget.label} deleted.` });
      setDeleteTarget(null);
    } catch (error) {
      setNotice({ severity: 'error', message: error.message });
      setDeleteTarget(null);
    }
  };
  const actionButtons = (onEdit, target) => (
    <Box sx={{ display: 'flex', flexShrink: 0 }}>
      <Tooltip title="Edit assignment"><IconButton size="small" aria-label={`Edit ${target.label}`} onClick={onEdit}><EditOutlined fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete assignment"><IconButton size="small" color="error" aria-label={`Delete ${target.label}`} onClick={() => setDeleteTarget(target)}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
    </Box>
  );

  return <>
    <InventoryPageHeading title="Approval Setup" subtitle="Configure the strict Branch Inventory Person → Category Vice President → Inventory Head approval chain." />
    {notice && <Alert severity={notice.severity} sx={{ mb: 2 }}>{notice.message}</Alert>}
    <Grid container spacing={2} alignItems="stretch">
      <Grid size={{ xs: 12, md: 4 }}>
        <SetupCard title="Branch Inventory Person" description="First approver for every request from this branch.">
          <TextField select fullWidth size="small" label="Branch" value={branchForm.branchId} onChange={(event) => setBranchForm({ branchId: event.target.value, employeeCode: '' })} sx={{ mb: 1.5 }}>
            {(branches.data || []).map((branch) => <MenuItem key={branch.id} value={branch.id}>{branchName(branch.id)}</MenuItem>)}
          </TextField>
          <Box sx={{ mb: 2 }}><EmployeeSelect options={employees} value={branchForm.employeeCode} loading={approverOptions.isLoading} onChange={(employeeCode) => setBranchForm({ ...branchForm, employeeCode })} /></Box>
          <Button variant="contained" disableElevation disabled={!branchForm.branchId || !branchForm.employeeCode || saveBranchApprover.isPending} onClick={saveBranch}>Save</Button>
        </SetupCard>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <SetupCard title="Category Vice Presidents" description="Second approver based on the requested inventory category, independent of the requester’s department.">
          <Box sx={{ mb: 1.5 }}><EmployeeSelect options={employees} value={vpForm.employeeCode} loading={approverOptions.isLoading} onChange={(employeeCode) => setVpForm((current) => ({ ...current, employeeCode }))} /></Box>
          <Autocomplete
            multiple
            size="small"
            options={categoryOptions}
            value={categoryOptions.filter((category) => vpForm.categoryIds.some((id) => String(id) === String(category.id)))}
            onChange={(_event, selected) => setVpForm((current) => ({ ...current, categoryIds: selected.map((category) => String(category.id)) }))}
            getOptionLabel={(category) => category.name}
            isOptionEqualToValue={(option, selected) => String(option.id) === String(selected.id)}
            renderInput={(params) => <TextField {...params} label="Categories" placeholder="Select one or more categories" />}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" disableElevation disabled={!vpForm.employeeCode || !vpForm.categoryIds.length || saveResponsibility.isPending} onClick={saveVp}>Save categories</Button>
        </SetupCard>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <SetupCard title="Inventory Heads by category" description="Assign one person to one or multiple inventory categories. Each category routes to its configured final approver.">
          <Box sx={{ mb: 1.5 }}><EmployeeSelect options={employees} value={headForm.employeeCode} loading={approverOptions.isLoading} onChange={(employeeCode) => setHeadForm((current) => ({ ...current, employeeCode }))} /></Box>
          <Autocomplete
            multiple
            size="small"
            options={categoryOptions}
            value={categoryOptions.filter((category) => headForm.categoryIds.some((id) => String(id) === String(category.id)))}
            onChange={(_event, selected) => setHeadForm((current) => ({ ...current, categoryIds: selected.map((category) => String(category.id)) }))}
            getOptionLabel={(category) => category.name}
            isOptionEqualToValue={(option, selected) => String(option.id) === String(selected.id)}
            renderInput={(params) => <TextField {...params} label="Categories" placeholder="Select one or more categories" />}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" disableElevation disabled={!headForm.employeeCode || !headForm.categoryIds.length || saveResponsibility.isPending} onClick={saveHead}>Save categories</Button>
        </SetupCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SetupCard title="Branch assignments" description="Current local branch routing.">
          {(branchApprovers.data || []).map((item) => {
            const label = `${branchName(item.branchId)} assignment`;
            return <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: 1, borderColor: 'divider' }}><Typography sx={{ fontSize: 14, flex: 1 }}>{branchName(item.branchId)}</Typography><Typography sx={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{employeeLabel(item.employeeCode)}</Typography>{actionButtons(() => editBranch(item), { kind: 'branch', id: item.id, label })}</Box>;
          })}
          {!branchApprovers.isLoading && !(branchApprovers.data || []).length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No branch approvers configured.</Typography>}
        </SetupCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SetupCard title="VP and Inventory Head assignments" description="Category-based approval routing. Department VP assignments below only control overview access.">
          {vpAssignments.map((assignment) => {
            const label = `${employeeLabel(assignment.employeeCode)} Category VP assignment`;
            return <Box key={`category-vp-${assignment.employeeCode}`} sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{employeeLabel(assignment.employeeCode)} · Category VP</Typography>{actionButtons(() => editVp(assignment), { kind: 'responsibility', ids: assignment.ids, label })}</Box><Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}>{assignment.categoryIds.map((categoryId) => <Chip key={categoryId} size="small" label={categoryName(categoryId)} />)}</Box></Box>;
          })}
          {headAssignments.map((assignment) => {
            const label = `${employeeLabel(assignment.employeeCode)} Inventory Head assignment`;
            return <Box key={assignment.employeeCode} sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{employeeLabel(assignment.employeeCode)}</Typography>{actionButtons(() => editHead(assignment), { kind: 'responsibility', ids: assignment.ids, label })}</Box><Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}>{assignment.categoryIds.map((categoryId) => <Chip key={categoryId} size="small" label={categoryName(categoryId)} />)}</Box></Box>;
          })}
          {departmentOverviewAssignments.map((item) => (
            <Box key={`department-overview-${item.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 14, flex: 1 }}>{departmentName(item.departmentId)} overview access</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{employeeLabel(item.employeeCode)}</Typography>
            </Box>
          ))}
          {!responsibilities.isLoading && !(responsibilities.data || []).length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No VP or Inventory Head assignments configured.</Typography>}
        </SetupCard>
      </Grid>
    </Grid>
    <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
      <DialogTitle>Delete approver assignment?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Delete {deleteTarget?.label}? New requests that need this approval level cannot be submitted or advanced until another approver is configured.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
        <Button color="error" variant="contained" disableElevation disabled={deleteResponsibility.isPending || deleteBranchApprover.isPending} onClick={confirmDelete}>Delete</Button>
      </DialogActions>
    </Dialog>
  </>;
};

export default InventoryApprovalSetup;
