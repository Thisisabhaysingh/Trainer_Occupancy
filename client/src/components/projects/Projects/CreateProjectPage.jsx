import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Stack,
  Chip,
  Divider,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Collapse
} from '@mui/material';
import { Search, Add, Delete } from '@mui/icons-material';
import { PageShell, useJobTemplates, apiBaseUrl, priorityOptions, assigneeTypes, generateItemId, emptyTemplate, emptyJob, emptyTask, statusLabel, statusColorMap, timestampLabel } from '../../ProjectManagementSection.shared.jsx';

const CreateProjectPage = () => {
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [jobTemplates] = useJobTemplates();
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customJobs, setCustomJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [newJobName, setNewJobName] = useState('');
  const [newTask, setNewTask] = useState({ title: '', estimatedHours: '', priority: 'Medium', assigneeType: 'User', description: '' });
  const [projectInfo, setProjectInfo] = useState({ name: '', clientName: '', branch: '', ownerId: '', priority: 'Medium', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [employeeRes, branchRes] = await Promise.all([
          axios.get(`${apiBaseUrl}/api/employees`, { withCredentials: true }),
          axios.get(`${apiBaseUrl}/api/branches`, { withCredentials: true })
        ]);
        setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data : []);
        setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);
      } catch (error) {
        console.error('Unable to load project metadata', error);
      }
    };
    loadMeta();
  }, []);

  const selectedTemplate = useMemo(
    () => jobTemplates.find((template) => template.id === selectedTemplateId) || null,
    [jobTemplates, selectedTemplateId]
  );

  const filteredTemplates = useMemo(
    () => jobTemplates.filter((template) =>
      template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      (template.description || '').toLowerCase().includes(templateSearch.toLowerCase())
    ),
    [jobTemplates, templateSearch]
  );

  const selectedJob = useMemo(
    () => customJobs.find((job) => job.id === selectedJobId) || null,
    [customJobs, selectedJobId]
  );

  const totalTemplateJobs = selectedTemplate?.jobs?.length || 0;
  const totalTemplateTasks = selectedTemplate?.jobs?.reduce((sum, job) => sum + (job.tasks?.length || 0), 0) || 0;
  const totalCustomJobs = customJobs.length;
  const totalCustomTasks = customJobs.reduce((sum, job) => sum + (job.tasks?.length || 0), 0);
  const totalTasks = totalTemplateTasks + totalCustomTasks;
  const estimatedEffort = selectedTemplate?.jobs?.reduce(
    (sum, job) => sum + (job.tasks?.reduce((taskSum, task) => taskSum + Number(task.estimatedHours || 0), 0) || 0),
    0
  ) + customJobs.reduce(
    (sum, job) => sum + (job.tasks?.reduce((taskSum, task) => taskSum + Number(task.estimatedHours || 0), 0) || 0),
    0
  );

  const handleProjectChange = (field) => (event) => {
    setProjectInfo((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const addCustomJob = () => {
    const title = newJobName.trim();
    if (!title) {
      setMessage({ type: 'error', text: 'Enter a custom job name before adding.' });
      return;
    }

    const nextJob = {
      id: generateItemId('custom-job'),
      title,
      description: '',
      tasks: []
    };

    setCustomJobs((prev) => [...prev, nextJob]);
    setSelectedJobId(nextJob.id);
    setNewJobName('');
    setMessage(null);
  };

  const deleteCustomJob = (jobId) => {
    setCustomJobs((prev) => prev.filter((job) => job.id !== jobId));
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
    }
  };

  const addCustomTask = () => {
    if (!selectedJob) {
      setMessage({ type: 'error', text: 'Select a custom job before adding a task.' });
      return;
    }

    if (!newTask.title.trim()) {
      setMessage({ type: 'error', text: 'Task name cannot be empty.' });
      return;
    }

    const task = {
      id: generateItemId('custom-task'),
      title: newTask.title,
      description: newTask.description,
      estimatedHours: newTask.estimatedHours,
      priority: newTask.priority,
      assigneeType: newTask.assigneeType,
      status: 'pending'
    };

    setCustomJobs((prev) => prev.map((job) =>
      job.id === selectedJob.id ? { ...job, tasks: [...job.tasks, task] } : job
    ));

    setNewTask({ title: '', estimatedHours: '', description: '', priority: 'Medium', assigneeType: 'User' });
    setMessage(null);
  };

  const deleteCustomTask = (taskId) => {
    setCustomJobs((prev) => prev.map((job) => ({
      ...job,
      tasks: job.tasks.filter((task) => task.id !== taskId)
    })));
  };

  const handleCreateProject = async () => {
    if (!projectInfo.name.trim()) {
      setMessage({ type: 'error', text: 'Project Name is required.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const projectPayload = {
        title: projectInfo.name.trim(),
        description: projectInfo.clientName ? `${projectInfo.clientName} • ${projectInfo.branch}` : projectInfo.branch,
        status: 'active',
        startDate: projectInfo.startDate || null,
        endDate: projectInfo.endDate || null,
        ownerId: projectInfo.ownerId || null
      };

      const projectRes = await axios.post(`${apiBaseUrl}/api/projects`, projectPayload, { withCredentials: true });
      const project = projectRes.data;

      const createJob = async (jobData) => {
        const jobRes = await axios.post(`${apiBaseUrl}/api/projects/${project.id}/jobs`, {
          title: jobData.title,
          description: jobData.description || '',
          status: 'planned',
          ownerId: projectInfo.ownerId || null
        }, { withCredentials: true });
        return jobRes.data;
      };

      if (selectedTemplate?.jobs?.length) {
        for (const job of selectedTemplate.jobs) {
          const createdJob = await createJob(job);
          if (job.tasks?.length) {
            await Promise.all(job.tasks.map((task) => axios.post(
              `${apiBaseUrl}/api/jobs/${createdJob.id}/tasks`,
              {
                title: task.title,
                description: task.description || '',
                priority: task.priority?.toLowerCase() || 'medium',
                deadline: null,
                status: 'pending'
              },
              { withCredentials: true }
            )));
          }
        }
      }

      if (customJobs.length) {
        for (const job of customJobs) {
          const createdJob = await createJob(job);
          if (job.tasks?.length) {
            await Promise.all(job.tasks.map((task) => axios.post(
              `${apiBaseUrl}/api/jobs/${createdJob.id}/tasks`,
              {
                title: task.title,
                description: task.description || '',
                priority: task.priority?.toLowerCase() || 'medium',
                deadline: null,
                status: 'pending'
              },
              { withCredentials: true }
            )));
          }
        }
      }

      setMessage({ type: 'success', text: 'Project created successfully.' });
      setProjectInfo({ name: '', clientName: '', branch: '', ownerId: '', priority: 'Medium', startDate: '', endDate: '' });
      setSelectedTemplateId('');
      setCustomJobs([]);
      setSelectedJobId(null);
      setNewJobName('');
      setNewTask({ title: '', estimatedHours: '', description: '', priority: 'Medium', assigneeType: 'User' });
    } catch (error) {
      console.error('Create project error', error);
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Unable to create project.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageShell
        title="Create Project"
        description="Build a new project from a reusable template, add custom jobs, and estimate your initial effort."
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Project Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Project Name"
                  value={projectInfo.name}
                  onChange={handleProjectChange('name')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Client Name"
                  value={projectInfo.clientName}
                  onChange={handleProjectChange('clientName')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={branches}
                  getOptionLabel={(option) => option.name || ''}
                  value={branches.find((branch) => branch.id === projectInfo.branch) || null}
                  onChange={(_, value) => setProjectInfo((prev) => ({ ...prev, branch: value?.id || '' }))}
                  renderInput={(params) => <TextField {...params} label="Branch" />}
                  fullWidth
                  clearOnEscape
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={employees}
                  getOptionLabel={(option) => option.name || ''}
                  value={employees.find((employee) => employee.employeeCode === projectInfo.ownerId) || null}
                  onChange={(_, value) => setProjectInfo((prev) => ({ ...prev, ownerId: value?.employeeCode || '' }))}
                  renderInput={(params) => <TextField {...params} label="Project Owner" />}
                  fullWidth
                  clearOnEscape
                  isOptionEqualToValue={(option, value) => option?.employeeCode === value?.employeeCode}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    label="Priority"
                    value={projectInfo.priority}
                    onChange={handleProjectChange('priority')}
                  >
                    {priorityOptions.map((priority) => (
                      <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={projectInfo.startDate}
                  onChange={handleProjectChange('startDate')}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="End Date"
                  type="date"
                  value={projectInfo.endDate}
                  onChange={handleProjectChange('endDate')}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Template Selection
            </Typography>
            <TextField
              label="Search Templates"
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 3 }}
            />
            <Grid container spacing={2}>
              {filteredTemplates.length ? (
                filteredTemplates.map((template) => {
                  const selected = template.id === selectedTemplateId;
                  const tasksCount = template.jobs?.reduce((sum, job) => sum + (job.tasks?.length || 0), 0) || 0;
                  return (
                    <Grid key={template.id} item xs={12} md={6}>
                      <Paper
                        elevation={selected ? 8 : 1}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: selected ? '2px solid #0070F0' : '1px solid',
                          borderColor: selected ? '#0070F0' : 'divider',
                          cursor: 'pointer',
                          height: '100%'
                        }}
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <Typography fontWeight={700} sx={{ mb: 1 }}>
                          {template.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {template.description || 'No description provided.'}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip label={`${template.jobs?.length || 0} jobs`} size="small" />
                          <Chip label={`${tasksCount} tasks`} size="small" />
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })
              ) : (
                <Grid item xs={12}>
                  <Typography color="text.secondary">No templates available yet. Build job templates in Job Templates.</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Custom Jobs
              </Typography>
              <Button variant="outlined" startIcon={<Add />} onClick={addCustomJob} sx={{ textTransform: 'none' }}>
                Add Custom Job
              </Button>
            </Box>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <TextField
                  label="New custom job"
                  value={newJobName}
                  onChange={(event) => setNewJobName(event.target.value)}
                  fullWidth
                  size="small"
                />
                <Button variant="contained" startIcon={<Add />} onClick={addCustomJob} sx={{ textTransform: 'none' }}>
                  Add Job
                </Button>
              </Stack>

              <Box>
                {customJobs.length ? (
                  <Stack spacing={1}>
                    {customJobs.map((job) => (
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
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography fontWeight={700}>{job.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {job.tasks?.length || 0} tasks
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={(event) => { event.stopPropagation(); deleteCustomJob(job.id); }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">Add custom jobs to extend the selected template or build a project from scratch.</Typography>
                )}
              </Box>

              {selectedJob && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mt: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Tasks for {selectedJob.title}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Task Name"
                        value={newTask.title}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Estimated Hours"
                        type="number"
                        value={newTask.estimatedHours}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, estimatedHours: event.target.value }))}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Priority</InputLabel>
                        <Select
                          label="Priority"
                          value={newTask.priority}
                          onChange={(event) => setNewTask((prev) => ({ ...prev, priority: event.target.value }))}
                        >
                          {priorityOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Assignee Type</InputLabel>
                        <Select
                          label="Assignee Type"
                          value={newTask.assigneeType}
                          onChange={(event) => setNewTask((prev) => ({ ...prev, assigneeType: event.target.value }))}
                        >
                          {assigneeTypes.map((type) => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Task Description"
                        value={newTask.description}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setNewTask({ title: '', estimatedHours: '', priority: 'Medium', assigneeType: 'User', description: '' });
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Clear
                    </Button>
                    <Button variant="contained" onClick={addCustomTask} startIcon={<Add />} sx={{ textTransform: 'none' }}>
                      Add Task
                    </Button>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {selectedJob.tasks.length ? (
                    <Stack spacing={1}>
                      {selectedJob.tasks.map((task) => (
                        <Paper key={task.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography fontWeight={700}>{task.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {task.description || 'No task description'}
                              </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => deleteCustomTask(task.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                            <Chip label={`${task.priority} priority`} size="small" />
                            <Chip label={`${task.estimatedHours || 0}h`} size="small" />
                            <Chip label={task.assigneeType} size="small" />
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">No tasks added to this custom job yet.</Typography>
                  )}
                </Paper>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Summary
            </Typography>
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(0,112,240,0.05)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Jobs</Typography>
                <Typography variant="h4" fontWeight={700}>{totalTemplateJobs + totalCustomJobs}</Typography>
                <Typography variant="body2" color="text.secondary">Template jobs + custom jobs</Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(124,58,237,0.05)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Tasks</Typography>
                <Typography variant="h4" fontWeight={700}>{totalTasks}</Typography>
                <Typography variant="body2" color="text.secondary">Total tasks included in this project</Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(16,185,129,0.08)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Estimated Effort</Typography>
                <Typography variant="h4" fontWeight={700}>{estimatedEffort || 0} hrs</Typography>
                <Typography variant="body2" color="text.secondary">Sum of task estimates from template and custom work</Typography>
              </Paper>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Template Preview
            </Typography>
            {selectedTemplate ? (
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{selectedTemplate.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedTemplate.description || 'No description available.'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip label={`${totalTemplateJobs} jobs`} size="small" />
                  <Chip label={`${totalTemplateTasks} tasks`} size="small" />
                </Stack>
              </Box>
            ) : (
              <Typography color="text.secondary">Select a template to preview job and task counts before creating the project.</Typography>
            )}
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
            <Button variant="outlined" sx={{ flex: 1, textTransform: 'none' }} onClick={() => {
              setProjectInfo({ name: '', clientName: '', branch: '', ownerId: '', priority: 'Medium', startDate: '', endDate: '' });
              setSelectedTemplateId('');
              setCustomJobs([]);
              setSelectedJobId(null);
              setNewJobName('');
              setNewTask({ title: '', estimatedHours: '', description: '', priority: 'Medium', assigneeType: 'User' });
              setMessage(null);
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ flex: 1, textTransform: 'none' }}
              onClick={handleCreateProject}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Project'}
            </Button>
          </Box>

          {message && (
            <Collapse in>
              <Paper elevation={0} sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: message.type === 'error' ? 'rgba(254, 226, 226, 0.8)' : 'rgba(220, 252, 231, 0.8)' }}>
                <Typography color={message.type === 'error' ? 'error.main' : 'success.main'}>{message.text}</Typography>
              </Paper>
            </Collapse>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateProjectPage;
