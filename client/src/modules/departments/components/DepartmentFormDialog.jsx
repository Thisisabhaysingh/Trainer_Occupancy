import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';

const emptyForm = { name: '', location: '', description: '', color: '#4285F4' };

const DepartmentFormDialog = ({ open, department, loading, onClose, onSubmit }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  useEffect(() => {
    setForm(department ? { name: department.name || '', location: department.location || '', description: department.description || '', color: department.color || '#4285F4' } : emptyForm);
    setError('');
  }, [department, open]);

  const submit = () => {
    if (!form.name.trim() || !form.location.trim()) {
      setError('Name and location are required.');
      return;
    }
    onSubmit({ ...form, name: form.name.trim(), location: form.location.trim() });
  };

  return <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle>{department ? 'Edit department' : 'Create department'}</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <TextField required label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
      <TextField label="Description" multiline minRows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <TextField label="Color" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
      {error && <TextField error value={error} slotProps={{ input: { readOnly: true } }} />}
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose} disabled={loading}>Cancel</Button><Button variant="contained" onClick={submit} disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button></DialogActions>
  </Dialog>;
};

export default DepartmentFormDialog;
