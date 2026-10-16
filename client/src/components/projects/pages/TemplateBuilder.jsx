import React, { useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography, Button, List, ListItem, ListItemText, TextField } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';
import { templates as mockTemplates } from '../mockData';

const TemplateBuilder = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(mockTemplates[0]?.id || null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [draftTemplates, setDraftTemplates] = useState(mockTemplates.map(t => JSON.parse(JSON.stringify(t))));

  const template = useMemo(() => draftTemplates.find(t => t.id === selectedTemplateId) || null, [draftTemplates, selectedTemplateId]);
  const jobs = template?.jobs || [];
  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0] || null;
  const selectedTask = selectedJob?.tasks.find(ts => ts.id === selectedTaskId) || selectedJob?.tasks?.[0] || null;

  const addJob = () => {
    if (!template) return;
    const newJob = { id: `j-${Date.now()}`, title: 'New Job', tasks: [] };
    setDraftTemplates(prev => prev.map(t => t.id === template.id ? { ...t, jobs: [...t.jobs, newJob] } : t));
    setSelectedJobId(newJob.id);
  };

  const updateTaskTitle = (val) => {
    if (!template || !selectedJob || !selectedTask) return;
    setDraftTemplates(prev => prev.map(t => {
      if (t.id !== template.id) return t;
      return { ...t, jobs: t.jobs.map(j => j.id === selectedJob.id ? { ...j, tasks: j.tasks.map(ts => ts.id === selectedTask.id ? { ...ts, title: val } : ts) } : j) };
    }));
  };

  return (
    <Box>
      <PageShell title="Template Builder" description="Three-column builder: Jobs / Tasks / Task Details (drag & drop ready)." />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Templates</Typography>
              {draftTemplates.map(t => (
                <Button key={t.id} fullWidth variant={t.id === selectedTemplateId ? 'contained' : 'outlined'} sx={{ mb: 1, textTransform: 'none' }} onClick={() => { setSelectedTemplateId(t.id); setSelectedJobId(t.jobs?.[0]?.id || null); setSelectedTaskId(t.jobs?.[0]?.tasks?.[0]?.id || null); }}>{t.name}</Button>
              ))}
              <Button variant="outlined" onClick={() => setDraftTemplates(prev => [{ id: `t-${Date.now()}`, name: 'New Template', description: '', category: '', difficulty: '', jobs: [] }, ...prev])}>New Template</Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Jobs</Typography>
              <List>
                {jobs.map(j => (
                  <ListItem key={j.id} button selected={j.id === selectedJob?.id} onClick={() => { setSelectedJobId(j.id); setSelectedTaskId(j.tasks?.[0]?.id || null); }}>
                    <ListItemText primary={j.title} secondary={`${j.tasks?.length || 0} tasks`} />
                  </ListItem>
                ))}
              </List>
              <Button variant="outlined" onClick={addJob}>Add Job</Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Task Details</Typography>
              {selectedTask ? (
                <Box>
                  <TextField fullWidth size="small" label="Task name" value={selectedTask.title} onChange={(e) => updateTaskTitle(e.target.value)} sx={{ mb: 2 }} />
                  <TextField fullWidth size="small" label="Description" multiline minRows={3} sx={{ mb: 2 }} defaultValue={selectedTask.description || ''} />
                  <Button variant="contained">Save Task</Button>
                </Box>
              ) : (
                <Typography color="text.secondary">Select a job and task to edit details.</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default TemplateBuilder;
