import { useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Snackbar, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppShell, { AppShellContent, AppShellMain } from '../../../components/layout/AppShell';
import RoleAwareNavigation from '../../../components/navigation/RoleAwareNavigation';
import { Breadcrumb, Header } from '../../../components/dashboard/DashboardComponents';
import { ErrorState, LoadingState } from '../../../components/states';
import { createNavigationSearchOptions, flattenNavigation, getNavigationForRole } from '../../../core/navigation/roleNavigation';
import { hasPermission } from '../../../core/auth/permissions';
import { logout } from '../../../features/auth/authSlice';
import BranchTable from '../components/BranchTable';
import BranchFormDialog from '../components/BranchFormDialog';
import { useBranches, useCreateBranch } from '../hooks/useBranches';

const BranchesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const navigation = getNavigationForRole(user?.role);
  const branchesQuery = useBranches();
  const createMutation = useCreateBranch();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });
  const canManage = hasPermission(user, 'branch.manage');
  const branches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (branchesQuery.data || []).filter((branch) => !term || [branch.name, branch.location, branch.manager?.name].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [branchesQuery.data, search]);
  const navigateFromMenu = (id) => {
    const item = flattenNavigation(navigation).find((entry) => entry.id === id);
    navigate(item?.route || `/admin?section=${encodeURIComponent(id)}`);
  };
  const createBranch = async (data) => {
    try {
      await createMutation.mutateAsync(data);
      setFormOpen(false);
      setNotice({ open: true, message: 'Branch created successfully.', severity: 'success' });
    } catch (error) {
      setNotice({ open: true, message: error.message, severity: 'error' });
    }
  };
  return <AppShell>
    <RoleAwareNavigation role={user?.role} items={navigation} activeItem="branches" onItemClick={navigateFromMenu} user={{ name: user?.name || 'Admin', role: user?.role }} onLogout={async () => { await dispatch(logout()); navigate('/login'); }} />
    <AppShellMain><Header searchValue={search} onSearchChange={setSearch} searchOptions={createNavigationSearchOptions(navigation)} onSearchSelect={(option) => navigateFromMenu(option.id)} user={{ name: user?.name || 'Admin' }} /><AppShellContent>
      <Breadcrumb items={[{ label: 'Admin' }, { label: 'Branches', active: true }]} separator=">" />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 3 }}><Box><Typography variant="h4" fontWeight={800}>Branches</Typography><Typography color="text.secondary">Locations, managers, and assigned employee counts.</Typography></Box>{canManage && <Button variant="contained" startIcon={<Add />} onClick={() => setFormOpen(true)}>Add branch</Button>}</Box>
      <Paper variant="outlined">{branchesQuery.isLoading ? <LoadingState message="Loading branches…" /> : branchesQuery.isError ? <ErrorState error={branchesQuery.error} onRetry={branchesQuery.refetch} /> : <BranchTable branches={branches} />}</Paper>
    </AppShellContent></AppShellMain>
    <BranchFormDialog open={formOpen} loading={createMutation.isPending} onClose={() => setFormOpen(false)} onSubmit={createBranch} />
    <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice({ ...notice, open: false })}><Alert severity={notice.severity} onClose={() => setNotice({ ...notice, open: false })}>{notice.message}</Alert></Snackbar>
  </AppShell>;
};
export default BranchesPage;
