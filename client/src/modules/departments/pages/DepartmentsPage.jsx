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
import DepartmentTable from '../components/DepartmentTable';
import DepartmentFormDialog from '../components/DepartmentFormDialog';
import { useCreateDepartment, useDeleteDepartment, useDepartments, useUpdateDepartment } from '../hooks/useDepartments';

const DepartmentsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const navigation = getNavigationForRole(user?.role);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });
  const departmentsQuery = useDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  const canManage = hasPermission(user, 'department.manage');

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (departmentsQuery.data || []).filter((department) => !term || [department.name, department.location, department.description].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [departmentsQuery.data, search]);

  const handleNavigation = (id) => {
    const item = flattenNavigation(navigation).find((entry) => entry.id === id);
    navigate(item?.route || `/admin?section=${encodeURIComponent(id)}`);
  };
  const saveDepartment = async (data) => {
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
      else await createMutation.mutateAsync(data);
      setFormOpen(false);
      setEditing(null);
      setNotice({ open: true, message: `Department ${editing ? 'updated' : 'created'} successfully.`, severity: 'success' });
    } catch (error) {
      setNotice({ open: true, message: error.message, severity: 'error' });
    }
  };
  const deleteDepartment = async (department) => {
    if (!window.confirm(`Delete ${department.name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(department.id);
      setNotice({ open: true, message: 'Department deleted successfully.', severity: 'success' });
    } catch (error) {
      setNotice({ open: true, message: error.message, severity: 'error' });
    }
  };

  return <AppShell>
    <RoleAwareNavigation role={user?.role} items={navigation} activeItem="departments" onItemClick={handleNavigation} user={{ name: user?.name || 'Admin', role: user?.role }} onLogout={async () => { await dispatch(logout()); navigate('/login'); }} />
    <AppShellMain>
      <Header searchValue={search} onSearchChange={setSearch} searchOptions={createNavigationSearchOptions(navigation)} onSearchSelect={(option) => handleNavigation(option.id)} user={{ name: user?.name || 'Admin' }} />
      <AppShellContent>
        <Breadcrumb items={[{ label: 'Admin' }, { label: 'Departments', active: true }]} separator=">" />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 3 }}>
          <Box><Typography variant="h4" fontWeight={800}>Departments</Typography></Box>
          {canManage && <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add department</Button>}
        </Box>
        <Paper variant="outlined">
          {departmentsQuery.isLoading ? <LoadingState message="Loading departments…" /> : departmentsQuery.isError ? <ErrorState error={departmentsQuery.error} onRetry={departmentsQuery.refetch} /> : <DepartmentTable departments={filteredDepartments} canManage={canManage} onEdit={(department) => { setEditing(department); setFormOpen(true); }} onDelete={deleteDepartment} />}
        </Paper>
      </AppShellContent>
    </AppShellMain>
    <DepartmentFormDialog open={formOpen} department={editing} loading={createMutation.isPending || updateMutation.isPending} onClose={() => setFormOpen(false)} onSubmit={saveDepartment} />
    <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice({ ...notice, open: false })}><Alert severity={notice.severity} onClose={() => setNotice({ ...notice, open: false })}>{notice.message}</Alert></Snackbar>
  </AppShell>;
};

export default DepartmentsPage;
