import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Snackbar, Alert } from '@mui/material';
import PageShellV2 from '../components/PageShellV2';

const difficultyOptions = ['Low', 'Medium', 'High'];

const STORAGE_KEY = 'projects_v2_templates';

const CreateTemplateV2 = () => {
  const [form, setForm] = useState({ name: '', description: '', category: '', difficulty: 'Medium' });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const saveTemplate = () => {
    setError('');
    if (!form.name.trim()) {
      setError('Template name is required');
      return;
    }
    setSaving(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const newTpl = { id: `tpl_${Date.now()}`, name: form.name, description: form.description, category: form.category, difficulty: form.difficulty };
      list.unshift(newTpl);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setOpen(true);
      setForm({ name: '', description: '', category: '', difficulty: 'Medium' });
    } catch (e) {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShellV2 title="Create Template" description="Define a reusable job template">
      <Box sx={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField fullWidth required label="Template Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={!!error} helperText={error} />
        <TextField fullWidth label="Description" multiline rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <TextField fullWidth label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <TextField select fullWidth label="Difficulty" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
          {difficultyOptions.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={saveTemplate} disabled={saving}>Save Template</Button>
          <Button variant="outlined" onClick={() => setForm({ name: '', description: '', category: '', difficulty: 'Medium' })}>Reset</Button>
        </Box>
      </Box>

      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert onClose={() => setOpen(false)} severity="success" sx={{ width: '100%' }}>
          Template saved
        </Alert>
      </Snackbar>
    </PageShellV2>
  );
};

export default CreateTemplateV2;
