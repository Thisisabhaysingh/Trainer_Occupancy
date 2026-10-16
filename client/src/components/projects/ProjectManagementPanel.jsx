import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  Tabs,
  Tab,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Divider,
  Autocomplete,
  IconButton
} from '@mui/material';
import { Add, ArrowBack, Edit, Delete } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { StatCard, DataTable } from '../dashboard/DashboardComponents';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const statusColors = {
  planned: 'default',
  active: 'primary',
  completed: 'success',
  'on-hold': 'warning',
  cancelled: 'error',
  todo: 'default',
  'in-progress': 'info',
  submitted: 'warning',
  review: 'info',
  approved: 'success',
  rejected: 'error'
};

const ProjectManagementPanel = ({
  initialRootTab = 'projects',
  initialProjectSearch = '',
  initialJobSearch = '',
  initialTaskSearch = '',
  initialProjectFilterStatus = '',
  initialJobFilterStatus = '',
  initialTaskFilterStatus = ''
}) => {
  const theme = useTheme();
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [viewMode, setViewMode] = useState('jobs');
  const [rootTab, setRootTab] = useState(initialRootTab);
  const [jobSearch, setJobSearch] = useState(initialJobSearch);
  const [taskSearch, setTaskSearch] = useState(initialTaskSearch);
  const [projectSearch, setProjectSearch] = useState(initialProjectSearch);
  const [projectFilterStatus, setProjectFilterStatus] = useState(initialProjectFilterStatus);
  const [projectFilterOwner, setProjectFilterOwner] = useState(null);
  const [jobFilterStatus, setJobFilterStatus] = useState(initialJobFilterStatus);
  const [taskFilterStatus, setTaskFilterStatus] = useState(initialTaskFilterStatus);
  const [taskFilterPriority, setTaskFilterPriority] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    status: 'planned',
    startDate: '',
    endDate: '',
    ownerId: ''
  });
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    status: 'planned',
    startDate: '',
    endDate: '',
    ownerId: ''
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium',
    deadline: '',
    status: 'todo'
  });
  const [saving, setSaving] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [deleteJob, setDeleteJob] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [projectsPage, setProjectsPage] = useState(0);
  const [jobsPage, setJobsPage] = useState(0);
  const [tasksPage, setTasksPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase()) || job.description.toLowerCase().includes(jobSearch.toLowerCase());
        const matchesStatus = jobFilterStatus ? job.status === jobFilterStatus : true;
        return matchesSearch && matchesStatus;
      }),
    [jobs, jobSearch, jobFilterStatus]
  );

  const paginatedJobs = useMemo(() => {
    const start = jobsPage * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredJobs.slice(start, end);
  }, [filteredJobs, jobsPage, rowsPerPage]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) || (task.description || '').toLowerCase().includes(taskSearch.toLowerCase());
        const matchesStatus = taskFilterStatus ? task.status === taskFilterStatus : true;
        const matchesPriority = taskFilterPriority ? task.priority === taskFilterPriority : true;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [tasks, taskSearch, taskFilterStatus, taskFilterPriority]
  );

  const paginatedTasks = useMemo(() => {
    const start = tasksPage * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredTasks.slice(start, end);
  }, [filteredTasks, tasksPage, rowsPerPage]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(projectSearch.toLowerCase()) || (p.description || '').toLowerCase().includes(projectSearch.toLowerCase());
      const matchesStatus = projectFilterStatus ? p.status === projectFilterStatus : true;
      const matchesOwner = projectFilterOwner ? p.owner?.employeeCode === projectFilterOwner.employeeCode : true;
      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [projects, projectSearch, projectFilterStatus, projectFilterOwner]);

  const paginatedProjects = useMemo(() => {
    const start = projectsPage * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredProjects.slice(start, end);
  }, [filteredProjects, projectsPage, rowsPerPage]);

  const projectSummary = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active').length;
    const planned = projects.filter((p) => p.status === 'planned').length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const overdueTasks = tasks.filter((task) => task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed').length;
    return { active, planned, completed, overdueTasks };
  }, [projects, tasks]);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, []);

  useEffect(() => {
    setRootTab(initialRootTab);
  }, [initialRootTab]);

  useEffect(() => {
    setProjectSearch(initialProjectSearch);
  }, [initialProjectSearch]);

  useEffect(() => {
    setJobSearch(initialJobSearch);
  }, [initialJobSearch]);

  useEffect(() => {
    setTaskSearch(initialTaskSearch);
  }, [initialTaskSearch]);

  useEffect(() => {
    setProjectFilterStatus(initialProjectFilterStatus);
  }, [initialProjectFilterStatus]);

  useEffect(() => {
    setJobFilterStatus(initialJobFilterStatus);
  }, [initialJobFilterStatus]);

  useEffect(() => {
    setTaskFilterStatus(initialTaskFilterStatus);
  }, [initialTaskFilterStatus]);

  useEffect(() => {
    if (selectedProject) {
      fetchJobs(selectedProject.id);
      setSelectedJob(null);
      setTasks([]);
      setViewMode('jobs');
      setJobSearch('');
      setTaskSearch('');
      setJobsPage(0);
      setTasksPage(0);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedJob) {
      fetchTasks(selectedJob.id);
    }
  }, [selectedJob]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/api/projects`, { withCredentials: true });
      setProjects(res.data);
      if (!selectedProject && res.data.length) {
        setSelectedProject(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/employees`, { withCredentials: true });
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async (projectId) => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/projects/${projectId}/jobs`, { withCredentials: true });
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async (jobId) => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/jobs/${jobId}/tasks`, { withCredentials: true });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async () => {
    if (!formState.title) return;
    setSaving(true);
    try {
      await axios.post(`${apiBaseUrl}/api/projects`, formState, { withCredentials: true });
      setDialogOpen(false);
      setFormState({ title: '', description: '', status: 'planned', startDate: '', endDate: '', ownerId: '' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateJob = async () => {
    if (!selectedProject || !jobForm.title) return;
    setSaving(true);
    try {
      await axios.post(`${apiBaseUrl}/api/projects/${selectedProject.id}/jobs`, jobForm, { withCredentials: true });
      setJobDialogOpen(false);
      setJobForm({ title: '', description: '', status: 'planned', startDate: '', endDate: '', ownerId: '' });
      fetchJobs(selectedProject.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTask = async () => {
    if (!selectedJob || !taskForm.title) return;
    setSaving(true);
    try {
      if (editTask) {
        await axios.put(`${apiBaseUrl}/api/tasks/${editTask.id}`, taskForm, { withCredentials: true });
      } else {
        await axios.post(`${apiBaseUrl}/api/jobs/${selectedJob.id}/tasks`, taskForm, { withCredentials: true });
      }
      setTaskDialogOpen(false);
      setEditTask(null);
      setTaskForm({ title: '', description: '', assigneeId: '', priority: 'medium', deadline: '', status: 'todo' });
      fetchTasks(selectedJob.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const openProjectDialog = (project = null) => {
    if (project) {
      setEditProject(project);
      setFormState({
        title: project.title || '',
        description: project.description || '',
        status: project.status || 'planned',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        ownerId: project.ownerId || ''
      });
    } else {
      setEditProject(null);
      setFormState({ title: '', description: '', status: 'planned', startDate: '', endDate: '', ownerId: '' });
    }
    setDialogOpen(true);
  };

  const openJobDialog = (job = null) => {
    if (job) {
      setEditJob(job);
      setJobForm({
        title: job.title || '',
        description: job.description || '',
        status: job.status || 'planned',
        startDate: job.startDate || '',
        endDate: job.endDate || '',
        ownerId: job.ownerId || ''
      });
    } else {
      setEditJob(null);
      setJobForm({ title: '', description: '', status: 'planned', startDate: '', endDate: '', ownerId: '' });
    }
    setJobDialogOpen(true);
  };

  const openTaskDialog = (task = null) => {
    if (task) {
      setEditTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        assigneeId: task.assigneeId || '',
        priority: task.priority || 'medium',
        deadline: task.deadline || '',
        status: task.status || 'todo'
      });
    } else {
      setEditTask(null);
      setTaskForm({ title: '', description: '', assigneeId: '', priority: 'medium', deadline: '', status: 'todo' });
    }
    setTaskDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formState.title) return;
    setSaving(true);
    try {
      if (editProject) {
        await axios.put(`${apiBaseUrl}/api/projects/${editProject.id}`, formState, { withCredentials: true });
      } else {
        await axios.post(`${apiBaseUrl}/api/projects`, formState, { withCredentials: true });
      }
      setDialogOpen(false);
      setEditProject(null);
      setFormState({ title: '', description: '', status: 'planned', startDate: '', endDate: '', ownerId: '' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJob = async () => {
    if (!selectedProject || !jobForm.title) return;
    setSaving(true);
    try {
      if (editJob) {
        await axios.put(`${apiBaseUrl}/api/jobs/${editJob.id}`, jobForm, { withCredentials: true });
      } else {
        await axios.post(`${apiBaseUrl}/api/projects/${selectedProject.id}/jobs`, jobForm, { withCredentials: true });
      }
      setJobDialogOpen(false);
      setEditJob(null);
      setJobForm({ title: '', description: '', status: 'planned', startDate: '', endDate: '', ownerId: '' });
      fetchJobs(selectedProject.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    setSaving(true);
    try {
      await axios.delete(`${apiBaseUrl}/api/projects/${deleteProject.id}`, { withCredentials: true });
      if (selectedProject?.id === deleteProject.id) {
        setSelectedProject(null);
      }
      setDeleteProject(null);
      fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!deleteJob) return;
    setSaving(true);
    try {
      await axios.delete(`${apiBaseUrl}/api/jobs/${deleteJob.id}`, { withCredentials: true });
      if (selectedJob?.id === deleteJob.id) {
        setSelectedJob(null);
        setTasks([]);
      }
      setDeleteJob(null);
      fetchJobs(selectedProject.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTask) return;
    setSaving(true);
    try {
      await axios.delete(`${apiBaseUrl}/api/tasks/${deleteTask.id}`, { withCredentials: true });
      setDeleteTask(null);
      fetchTasks(selectedJob.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const projectColumns = [
    { key: 'title', label: 'Project', render: (value, row) => <Typography fontWeight={600}>{row.title}</Typography> },
    { key: 'status', label: 'Status', render: (_, row) => <Chip label={row.status} color={statusColors[row.status] || 'default'} size="small" /> },
    { key: 'startDate', label: 'Start Date', align: 'right', sx: { textAlign: 'right' } },
    { key: 'endDate', label: 'End Date', align: 'right', sx: { textAlign: 'right' } },
    { key: 'owner', label: 'Owner', render: (_, row) => row.owner?.name || 'Unassigned' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openProjectDialog(row); }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteProject(row); }}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  const jobColumns = [
    { key: 'title', label: 'Job', render: (value, row) => <Typography fontWeight={600}>{row.title}</Typography> },
    { key: 'status', label: 'Status', render: (_, row) => <Chip label={row.status} color={statusColors[row.status] || 'default'} size="small" /> },
    { key: 'owner', label: 'Owner', render: (_, row) => row.owner?.name || 'Unassigned' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openJobDialog(row); }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteJob(row); }}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  const taskColumns = [
    { key: 'title', label: 'Task', render: (value, row) => <Typography fontWeight={600}>{row.title}</Typography> },
    { key: 'status', label: 'Status', render: (_, row) => <Chip label={row.status} color={statusColors[row.status] || 'default'} size="small" /> },
    { key: 'priority', label: 'Priority', render: (_, row) => <Chip label={row.priority} color={statusColors[row.priority] || 'default'} size="small" /> },
    { key: 'assignee', label: 'Assignee', render: (_, row) => row.assignee?.name || 'Unassigned' },
    { key: 'deadline', label: 'Deadline' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openTaskDialog(row); }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTask(row); }}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tabs value={rootTab} onChange={(e, val) => setRootTab(val)} textColor="primary" indicatorColor="primary">
          <Tab label="Projects" value="projects" />
          <Tab label="Jobs" value="jobs" />
          <Tab label="Tasks" value="tasks" />
        </Tabs>
        <Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => {
            if (rootTab === 'projects') openProjectDialog();
            else if (rootTab === 'jobs') openJobDialog();
            else openTaskDialog();
          }} sx={{ textTransform: 'none' }}>
            New {rootTab === 'projects' ? 'Project' : rootTab === 'jobs' ? 'Job' : 'Task'}
          </Button>
        </Box>
      </Box>

      {rootTab === 'projects' && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 3 }}>
            <StatCard title="Total Projects" value={projects.length} icon="projects" />
            <StatCard title="Active Projects" value={projectSummary.active} icon="projects" />
            <StatCard title="Planned Projects" value={projectSummary.planned} icon="projects" />
            <StatCard title="Overdue Tasks" value={projectSummary.overdueTasks} icon="error" color={projectSummary.overdueTasks ? 'error' : 'success'} />
          </Box>

          <Box sx={{ display: { xs: 'block', lg: 'grid' }, gridTemplateColumns: '320px 1fr 320px', gap: 3 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 1, minHeight: 520, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Projects</Typography>
                  <Typography variant="body2" color="text.secondary">Create and manage high-level initiatives.</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => openProjectDialog()} sx={{ textTransform: 'none' }}>
                  New Project
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Search projects"
                  value={projectSearch}
                  onChange={(e) => { setProjectSearch(e.target.value); setProjectsPage(0); }}
                  sx={{ flex: 1 }}
                  size="small"
                />
                <FormControl size="small" sx={{ width: 160 }}>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={projectFilterStatus} onChange={(e) => { setProjectFilterStatus(e.target.value); setProjectsPage(0); }}>
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value="planned">Planned</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="on-hold">On Hold</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Autocomplete
                options={sortedEmployees}
                getOptionLabel={(option) => option.name || ''}
                value={projectFilterOwner}
                onChange={(e, val) => { setProjectFilterOwner(val || null); setProjectsPage(0); }}
                renderInput={(params) => <TextField {...params} label="Owner filter" size="small" />}
                clearOnEscape
                isOptionEqualToValue={(option, value) => option.employeeCode === value.employeeCode}
                sx={{ mb: 2 }}
              />

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataTable
                  columns={projectColumns}
                  data={paginatedProjects}
                  onRowClick={(row) => setSelectedProject(row)}
                  sx={{ flex: 1, borderRadius: 1 }}
                />
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Page {projectsPage + 1} of {Math.ceil(filteredProjects.length / rowsPerPage) || 1}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setProjectsPage(p => Math.max(p - 1, 0))}
                    disabled={projectsPage === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setProjectsPage(p => (p + 1) * rowsPerPage < filteredProjects.length ? p + 1 : p)}
                    disabled={(projectsPage + 1) * rowsPerPage >= filteredProjects.length}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {viewMode === 'jobs' ? (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>Jobs</Typography>
                      <Typography variant="body2" color="text.secondary">Click to load tasks inside a job.</Typography>
                    </Box>
                    <Button variant="outlined" onClick={() => openJobDialog()} disabled={!selectedProject} sx={{ textTransform: 'none' }}>
                      Add Job
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      label="Search jobs"
                      value={jobSearch}
                      onChange={(e) => { setJobSearch(e.target.value); setJobsPage(0); }}
                      sx={{ flex: 1 }}
                      size="small"
                    />
                    <FormControl size="small" sx={{ width: 160 }}>
                      <InputLabel>Status</InputLabel>
                      <Select label="Status" value={jobFilterStatus} onChange={(e) => { setJobFilterStatus(e.target.value); setJobsPage(0); }}>
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="planned">Planned</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="blocked">Blocked</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <DataTable
                    columns={jobColumns}
                    data={paginatedJobs}
                    onRowClick={(row) => {
                      setSelectedJob(row);
                      setViewMode('tasks');
                    }}
                    sx={{ minHeight: 320, borderRadius: 1 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      Page {jobsPage + 1} of {Math.ceil(filteredJobs.length / rowsPerPage) || 1}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => setJobsPage(p => Math.max(p - 1, 0))}
                        disabled={jobsPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setJobsPage(p => (p + 1) * rowsPerPage < filteredJobs.length ? p + 1 : p)}
                        disabled={(jobsPage + 1) * rowsPerPage >= filteredJobs.length}
                      >
                        Next
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              ) : (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>Tasks for {selectedJob?.title || 'Job'}</Typography>
                      <Typography variant="body2" color="text.secondary">Use tasks to assign work to team members.</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <IconButton onClick={() => {
                        setViewMode('jobs');
                        setSelectedJob(null);
                        setTaskSearch('');
                      }} size="large">
                        <ArrowBack />
                      </IconButton>
                      <Button variant="outlined" startIcon={<Add />} onClick={() => openTaskDialog()} disabled={!selectedJob} sx={{ textTransform: 'none' }}>
                        Add Task
                      </Button>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      label="Search tasks"
                      value={taskSearch}
                      onChange={(e) => { setTaskSearch(e.target.value); setTasksPage(0); }}
                      sx={{ flex: 1 }}
                      size="small"
                    />
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>Status</InputLabel>
                      <Select label="Status" value={taskFilterStatus} onChange={(e) => { setTaskFilterStatus(e.target.value); setTasksPage(0); }}>
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="todo">To Do</MenuItem>
                        <MenuItem value="in-progress">In Progress</MenuItem>
                        <MenuItem value="review">Review</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 140 }}>
                      <InputLabel>Priority</InputLabel>
                      <Select label="Priority" value={taskFilterPriority} onChange={(e) => { setTaskFilterPriority(e.target.value); setTasksPage(0); }}>
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="critical">Critical</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <DataTable
                    columns={taskColumns}
                    data={paginatedTasks}
                    sx={{ minHeight: 320, borderRadius: 1 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      Page {tasksPage + 1} of {Math.ceil(filteredTasks.length / rowsPerPage) || 1}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => setTasksPage(p => Math.max(p - 1, 0))}
                        disabled={tasksPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setTasksPage(p => (p + 1) * rowsPerPage < filteredTasks.length ? p + 1 : p)}
                        disabled={(tasksPage + 1) * rowsPerPage >= filteredTasks.length}
                      >
                        Next
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Box>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 1, minHeight: 520, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Project Detail</Typography>
                  <Typography variant="body2" color="text.secondary">Quick view and actions for selected project.</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => selectedProject && openProjectDialog(selectedProject)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => selectedProject && setDeleteProject(selectedProject)}>Delete</Button>
                </Box>
              </Box>

              {!selectedProject ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Typography color="text.secondary">Select a project to see details</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="h5" fontWeight={700}>{selectedProject.title}</Typography>
                  <Chip label={selectedProject.status} color={statusColors[selectedProject.status] || 'default'} size="small" />
                  <Typography variant="body2" color="text.secondary">{selectedProject.description}</Typography>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2">Owner</Typography>
                    <Typography>{selectedProject.owner?.name || 'Unassigned'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Dates</Typography>
                    <Typography>{selectedProject.startDate || '—'} → {selectedProject.endDate || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Counts</Typography>
                    <Typography>Jobs: {jobs.length}</Typography>
                    <Typography>Tasks (current job view): {tasks.length}</Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </>
      )}

      {rootTab === 'jobs' && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Jobs</Typography>
              <Typography variant="body2" color="text.secondary">Create and manage jobs across projects.</Typography>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={() => openJobDialog()} sx={{ textTransform: 'none' }}>
              New Job
            </Button>
          </Box>
          <TextField
            label="Search jobs"
            value={jobSearch}
            onChange={(e) => { setJobSearch(e.target.value); setJobsPage(0); }}
            fullWidth
            sx={{ mb: 2 }}
          />
          <DataTable columns={jobColumns} data={paginatedJobs} sx={{ minHeight: 420 }} />
        </Paper>
      )}

      {rootTab === 'tasks' && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Tasks</Typography>
              <Typography variant="body2" color="text.secondary">Create and manage tasks across jobs and projects.</Typography>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={() => openTaskDialog()} sx={{ textTransform: 'none' }}>
              New Task
            </Button>
          </Box>
          <TextField
            label="Search tasks"
            value={taskSearch}
            onChange={(e) => { setTaskSearch(e.target.value); setTasksPage(0); }}
            fullWidth
            sx={{ mb: 2 }}
          />
          <DataTable columns={taskColumns} data={paginatedTasks} sx={{ minHeight: 420 }} />
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditProject(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={formState.title}
            onChange={(e) => setFormState({ ...formState, title: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={formState.description}
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
            fullWidth
            multiline
            minRows={3}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={formState.status}
              onChange={(e) => setFormState({ ...formState, status: e.target.value })}
            >
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="on-hold">On Hold</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            value={formState.startDate}
            onChange={(e) => setFormState({ ...formState, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="End Date"
            type="date"
            value={formState.endDate}
            onChange={(e) => setFormState({ ...formState, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Autocomplete
            options={sortedEmployees}
            getOptionLabel={(option) => option.name || ''}
            value={sortedEmployees.find((user) => user.employeeCode === formState.ownerId) || null}
            onChange={(event, value) => setFormState({ ...formState, ownerId: value?.employeeCode || '' })}
            renderInput={(params) => <TextField {...params} label="Owner" fullWidth />}
            clearOnEscape
            isOptionEqualToValue={(option, value) => option.employeeCode === value.employeeCode}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setDialogOpen(false); setEditProject(null); }} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProject} sx={{ fontWeight: 700 }} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editProject ? 'Update Project' : 'Save Project'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={jobDialogOpen} onClose={() => { setJobDialogOpen(false); setEditJob(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editJob ? 'Edit Job' : 'Add Job'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={jobForm.title}
            onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={jobForm.description}
            onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
            fullWidth
            multiline
            minRows={3}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={jobForm.status}
              onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}
            >
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Start Date" type="date" value={jobForm.startDate} onChange={(e) => setJobForm({ ...jobForm, startDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="End Date" type="date" value={jobForm.endDate} onChange={(e) => setJobForm({ ...jobForm, endDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          <Autocomplete
            options={sortedEmployees}
            getOptionLabel={(option) => option.name || ''}
            value={sortedEmployees.find((user) => user.employeeCode === jobForm.ownerId) || null}
            onChange={(event, value) => setJobForm({ ...jobForm, ownerId: value?.employeeCode || '' })}
            renderInput={(params) => <TextField {...params} label="Owner" fullWidth />}
            clearOnEscape
            isOptionEqualToValue={(option, value) => option.employeeCode === value.employeeCode}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setJobDialogOpen(false); setEditJob(null); }} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveJob} sx={{ fontWeight: 700 }} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editJob ? 'Update Job' : 'Save Job'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={taskDialogOpen} onClose={() => { setTaskDialogOpen(false); setEditTask(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            fullWidth
            multiline
            minRows={3}
          />
          <Autocomplete
            options={sortedEmployees}
            getOptionLabel={(option) => option.name || ''}
            value={sortedEmployees.find((user) => user.employeeCode === taskForm.assigneeId) || null}
            onChange={(event, value) => setTaskForm({ ...taskForm, assigneeId: value?.employeeCode || '' })}
            renderInput={(params) => <TextField {...params} label="Assignee" fullWidth />}
            clearOnEscape
            isOptionEqualToValue={(option, value) => option.employeeCode === value.employeeCode}
          />
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select label="Priority" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Deadline" type="date" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="review">Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setTaskDialogOpen(false); setEditTask(null); }} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTask} sx={{ fontWeight: 700 }} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editTask ? 'Update Task' : 'Save Task'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteProject)} onClose={() => setDeleteProject(null)}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the project "{deleteProject?.title}"? This will remove all associated jobs and tasks.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteProject(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteProject} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteJob)} onClose={() => setDeleteJob(null)}>
        <DialogTitle>Delete Job</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the job "{deleteJob?.title}"? This will remove all associated tasks.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteJob(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteJob} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTask)} onClose={() => setDeleteTask(null)}>
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the task "{deleteTask?.title}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTask(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteTask} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectManagementPanel;
