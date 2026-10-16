import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, InputAdornment, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BrokenImageOutlinedIcon from '@mui/icons-material/BrokenImageOutlined';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '../../../core/auth/permissions';
import {
  useCentralAvailableItems,
  useCentralInventoryBranches,
  useCentralInventoryStatus,
  useInventoryCategories,
  useInventoryItems,
} from '../hooks/useInventory';
import { useBranches } from '../../branches/hooks/useBranches';
import ErrorState from '../../../components/states/ErrorState';
import LoadingState from '../../../components/states/LoadingState';
import InventoryPageHeading from '../components/InventoryPageHeading';

const quantity = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const itemsFrom = (payload) => Array.isArray(payload) ? payload : payload?.items || payload?.serials || [];
const branchesFrom = (payload) => Array.isArray(payload) ? payload : payload?.items || payload?.branches || [];
const safeImageSrc = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const InventoryThumbnail = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const imageSrc = safeImageSrc(src);
  if (!imageSrc || failed) {
    return <Box component="span" role="img" aria-label={`No image available for ${name}`} sx={{ width: 56, height: 56, flexShrink: 0, borderRadius: 1.5, bgcolor: 'action.hover', color: 'text.disabled', display: 'inline-grid', placeItems: 'center' }}><BrokenImageOutlinedIcon /></Box>;
  }
  return <Box component="img" src={imageSrc} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', border: 1, borderColor: 'divider', bgcolor: 'background.paper' }} />;
};

const BrowseInventory = () => {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const canRequest = hasPermission(user, 'inventory.request');
  const isEmployee = user?.role === 'employee';
  const assignedBranchId = user?.branchId ? String(user.branchId) : '';
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const branchId = isEmployee ? assignedBranchId : selectedBranchId;
  const localItems = useInventoryItems(branchId ? { branchId } : {});
  const categories = useInventoryCategories();
  const branches = useBranches();
  const centralStatus = useCentralInventoryStatus();
  const centralActive = Boolean(centralStatus.data?.enabled && centralStatus.data?.configured);
  const centralItems = useCentralAvailableItems(centralActive, branchId ? { branchId } : {});
  const centralBranches = useCentralInventoryBranches(centralActive);

  const localBranchName = useCallback((id) => {
    if (String(id) === '1') return 'Mumbai HQ';
    const branch = (branches.data || []).find((entry) => String(entry.id) === String(id));
    return branch?.name || branch?.location || 'Unknown branch';
  }, [branches.data]);
  const centralBranchName = useCallback((id) => {
    const branch = branchesFrom(centralBranches.data).find((entry) => String(entry.id) === String(id));
    return branch?.name || branch?.location || `Central branch ${id}`;
  }, [centralBranches.data]);

  const categoryOptions = useMemo(() => {
    const options = new Map((categories.data || []).map((category) => [String(category.id), { id: String(category.id), name: category.name }]));
    for (const item of itemsFrom(centralItems.data)) {
      const name = item.categoryName || item.category?.name || 'Central Inventory';
      const id = item.categoryId ?? `central:${name}`;
      options.set(String(id), { id: String(id), name });
    }
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories.data, centralItems.data]);

  const rows = useMemo(() => {
    const localRows = (localItems.data || []).flatMap((item) => {
      const stocks = item.stock?.length ? item.stock : [{ branchId: branchId || null }];
      return stocks.map((stock) => ({
        key: `mis-${item.id}-${stock.branchId || 'none'}`,
        source: 'MIS',
        requestInventoryItemId: item.id,
        requestItemName: item.name,
        name: item.name,
        sku: item.sku,
        unit: item.defaultUnit || 'unit',
        branchId: stock.branchId,
        branchName: stock.branchId ? localBranchName(stock.branchId) : 'No stock record',
        available: stock.availableQuantity,
        reserved: stock.reservedQuantity,
        allocated: stock.allocatedQuantity,
        inTransit: stock.inTransitQuantity,
        damaged: stock.damagedQuantity,
        type: item.itemType,
        category: item.category?.name || '—',
        categoryId: item.categoryId,
        imageUrl: null,
      }));
    });
    const remoteRows = itemsFrom(centralItems.data).map((item) => {
      const remoteBranchId = item.branchId ?? item.branch?.id ?? item.branch;
      return {
        key: `central-${item.id ?? item.serial}`,
        source: 'Central App',
        requestInventoryItemId: null,
        requestItemName: item.name || item.itemName || item.sku || item.serial,
        name: item.name || item.itemName || item.sku || item.serial,
        sku: item.sku,
        unit: item.unit || 'unit',
        branchId: remoteBranchId,
        branchName: item.branchName || item.branch?.name || centralBranchName(remoteBranchId),
        available: item.quantity ?? 1,
        reserved: item.reservedQuantity,
        allocated: item.allocatedQuantity,
        inTransit: item.inTransitQuantity,
        damaged: item.damagedQuantity,
        type: item.itemType || 'serial',
        category: item.categoryName || item.category?.name || 'Central Inventory',
        categoryId: item.categoryId ?? `central:${item.categoryName || item.category?.name || 'Central Inventory'}`,
        imageUrl: item.imageUrl,
      };
    });
    return [...localRows, ...remoteRows].filter((row) => {
      const matchesText = `${row.name} ${row.sku || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryId || String(row.categoryId || '') === String(categoryId);
      return matchesText && matchesCategory;
    }).map((row) => ({
      ...row,
      name: <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}><InventoryThumbnail key={row.imageUrl || 'placeholder'} src={row.imageUrl} name={row.name} /><Box component="span">{row.name}</Box></Box>,
    }));
  }, [localItems.data, centralItems.data, search, categoryId, branchId, localBranchName, centralBranchName]);

  const loading = localItems.isLoading || branches.isLoading || centralStatus.isLoading || (centralActive && centralItems.isLoading);
  return <>
    <InventoryPageHeading title="Browse Inventory" subtitle="View MIS branch stock and read-only available inventory from the Central App." />
    <Alert severity={centralActive ? 'success' : 'info'} sx={{ mb: 2 }}>
      {centralActive
        ? 'Central App read-only inventory is connected. Available Central items are included below.'
        : 'Showing MIS local inventory. Central App reads will appear automatically after a valid JWT and branch mapping are configured.'}
    </Alert>
    <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inventory..." sx={{ minWidth: 260, flex: 1 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" disabled={isEmployee} label="Branch" value={branchId} onChange={(event) => setSelectedBranchId(event.target.value)} sx={{ minWidth: 210 }}>
          {!isEmployee && <MenuItem value="">All branches</MenuItem>}
          {(branches.data || []).filter((branch) => !isEmployee || String(branch.id) === assignedBranchId).map((branch) => <MenuItem key={branch.id} value={String(branch.id)}>{String(branch.id) === '1' ? 'Mumbai HQ' : branch.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} sx={{ minWidth: 190 }}><MenuItem value="">All categories</MenuItem>{categoryOptions.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField>
      </Box>
    </Paper>
    {centralItems.isError && <Alert severity="warning" sx={{ mb: 2 }}>Central App inventory is temporarily unavailable. MIS local inventory remains visible.</Alert>}
    {loading ? <LoadingState /> : localItems.isError ? <ErrorState error={localItems.error} onRetry={localItems.refetch} /> : !rows.length ? <Alert severity="info">No matching inventory stock found.</Alert> :
      <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Item</TableCell><TableCell>Source</TableCell><TableCell>Branch</TableCell><TableCell align="right">Available</TableCell><TableCell align="right">Reserved</TableCell><TableCell align="right">Allocated</TableCell><TableCell align="right">In transit</TableCell><TableCell align="right">Damaged</TableCell><TableCell>Type</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell>Action</TableCell></TableRow></TableHead><TableBody>{rows.map((row) => <TableRow hover key={row.key}><TableCell><Typography sx={{ fontSize: 14, fontWeight: 600 }}>{row.name}</Typography><Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.sku || 'No SKU'} · {row.unit}</Typography></TableCell><TableCell><Chip size="small" color={row.source === 'Central App' ? 'primary' : 'default'} variant={row.source === 'Central App' ? 'filled' : 'outlined'} label={row.source} /></TableCell><TableCell><Typography sx={{ fontSize: 14, fontWeight: row.branchName === 'Mumbai HQ' ? 600 : 400 }}>{row.branchName}</Typography></TableCell><TableCell align="right"><Typography sx={{ fontSize: 14, fontWeight: 700, color: Number(row.available || 0) > 0 ? 'success.main' : 'error.main' }}>{quantity(row.available)}</Typography></TableCell><TableCell align="right">{row.reserved == null ? '—' : quantity(row.reserved)}</TableCell><TableCell align="right">{row.allocated == null ? '—' : quantity(row.allocated)}</TableCell><TableCell align="right">{row.inTransit == null ? '—' : quantity(row.inTransit)}</TableCell><TableCell align="right">{row.damaged == null ? '—' : quantity(row.damaged)}</TableCell><TableCell><Chip size="small" label={row.type} /></TableCell><TableCell>{row.category}</TableCell><TableCell><Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{Number(row.available || 0) > 0 && <Chip size="small" color="success" label="Available" />}{Number(row.allocated || 0) > 0 && <Chip size="small" color="warning" label="Assigned" />}{Number(row.available || 0) <= 0 && Number(row.allocated || 0) <= 0 && <Chip size="small" variant="outlined" label="Out of stock" />}</Box></TableCell><TableCell><Button size="small" variant="contained" disableElevation disabled={!canRequest} onClick={() => navigate('/inventory/create-request', { state: { requestItem: { inventoryItemId: row.requestInventoryItemId || '', requestedItemName: row.requestItemName || '', itemType: row.type === 'consumable' || row.type === 'bulk' ? row.type : 'asset', unit: row.unit || 'unit', quantity: 1 } } })}>Request</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>}
  </>;
};

export default BrowseInventory;
