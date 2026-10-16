import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';

const BranchFormDialog = ({ open, loading, onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', location: '' });
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm({ name: '', location: '' }); setError(''); } }, [open]);
  const submit = () => {
    if (!form.name.trim() || !form.location.trim()) return setError('Name and location are required.');
    onSubmit({ name: form.name.trim(), location: form.location.trim() });
  };
  return <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm"><DialogTitle>Create branch</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField required label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><TextField required label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />{error && <TextField error value={error} slotProps={{ input: { readOnly: true } }} />}</Stack></DialogContent><DialogActions><Button onClick={onClose} disabled={loading}>Cancel</Button><Button variant="contained" onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button></DialogActions></Dialog>;
};
export default BranchFormDialog;
