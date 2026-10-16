import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tab, Tabs } from '@mui/material';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppShell, { AppShellContent, AppShellMain } from '../../../components/layout/AppShell';
import RoleAwareNavigation from '../../../components/navigation/RoleAwareNavigation';
import { Header, PageHeader } from '../../../components/dashboard/DashboardComponents';
import { createNavigationSearchOptions, getNavigationForRole } from '../../../core/navigation/roleNavigation';
import { logout } from '../../auth/state/authSlice';
import { hasPermission } from '../../../core/auth/permissions';
import InventoryHome from '../pages/InventoryHome';
import BrowseInventory from '../pages/BrowseInventory';
import CreateRequest from '../pages/CreateRequest';
import MyRequests from '../pages/MyRequests';
import ApprovalInbox from '../pages/ApprovalInbox';
import InventoryManagerDashboard from '../pages/InventoryManagerDashboard';
import InventoryApprovalSetup from '../pages/InventoryApprovalSetup';
import { useInventoryControlOverviewAccess } from '../hooks/useInventory';

const inventoryTabs = [
  { label: 'Overview', path: '/inventory' },
  { label: 'Browse', path: '/inventory/browse' },
  { label: 'Create Request', path: '/inventory/create-request' },
  { label: 'My Requests', path: '/inventory/requests' },
  { label: 'Approvals', path: '/inventory/approvals' },
  { label: 'Manager', path: '/inventory/manager' },
  { label: 'Approval Setup', path: '/inventory/approval-setup' },
];

const dashboardPathByRole = {
  employee: '/employee',
  teamlead: '/teamlead',
  manager: '/manager',
  senior_manager: '/senior-manager',
  admin: '/admin',
  inventory_admin: '/inventory/manager',
};

const normalizeRole = (role) => (role === 'inventory_admin' ? 'admin' : role || 'employee');

const InventoryRoutes = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const overviewAccess = useInventoryControlOverviewAccess();
  const hasControlOverview = ['admin', 'inventory_admin'].includes(user?.role)
    || Boolean(overviewAccess.data?.canViewControlOverview);
  const isInventoryHead = Boolean(overviewAccess.data?.isInventoryHead);
  const visibleTabs = useMemo(() => inventoryTabs.filter((tab) => {
    if (['admin', 'inventory_admin'].includes(user?.role) && ['/inventory/create-request', '/inventory/requests'].includes(tab.path)) return false;
    if (tab.path === '/inventory/approval-setup') return hasPermission(user, 'inventory.configure');
    if (tab.path === '/inventory/manager') return hasPermission(user, 'inventory.manage_orders') || hasPermission(user, 'inventory.allocate') || hasPermission(user, 'inventory.configure') || Boolean(overviewAccess.data?.canManageProcurement);
    if (tab.path === '/inventory/approvals') return true;
    return true;
  }), [hasControlOverview, overviewAccess.data?.canManageProcurement, user]);
  const role = normalizeRole(user?.role);
  const sidebarItems = useMemo(() => getNavigationForRole(role), [role]);
  const searchOptions = useMemo(() => createNavigationSearchOptions(sidebarItems), [sidebarItems]);
  const [searchValue, setSearchValue] = useState('');
  const activeTab = inventoryTabs.find((tab) => tab.path === location.pathname) || inventoryTabs[0];

  const handleGlobalNavigation = (id) => {
    const item = sidebarItems.flatMap((section) => section.items).find((entry) => entry.id === id);
    if (item?.route) {
      navigate(item.route);
      return;
    }
    navigate(dashboardPathByRole[user?.role] || dashboardPathByRole[role] || '/');
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <AppShell>
      <RoleAwareNavigation
        role={role}
        items={sidebarItems}
        activeItem="inventory"
        onItemClick={handleGlobalNavigation}
        user={{ name: user?.name || 'User', role: user?.role || role }}
        onLogout={handleLogout}
      />

      <AppShellMain>
        <Header
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchOptions={searchOptions}
          onSearchSelect={(option) => handleGlobalNavigation(option.id)}
          searchPlaceholder="Search dashboard..."
          user={{ name: user?.name || 'User' }}
        />

        <AppShellContent sx={{ overflowX: 'hidden' }}>
          <PageHeader
            breadcrumbs={activeTab.path === '/inventory'
              ? ['Dashboard', 'Inventory']
              : ['Dashboard', 'Inventory', activeTab.label]}
            title="Inventory Management"
          subtitle={hasControlOverview ? 'Control inventory, requests, approvals, stock, and fulfilment across the organisation.' : isInventoryHead ? 'Review category-assigned demand, approve batches, and manage procurement.' : 'Browse stock, submit requests, and track fulfilment.'}
            sx={{ mb: 3 }}
          />

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
            <Tabs
              value={activeTab.path}
              onChange={(_, path) => navigate(path)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Inventory sections"
              sx={{
                minHeight: 44,
                '& .MuiTab-root': { minHeight: 44, px: 2.5, fontSize: 14, fontWeight: 600, textTransform: 'none' },
              }}
            >
              {visibleTabs.map((tab) => <Tab key={tab.path} value={tab.path} label={tab.label} />)}
            </Tabs>
          </Box>

          <Routes>
            <Route index element={<InventoryHome />} />
            <Route path="browse" element={<BrowseInventory />} />
            <Route path="create-request" element={<CreateRequest />} />
            <Route path="requests" element={<MyRequests />} />
            <Route path="approvals" element={<ApprovalInbox />} />
            <Route path="manager" element={<InventoryManagerDashboard />} />
            <Route path="approval-setup" element={<InventoryApprovalSetup />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
};

export default InventoryRoutes;
