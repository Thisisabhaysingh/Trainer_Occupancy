import { Alert, Box, Grid, Paper, Typography } from '@mui/material';
import { CategoryOutlined, Inventory2Outlined, RequestPageOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { useInventoryCategories, useInventoryControlOverviewAccess, useInventoryItems, useMyInventoryRequests } from '../hooks/useInventory';
import AdminInventoryOverview from './AdminInventoryOverview';
const PersonalInventoryHome = () => {
  const user = useSelector((state) => state.auth.user);
  const theme = useTheme();
  const categories = useInventoryCategories(); const items = useInventoryItems(); const requests = useMyInventoryRequests();
  const schemaMissing = [categories, items, requests].find((query) => query.error?.status === 500);
  const metrics = [
    { label: 'Categories', value: categories.data?.length || 0, icon: <CategoryOutlined sx={{ fontSize: 21 }} />, color: '#0070F0', bg: '#EFF6FF' },
    { label: 'Inventory items', value: items.data?.length || 0, icon: <Inventory2Outlined sx={{ fontSize: 21 }} />, color: '#12B76A', bg: '#ECFDF3' },
    { label: 'My requests', value: requests.data?.length || 0, icon: <RequestPageOutlined sx={{ fontSize: 21 }} />, color: '#F79009', bg: '#FFFAEB' },
  ];
  return <Box>
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 20, lineHeight: '28px', fontWeight: 600, color: 'text.primary' }}>Overview</Typography>
      <Typography sx={{ mt: 0.25, fontSize: 14, lineHeight: '20px', color: 'text.secondary' }}>Welcome back, {user?.name || 'User'}. Here is your inventory summary.</Typography>
    </Box>
    {schemaMissing && <Alert severity="info" sx={{ mb: 3 }}>Inventory is installed, but its database migration must be applied before data can be used.</Alert>}
    <Grid container spacing={2.5}>{metrics.map(({ label, value, icon, color, bg }) => <Grid key={label} size={{ xs: 12, md: 4 }}>
      <Paper elevation={0} sx={{ p: 2.5, minHeight: 122, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ width: 40, height: 40, mb: 1.5, borderRadius: 2, display: 'grid', placeItems: 'center', color, bgcolor: bg }}>{icon}</Box>
        <Typography sx={{ fontSize: 24, lineHeight: '30px', fontWeight: 700, color: 'text.primary' }}>{value}</Typography>
        <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'text.secondary' }}>{label}</Typography>
      </Paper>
    </Grid>)}</Grid>
  </Box>;
};
const InventoryHome = () => {
  const role = useSelector((state) => state.auth.user?.role);
  const access = useInventoryControlOverviewAccess();
  if (['admin', 'inventory_admin'].includes(role)) return <AdminInventoryOverview />;
  if (access.isLoading) return <Typography sx={{ color: 'text.secondary' }}>Loading inventory overview…</Typography>;
  if (access.data?.isInventoryHead) return <AdminInventoryOverview categoryScope={access.data.inventoryCategoryIds || []} inventoryHead />;
  return access.data?.canViewControlOverview
    ? <AdminInventoryOverview departmentScope={access.data?.isDepartmentVicePresident ? access.data.departmentId : null} />
    : <PersonalInventoryHome />;
};
export default InventoryHome;
