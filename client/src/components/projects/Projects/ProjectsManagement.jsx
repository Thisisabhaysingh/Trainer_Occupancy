import React, { useState, useEffect } from 'react';
import {
    Box,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Chip,
    Grid,
    Paper,
    IconButton,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Divider,
    LinearProgress,
    Tooltip,
    Avatar,
    Collapse,
    CircularProgress
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Assignment as TaskIcon,
    Work as JobIcon,
    AccessTime as TimeIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon,
    Folder as FolderIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    KeyboardArrowRight as ArrowIcon
} from '@mui/icons-material';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getOwnProgress = (item) => {
    if (!item) return 0;
    if (item.status === 'completed' || Number(item.completion_percentage_new || 0) >= 100) return 100;
    const progress = Number(item.completion_percentage_new || 0);
    return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
};
const getTaskRollupProgress = (task) => {
    const subtasks = task?.subtasks || task?.childActivities || [];
    if (!subtasks.length) return getOwnProgress(task);
    return subtasks.reduce((sum, subtask) => sum + getOwnProgress(subtask), 0) / subtasks.length;
};
const getJobRollupProgress = (job) => {
    const tasks = job?.tasks || [];
    if (!tasks.length) return getOwnProgress(job);
    return tasks.reduce((sum, task) => sum + getTaskRollupProgress(task), 0) / tasks.length;
};
const getProjectRollupProgress = (jobs, fallback = 0) => {
    if (!jobs?.length) return Number(fallback || 0);
    return Math.round(jobs.reduce((sum, job) => sum + getJobRollupProgress(job), 0) / jobs.length);
};

const StatBadge = ({ icon, label, value, color = '#6366f1' }) => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2.5,
        py: 1.5,
        borderRadius: 2,
        bgcolor: `${color}12`,
        border: `1px solid ${color}28`,
        minWidth: 90,
        gap: 0.25,
    }}>
        <Box sx={{ color, display: 'flex', alignItems: 'center', mb: 0.25 }}>{icon}</Box>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 11, color: '#888', fontWeight: 500, mt: 0.25 }}>{label}</Typography>
    </Box>
);

const FormSection = ({ title, fields, onCancel, onSubmit, submitLabel, values, setValues, employees, priorities, statuses }) => (
    <Box sx={{
        mt: 2,
        p: 2.5,
        borderRadius: 2.5,
        bgcolor: '#f8faff',
        border: '1.5px dashed #c7d2fe',
        boxShadow: 'inset 0 1px 4px rgba(99,102,241,0.04)'
    }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#4f46e5', mb: 2 }}>{title}</Typography>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TextField
                    fullWidth size="small" label="Title *"
                    value={values.title}
                    onChange={e => setValues({ ...values, title: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    fullWidth size="small" label="Description" multiline rows={2}
                    value={values.description}
                    onChange={e => setValues({ ...values, description: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                />
            </Grid>
            <Grid item xs={6}>
                <FormControl fullWidth size="small">
                    <InputLabel>Assign To</InputLabel>
                    <Select
                        value={values.assigned_to} label="Assign To"
                        onChange={e => setValues({ ...values, assigned_to: e.target.value })}
                        sx={{ borderRadius: 2, bgcolor: '#fff' }}
                    >
                        {employees.map(emp => (
                            <MenuItem key={emp.employeeCode} value={emp.employeeCode}>{emp.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={6}>
                <TextField
                    fullWidth size="small" label="Due Date" type="date"
                    value={values.due_date}
                    onChange={e => setValues({ ...values, due_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                />
            </Grid>
            <Grid item xs={4}>
                <TextField
                    fullWidth size="small" label="Est. Hours" type="number"
                    value={values.estimated_hours}
                    onChange={e => setValues({ ...values, estimated_hours: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                />
            </Grid>
            <Grid item xs={4}>
                <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                        value={values.priority_id} label="Priority"
                        onChange={e => setValues({ ...values, priority_id: e.target.value })}
                        sx={{ borderRadius: 2, bgcolor: '#fff' }}
                    >
                        {priorities.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color || '#888' }} />
                                    {p.name}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={4}>
                <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={values.status_id} label="Status"
                        onChange={e => setValues({ ...values, status_id: e.target.value })}
                        sx={{ borderRadius: 2, bgcolor: '#fff' }}
                    >
                        {statuses.map(s => (
                            <MenuItem key={s.id} value={s.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color || '#888' }} />
                                    {s.name}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2.5 }}>
            <Button size="small" onClick={onCancel} sx={{ borderRadius: 2, textTransform: 'none', color: '#666' }}>
                Cancel
            </Button>
            <Button
                size="small" variant="contained" onClick={onSubmit}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, px: 2.5 }}
            >
                {submitLabel}
            </Button>
        </Box>
    </Box>
);

const TaskRow = ({ task }) => {
    const done = (task.completion_percentage_new || 0) >= 100;
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 2, py: 1.25,
            borderRadius: 1.5,
            bgcolor: done ? '#f0fdf4' : '#fafbff',
            border: `1px solid ${done ? '#bbf7d0' : '#e8eaf6'}`,
            transition: 'all 0.15s',
            '&:hover': { bgcolor: done ? '#dcfce7' : '#f0f4ff', borderColor: done ? '#86efac' : '#c7d2fe' }
        }}>
            {done
                ? <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e', flexShrink: 0 }} />
                : <UncheckedIcon sx={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }} />
            }
            <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: done ? '#15803d' : '#334155', textDecoration: done ? 'line-through' : 'none' }}>
                {task.title}
            </Typography>
            {task.assignedTo?.name && (
                <Tooltip title={task.assignedTo.name}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: '#6366f1' }}>
                        {task.assignedTo.name.charAt(0)}
                    </Avatar>
                </Tooltip>
            )}
            {task.priority && (
                <Chip
                    label={task.priority.name} size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${task.priority.color}22`, color: task.priority.color, border: `1px solid ${task.priority.color}44` }}
                />
            )}
            {task.due_date && (
                <Typography sx={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </Typography>
            )}
            <Box sx={{ minWidth: 36, textAlign: 'right' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: done ? '#22c55e' : '#6366f1' }}>
                    {task.completion_percentage_new || 0}%
                </Typography>
            </Box>
        </Box>
    );
};

const JobCard = ({ job, onAddTask, priorities, statuses, employees, showTaskForm, setShowTaskForm, newTask, setNewTask, handleCreateTask }) => {
    const [expanded, setExpanded] = useState(false);
    const taskCount = job.tasks?.length || 0;
    const doneCount = job.tasks?.filter(t => getTaskRollupProgress(t) >= 100).length || 0;
    const progress = Math.round(getJobRollupProgress(job));

    return (
        <Paper elevation={0} sx={{
            mb: 2, borderRadius: 2.5,
            border: '1.5px solid #e8eaf6',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: '0 4px 16px rgba(99,102,241,0.10)' }
        }}>
            {/* Job Header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 2.5, py: 1.75,
                    cursor: 'pointer',
                    bgcolor: expanded ? '#f5f3ff' : '#fff',
                    borderBottom: expanded ? '1.5px solid #e8eaf6' : 'none',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: '#f5f3ff' }
                }}
            >
                <Box sx={{
                    width: 34, height: 34, borderRadius: 1.5,
                    bgcolor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <JobIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#1e1b4b' }}>{job.title}</Typography>
                        {job.priority && (
                            <Chip label={job.priority.name} size="small" sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: `${job.priority.color}22`, color: job.priority.color,
                                border: `1px solid ${job.priority.color}44`
                            }} />
                        )}
                        {job.status && (
                            <Chip label={job.status.name} size="small" sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: `${job.status.color}22`, color: job.status.color,
                                border: `1px solid ${job.status.color}44`
                            }} />
                        )}
                    </Box>
                    {taskCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <LinearProgress
                                variant="determinate" value={progress}
                                sx={{ flex: 1, maxWidth: 140, height: 5, borderRadius: 3, bgcolor: '#e8eaf6', '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 3 } }}
                            />
                            <Typography sx={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{doneCount}/{taskCount} tasks</Typography>
                        </Box>
                    )}
                </Box>

                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexShrink: 0 }}>
                    {job.assignedTo?.name && (
                        <Tooltip title={`Assigned: ${job.assignedTo.name}`}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#6366f1' }}>
                                {job.assignedTo.name.charAt(0)}
                            </Avatar>
                        </Tooltip>
                    )}
                    {job.due_date && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                                {new Date(job.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </Typography>
                        </Box>
                    )}
                    {job.estimated_hours_new > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimeIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>{job.estimated_hours_new}h</Typography>
                        </Box>
                    )}
                    <IconButton size="small" sx={{ color: '#6366f1', p: 0.25 }}>
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                </Stack>
            </Box>

            {/* Expanded Job Body */}
            <Collapse in={expanded}>
                <Box sx={{ px: 2.5, py: 2, bgcolor: '#fafbff' }}>
                    {job.description && (
                        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2, fontStyle: 'italic' }}>
                            {job.description}
                        </Typography>
                    )}

                    {/* Tasks */}
                    {job.tasks && job.tasks.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
                                Tasks
                            </Typography>
                            <Stack spacing={0.75}>
                                {job.tasks.map(task => <TaskRow key={task.id} task={task} />)}
                            </Stack>
                        </Box>
                    )}

                    {/* Add Task Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            size="small" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
                            onClick={() => setShowTaskForm(showTaskForm === job.id ? null : job.id)}
                            sx={{
                                textTransform: 'none', fontSize: 13, fontWeight: 600,
                                color: '#6366f1', borderRadius: 1.5,
                                border: '1px dashed #c7d2fe', px: 1.5,
                                '&:hover': { bgcolor: '#ede9fe', borderColor: '#a5b4fc' }
                            }}
                        >
                            Add Task
                        </Button>
                    </Box>

                    {/* Task Form */}
                    {showTaskForm === job.id && (
                        <FormSection
                            title="New Task"
                            values={newTask}
                            setValues={setNewTask}
                            employees={employees}
                            priorities={priorities}
                            statuses={statuses}
                            onCancel={() => setShowTaskForm(null)}
                            onSubmit={() => handleCreateTask(job.id)}
                            submitLabel="Create Task"
                        />
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
};

const ProjectDetail = ({ project, onClose, onRefresh, showSnackbar }) => {
    const [jobs, setJobs] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showJobForm, setShowJobForm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(null);
    const [newJob, setNewJob] = useState({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' });
    const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' });

    useEffect(() => {
        fetchProjectHierarchy();
        fetchPriorities();
        fetchStatuses();
        fetchEmployees();
    }, [project.id]);

    const fetchProjectHierarchy = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiBaseUrl}/api/projects/${project.id}`, { withCredentials: true });
            if (response.data.success) setJobs(response.data.jobs || []);
        } catch (error) {
            console.error('Error fetching project hierarchy:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPriorities = async () => {
        try {
            const res = await axios.get(`${apiBaseUrl}/api/priorities`, { withCredentials: true });
            if (res.data.success) setPriorities(res.data.priorities);
        } catch (e) { console.error(e); }
    };

    const fetchStatuses = async () => {
        try {
            const res = await axios.get(`${apiBaseUrl}/api/statuses`, { withCredentials: true });
            if (res.data.success) setStatuses(res.data.statuses);
        } catch (e) { console.error(e); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get(`${apiBaseUrl}/api/employees`, { withCredentials: true });
            setEmployees(res.data || []);
        } catch (e) { console.error(e); }
    };

    const handleCreateJob = async () => {
        if (!newJob.title) { showSnackbar('Job title is required', 'error'); return; }
        setLoading(true);
        try {
            const res = await axios.post(`${apiBaseUrl}/api/projects/${project.id}/jobs`, newJob, { withCredentials: true });
            if (res.data.success) {
                showSnackbar('Job created successfully', 'success');
                setNewJob({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' });
                setShowJobForm(false);
                fetchProjectHierarchy();
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to create job', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (jobId) => {
        if (!newTask.title) { showSnackbar('Task title is required', 'error'); return; }
        setLoading(true);
        try {
            const res = await axios.post(`${apiBaseUrl}/api/projects/${project.id}/tasks`, { ...newTask, job_id: jobId }, { withCredentials: true });
            if (res.data.success) {
                showSnackbar('Task created successfully', 'success');
                setNewTask({ title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' });
                setShowTaskForm(null);
                fetchProjectHierarchy();
            }
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to create task', 'error');
        } finally {
            setLoading(false);
        }
    };

    const totalTasks = jobs.reduce((s, j) => s + (j.tasks?.length || 0), 0);
    const doneTasks = jobs.reduce((s, j) => s + (j.tasks?.filter(t => getTaskRollupProgress(t) >= 100).length || 0), 0);
    const overallProgress = getProjectRollupProgress(jobs, project.progress);

    return (
        <>
            {/* Header */}
            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    px: 3.5, pt: 3, pb: 2.5
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FolderIcon sx={{ color: '#fff', fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{project.name}</Typography>
                                {project.projectManager?.name && (
                                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 12.5, mt: 0.25 }}>
                                        PM: {project.projectManager.name}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {project.description && (
                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, mb: 2 }}>
                            {project.description}
                        </Typography>
                    )}

                    {/* Stats row */}
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <StatBadge icon={<JobIcon sx={{ fontSize: 16 }} />} label="Jobs" value={jobs.length} color="#a78bfa" />
                        <StatBadge icon={<TaskIcon sx={{ fontSize: 16 }} />} label="Tasks" value={totalTasks} color="#818cf8" />
                        <StatBadge icon={<CheckCircleIcon sx={{ fontSize: 16 }} />} label="Done" value={doneTasks} color="#34d399" />
                        {project.start_date && (
                            <StatBadge
                                icon={<CalendarIcon sx={{ fontSize: 16 }} />}
                                label="Deadline"
                                value={project.end_date ? new Date(project.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                color="#f472b6"
                            />
                        )}
                    </Box>
                </Box>

                {/* Progress bar */}
                <Box sx={{ px: 3.5, pt: 1.5, pb: 1, bgcolor: '#fff', borderBottom: '1px solid #e8eaf6' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Overall Progress</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>{overallProgress}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate" value={overallProgress}
                        sx={{ height: 7, borderRadius: 4, bgcolor: '#e8eaf6', '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5', borderRadius: 4 } }}
                    />
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: '#f8faff' }}>
                <Box sx={{ px: 3, py: 2.5 }}>
                    {/* Add Job Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1e1b4b' }}>
                            Jobs {jobs.length > 0 && <Typography component="span" sx={{ fontWeight: 400, fontSize: 13, color: '#94a3b8' }}>({jobs.length})</Typography>}
                        </Typography>
                        <Button
                            size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setShowJobForm(!showJobForm)}
                            sx={{
                                textTransform: 'none', fontSize: 13, fontWeight: 600,
                                borderRadius: 2, bgcolor: '#4f46e5', px: 2,
                                '&:hover': { bgcolor: '#4338ca' },
                                boxShadow: '0 2px 8px rgba(79,70,229,0.3)'
                            }}
                        >
                            Add Job
                        </Button>
                    </Box>

                    {/* Job Form */}
                    {showJobForm && (
                        <FormSection
                            title="New Job"
                            values={newJob}
                            setValues={setNewJob}
                            employees={employees}
                            priorities={priorities}
                            statuses={statuses}
                            onCancel={() => setShowJobForm(false)}
                            onSubmit={handleCreateJob}
                            submitLabel="Create Job"
                        />
                    )}

                    {/* Loading */}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} sx={{ color: '#6366f1' }} />
                        </Box>
                    )}

                    {/* Jobs List */}
                    {!loading && jobs.length === 0 ? (
                        <Box sx={{
                            textAlign: 'center', py: 6,
                            borderRadius: 2.5, border: '1.5px dashed #c7d2fe', bgcolor: '#fafbff'
                        }}>
                            <JobIcon sx={{ fontSize: 40, color: '#c7d2fe', mb: 1.5 }} />
                            <Typography sx={{ color: '#94a3b8', fontWeight: 500 }}>No jobs yet</Typography>
                            <Typography sx={{ color: '#c7d2fe', fontSize: 13, mt: 0.5 }}>Click "Add Job" to create the first one</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ mt: showJobForm ? 2 : 0 }}>
                            {jobs.map(job => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    priorities={priorities}
                                    statuses={statuses}
                                    employees={employees}
                                    showTaskForm={showTaskForm}
                                    setShowTaskForm={setShowTaskForm}
                                    newTask={newTask}
                                    setNewTask={setNewTask}
                                    handleCreateTask={handleCreateTask}
                                />
                            ))}
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e8eaf6', bgcolor: '#fff' }}>
                <Button
                    onClick={onClose}
                    sx={{ textTransform: 'none', borderRadius: 2, color: '#64748b', fontWeight: 600, '&:hover': { bgcolor: '#f1f5f9' } }}
                >
                    Close
                </Button>
            </DialogActions>
        </>
    );
};

export default ProjectDetail;
