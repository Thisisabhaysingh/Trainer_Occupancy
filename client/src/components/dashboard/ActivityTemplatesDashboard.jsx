import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { Add, DeleteOutline, EditOutlined, Refresh, Search } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export default function ActivityTemplatesDashboard({ departmentId, departmentName, onTemplatesChange, visibility = 'employee' }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [title, setTitle] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    axios.get(`${apiBaseUrl}/api/activities/templates`, { withCredentials: true, signal: controller.signal })
      .then(({ data }) => setTemplates(Array.isArray(data) ? data : []))
      .catch(err => { if (!controller.signal.aborted) setLoadError(err.response?.data?.error || 'Could not load templates. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  const visibleTemplates = useMemo(() => templates.filter(template => `${template.title} ${template.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [templates, search]);
  const openEditor = (template = {}) => { setTitle(template.title || ''); setEditor(template); setActionError(''); setSuccess(''); };
  const closeEditor = () => { if (!busy) { setEditor(null); setActionError(''); } };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = title.trim();
    if (!trimmed) { setActionError('Template title is required.'); return; }
    setBusy(true);
    setActionError('');
    try {
      const url = `${apiBaseUrl}/api/activities/templates`;
      await axios[editor.id ? 'put' : 'post'](editor.id ? `${url}/${encodeURIComponent(editor.id)}` : url, { title: trimmed }, { withCredentials: true });
      setSuccess(editor.id ? 'Template updated successfully.' : 'Template created successfully.');
      setEditor(null);
      onTemplatesChange?.();
      setRefresh(value => value + 1);
    } catch (err) { setActionError(err.response?.data?.error || 'Could not save template. Please try again.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await axios.delete(`${apiBaseUrl}/api/activities/templates/${encodeURIComponent(deleting.id)}`, { withCredentials: true });
      setSuccess('Template deleted successfully.');
      setDeleting(null);
      onTemplatesChange?.();
      setRefresh(value => value + 1);
    } catch (err) { setActionError(err.response?.data?.error || 'Could not delete template. Please try again.'); }
    finally { setBusy(false); }
  };

  return <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(16,24,40,0.08)' }}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="h5" fontWeight={700}>Activity Templates</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{visibility === 'manager' ? 'Manage activity templates using your assigned department or branch visibility.' : 'Manage activity templates shared with Employees and Team Leads in your department.'}</Typography>
        {departmentName && <Chip size="small" label={`${departmentName} Department`} sx={{ mt: 1.5 }} />}
      </Box>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Button variant="outlined" size="small" startIcon={<Refresh />} disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}>Refresh</Button>
        <Button variant="contained" size="small" startIcon={<Add />} disabled={!departmentId || busy} onClick={() => openEditor()}>Add Template</Button>
      </Stack>
    </Stack>
    <Stack spacing={2} sx={{ mt: 3 }}>
      {!departmentId && <Alert severity="warning">You need an assigned department to manage activity templates.</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {loadError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setRefresh(value => value + 1)}>Retry</Button>}>{loadError}</Alert>}
      <TextField label="Search templates" value={search} size="small" onChange={event => setSearch(event.target.value)} sx={{ maxWidth: 360 }} InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }} />
      {loading ? <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={28} aria-label="Loading activity templates" /></Box> : !loadError && !visibleTemplates.length ? <Alert severity="info">{search ? 'No templates match your search.' : 'No activity templates yet. Add a template to get started.'}</Alert> : !loadError && visibleTemplates.map(template => {
        const protectedTemplate = template.title === 'Total No. of Sessions';
        const canManage = !protectedTemplate && departmentId && String(template.departmentId) === String(departmentId);
        return <Box key={template.id} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, '&:hover': { bgcolor: 'action.hover' } }}>
          <Box sx={{ minWidth: 0 }}><Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{template.title}</Typography>
            {template.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{template.description}</Typography>}
            {protectedTemplate && <Typography variant="caption" color="text.secondary">System template</Typography>}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<EditOutlined />} aria-label={`Edit ${template.title}`} disabled={!canManage || busy} onClick={() => openEditor(template)}>Edit</Button>
            <Button variant="outlined" color="error" size="small" startIcon={<DeleteOutline />} aria-label={`Delete ${template.title}`} disabled={!canManage || busy} onClick={() => { setDeleting(template); setActionError(''); setSuccess(''); }}>Delete</Button>
          </Stack>
        </Box>;
      })}
    </Stack>
    <Dialog open={editor !== null} onClose={closeEditor} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <Box component="form" onSubmit={save}>
        <DialogTitle>{editor?.id ? 'Edit Activity Template' : 'Add Activity Template'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">Templates are available to your department for activity logging.</Typography>
          {actionError && <Alert severity="error">{actionError}</Alert>}
          <TextField autoFocus required label="Template Title" fullWidth value={title} disabled={busy} inputProps={{ maxLength: 255 }} onChange={event => { setTitle(event.target.value); setActionError(''); }} />
        </Stack></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}><Button disabled={busy} onClick={closeEditor}>Cancel</Button><Button type="submit" variant="contained" disabled={busy || !title.trim()}>{busy ? 'Saving…' : editor?.id ? 'Update Template' : 'Create Template'}</Button></DialogActions>
      </Box>
    </Dialog>
    <Dialog open={deleting !== null} onClose={() => { if (!busy) { setDeleting(null); setActionError(''); } }} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>Delete Activity Template?</DialogTitle>
      <DialogContent><DialogContentText>Delete “{deleting?.title}”? It will no longer be available when logging new activities.</DialogContentText>{actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}><Button disabled={busy} onClick={() => { setDeleting(null); setActionError(''); }}>Cancel</Button><Button variant="contained" color="error" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete Template'}</Button></DialogActions>
    </Dialog>
  </Paper>;
}
