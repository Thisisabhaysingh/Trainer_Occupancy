import React, { useState } from 'react';
import { Box, Button, Stepper, Step, StepLabel, TextField, Grid, MenuItem, Paper, Stack, Typography } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';
import { templates as mockTemplates, branches, users } from '../mockData';

const steps = ['Project Details', 'Template Selection', 'Custom Jobs', 'Review & Create'];

const CreateProject = () => {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({ name: '', code: '', description: '', branchId: '', ownerId: '', priority: 'Medium', startDate: '', endDate: '', status: 'planned', selectedTemplateId: null, jobs: [] });

  const next = () => setActive((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setActive((s) => Math.max(s - 1, 0));

  const applyTemplate = (templateId) => {
    const t = mockTemplates.find(x => x.id === templateId);
    if (!t) return;
    setForm((prev) => ({ ...prev, selectedTemplateId: templateId, jobs: t.jobs.map(j => ({ id: j.id, title: j.title, tasks: j.tasks || [] })) }));
  };

  return (
    <Box>
      <PageShell title="Create Project" description="Multi-step wizard: Project Details → Template Selection → Custom Jobs → Review & Create" />

      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 2 }}>
          <Stepper activeStep={active} alternativeLabel>
            {steps.map((s) => (
              <Step key={s}><StepLabel>{s}</StepLabel></Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 3 }}>
            {active === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField label="Project Name" fullWidth size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Grid>
                <Grid item xs={12} md={6}><TextField label="Project Code" fullWidth size="small" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Grid>
                <Grid item xs={12}><TextField label="Description" fullWidth size="small" multiline minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
                <Grid item xs={12} md={4}><TextField select label="Branch" fullWidth size="small" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>{branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Owner" fullWidth size="small" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>{users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Priority" fullWidth size="small" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><MenuItem value="Low">Low</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="High">High</MenuItem><MenuItem value="Critical">Critical</MenuItem></TextField></Grid>
              </Grid>
            )}

            {active === 1 && (
              <Box>
                <Typography sx={{ mb: 1 }}>Select a template to prefill jobs and tasks.</Typography>
                <Stack spacing={2}>
                  {mockTemplates.map(t => (
                    <Paper key={t.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight={700}>{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                      </Box>
                      <Button variant={form.selectedTemplateId === t.id ? 'contained' : 'outlined'} onClick={() => applyTemplate(t.id)}>Apply</Button>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {active === 2 && (
              <Box>
                <Typography sx={{ mb: 1 }}>Customize jobs and tasks (basic inline editor).</Typography>
                <Stack spacing={2}>
                  {form.jobs.map((job, idx) => (
                    <Paper key={job.id || idx} sx={{ p: 2 }}>
                      <TextField fullWidth size="small" label="Job title" value={job.title} onChange={(e) => setForm(prev => ({ ...prev, jobs: prev.jobs.map(j => j === job ? { ...j, title: e.target.value } : j) }))} sx={{ mb: 1 }} />
                      <Typography variant="caption">Tasks: {job.tasks?.length || 0}</Typography>
                    </Paper>
                  ))}
                  <Button variant="outlined" onClick={() => setForm(prev => ({ ...prev, jobs: [...prev.jobs, { id: `j-${Date.now()}`, title: 'New job', tasks: [] }] }))}>Add Job</Button>
                </Stack>
              </Box>
            )}

            {active === 3 && (
              <Box>
                <Typography variant="h6">Review</Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography><strong>Name:</strong> {form.name}</Typography>
                  <Typography><strong>Code:</strong> {form.code}</Typography>
                  <Typography><strong>Template:</strong> {mockTemplates.find(t => t.id === form.selectedTemplateId)?.name || '—'}</Typography>
                  <Typography sx={{ mt: 1 }}><strong>Jobs:</strong> {form.jobs.length}</Typography>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={() => alert('Project created (mock)')} sx={{ mr: 1 }}>Create Project</Button>
                  <Button variant="outlined" onClick={() => { setActive(0); }}>Edit</Button>
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button disabled={active === 0} onClick={back}>Back</Button>
            <Button variant="contained" onClick={next}>{active === steps.length - 1 ? 'Finish' : 'Next'}</Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default CreateProject;
