import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Chip,
    Grid,
    Stack,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Snackbar,
    CircularProgress,
    Tooltip,
    Card,
    CardContent,
    LinearProgress,
    Menu,
    Divider,
    Avatar
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Work as JobIcon,
    Assignment as TaskIcon,
    ArrowBack as BackIcon,
    MoreVert as MoreIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Flag as FlagIcon,
    Schedule as ScheduleIcon,
    Business as BusinessIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../AdminLayout';
import ManagerLayout from '../ManagerLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const ProjectDetail = ({ isManagerView = false }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [project, setProject] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [priorities, setPriorities] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog states (same as before)
    const [jobDialogOpen, setJobDialogOpen] = useState(false);
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, title: '' });
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form states
    const [jobForm, setJobForm] = useState({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        estimated_hours: '',
        priority_id: '',
        status_id: ''
    });
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        estimated_hours: '',
        priority_id: '',
        status_id: ''
    });

    useEffect(() => {
        fetchProjectData();
        fetchPriorities();
        fetchStatuses();
        fetchEmployees();
    }, [id]);

    const fetchProjectData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiBaseUrl}/api/projects/${id}`, { withCredentials: true });
            if (response.data.success) {
                setProject(response.data.project);
                setJobs(response.data.jobs || []);
            }
        } catch (error) {
            console.error('Error fetching project:', error);
            showSnackbar('Failed to load project', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchPriorities = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/priorities`, { withCredentials: true });
            if (response.data.success) setPriorities(response.data.priorities);
        } catch (error) {
            console.error('Error fetching priorities:', error);
        }
    };

    const fetchStatuses = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/statuses`, { withCredentials: true });
            if (response.data.success) setStatuses(response.data.statuses);
        } catch (error) {
            console.error('Error fetching statuses:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/employees`, { withCredentials: true });
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleCreateJob = async () => {
        if (!jobForm.title) {
            showSnackbar('Job title is required', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${apiBaseUrl}/api/projects/${id}/jobs`, jobForm, { withCredentials: true });
            if (response.data.success) {
                showSnackbar('Job created successfully', 'success');
                setJobForm({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' });
                setJobDialogOpen(false);
                fetchProjectData();
            }
        } catch (error) {
            console.error('Error creating job:', error);
            showSnackbar(error.response?.data?.error || 'Failed to create job', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async () => {
        if (!taskForm.title) {
            showSnackbar('Task title is required', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${apiBaseUrl}/api/projects/${id}/tasks`,
                { ...taskForm, job_id: selectedJob.id },
                { withCredentials: true }
            );
            if (response.data.success) {
                showSnackbar('Task created successfully', 'success');
                setTaskForm({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' });
                setTaskDialogOpen(false);
                setSelectedJob(null);
                fetchProjectData();
            }
        } catch (error) {
            console.error('Error creating task:', error);
            showSnackbar(error.response?.data?.error || 'Failed to create task', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateJob = async () => {
        if (!editingJob) return;
        setLoading(true);
        try {
            const updateData = {
                title: editingJob.title,
                description: editingJob.description,
                assignedToId: editingJob.assignedToId,
                due_date: editingJob.due_date,
                estimated_hours_new: editingJob.estimated_hours_new,
                priority_id: editingJob.priority_id,
                status_id: editingJob.status_id
            };
            const response = await axios.put(`${apiBaseUrl}/api/activities/${editingJob.id}`, updateData, { withCredentials: true });
            if (response.data.success) {
                showSnackbar('Job updated successfully', 'success');
                setEditingJob(null);
                setJobDialogOpen(false);
                fetchProjectData();
            }
        } catch (error) {
            console.error('Error updating job:', error);
            showSnackbar('Failed to update job', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTask = async () => {
        if (!editingTask) return;
        setLoading(true);
        try {
            const updateData = {
                title: editingTask.title,
                description: editingTask.description,
                assignedToId: editingTask.assignedToId,
                due_date: editingTask.due_date,
                estimated_hours_new: editingTask.estimated_hours_new,
                priority_id: editingTask.priority_id,
                status_id: editingTask.status_id
            };
            const response = await axios.put(`${apiBaseUrl}/api/activities/${editingTask.id}`, updateData, { withCredentials: true });
            if (response.data.success) {
                showSnackbar('Task updated successfully', 'success');
                setEditingTask(null);
                setTaskDialogOpen(false);
                fetchProjectData();
            }
        } catch (error) {
            console.error('Error updating task:', error);
            showSnackbar('Failed to update task', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJob = async (jobId, jobTitle) => {
        setDeleteConfirm({ open: false, type: '', id: null, title: '' });
        setLoading(true);
        try {
            await axios.delete(`${apiBaseUrl}/api/activities/${jobId}`, { withCredentials: true });
            showSnackbar(`Job "${jobTitle}" deleted successfully`, 'success');
            fetchProjectData();
        } catch (error) {
            console.error('Error deleting job:', error);
            showSnackbar(error.response?.data?.error || 'Failed to delete job', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (taskId, taskTitle) => {
        setDeleteConfirm({ open: false, type: '', id: null, title: '' });
        setLoading(true);
        try {
            await axios.delete(`${apiBaseUrl}/api/activities/${taskId}`, { withCredentials: true });
            showSnackbar(`Task "${taskTitle}" deleted successfully`, 'success');
            fetchProjectData();
        } catch (error) {
            console.error('Error deleting task:', error);
            showSnackbar('Failed to delete task', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openEditJobDialog = (job) => {
        setEditingJob(job);
        setJobForm({
            title: job.title,
            description: job.description || '',
            assigned_to: job.assignedToId || '',
            due_date: job.due_date?.split('T')[0] || '',
            estimated_hours: job.estimated_hours_new || '',
            priority_id: job.priority_id || '',
            status_id: job.status_id || ''
        });
        setJobDialogOpen(true);
    };

    const openEditTaskDialog = (task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || '',
            assigned_to: task.assignedToId || '',
            due_date: task.due_date?.split('T')[0] || '',
            estimated_hours: task.estimated_hours_new || '',
            priority_id: task.priority_id || '',
            status_id: task.status_id || ''
        });
        setTaskDialogOpen(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getPriorityColor = (priorityDef) => priorityDef?.color || '#ff9800';
    const getStatusColor = (statusDef) => statusDef?.color || '#6c757d';

    const totalJobs = jobs.length;
    const totalTasks = jobs.reduce((acc, job) => acc + (job.tasks?.length || 0), 0);
    const progress = project?.progress || 0;

    // Conditional layout helper
    const Layout = isManagerView ? ManagerLayout : AdminLayout;
    const userRole = isManagerView ? 'Manager' : 'Administrator';
    const backPath = isManagerView ? '/manager' : '/admin/projects';
    const breadcrumbBase = isManagerView
        ? [{ label: 'Manager', path: '/manager', active: false }]
        : [{ label: 'Admin', path: '/admin', active: false }];
    const projectsPath = isManagerView ? '/manager' : '/admin/projects';

    // Loading state
    if (loading && !project) {
        return (
            <Layout
                title="Loading..."
                breadcrumbItems={[
                    ...breadcrumbBase,
                    { label: 'Projects', path: projectsPath, active: false },
                    { label: 'Loading', active: true }
                ]}
                user={{ name: user?.name || (isManagerView ? 'Manager' : 'Admin'), role: userRole }}
                onLogout={handleLogout}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <CircularProgress />
                </Box>
            </Layout>
        );
    }

    // Project not found
    if (!project) {
        return (
            <Layout
                title="Project Not Found"
                breadcrumbItems={[
                    ...breadcrumbBase,
                    { label: 'Projects', path: projectsPath, active: false }
                ]}
                user={{ name: user?.name || (isManagerView ? 'Manager' : 'Admin'), role: userRole }}
                onLogout={handleLogout}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h5" color="error">Project not found</Typography>
                    <Button variant="contained" onClick={() => navigate(backPath)} sx={{ mt: 2 }}>
                        Back to {isManagerView ? 'Dashboard' : 'Projects'}
                    </Button>
                </Box>
            </Layout>
        );
    }

    // Main view
    return (
        <Layout
            title={project.name}
            breadcrumbItems={[
                ...breadcrumbBase,
                { label: 'Projects', path: projectsPath, active: false },
                { label: project.name, active: true }
            ]}
            user={{ name: user?.name || (isManagerView ? 'Manager' : 'Admin'), role: userRole }}
            onLogout={handleLogout}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
        >
            <Box>
                {/* Back Button */}
                <Button
                    startIcon={<BackIcon />}
                    onClick={() => navigate(backPath)}
                    sx={{
                        textTransform: 'none',
                        color: '#666',
                        mb: 3,
                        '&:hover': { bgcolor: 'transparent', color: '#1976d2' }
                    }}
                >
                    Back to {isManagerView ? 'Dashboard' : 'Projects'}
                </Button>

                {/* Project Header Card */}
                <Paper elevation={0} sx={{
                    borderRadius: 2,
                    border: '1px solid #e8e8e8',
                    overflow: 'hidden',
                    mb: 4
                }}>
                    <Box sx={{ p: 3, bgcolor: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                            {project.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {project.description || 'No description provided'}
                        </Typography>
                    </Box>

                    <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: '#e3f2fd', width: 40, height: 40 }}>
                                        <BusinessIcon sx={{ color: '#1976d2' }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Department</Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            {project.projectDepartment?.name || 'Not assigned'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: '#e8f5e9', width: 40, height: 40 }}>
                                        <PersonIcon sx={{ color: '#4caf50' }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Project Manager</Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            {project.projectManager?.name || 'Not assigned'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: '#fff3e0', width: 40, height: 40 }}>
                                        <CalendarIcon sx={{ color: '#ff9800' }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Timeline</Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            {formatDate(project.start_date)} — {formatDate(project.end_date)}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar sx={{ bgcolor: '#fce4ec', width: 40, height: 40 }}>
                                        <FlagIcon sx={{ color: '#f44336' }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Priority & Status</Typography>
                                        <Stack direction="row" spacing={0.5}>
                                            <Chip
                                                size="small"
                                                label={project.priorityDefinition?.name || 'Medium'}
                                                sx={{ bgcolor: getPriorityColor(project.priorityDefinition), color: '#fff', height: 22, fontSize: '0.7rem' }}
                                            />
                                            <Chip
                                                size="small"
                                                label={project.statusDefinition?.name || 'Planning'}
                                                sx={{ bgcolor: getStatusColor(project.statusDefinition), color: '#fff', height: 22, fontSize: '0.7rem' }}
                                            />
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>

                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={700} sx={{ fontSize: '2rem', mb: 0.5, color: '#1976d2' }}>
                                {totalJobs}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Jobs</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={700} sx={{ fontSize: '2rem', mb: 0.5, color: '#4caf50' }}>
                                {totalTasks}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Tasks</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={700} sx={{ fontSize: '2rem', mb: 0.5, color: '#ff9800' }}>
                                {progress}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Overall Progress</Typography>
                            <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, height: 4, borderRadius: 2 }} />
                        </Paper>
                    </Grid>
                </Grid>

                {/* Jobs & Tasks Section (unchanged) */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={600}>Jobs & Tasks</Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setEditingJob(null);
                            setJobForm({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' });
                            setJobDialogOpen(true);
                        }}
                        sx={{ textTransform: 'none', borderRadius: 1.5, bgcolor: '#1976d2' }}
                    >
                        Add Job
                    </Button>
                </Box>

                {jobs.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                        <JobIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">No jobs yet</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Create your first job to start organizing tasks
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setJobDialogOpen(true)} sx={{ textTransform: 'none' }}>
                            Add Job
                        </Button>
                    </Paper>
                ) : (
                    jobs.map((job) => (
                        <Card key={job.id} elevation={0} sx={{ mb: 3, border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <CardContent sx={{ p: 3 }}>
                                {/* Job Header */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                        <JobIcon sx={{ color: '#1976d2' }} />
                                        <Typography variant="h6" fontWeight={600}>{job.title}</Typography>
                                        <Chip label={job.priorityDef?.name || 'Medium'} size="small" sx={{ bgcolor: getPriorityColor(job.priorityDef), color: '#fff', height: 24 }} />
                                        <Chip label={job.statusDef?.name || 'Pending'} size="small" sx={{ bgcolor: getStatusColor(job.statusDef), color: '#fff', height: 24 }} />
                                    </Box>
                                    <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedItem({ type: 'job', data: job }); }} sx={{ color: '#999' }}>
                                        <MoreIcon />
                                    </IconButton>
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {job.description || 'No description'}
                                </Typography>

                                <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                    <Tooltip title="Due Date">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <CalendarIcon sx={{ fontSize: 14, color: '#999' }} />
                                            <Typography variant="caption" color="text.secondary">{formatDate(job.due_date)}</Typography>
                                        </Stack>
                                    </Tooltip>
                                    <Tooltip title="Estimated Hours">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <ScheduleIcon sx={{ fontSize: 14, color: '#999' }} />
                                            <Typography variant="caption" color="text.secondary">{job.estimated_hours_new || 0} hours</Typography>
                                        </Stack>
                                    </Tooltip>
                                    <Tooltip title="Assigned To">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <PersonIcon sx={{ fontSize: 14, color: '#999' }} />
                                            <Typography variant="caption" color="text.secondary">{job.assignedTo?.name || 'Not assigned'}</Typography>
                                        </Stack>
                                    </Tooltip>
                                </Stack>

                                <Divider sx={{ my: 2 }} />

                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight={600}>Tasks ({job.tasks?.length || 0})</Typography>
                                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => { setSelectedJob(job); setEditingTask(null); setTaskForm({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' }); setTaskDialogOpen(true); }} sx={{ textTransform: 'none', borderRadius: 1.5 }}>
                                            Add Task
                                        </Button>
                                    </Box>

                                    {job.tasks && job.tasks.length > 0 ? (
                                        <Stack spacing={1.5}>
                                            {job.tasks.map((task) => (
                                                <Paper key={task.id} elevation={0} sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 1.5 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <Box sx={{ flex: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                                                <TaskIcon fontSize="small" sx={{ color: '#666' }} />
                                                                <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                                                                {task.priorityDef && <Chip label={task.priorityDef.name} size="small" sx={{ bgcolor: task.priorityDef.color, color: '#fff', height: 20, fontSize: '0.65rem' }} />}
                                                                <Chip label={task.statusDef?.name || 'Pending'} size="small" sx={{ bgcolor: getStatusColor(task.statusDef), color: '#fff', height: 20, fontSize: '0.65rem' }} />
                                                            </Box>
                                                            {task.description && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{task.description}</Typography>}
                                                            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                                                <Typography variant="caption" color="text.secondary">Due: {formatDate(task.due_date)}</Typography>
                                                                <Typography variant="caption" color="text.secondary">Est: {task.estimated_hours_new || 0}h</Typography>
                                                                <Typography variant="caption" color="text.secondary">Progress: {task.completion_percentage_new || 0}%</Typography>
                                                                <Typography variant="caption" color="text.secondary">Assigned to: {task.assignedTo?.name || 'Not assigned'}</Typography>
                                                            </Stack>
                                                        </Box>
                                                        <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedItem({ type: 'task', data: task, parentJob: job }); }} sx={{ color: '#999' }}>
                                                            <MoreIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">No tasks yet. Click "Add Task" to get started.</Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    ))
                )}


                {/* Job Dialog */}
                <Dialog open={jobDialogOpen} onClose={() => setJobDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ fontWeight: 600 }}>
                        {editingJob ? 'Edit Job' : 'Create New Job'}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Job Title"
                                    required
                                    value={jobForm.title}
                                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    multiline
                                    rows={3}
                                    value={jobForm.description}
                                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Assign To</InputLabel>
                                    <Select
                                        value={jobForm.assigned_to}
                                        label="Assign To"
                                        onChange={(e) => setJobForm({ ...jobForm, assigned_to: e.target.value })}
                                    >
                                        <MenuItem value="">Not Assigned</MenuItem>
                                        {employees.map(emp => (
                                            <MenuItem key={emp.employeeCode} value={emp.employeeCode}>{emp.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Due Date"
                                    type="date"
                                    value={jobForm.due_date}
                                    onChange={(e) => setJobForm({ ...jobForm, due_date: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Est. Hours"
                                    type="number"
                                    value={jobForm.estimated_hours}
                                    onChange={(e) => setJobForm({ ...jobForm, estimated_hours: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={jobForm.priority_id}
                                        label="Priority"
                                        onChange={(e) => setJobForm({ ...jobForm, priority_id: e.target.value })}
                                    >
                                        <MenuItem value="">Default</MenuItem>
                                        {priorities.map(p => (
                                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={jobForm.status_id}
                                        label="Status"
                                        onChange={(e) => setJobForm({ ...jobForm, status_id: e.target.value })}
                                    >
                                        <MenuItem value="">Default</MenuItem>
                                        {statuses.map(s => (
                                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setJobDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                        <Button variant="contained" onClick={editingJob ? handleUpdateJob : handleCreateJob} sx={{ textTransform: 'none' }}>
                            {editingJob ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Task Dialog */}
                <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ fontWeight: 600 }}>
                        {editingTask ? 'Edit Task' : `Create New Task for "${selectedJob?.title || ''}"`}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Task Title"
                                    required
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    multiline
                                    rows={3}
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Assign To</InputLabel>
                                    <Select
                                        value={taskForm.assigned_to}
                                        label="Assign To"
                                        onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                                    >
                                        <MenuItem value="">Not Assigned</MenuItem>
                                        {employees.map(emp => (
                                            <MenuItem key={emp.employeeCode} value={emp.employeeCode}>{emp.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Due Date"
                                    type="date"
                                    value={taskForm.due_date}
                                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Est. Hours"
                                    type="number"
                                    value={taskForm.estimated_hours}
                                    onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={taskForm.priority_id}
                                        label="Priority"
                                        onChange={(e) => setTaskForm({ ...taskForm, priority_id: e.target.value })}
                                    >
                                        <MenuItem value="">Default</MenuItem>
                                        {priorities.map(p => (
                                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={taskForm.status_id}
                                        label="Status"
                                        onChange={(e) => setTaskForm({ ...taskForm, status_id: e.target.value })}
                                    >
                                        <MenuItem value="">Default</MenuItem>
                                        {statuses.map(s => (
                                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setTaskDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                        <Button variant="contained" onClick={editingTask ? handleUpdateTask : handleCreateTask} sx={{ textTransform: 'none' }}>
                            {editingTask ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Action Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    PaperProps={{ sx: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minWidth: 140 } }}
                >
                    <MenuItem onClick={() => {
                        if (selectedItem?.type === 'job') {
                            openEditJobDialog(selectedItem.data);
                        } else if (selectedItem?.type === 'task') {
                            openEditTaskDialog(selectedItem.data);
                        }
                        setMenuAnchor(null);
                    }}>
                        <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            if (selectedItem?.type === 'job') {
                                setDeleteConfirm({ open: true, type: 'job', id: selectedItem.data.id, title: selectedItem.data.title });
                            } else if (selectedItem?.type === 'task') {
                                setDeleteConfirm({ open: true, type: 'task', id: selectedItem.data.id, title: selectedItem.data.title });
                            }
                            setMenuAnchor(null);
                        }}
                        sx={{ color: 'error.main' }}
                    >
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                </Menu>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, type: '', id: null, title: '' })}>
                    <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
                    <DialogContent>
                        <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                            Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>?
                            {deleteConfirm.type === 'job' && ' This will also delete all tasks under this job.'}
                            <Box sx={{ mt: 1, fontSize: '0.8rem' }}>This action cannot be undone.</Box>
                        </Alert>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: null, title: '' })} sx={{ textTransform: 'none' }}>
                            Cancel
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={() => {
                                if (deleteConfirm.type === 'job') {
                                    handleDeleteJob(deleteConfirm.id, deleteConfirm.title);
                                } else if (deleteConfirm.type === 'task') {
                                    handleDeleteTask(deleteConfirm.id, deleteConfirm.title);
                                }
                            }}
                            sx={{ textTransform: 'none' }}
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert severity={snackbar.severity} sx={{ borderRadius: 1.5 }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>


            </Box>
        </Layout>
    );
};

export default ProjectDetail;