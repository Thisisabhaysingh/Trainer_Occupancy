import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Button, Grid, TextField, Stack, Divider, InputAdornment, IconButton, FormControl, InputLabel, Select, MenuItem, Autocomplete } from '@mui/material';
import { Search, Add, Delete, KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { PageShell, useJobTemplates, apiBaseUrl, emptyTemplate, emptyTask, priorityOptions, assigneeTypes, TemplateCard } from '../../ProjectManagementSection.shared.jsx';

const JobTemplatesPage = ({ startNewTemplate = false }) => {
  const [jobTemplates, saveTemplates] = useJobTemplates();
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(emptyTemplate());
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [templateMessage, setTemplateMessage] = useState(null);

  useEffect(() => {
    if (!builderOpen) {
      setTemplateDraft(emptyTemplate());
      setEditingTemplate(null);
      setSelectedJobId(null);
      setSelectedTaskId(null);
      setTemplateMessage(null);
    }
  }, [builderOpen]);

  useEffect(() => {
    if (startNewTemplate) {
      openNewTemplate();
    }
  }, [startNewTemplate]);

  const filteredTemplates = useMemo(
    () => jobTemplates.filter((template) =>
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      (template.description || '').toLowerCase().includes(search.toLowerCase())
    ),
    [jobTemplates, search]
  );

  const selectedJob = useMemo(
    () => templateDraft.jobs.find((job) => job.id === selectedJobId) || null,
    [templateDraft.jobs, selectedJobId]
  );

  const selectedTask = useMemo(
    () => selectedJob?.tasks.find((task) => task.id === selectedTaskId) || null,
    [selectedJob, selectedTaskId]
  );

  const openNewTemplate = () => {
    setTemplateDraft(emptyTemplate());
    setEditingTemplate(null);
    setSelectedJobId(null);
    setSelectedTaskId(null);
    setBuilderOpen(true);
  };

  const openEditTemplate = (template) => {
    setTemplateDraft(JSON.parse(JSON.stringify(template)));
    setEditingTemplate(template);
    setSelectedJobId(template.jobs?.[0]?.id || null);
    setSelectedTaskId(template.jobs?.[0]?.tasks?.[0]?.id || null);
    setBuilderOpen(true);
  };

  const duplicateTemplate = (template) => {
    const clone = {
      ...JSON.parse(JSON.stringify(template)),
      id: `${template.id}-${Date.now()}`,
      name: `${template.name} copy`,
      jobs: (template.jobs || []).map((job) => ({ ...job, id: `${job.id}-${Date.now()}`, tasks: (job.tasks || []).map((task) => ({ ...task, id: `${task.id}-${Date.now()}` })) }))
    };
    saveTemplates([clone, ...jobTemplates]);
    setTemplateMessage({ type: 'success', text: 'Template duplicated.' });
  };

  const removeTemplate = (templateId) => {
    saveTemplates(jobTemplates.filter((template) => template.id !== templateId));
    setTemplateMessage({ type: 'success', text: 'Template deleted.' });
  };

  const addJob = () => {
    const nextJob = { ...emptyTask(), id: `job-${Date.now()}`, title: '', description: '', tasks: [] };
    setTemplateDraft((prev) => ({ ...prev, jobs: [...prev.jobs, nextJob] }));
    setSelectedJobId(nextJob.id);
    setSelectedTaskId(null);
  };

  const updateJob = (jobId, updates) => {
    setTemplateDraft((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => job.id === jobId ? { ...job, ...updates } : job)
    }));
  };

  const deleteJob = (jobId) => {
    setTemplateDraft((prev) => ({
      ...prev,
      jobs: prev.jobs.filter((job) => job.id !== jobId)
    }));
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
      setSelectedTaskId(null);
    }
  };

  const moveJob = (jobId, direction) => {
    setTemplateDraft((prev) => {
      const jobs = [...prev.jobs];
      const index = jobs.findIndex((job) => job.id === jobId);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= jobs.length) return prev;
      [jobs[index], jobs[target]] = [jobs[target], jobs[index]];
      return { ...prev, jobs };
    });
  };

  const addTask = () => {
    if (!selectedJob) {
      setTemplateMessage({ type: 'error', text: 'Please select a job before adding tasks.' });
      return;
    }
    const newTaskItem = emptyTask();
    setTemplateDraft((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) =>
        job.id === selectedJob.id ? { ...job, tasks: [...job.tasks, newTaskItem] } : job
      )
    }));
    setSelectedTaskId(newTaskItem.id);
    setTemplateMessage(null);
  };

  const updateTask = (taskId, updates) => {
    setTemplateDraft((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => ({
        ...job,
        tasks: job.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      }))
    }));
  };

  const deleteTask = (taskId) => {
    setTemplateDraft((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => ({
        ...job,
        tasks: job.tasks.filter((task) => task.id !== taskId)
      }))
    }));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  };

  const moveTask = (taskId, direction) => {
    if (!selectedJob) return;
    setTemplateDraft((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) => {
        if (job.id !== selectedJob.id) return job;
        const tasks = [...job.tasks];
        const index = tasks.findIndex((task) => task.id === taskId);
        if (index < 0) return job;
        const target = index + direction;
        if (target < 0 || target >= tasks.length) return job;
        [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
        return { ...job, tasks };
      })
    }));
  };

  const saveTemplate = () => {
    if (!templateDraft.name.trim()) {
      setTemplateMessage({ type: 'error', text: 'Enter a template name before saving.' });
      return;
    }

    const normalized = {
      ...templateDraft,
      name: templateDraft.name.trim(),
      jobs: templateDraft.jobs.map((job, idx) => ({ ...job, order: idx }))
    };

    if (editingTemplate) {
      saveTemplates(jobTemplates.map((template) => (template.id === editingTemplate.id ? normalized : template)));
      setTemplateMessage({ type: 'success', text: 'Template updated successfully.' });
    } else {
      saveTemplates([normalized, ...jobTemplates]);
      setTemplateMessage({ type: 'success', text: 'Template saved successfully.' });
    }
    setBuilderOpen(false);
  };

  const saveNewTaskDetails = (updates) => {
    if (selectedTask) {
      updateTask(selectedTask.id, updates);
    }
  };

  return (
    <Box>
      <PageShell
        title="Job Templates"
        description="Manage reusable job templates that automatically generate work breakdowns when creating new projects."
        actions={[
          <Button key="create" variant="contained" startIcon={<Add />} onClick={openNewTemplate} sx={{ textTransform: 'none' }}>
            Create Template
          </Button>
        ]}
      >
        <TextField
          label="Search templates"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
          size="small"
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
      </PageShell>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Templates
            </Typography>
            <Stack spacing={2}>
              {filteredTemplates.length ? filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={editingTemplate?.id === template.id}
                  onSelect={() => {
                    setEditingTemplate(template);
                    setSelectedTemplateId(template.id);
                  }}
                  onView={() => openEditTemplate(template)}
                  onEdit={() => openEditTemplate(template)}
                  onDuplicate={() => duplicateTemplate(template)}
                  onDelete={() => removeTemplate(template.id)}
                />
              )) : (
                <Typography color="text.secondary">No job templates available. Create a template to reuse job structures.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            {!builderOpen && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Template Builder</Typography>
                  <Typography color="text.secondary">Select a job template or start a new one to open the builder.</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={openNewTemplate} sx={{ textTransform: 'none' }}>
                  Start Builder
                </Button>
              </Box>
            )}

            {builderOpen && (
              <Box>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
                  <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 260 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                      Jobs
                    </Typography>
                    <Button variant="outlined" startIcon={<Add />} onClick={addJob} sx={{ mb: 2, textTransform: 'none' }}>
                      Add Job
                    </Button>
                    <Stack spacing={1}>
                      {templateDraft.jobs.map((job, index) => (
                        <Paper
                          key={job.id}
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            border: selectedJobId === job.id ? '1px solid #0070F0' : '1px solid',
                            borderColor: selectedJobId === job.id ? '#0070F0' : 'divider',
                            bgcolor: selectedJobId === job.id ? 'rgba(0,112,240,0.04)' : 'background.paper',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setSelectedTaskId(job.tasks?.[0]?.id || null);
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                            <Box>
                              <Typography fontWeight={700}>{job.title || `Job ${index + 1}`}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {job.tasks?.length || 0} tasks
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={(event) => { event.stopPropagation(); moveJob(job.id, -1); }}>
                                <KeyboardArrowLeft fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={(event) => { event.stopPropagation(); moveJob(job.id, 1); }}>
                                <KeyboardArrowRight fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={(event) => { event.stopPropagation(); deleteJob(job.id); }}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Box>
                          {selectedJobId === job.id && (
                            <Box sx={{ mt: 2 }}>
                              <TextField
                                label="Job title"
                                value={job.title}
                                onChange={(event) => updateJob(job.id, { title: event.target.value })}
                                fullWidth
                                size="small"
                                sx={{ mb: 2 }}
                              />
                              <TextField
                                label="Job description"
                                value={job.description}
                                onChange={(event) => updateJob(job.id, { description: event.target.value })}
                                fullWidth
                                size="small"
                                multiline
                                minRows={2}
                              />
                            </Box>
                          )}
                        </Paper>
                      ))}
                      {!templateDraft.jobs.length && (
                        <Typography color="text.secondary">Add jobs to start building the template.</Typography>
                      )}
                    </Stack>
                  </Paper>

                  <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 260 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                      Tasks
                    </Typography>
                    {!selectedJob ? (
                      <Typography color="text.secondary">Select a job to add tasks.</Typography>
                    ) : (
                      <Box>
                        <Button variant="outlined" startIcon={<Add />} onClick={addTask} sx={{ mb: 2, textTransform: 'none' }}>
                          Add Task
                        </Button>
                        <Stack spacing={1}>
                          {selectedJob.tasks.map((task) => (
                            <Paper
                              key={task.id}
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: 3,
                                border: selectedTaskId === task.id ? '1px solid #0070F0' : '1px solid',
                                borderColor: selectedTaskId === task.id ? '#0070F0' : 'divider',
                                bgcolor: selectedTaskId === task.id ? 'rgba(0,112,240,0.04)' : 'background.paper',
                                cursor: 'pointer'
                              }}
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography fontWeight={700}>{task.title || 'New task'}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {task.status} • {task.priority} priority
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton size="small" onClick={(event) => { event.stopPropagation(); moveTask(task.id, -1); }}>
                                    <KeyboardArrowLeft fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={(event) => { event.stopPropagation(); moveTask(task.id, 1); }}>
                                    <KeyboardArrowRight fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={(event) => { event.stopPropagation(); deleteTask(task.id); }}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </Box>
                            </Paper>
                          ))}
                          {!selectedJob.tasks.length && (
                            <Typography color="text.secondary">No tasks for this job yet.</Typography>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Paper>

                  <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 260 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                      Task Details
                    </Typography>
                    {selectedTask ? (
                      <Stack spacing={2}>
                        <TextField
                          label="Task name"
                          value={selectedTask.title}
                          onChange={(event) => saveNewTaskDetails({ title: event.target.value })}
                          fullWidth
                          size="small"
                        />
                        <TextField
                          label="Description"
                          value={selectedTask.description}
                          onChange={(event) => saveNewTaskDetails({ description: event.target.value })}
                          fullWidth
                          size="small"
                          multiline
                          minRows={3}
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Priority</InputLabel>
                          <Select
                            label="Priority"
                            value={selectedTask.priority}
                            onChange={(event) => saveNewTaskDetails({ priority: event.target.value })}
                          >
                            {priorityOptions.map((option) => (
                              <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          label="Estimated Hours"
                          type="number"
                          value={selectedTask.estimatedHours}
                          onChange={(event) => saveNewTaskDetails({ estimatedHours: event.target.value })}
                          fullWidth
                          size="small"
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Assignee Type</InputLabel>
                          <Select
                            label="Assignee Type"
                            value={selectedTask.assigneeType}
                            onChange={(event) => saveNewTaskDetails({ assigneeType: event.target.value })}
                          >
                            {assigneeTypes.map((type) => (
                              <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Autocomplete
                          multiple
                          options={selectedJob.tasks.filter((task) => task.id !== selectedTask.id)}
                          getOptionLabel={(task) => task.title || 'Unnamed task'}
                          value={selectedJob.tasks.filter((task) => selectedTask.dependencies.includes(task.id))}
                          onChange={(_, value) => saveNewTaskDetails({ dependencies: value.map((task) => task.id) })}
                          renderInput={(params) => <TextField {...params} label="Dependencies" size="small" />}
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            label="Status"
                            value={selectedTask.status}
                            onChange={(event) => saveNewTaskDetails({ status: event.target.value })}
                          >
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="in-progress">In Progress</MenuItem>
                            <MenuItem value="review">Review</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="blocked">Blocked</MenuItem>
                          </Select>
                        </FormControl>
                        <Button variant="contained" sx={{ textTransform: 'none' }} onClick={() => setTemplateMessage({ type: 'success', text: 'Task changes saved.' })}>
                          Save Details
                        </Button>
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">Select a task to view and edit its details.</Typography>
                    )}
                  </Paper>
                </Stack>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                  <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={() => setBuilderOpen(false)}>
                    Close Builder
                  </Button>
                  <Button variant="contained" sx={{ textTransform: 'none' }} onClick={saveTemplate}>
                    Save Template
                  </Button>
                </Box>
                {templateMessage && (
                  <Paper elevation={0} sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: templateMessage.type === 'error' ? 'rgba(254,226,226,0.85)' : 'rgba(236,252,245,0.85)' }}>
                    <Typography color={templateMessage.type === 'error' ? 'error.main' : 'success.main'}>{templateMessage.text}</Typography>
                  </Paper>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default JobTemplatesPage;
