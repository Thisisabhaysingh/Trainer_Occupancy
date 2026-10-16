import React, { useState } from 'react';
import { Box, Paper, Stepper, Step, StepLabel, Grid, TextField, MenuItem, Button, Typography } from '@mui/material';
import { branchesV2, templatesV2, usersV2 } from '../mockDataV2';

const steps = ['Project Details', 'Template Selection', 'Custom Jobs', 'Review & Create'];

const CreateProjectWizardV2 = () => {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({ name: '', code: '', description: '', branchId: '', ownerId: '', priority: 'Medium', startDate: '', endDate: '', status: 'planned', selectedTemplateId: null, jobs: [] });

  const next = () => setActive(a => Math.min(a + 1, steps.length - 1));
  const back = () => setActive(a => Math.max(a - 1, 0));

  const applyTemplate = (id) => {
    const t = templatesV2.find(x => x.id === id);
    if (!t) return;
    setForm(prev => ({ ...prev, selectedTemplateId: id, jobs: t.jobs || [] }));
  };

  return (
    <Box>
      <Paper sx={{ p: 3, borderRadius: 3 }} elevation={0}>
        <Typography variant="h5" fontWeight={800}>Create Project</Typography>
        <Typography color="text.secondary">Follow the four-step flow to create a project aligned to your business model.</Typography>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stepper activeStep={active} alternativeLabel>
          {steps.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>

        <Box sx={{ mt: 3 }}>
          {active === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><TextField label="Project Name" fullWidth size="small" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
              <Grid item xs={12} md={6}><TextField label="Project Code" fullWidth size="small" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField label="Description" fullWidth size="small" multiline minRows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Grid>
              <Grid item xs={12} md={4}><TextField select label="Branch" fullWidth size="small" value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>{branchesV2.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={4}><TextField select label="Owner" fullWidth size="small" value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}>{usersV2.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={4}><TextField select label="Priority" fullWidth size="small" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><MenuItem value="Low">Low</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="High">High</MenuItem><MenuItem value="Critical">Critical</MenuItem></TextField></Grid>
            </Grid>
          )}

          {active === 1 && (
            <Box>
              <Typography sx={{ mb: 1 }}>Choose a template to prefill jobs and tasks.</Typography>
              {templatesV2.map(t => (
                <Paper key={t.id} sx={{ p: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={700}>{t.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                  </Box>
                  <Button variant={form.selectedTemplateId === t.id ? 'contained' : 'outlined'} onClick={() => applyTemplate(t.id)}>{form.selectedTemplateId === t.id ? 'Applied' : 'Apply'}</Button>
                </Paper>
              ))}
            </Box>
          )}

          {active === 2 && (
            <Box>
              <Typography sx={{ mb: 1 }}>Customize jobs (inline). Add jobs that represent `Job` entity only. Tasks are defined in templates.</Typography>
              {form.jobs.map((j, idx) => (
                <Paper key={j.id || idx} sx={{ p: 2, mb: 1 }}>
                  <TextField fullWidth size="small" label="Job name" value={j.title || ''} onChange={e => setForm(prev => ({ ...prev, jobs: prev.jobs.map((job,i) => i === idx ? { ...job, title: e.target.value } : job) }))} />
                </Paper>
              ))}
              <Button variant="outlined" onClick={() => setForm(prev => ({ ...prev, jobs: [...prev.jobs, { id: `j-${Date.now()}`, title: 'New Job', tasks: [] }] }))}>Add Job</Button>
            </Box>
          )}

          {active === 3 && (
            <Box>
              <Typography variant="h6">Review</Typography>
              <Typography sx={{ mt: 1 }}><strong>Name:</strong> {form.name}</Typography>
              <Typography><strong>Code:</strong> {form.code}</Typography>
              <Typography><strong>Template:</strong> {templatesV2.find(t => t.id === form.selectedTemplateId)?.name || '—'}</Typography>
              <Typography><strong>Jobs:</strong> {form.jobs.length}</Typography>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => alert('Created (mock)')}>Create Project</Button>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button disabled={active === 0} onClick={back}>Back</Button>
            <Button variant="contained" onClick={() => active === steps.length - 1 ? null : next()}>{active === steps.length - 1 ? 'Finish' : 'Next'}</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default CreateProjectWizardV2;
