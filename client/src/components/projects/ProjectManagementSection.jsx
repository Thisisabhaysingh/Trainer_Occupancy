import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Collapse,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Search,
  Add,
  Delete,
  ExpandMore,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Task
} from '@mui/icons-material';
import { StatCard } from '../dashboard/DashboardComponents';
import ProjectModuleV2 from '../projects_v2/ProjectModule';
import ActiveProjects from './pages/ActiveProjects';
import CompletedProjects from './pages/CompletedProjects';
import JobTemplates from './pages/JobTemplates';
import CreateTemplate from './pages/CreateTemplate';
import TemplateBuilder from './pages/TemplateBuilder';
import JobManager from './pages/JobManager';
import JobProgress from './pages/JobProgress';
import JobAnalytics from './pages/JobAnalytics';
import ProjectReports from './pages/ProjectReports';
import TaskReports from './pages/TaskReports';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const TEMPLATE_STORAGE_KEY = 'projectJobTemplates_v2';

const statusColorMap = {
  active: 'primary',
  completed: 'success',
  planned: 'warning',
  'on-hold': 'warning',
  cancelled: 'error',
  pending: 'default',
  'in-progress': 'info',
  review: 'secondary',
  blocked: 'error'
};

const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
const assigneeTypes = ['User', 'Team', 'Role'];
const kanbanStatuses = [
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'completed', label: 'Completed' }
];

const projectPageLabels = {
  'create project': 'Create Project',
  'all projects': 'All Projects',
  'active projects': 'Active Projects',
  'completed projects': 'Completed Projects',
  'job templates': 'Job Templates',
  'create template': 'Create Template',
  'template builder': 'Template Builder',
  'job manager': 'Job Manager',
  'job progress': 'Job Progress',
  'job analytics': 'Job Analytics',
  'project reports': 'Project Reports',
  'task reports': 'Task Reports'
};

const PageShell = ({ title, description, children, actions }) => (
  <Box>
    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { xs: 'flex-start', sm: 'center' }
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Box>
        {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
      </Box>
      {children}
    </Paper>
  </Box>
);

const useJobTemplates = () => {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (stored) {
      try {
        setTemplates(JSON.parse(stored));
      } catch (error) {
        console.error('Unable to parse saved project templates', error);
      }
    }
  }, []);

  const saveTemplates = useCallback((nextTemplates) => {
    setTemplates(nextTemplates);
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
  }, []);

  return [templates, saveTemplates];
};

const generateItemId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyTemplate = () => ({
  id: generateItemId('template'),
  name: '',
  description: '',
  jobs: []
});

const emptyJob = () => ({
  id: generateItemId('job'),
  title: '',
  description: '',
  order: 0,
  tasks: []
});

const emptyTask = () => ({
  id: generateItemId('task'),
  title: '',
  description: '',
  priority: 'Medium',
  estimatedHours: '',
  assigneeType: 'User',
  dependencies: [],
  order: 0,
  status: 'pending'
});

const timestampLabel = (value) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const statusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in-progress':
      return 'In Progress';
    case 'review':
      return 'Review';
    case 'completed':
      return 'Completed';
    case 'blocked':
      return 'Blocked';
    default:
      return status;
  }
};

const TemplateCard = ({ template, selected, onSelect, onView, onEdit, onDuplicate, onDelete }) => (
  <Paper
    elevation={selected ? 8 : 1}
    sx={{
      p: 3,
      borderRadius: 3,
      border: selected ? '2px solid #0070F0' : '1px solid',
      borderColor: selected ? '#0070F0' : 'divider',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.05)'
      }
    }}
    onClick={onSelect}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          {template.name || 'Untitled Template'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {template.description || 'Job template with reusable jobs and task definitions.'}
        </Typography>
      </Box>
      <Chip
        label={`${template.jobs?.length || 0} jobs`}
        size="small"
        sx={{ bgcolor: '#EFF6FF', color: '#0B69FF', fontWeight: 600 }}
      />
    </Box>
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
      <Chip label={`${template.jobs?.reduce((sum, job) => sum + (job.tasks?.length || 0), 0)} tasks`} size="small" />
      <Chip label="Reusable" size="small" color="secondary" />
    </Stack>
    <Divider sx={{ my: 2 }} />
    <Stack direction="row" spacing={1}>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onView();
        }}
        sx={{ textTransform: 'none' }}
      >
        View
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        sx={{ textTransform: 'none' }}
      >
        Edit
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onDuplicate();
        }}
        sx={{ textTransform: 'none' }}
      >
        Duplicate
      </Button>
      <Button
        size="small"
        color="error"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        sx={{ textTransform: 'none' }}
      >
        Delete
      </Button>
    </Stack>
  </Paper>
);

const CreateProjectPage = () => {
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [jobTemplates, saveTemplates] = useJobTemplates();
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customJobs, setCustomJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [newJobName, setNewJobName] = useState('');
  const [newTask, setNewTask] = useState({ title: '', estimatedHours: '', priority: 'Medium', assigneeType: 'User' });
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

    setNewTask({ title: '', description: '', estimatedHours: '', priority: 'Medium', assigneeType: 'User' });
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

const ProjectsPage = ({ initialStatus = '' }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState(initialStatus);
  const [jobs, setJobs] = useState([]);
  const [tasksByJob, setTasksByJob] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${apiBaseUrl}/api/projects`, { withCredentials: true });
        const projectList = Array.isArray(res.data) ? res.data : [];
        setProjects(projectList);
        setSelectedProject((prev) => {
          if (prev && projectList.some((item) => item.id === prev.id)) return prev;
          return projectList[0] || null;
        });
      } catch (error) {
        console.error('Unable to fetch projects', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setJobs([]);
      setTasksByJob({});
      return;
    }

    const loadProjectJobs = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/api/projects/${selectedProject.id}/jobs`, { withCredentials: true });
        const projectJobs = Array.isArray(res.data) ? res.data : [];
        setJobs(projectJobs);
        const tasksMap = {};
        await Promise.all(projectJobs.map(async (job) => {
          const taskRes = await axios.get(`${apiBaseUrl}/api/jobs/${job.id}/tasks`, { withCredentials: true });
          tasksMap[job.id] = Array.isArray(taskRes.data) ? taskRes.data : [];
        }));
        setTasksByJob(tasksMap);
      } catch (error) {
        console.error('Unable to load jobs or tasks', error);
      }
    };
    loadProjectJobs();
  }, [selectedProject]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesStatus = projectStatus ? project.status === projectStatus : true;
      const matchesSearch = project.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
        (project.description || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
        (project.owner?.name || '').toLowerCase().includes(projectSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [projects, projectSearch, projectStatus]);

  const projectMetrics = useMemo(() => {
    const total = filteredProjects.length;
    const active = filteredProjects.filter((project) => project.status === 'active').length;
    const completed = filteredProjects.filter((project) => project.status === 'completed').length;
    return { total, active, completed };
  }, [filteredProjects]);

  const selectedProjectTasks = useMemo(
    () => Object.values(tasksByJob).flat(),
    [tasksByJob]
  );

  const taskSummary = useMemo(() => {
    const now = new Date();
    const completed = selectedProjectTasks.filter((task) => task.status === 'completed').length;
    const overdue = selectedProjectTasks.filter((task) => task.deadline && new Date(task.deadline) < now && task.status !== 'completed').length;
    const pending = selectedProjectTasks.length - completed;
    const progress = selectedProjectTasks.length ? Math.round((completed / selectedProjectTasks.length) * 100) : 0;
    return { completed, pending, overdue, progress, total: selectedProjectTasks.length };
  }, [selectedProjectTasks]);

  const groupedTasks = useMemo(() => {
    const now = new Date();
    const groups = { completed: [], overdue: [], pending: [] };
    selectedProjectTasks.forEach((task) => {
      if (task.status === 'completed') {
        groups.completed.push(task);
      } else if (task.deadline && new Date(task.deadline) < now) {
        groups.overdue.push(task);
      } else {
        groups.pending.push(task);
      }
    });
    return groups;
  }, [selectedProjectTasks]);

  return (
    <Box>
      <PageShell
        title={projectPageLabels[initialStatus ? `${initialStatus} projects` : 'all projects']}
        description="Browse active, completed and all project work in a responsive card layout."
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          <StatCard title="Total Projects" value={projectMetrics.total} icon="projects" />
          <StatCard title="Active" value={projectMetrics.active} icon="projects" color="primary" />
          <StatCard title="Completed" value={projectMetrics.completed} icon="check" color="success" />
          <StatCard title="Tasks" value={selectedProjectTasks.length} icon="tasks" color="warning" />
        </Box>
      </PageShell>

      <Grid container spacing={3}>
        <Grid item xs={12} xl={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Projects</Typography>
              <TextField
                size="small"
                label="Search projects"
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
                fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {['', 'active', 'completed'].map((status) => (
                  <Button
                    key={status}
                    variant={projectStatus === status ? 'contained' : 'outlined'}
                    onClick={() => setProjectStatus(status)}
                    sx={{ textTransform: 'none' }}
                  >
                    {status ? statusLabel(status) : 'All'}
                  </Button>
                ))}
              </Stack>
              <Divider />
              {loading ? (
                <Typography color="text.secondary">Loading projects...</Typography>
              ) : filteredProjects.length ? (
                <Stack spacing={2}>
                  {filteredProjects.map((project) => (
                    <Paper
                      key={project.id}
                      elevation={selectedProject?.id === project.id ? 4 : 1}
                      sx={{ p: 2, borderRadius: 3, cursor: 'pointer', border: selectedProject?.id === project.id ? '1px solid #0070F0' : '1px solid', borderColor: selectedProject?.id === project.id ? '#0070F0' : 'divider' }}
                      onClick={() => setSelectedProject(project)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2 }}>
                        <Box>
                          <Typography fontWeight={700}>{project.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.owner?.name || 'Unassigned'} • {project.status}
                          </Typography>
                        </Box>
                        <Chip label={statusLabel(project.status)} size="small" color={statusColorMap[project.status] || 'default'} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {project.description || 'No description'}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No projects match this filter.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} xl={8}>
          {selectedProject ? (
            <Stack spacing={3}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>{selectedProject.title}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {selectedProject.owner?.name || 'No owner'} • {statusLabel(selectedProject.status)}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="body2" color="text.secondary">Dates</Typography>
                    <Typography fontWeight={700}>{timestampLabel(selectedProject.startDate)} - {timestampLabel(selectedProject.endDate)}</Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">Project completion</Typography>
                  <LinearProgress variant="determinate" value={taskSummary.progress} sx={{ height: 10, borderRadius: 5, mt: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{taskSummary.progress}% complete</Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">Completed</Typography>
                    <Typography variant="h6" fontWeight={700}>{taskSummary.completed}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                    <Typography variant="h6" fontWeight={700}>{taskSummary.pending}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">Overdue</Typography>
                    <Typography variant="h6" fontWeight={700}>{taskSummary.overdue}</Typography>
                  </Paper>
                </Stack>
              </Paper>

              <Stack spacing={2}>
                {jobs.length ? jobs.map((job) => {
                  const jobTasks = tasksByJob[job.id] || [];
                  const now = new Date();
                  const completed = jobTasks.filter((task) => task.status === 'completed').length;
                  const overdue = jobTasks.filter((task) => task.deadline && new Date(task.deadline) < now && task.status !== 'completed').length;
                  const pending = jobTasks.length - completed;
                  return (
                    <Accordion key={job.id} defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ width: '100%' }}>
                          <Typography fontWeight={700}>{job.title}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
                            <Chip label={`${completed} completed`} size="small" />
                            <Chip label={`${pending} pending`} size="small" />
                            <Chip label={`${overdue} overdue`} size="small" color="error" />
                          </Stack>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {jobTasks.length ? (
                          <Stack spacing={2}>
                            {['completed', 'pending', 'overdue'].map((groupKey) => {
                              const items = jobTasks.filter((task) => {
                                if (groupKey === 'completed') return task.status === 'completed';
                                if (groupKey === 'overdue') return task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
                                return task.status !== 'completed' && !(task.deadline && new Date(task.deadline) < new Date());
                              });
                              return (
                                <Box key={groupKey}>
                                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}</Typography>
                                  {items.length ? (
                                    <Stack spacing={1}>
                                      {items.map((task) => (
                                        <Paper key={task.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                                            <Box>
                                              <Typography fontWeight={700}>{task.title}</Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {task.description || 'No description'}
                                              </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                              <Chip label={statusLabel(task.status)} size="small" color={statusColorMap[task.status] || 'default'} />
                                              <Chip label={task.priority ? `${task.priority} priority` : 'No priority'} size="small" />
                                            </Stack>
                                          </Box>
                                        </Paper>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">No tasks in this category.</Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Stack>
                        ) : (
                          <Typography color="text.secondary">No tasks found for this job.</Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                }) : (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Typography color="text.secondary">Select a project to review its jobs and task hierarchy.</Typography>
                  </Paper>
                )}
              </Stack>
            </Stack>
          ) : (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography color="text.secondary">Pick a project on the left to see the project details and task hierarchy.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

const JobTemplatesPage = ({ startNewTemplate = false }) => {
  const [jobTemplates, saveTemplates] = useJobTemplates();
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState(emptyTemplate());
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [templateMessage, setTemplateMessage] = useState(null);

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

  useEffect(() => {
    if (!builderOpen) {
      setTemplateDraft(emptyTemplate());
      setEditingTemplate(null);
      setSelectedJobId(null);
      setSelectedTaskId(null);
      setTemplateMessage(null);
    }
  }, [builderOpen]);

  const openNewTemplate = () => {
    setTemplateDraft(emptyTemplate());
    setEditingTemplate(null);
    setSelectedJobId(null);
    setSelectedTaskId(null);
    setBuilderOpen(true);
  };

  useEffect(() => {
    if (startNewTemplate) {
      openNewTemplate();
    }
  }, [startNewTemplate]);

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
      id: generateItemId('template'),
      name: `${template.name} copy`,
      jobs: (template.jobs || []).map((job) => ({ ...job, id: generateItemId('job'), tasks: (job.tasks || []).map((task) => ({ ...task, id: generateItemId('task') })) }))
    };
    saveTemplates([clone, ...jobTemplates]);
    setTemplateMessage({ type: 'success', text: 'Template duplicated.' });
  };

  const removeTemplate = (templateId) => {
    saveTemplates(jobTemplates.filter((template) => template.id !== templateId));
    setTemplateMessage({ type: 'success', text: 'Template deleted.' });
  };

  const handleTemplateField = (field) => (event) => {
    setTemplateDraft((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const addJob = () => {
    const nextJob = emptyJob();
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
                                    {statusLabel(task.status)} • {task.priority} priority
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
                            {kanbanStatuses.map((status) => (
                              <MenuItem key={status.id} value={status.id}>{status.label}</MenuItem>
                            ))}
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

const JobProgressPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [tasksByJob, setTasksByJob] = useState({});
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/api/projects`, { withCredentials: true });
        const list = Array.isArray(res.data) ? res.data : [];
        setProjects(list);
        setSelectedProjectId((prev) => prev || list[0]?.id || '');
      } catch (error) {
        console.error('Unable to load projects for job progress', error);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const loadProjectData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${apiBaseUrl}/api/projects/${selectedProjectId}/jobs`, { withCredentials: true });
        const projectJobs = Array.isArray(res.data) ? res.data : [];
        setJobs(projectJobs);
        const tasksMap = {};
        await Promise.all(projectJobs.map(async (job) => {
          const taskRes = await axios.get(`${apiBaseUrl}/api/jobs/${job.id}/tasks`, { withCredentials: true });
          tasksMap[job.id] = Array.isArray(taskRes.data) ? taskRes.data : [];
        }));
        setTasksByJob(tasksMap);
      } catch (error) {
        console.error('Unable to load job progress data', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjectData();
  }, [selectedProjectId]);

  const allTasks = useMemo(() => Object.values(tasksByJob).flat(), [tasksByJob]);

  const boardTasks = useMemo(() => {
    const columns = {
      pending: [],
      'in-progress': [],
      review: [],
      completed: []
    };
    allTasks.forEach((task) => {
      const column = kanbanStatuses.find((status) => status.id === task.status) ? task.status : 'pending';
      columns[column].push(task);
    });
    return columns;
  }, [allTasks]);

  const stats = useMemo(() => {
    const overdue = allTasks.filter((task) => task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed').length;
    return {
      completed: allTasks.filter((task) => task.status === 'completed').length,
      pending: allTasks.filter((task) => task.status === 'pending').length,
      inProgress: allTasks.filter((task) => task.status === 'in-progress').length,
      review: allTasks.filter((task) => task.status === 'review').length,
      overdue,
      blocked: allTasks.filter((task) => task.status === 'blocked').length,
      total: allTasks.length
    };
  }, [allTasks]);

  const progressValue = allTasks.length ? Math.round((stats.completed / allTasks.length) * 100) : 0;

  const activityFeed = useMemo(() => {
    const feed = allTasks
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: statusLabel(task.status),
        assignee: task.assignee?.name || 'Unassigned',
        time: task.updatedAt || task.createdAt || new Date().toISOString()
      }))
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 6);
    return feed;
  }, [allTasks]);

  const handleDragStart = (taskId) => {
    setDraggingTaskId(taskId);
  };

  const handleDrop = async (status) => {
    if (!draggingTaskId) return;
    const currentJobId = Object.entries(tasksByJob).find(([, tasks]) => tasks.some((task) => task.id === draggingTaskId))?.[0];
    if (!currentJobId) return;
    const task = tasksByJob[currentJobId].find((item) => item.id === draggingTaskId);
    if (!task) return;

    try {
      await axios.put(`${apiBaseUrl}/api/tasks/${draggingTaskId}`, { status }, { withCredentials: true });
      setTasksByJob((prev) => ({
        ...prev,
        [currentJobId]: prev[currentJobId].map((item) =>
          item.id === draggingTaskId ? { ...item, status } : item
        )
      }));
    } catch (error) {
      console.error('Unable to update task status', error);
    } finally {
      setDraggingTaskId(null);
    }
  };

  return (
    <Box>
      <PageShell
        title="Job Progress"
        description="Move tasks through Pending, In Progress, Review, and Completed lanes to keep the team aligned."
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" fontWeight={700}>Project</Typography>
                <FormControl size="small" sx={{ mt: 1, minWidth: 220 }}>
                  <InputLabel>Project</InputLabel>
                  <Select
                    label="Project"
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                  >
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>{project.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ minWidth: 220 }}>
                <Typography variant="subtitle2" color="text.secondary">Overall completion</Typography>
                <LinearProgress variant="determinate" value={progressValue} sx={{ height: 12, borderRadius: 6, mt: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{progressValue}% complete</Typography>
              </Box>
            </Stack>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Completed" value={stats.completed} icon="check" color="success" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Pending" value={stats.pending} icon="pending" color="warning" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Overdue" value={stats.overdue} icon="error" color="error" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Blocked" value={stats.blocked} icon="warning" color="error" />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
              {kanbanStatuses.map((column) => (
                <Paper
                  key={column.id}
                  elevation={0}
                  sx={{ p: 2, borderRadius: 3, minHeight: 420, border: '1px solid', borderColor: 'divider', bgcolor: '#F8FAFC' }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(column.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{column.label}</Typography>
                    <Chip label={boardTasks[column.id]?.length || 0} size="small" />
                  </Box>
                  <Stack spacing={2}>
                    {(boardTasks[column.id] || []).map((task) => (
                      <Paper
                        key={task.id}
                        elevation={1}
                        sx={{ p: 2, borderRadius: 3, cursor: 'grab' }}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                      >
                        <Typography fontWeight={700}>{task.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {task.assignee?.name || 'Unassigned'}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip label={statusLabel(task.status)} size="small" color={statusColorMap[task.status] || 'default'} />
                          <Chip label={task.priority ? `${task.priority} priority` : 'No priority'} size="small" />
                        </Stack>
                      </Paper>
                    ))}
                    {!boardTasks[column.id]?.length && (
                      <Typography variant="body2" color="text.secondary">Drag tasks here or add tasks from the project.</Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Activity Feed
            </Typography>
            {activityFeed.length ? (
              <List disablePadding>
                {activityFeed.map((item) => (
                  <ListItem key={item.id} sx={{ p: 2, borderRadius: 3, mb: 1, bgcolor: 'background.paper' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#0070F0' }}><Task /></Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.title}
                      secondary={
                        <>
                          <Typography component="span" variant="caption" color="text.secondary">
                            {item.status} • {item.assignee}
                          </Typography>
                          <Typography component="div" variant="caption" color="text.secondary">
                            {timestampLabel(item.time)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">Activity will show here when tasks move through the board.</Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Use drag and drop to move tasks across statuses. Each movement updates the task status and activity feed.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const SchoolProjectsPage = () => (
  <Box>
    <PageShell
      title="School Projects"
      description="School-specific projects are visible here with a clean project card layout."
    />
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography color="text.secondary">This space is reserved for school-focused projects and custom academic workflows.</Typography>
    </Paper>
  </Box>
);

const CreateTemplatePage = () => (
  <Box>
    <PageShell
      title="Create Template"
      description="Create a new reusable job template with structured tasks and workflow details."
    />
    <JobTemplatesPage startNewTemplate />
  </Box>
);

const JobAnalyticsPage = () => (
  <Box>
    <PageShell
      title="Job Analytics"
      description="Review progress, throughput, and job performance across your active projects."
    />
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Job Completion</Typography>
          <Typography color="text.secondary">Visualize completed job ratios and focus areas for bottleneck removal.</Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">Average completion time</Typography>
            <Typography variant="h4" fontWeight={700}>12.4 days</Typography>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">On-time delivery</Typography>
            <Typography variant="h4" fontWeight={700}>88%</Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Task Efficiency</Typography>
          <Typography color="text.secondary">Track average job task throughput and identify workflow trends.</Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">Tasks completed per week</Typography>
            <Typography variant="h4" fontWeight={700}>78</Typography>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">Blocked task ratio</Typography>
            <Typography variant="h4" fontWeight={700}>7%</Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const ProjectManagementSection = ({ page }) => {
  return <ProjectModuleV2 page={page} />;
};

export { projectPageLabels };
export default ProjectManagementSection;
