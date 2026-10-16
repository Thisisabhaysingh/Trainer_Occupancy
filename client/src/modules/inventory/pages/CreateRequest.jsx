import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, CircularProgress, Grid, IconButton, MenuItem, Paper, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSelector } from 'react-redux';
import { useCentralInventoryKits, useCreateInventoryRequest, useInventoryCategories, useInventoryItems } from '../hooks/useInventory';
import { inventoryApi } from '../api/inventoryApi';
import InventoryPageHeading from '../components/InventoryPageHeading';
import { useBranches } from '../../branches/hooks/useBranches';
import { useDepartments } from '../../departments/hooks/useDepartments';

const emptyItem = { inventoryItemId: '', zohoCompositeItemId: '', requestedItemName: '', itemType: 'asset', quantity: 1, unit: 'unit', referenceUrl: '', estimatedPrice: '', notes: '', kitComponents: [] };
const CreateRequest = () => {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();
  const categories = useInventoryCategories();
  const mutation = useCreateInventoryRequest();
  const branches = useBranches();
  const departments = useDepartments();
  const inventoryItems = useInventoryItems({ branchId: user?.branchId });
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ categoryId: '', subcategoryCode: '', branchId: user?.branchId || '', departmentId: user?.department?.id || user?.department || '', contextType: 'EMPLOYEE_REQUEST', contextName: '', purpose: '', priority: 'normal', requiredFrom: '', expectedReturnDate: '', items: [{ ...emptyItem, ...(location.state?.requestItem || {}) }] });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setItem = (index, key, value) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const selectedCategory = (categories.data || []).find((category) => String(category.id) === String(form.categoryId));
  const isKitCategory = ['SCHOOL_INVENTORY', 'INSTITUTE_CLASS'].includes(selectedCategory?.code)
    || ['school inventory', 'institute class'].includes(String(selectedCategory?.name || '').toLowerCase());
  const centralKits = useCentralInventoryKits(isKitCategory, { status: 'active' });
  const subcategories = (categories.data || []).filter((category) => category.parentId === selectedCategory?.id);
  const topCategories = (categories.data || []).filter((category) => !category.parentId);
  useEffect(() => {
    setForm((current) => ({ ...current, items: current.items.map((item) => ({
      ...item,
      itemType: isKitCategory ? 'kit' : item.itemType === 'kit' ? 'asset' : item.itemType,
      ...(!isKitCategory ? { zohoCompositeItemId: '', kitComponents: [] } : {}),
    })) }));
  }, [form.categoryId, isKitCategory]);
  const submit = async (event) => {
    event.preventDefault(); setNotice('');
    try {
      const result = await mutation.mutateAsync({ ...form, categoryId: Number(form.categoryId), branchId: Number(form.branchId), departmentId: form.departmentId ? Number(form.departmentId) : null, requiredFrom: form.requiredFrom || null, expectedReturnDate: form.expectedReturnDate || null, estimatedValue: form.items.reduce((sum, item) => sum + Number(item.estimatedPrice || 0) * Number(item.quantity), 0), items: form.items.map((item) => ({ ...item, inventoryItemId: item.inventoryItemId ? Number(item.inventoryItemId) : null, quantity: Number(item.quantity), estimatedPrice: Number(item.estimatedPrice || 0), notes: item.zohoCompositeItemId ? JSON.stringify({ source: 'OMNIX_ZOHO', zohoCompositeItemId: item.zohoCompositeItemId, components: item.kitComponents.map((component) => ({ ...component, totalQuantity: Number(component.quantity) * Number(item.quantity) })) }) : item.notes, kitComponents: undefined, zohoCompositeItemId: undefined })) });
      setNotice(result?.centralSync?.synced === false ? 'Request submitted in MIS, but it has not appeared in Omnix yet. Please retry or contact an administrator.' : 'Inventory request submitted and sent to Omnix.');
      setForm((current) => ({ ...current, purpose: '', items: [{ ...emptyItem }] }));
    } catch (error) { setNotice(error.message); }
  };
  return <>
    <InventoryPageHeading title="Create Inventory Request" subtitle="Add one or more items with the required category, dates, and supporting references." />
    {notice && <Alert severity={mutation.isError ? 'error' : notice.includes('not appeared') ? 'warning' : 'success'} sx={{ mb: 2 }}>{notice}</Alert>}
    <Paper component="form" onSubmit={submit} elevation={0} sx={{ p: { xs: 2, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>Request details</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}><TextField select required fullWidth size="small" label="Category" value={form.categoryId} onChange={set('categoryId')} disabled={categories.isLoading || categories.isError || topCategories.length === 0} error={categories.isError} helperText={categories.isLoading ? 'Loading request categories…' : categories.isError ? 'Could not load categories. Refresh the page and try again.' : topCategories.length === 0 ? 'No request categories are configured. Ask an administrator to restart MIS so its category seed can run.' : ''}>{topCategories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" disabled={!subcategories.length} label="Subcategory" value={form.subcategoryCode} onChange={set('subcategoryCode')}><MenuItem value="">None</MenuItem>{subcategories.map((category) => <MenuItem key={category.id} value={category.code}>{category.name}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField select required disabled fullWidth size="small" label="Requesting branch" value={form.branchId}>{(branches.data || []).map((branch) => <MenuItem key={branch.id} value={branch.id}>{String(branch.id) === '1' ? 'Mumbai HQ' : branch.name}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField select required disabled fullWidth size="small" label="Department" value={form.departmentId}>{(departments.data || []).map((department) => <MenuItem key={department.id} value={department.id}>{department.name}</MenuItem>)}</TextField></Grid>
        <Grid size={12}><TextField required fullWidth size="small" multiline minRows={2} label="Purpose / justification" value={form.purpose} onChange={set('purpose')} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Priority" value={form.priority} onChange={set('priority')}>{['low','normal','high','urgent'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" type="date" label="Required from" value={form.requiredFrom} onChange={set('requiredFrom')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" type="date" label="Expected return" value={form.expectedReturnDate} onChange={set('expectedReturnDate')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
      </Grid>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, mb: 1.5 }}><Typography sx={{ fontSize: 16, fontWeight: 600 }}>Requested items</Typography><Button size="small" startIcon={<AddIcon />} onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem, itemType: isKitCategory ? 'kit' : 'asset' }] }))}>Add item</Button></Box>
      {form.items.map((item, index) => <Paper key={index} elevation={0} sx={{ p: 2, mb: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}><Grid container spacing={1.5} alignItems="center">
        <Grid size={{ xs: 12, md: 3 }}><Autocomplete
          fullWidth
          size="small"
          options={isKitCategory ? centralKits.data?.items || [] : inventoryItems.data || []}
          value={(isKitCategory ? centralKits.data?.items || [] : inventoryItems.data || []).find((entry) => String(entry.zohoCompositeItemId || entry.id) === String(isKitCategory ? item.zohoCompositeItemId : item.inventoryItemId)) || null}
          inputValue={item.requestedItemName}
          onInputChange={(_, value, reason) => { if (reason === 'input') setItem(index, 'requestedItemName', value); }}
          disabled={isKitCategory && centralKits.isLoading}
          loading={isKitCategory ? centralKits.isLoading : inventoryItems.isLoading}
          getOptionLabel={(entry) => `${entry.name || ''}${entry.sku ? ` · ${entry.sku}` : ''}`}
          isOptionEqualToValue={(option, value) => String(option.zohoCompositeItemId || option.id) === String(value.zohoCompositeItemId || value.id)}
          onChange={async (_, selected) => {
            if (!selected) {
              setForm((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...emptyItem, itemType: isKitCategory ? 'kit' : 'asset', quantity: entry.quantity } : entry) }));
            } else if (isKitCategory) {
              const detail = await inventoryApi.centralKit(selected.zohoCompositeItemId);
              setForm((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, inventoryItemId: '', zohoCompositeItemId: selected.zohoCompositeItemId, requestedItemName: selected.name || detail?.name || '', itemType: 'kit', unit: selected.unit || detail?.unit || 'kit', estimatedPrice: selected.purchaseRate || '', kitComponents: detail?.components || [] } : entry) }));
            } else {
              setForm((current) => ({ ...current, items: current.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, inventoryItemId: selected.id, requestedItemName: selected.name || '', itemType: selected.itemType || 'asset', unit: selected.defaultUnit || 'unit' } : entry) }));
            }
          }}
          renderInput={(params) => <TextField {...params} required label={isKitCategory ? 'Search or select kit' : 'Search or select inventory item'} slotProps={{ input: { ...params.InputProps, endAdornment: <>{(isKitCategory ? centralKits.isLoading : inventoryItems.isLoading) && <CircularProgress color="inherit" size={18} />}{params.InputProps.endAdornment}</> } }} />}
        /></Grid>
        <Grid size={{ xs: 6, md: 2 }}><TextField select fullWidth size="small" disabled={isKitCategory} label="Type" value={item.itemType} onChange={(event) => setItem(index, 'itemType', event.target.value)}>{['asset','bulk','consumable','kit'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 3, md: 1 }}><TextField required fullWidth size="small" type="number" label="Qty" value={item.quantity} onChange={(event) => setItem(index, 'quantity', event.target.value)} /></Grid>
        <Grid size={{ xs: 3, md: 1 }}><TextField required fullWidth size="small" label="Unit" value={item.unit} onChange={(event) => setItem(index, 'unit', event.target.value)} /></Grid>
        <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="number" label="Unit price" value={item.estimatedPrice} onChange={(event) => setItem(index, 'estimatedPrice', event.target.value)} /></Grid>
        <Grid size={{ xs: 10, md: 2.5 }}><TextField fullWidth size="small" type="url" label="Image / reference URL" value={item.referenceUrl} onChange={(event) => setItem(index, 'referenceUrl', event.target.value)} /></Grid>
        <Grid size={{ xs: 2, md: 0.5 }}><IconButton aria-label="Remove item" disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><DeleteOutlineIcon /></IconButton></Grid>
      </Grid>{isKitCategory && item.kitComponents.length > 0 && <Box sx={{ mt: 1.5 }}><Typography sx={{ fontSize: 13, fontWeight: 600 }}>Kit components</Typography>{item.kitComponents.map((component) => <Typography key={component.zohoItemId} sx={{ fontSize: 12, color: 'text.secondary' }}>{component.name}{component.sku ? ` (${component.sku})` : ''} × {Number(component.quantity) * Number(item.quantity)} {component.unit || ''}</Typography>)}</Box>}</Paper>)}
      <Button type="submit" variant="contained" disableElevation disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit request'}</Button>
    </Paper>
  </>;
};
export default CreateRequest;
