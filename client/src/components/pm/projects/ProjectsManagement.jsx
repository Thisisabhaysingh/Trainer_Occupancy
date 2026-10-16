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
    Autocomplete,
    Stack,
    Divider,
    LinearProgress,
    Tooltip,
    Avatar,
    Collapse,
    CircularProgress
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
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
    KeyboardArrowRight as ArrowIcon,
    People as PeopleIcon,
    PersonAdd as PersonAddIcon,
    GroupRemove as GroupRemoveIcon
} from '@mui/icons-material';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const ALL_EMPLOYEES_ASSIGNEE = '__ALL_EMPLOYEES__';
const ALL_EMPLOYEES_OPTION = { employeeCode: ALL_EMPLOYEES_ASSIGNEE, name: 'All Employees' };

const ui = {
    bg: '#F9FAFB',
    surface: '#FFFFFF',
    border: '#EAECF0',
    text: '#101828',
    muted: '#667085',
    icon: '#344054',
    blue: '#0070F0',
    blueDark: '#0064D6',
    blueSoft: '#EFF6FF',
    green: '#12B76A',
    greenSoft: '#F0FDF4'
};

const StatBadge = ({ icon, label, value, color = '#6366f1' }) => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2.5,
        py: 1.5,
        borderRadius: '8px',
        bgcolor: ui.surface,
        border: `0.8px solid ${ui.border}`,
        minWidth: 90,
        gap: 0.25,
    }}>
        <Box sx={{ color, display: 'flex', alignItems: 'center', mb: 0.25 }}>{icon}</Box>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 11, color: ui.muted, fontWeight: 500, mt: 0.25 }}>{label}</Typography>
    </Box>
);

const controlSx = {
    '& .MuiOutlinedInput-root': {
        minHeight: 40,
        borderRadius: '6px',
        bgcolor: '#fff',
        fontSize: 14
    },
    '& .MuiInputLabel-root': {
        fontSize: 14
    }
};

const selectSx = {
    minHeight: 40,
    borderRadius: '6px',
    bgcolor: '#fff',
    fontSize: 14
};

const emptyWorkItem = { title: '', description: '', assigned_to: '', due_date: '', estimated_hours: '', priority_id: '', status_id: '' };

const formFromActivity = (activity) => ({
    title: activity?.title || '',
    description: activity?.description || '',
    assigned_to: activity?.assignedToId || activity?.assigned_to || '',
    due_date: (activity?.due_date || activity?.dueDate || '').split('T')[0],
    estimated_hours: activity?.estimated_hours_new || '',
    priority_id: activity?.priority_id || '',
    status_id: activity?.status_id || ''
});

const getPriorityDisplay = (item) => item?.priorityDef || item?.priorityDefinition || item?.priority;
const getStatusDisplay = (item) => item?.statusDef || item?.statusDefinition || item?.status;
const normalizeName = (value) => String(value || '').trim().toLowerCase();
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

const FormSection = ({
    title,
    fields,
    onCancel,
    onSubmit,
    submitLabel,
    values,
    setValues,
    employees,
    priorities,
    statuses,
    templates = [],
    selectedTemplateId = '',
    onTemplateChange,
    showTemplatePicker = false,
    allowAllEmployees = false
}) => (
    <Box sx={{
        mt: 2,
        p: 2.5,
        borderRadius: '8px',
        bgcolor: ui.bg,
        border: `0.8px solid ${ui.border}`,
        boxShadow: 'none'
    }}>
        <Typography sx={{ fontWeight: 600, fontSize: 14, color: ui.text, mb: 2 }}>{title}</Typography>
        {showTemplatePicker && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Use Job Template</InputLabel>
                <Select
                    value={selectedTemplateId}
                    label="Use Job Template"
                    onChange={(e) => onTemplateChange && onTemplateChange(e.target.value)}
                    sx={selectSx}
                >
                    <MenuItem value="">Manual Entry</MenuItem>
                    {templates.map(template => (
                        <MenuItem key={template.id || template._id} value={template.id || template._id}>
                            {template.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        )}
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.1fr 1.3fr 1.4fr' },
                gap: 2,
                alignItems: 'flex-start'
            }}
        >
            <Box>
                <TextField
                    fullWidth size="small" label="Title *"
                    value={values.title}
                    onChange={e => setValues({ ...values, title: e.target.value })}
                    sx={controlSx}
                />
            </Box>
            <Box>
                <TextField
                    fullWidth size="small" label="Description" multiline rows={4}
                    value={values.description}
                    onChange={e => setValues({ ...values, description: e.target.value.slice(0, 250) })}
                    inputProps={{ maxLength: 250 }}
                    helperText={`${values.description?.length || 0}/250`}
                    sx={controlSx}
                />
            </Box>
            <Box>
                <Autocomplete
                    size="small"
                    fullWidth
                    options={allowAllEmployees ? [ALL_EMPLOYEES_OPTION, ...employees] : employees}
                    value={
                        values.assigned_to === ALL_EMPLOYEES_ASSIGNEE
                            ? ALL_EMPLOYEES_OPTION
                            : employees.find(emp => emp.employeeCode === values.assigned_to) || null
                    }
                    getOptionLabel={(option) => {
                        if (option?.employeeCode === ALL_EMPLOYEES_ASSIGNEE) return 'All Employees';
                        return option?.name ? `${option.name}${option.employeeCode ? ` (${option.employeeCode})` : ''}` : '';
                    }}
                    isOptionEqualToValue={(option, value) => option.employeeCode === value.employeeCode}
                    onChange={(_, employee) => setValues({ ...values, assigned_to: employee?.employeeCode || '' })}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Assign To"
                            placeholder="Search employee"
                            sx={controlSx}
                        />
                    )}
                />
            </Box>
        </Box>

        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.2fr 1.2fr' },
                gap: 2,
                alignItems: 'flex-start',
                mt: 2
            }}
        >
            <Box>
                <TextField
                    fullWidth size="small" label="Due Date" type="date"
                    value={values.due_date}
                    onChange={e => setValues({ ...values, due_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={controlSx}
                />
            </Box>
            <Box>
                <TextField
                    fullWidth size="small" label="Est. Hours" type="number"
                    value={values.estimated_hours}
                    onChange={e => setValues({ ...values, estimated_hours: e.target.value })}
                    sx={controlSx}
                />
            </Box>
            <Box>
                <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                        value={values.priority_id} label="Priority"
                        onChange={e => setValues({ ...values, priority_id: e.target.value })}
                        sx={selectSx}
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
            </Box>
            <Box>
                <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={values.status_id} label="Status"
                        onChange={e => setValues({ ...values, status_id: e.target.value })}
                        sx={selectSx}
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
            </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2.5, pt: 2, borderTop: `0.8px solid ${ui.border}` }}>
            <Button size="small" onClick={onCancel} sx={{ borderRadius: '6px', textTransform: 'none', color: ui.icon }}>
                Cancel
            </Button>
            <Button
                size="small" variant="contained" onClick={onSubmit}
                sx={{ borderRadius: '6px', textTransform: 'none', bgcolor: ui.blue, '&:hover': { bgcolor: ui.blueDark }, px: 2.5 }}
            >
                {submitLabel}
            </Button>
        </Box>
    </Box>
);

const TaskRow = ({ task, onEdit, onDelete, onReview }) => {
    const done = (task.completion_percentage_new || 0) >= 100;
    const priority = getPriorityDisplay(task);
    const status = getStatusDisplay(task);
    const reviewNote = task.completionNotes || task.comment || task.needsChangesComments || task.reviewerComment;
    return (
        <>
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 2, py: 1.25,
            borderRadius: 1.5,
            bgcolor: done ? '#f0fdf4' : '#fafbff',
            border: `1px solid ${done ? '#bbf7d0' : '#dbeafe'}`,
            borderLeft: `3px solid ${done ? '#22c55e' : '#818cf8'}`,
            transition: 'all 0.15s',
            '&:hover': { bgcolor: done ? '#dcfce7' : '#f0f4ff', borderColor: done ? '#86efac' : '#c7d2fe' }
        }}>
            {done
                ? <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e', flexShrink: 0 }} />
                : <UncheckedIcon sx={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }} />
            }
            <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: done ? '#15803d' : '#334155', textDecoration: done ? 'line-through' : 'none' }}>
                <Typography component="span" sx={{ mr: 1, px: 0.75, py: 0.2, borderRadius: '4px', bgcolor: '#eef2ff', color: '#4f46e5', fontSize: 10, fontWeight: 800 }}>
                    TASK
                </Typography>
                {task.title}
            </Typography>
            {task.assignedTo?.name && (
                <Tooltip title={task.assignedTo.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 150 }}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: '#6366f1' }}>
                        {task.assignedTo.name.charAt(0)}
                    </Avatar>
                    <Typography sx={{ fontSize: 12, color: ui.icon, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.assignedTo.name}
                    </Typography>
                    </Box>
                </Tooltip>
            )}
            {priority && (
                <Chip
                    label={priority.name || priority} size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${priority.color || ui.blue}22`, color: priority.color || ui.blue, border: `1px solid ${priority.color || ui.blue}44` }}
                />
            )}
            {status && (
                <Chip
                    label={status.name || status} size="small"
                    sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${status.color || ui.muted}22`, color: status.color || ui.muted, border: `1px solid ${status.color || ui.muted}44` }}
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
            <Stack direction="row" spacing={0.5}>
                {task.status === 'submitted' && (
                    <>
                        <Tooltip title="Approve Task">
                            <Button size="small" variant="contained" onClick={() => onReview(task, 'approve')} sx={{ minHeight: 28, borderRadius: '6px', textTransform: 'none', fontSize: 11, bgcolor: ui.green, '&:hover': { bgcolor: '#039855' } }}>
                                Approve
                            </Button>
                        </Tooltip>
                        <Tooltip title="Request Redo">
                            <Button size="small" variant="outlined" color="error" onClick={() => onReview(task, 'redo')} sx={{ minHeight: 28, borderRadius: '6px', textTransform: 'none', fontSize: 11 }}>
                                Redo
                            </Button>
                        </Tooltip>
                    </>
                )}
                <Tooltip title="Edit Task">
                    <IconButton size="small" onClick={() => onEdit(task)} sx={{ color: ui.icon, border: `0.8px solid ${ui.border}`, borderRadius: '6px' }}>
                        <EditIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete Task">
                    <IconButton size="small" onClick={() => onDelete(task)} sx={{ color: '#D92D20', border: `0.8px solid ${ui.border}`, borderRadius: '6px' }}>
                        <DeleteIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
        {reviewNote && (
            <Box sx={{ ml: 4, mt: 0.5, p: 1.25, borderRadius: '6px', bgcolor: '#fff', border: `0.8px solid ${ui.border}` }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: ui.icon, mb: 0.25 }}>
                    Notes / Review Details
                </Typography>
                <Typography sx={{ fontSize: 12, color: ui.muted }}>
                    {reviewNote}
                </Typography>
            </Box>
        )}
        {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
            <Stack spacing={0.5} sx={{ ml: 4, mt: 0.5 }}>
                {task.subtasks.map((subtask) => {
                    const subtaskPriority = getPriorityDisplay(subtask);
                    const subtaskStatus = getStatusDisplay(subtask);
                    return (
                        <Box
                            key={subtask.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 1.5,
                                py: 0.85,
                                borderRadius: 1.5,
                                bgcolor: '#fff',
                                border: `0.8px solid ${ui.border}`
                            }}
                        >
                            <ArrowIcon sx={{ fontSize: 16, color: ui.blue }} />
                            <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: ui.text }}>
                                {subtask.title}
                            </Typography>
                            {subtask.assignedTo?.name && (
                                <Typography sx={{ fontSize: 12, color: ui.icon, minWidth: 150 }}>
                                    {subtask.assignedTo.name}
                                </Typography>
                            )}
                            {subtaskPriority && (
                                <Chip
                                    label={subtaskPriority.name || subtaskPriority}
                                    size="small"
                                    sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${subtaskPriority.color || ui.blue}22`, color: subtaskPriority.color || ui.blue }}
                                />
                            )}
                            {subtaskStatus && (
                                <Chip
                                    label={subtaskStatus.name || subtaskStatus}
                                    size="small"
                                    sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${subtaskStatus.color || ui.muted}22`, color: subtaskStatus.color || ui.muted }}
                                />
                            )}
                            {subtask.status === 'submitted' && (
                                <Stack direction="row" spacing={0.5}>
                                    <Button size="small" variant="contained" onClick={() => onReview(subtask, 'approve')} sx={{ minHeight: 26, borderRadius: '6px', textTransform: 'none', fontSize: 11, bgcolor: ui.green, '&:hover': { bgcolor: '#039855' } }}>
                                        Approve
                                    </Button>
                                    <Button size="small" variant="outlined" color="error" onClick={() => onReview(subtask, 'redo')} sx={{ minHeight: 26, borderRadius: '6px', textTransform: 'none', fontSize: 11 }}>
                                        Redo
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                    );
                })}
            </Stack>
        )}
        </>
    );
};

const JobCard = ({
    job,
    priorities,
    statuses,
    employees,
    showTaskForm,
    setShowTaskForm,
    newTask,
    setNewTask,
    handleCreateTask,
    editingJobId,
    editJob,
    setEditJob,
    onStartEditJob,
    onCancelEditJob,
    onUpdateJob,
    onDeleteJob,
    editingTaskId,
    editTask,
    setEditTask,
    onStartEditTask,
    onCancelEditTask,
    onUpdateTask,
    onDeleteTask,
    onReviewTask
}) => {
    const [expanded, setExpanded] = useState(false);
    const taskCount = job.tasks?.length || 0;
    const doneCount = job.tasks?.filter(t => getTaskRollupProgress(t) >= 100).length || 0;
    const progress = Math.round(getJobRollupProgress(job));
    const priority = getPriorityDisplay(job);
    const status = getStatusDisplay(job);

    return (
        <Paper elevation={0} sx={{
            mb: 2, borderRadius: '8px',
            border: `0.8px solid ${ui.border}`,
            borderLeft: `4px solid ${ui.blue}`,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)' }
        }}>
            {/* Job Header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 2.5, py: 1.75,
                    cursor: 'pointer',
                    bgcolor: expanded ? ui.bg : ui.surface,
                    borderBottom: expanded ? `0.8px solid ${ui.border}` : 'none',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: ui.bg }
                }}
            >
                <Box sx={{
                    width: 34, height: 34, borderRadius: 1.5,
                    bgcolor: ui.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <JobIcon sx={{ fontSize: 18, color: ui.blue }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label="JOB"
                            size="small"
                            sx={{ height: 20, fontSize: 10, fontWeight: 800, color: ui.blue, bgcolor: ui.blueSoft, borderRadius: '5px' }}
                        />
                        <Typography sx={{ fontWeight: 600, fontSize: 14.5, color: ui.text }}>{job.title}</Typography>
                        {priority && (
                            <Chip label={priority.name || priority} size="small" sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: `${priority.color || ui.blue}22`, color: priority.color || ui.blue,
                                border: `1px solid ${priority.color || ui.blue}44`
                            }} />
                        )}
                        {status && (
                            <Chip label={status.name || status} size="small" sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: `${status.color || ui.muted}22`, color: status.color || ui.muted,
                                border: `1px solid ${status.color || ui.muted}44`
                            }} />
                        )}
                    </Box>
                    {taskCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <LinearProgress
                                variant="determinate" value={progress}
                                sx={{ flex: 1, maxWidth: 140, height: 5, borderRadius: 3, bgcolor: ui.border, '& .MuiLinearProgress-bar': { bgcolor: ui.blue, borderRadius: 3 } }}
                            />
                            <Typography sx={{ fontSize: 11, color: ui.blue, fontWeight: 600 }}>{doneCount}/{taskCount} tasks</Typography>
                        </Box>
                    )}
                </Box>

                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexShrink: 0 }}>
                    {job.assignedTo?.name && (
                        <Tooltip title={`Assigned: ${job.assignedTo.name}`}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 170, maxWidth: 240 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#6366f1' }}>
                                {job.assignedTo.name.charAt(0)}
                            </Avatar>
                            <Typography sx={{ fontSize: 12, color: ui.icon, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {job.assignedTo.name}
                            </Typography>
                            </Box>
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
                    <Tooltip title="Edit Job">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onStartEditJob(job);
                                setExpanded(true);
                            }}
                            sx={{ color: ui.icon, border: `0.8px solid ${ui.border}`, borderRadius: '6px' }}
                        >
                            <EditIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Job">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteJob(job);
                            }}
                            sx={{ color: '#D92D20', border: `0.8px solid ${ui.border}`, borderRadius: '6px' }}
                        >
                            <DeleteIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                    </Tooltip>
                    <IconButton size="small" sx={{ color: ui.blue, p: 0.25 }}>
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                </Stack>
            </Box>

            {/* Expanded Job Body */}
            <Collapse in={expanded}>
                <Box sx={{ px: 2.5, py: 2, bgcolor: '#fafbff' }}>
                    {job.description && (
                        <Typography sx={{ fontSize: 13, color: ui.muted, mb: 2 }}>
                            {job.description}
                        </Typography>
                    )}

                    {editingJobId === job.id && (
                        <FormSection
                            title="Edit Job"
                            values={editJob}
                            setValues={setEditJob}
                            employees={employees}
                            priorities={priorities}
                            statuses={statuses}
                            onCancel={onCancelEditJob}
                            onSubmit={() => onUpdateJob(job.id)}
                            submitLabel="Save Job"
                        />
                    )}

                    {/* Tasks */}
                    {job.tasks && job.tasks.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
                                Tasks
                            </Typography>
                            <Stack spacing={0.75}>
                                {job.tasks.map(task => (
                                    <Box key={task.id}>
                                        <TaskRow task={task} onEdit={onStartEditTask} onDelete={onDeleteTask} onReview={onReviewTask} />
                                        {editingTaskId === task.id && (
                                            <FormSection
                                                title="Edit Task"
                                                values={editTask}
                                                setValues={setEditTask}
                                                employees={employees}
                                                priorities={priorities}
                                                statuses={statuses}
                                                onCancel={onCancelEditTask}
                                                onSubmit={() => onUpdateTask(task.id)}
                                                submitLabel="Save Task"
                                            />
                                        )}
                                    </Box>
                                ))}
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
                                color: ui.blue, borderRadius: '6px',
                                border: `0.8px dashed ${ui.border}`, px: 1.5,
                                '&:hover': { bgcolor: ui.blueSoft, borderColor: ui.blue }
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
                            allowAllEmployees
                        />
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
};

const ProjectDetail = ({ project, onClose, onRefresh, showSnackbar }) => {
    const [projectDetails, setProjectDetails] = useState(project);
    const [jobs, setJobs] = useState([]);
    const [members, setMembers] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showJobForm, setShowJobForm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(null);
    const [selectedJobTemplateId, setSelectedJobTemplateId] = useState('');
    const [newJob, setNewJob] = useState(emptyWorkItem);
    const [newTask, setNewTask] = useState(emptyWorkItem);
    const [editingJobId, setEditingJobId] = useState(null);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editJob, setEditJob] = useState(emptyWorkItem);
    const [editTask, setEditTask] = useState(emptyWorkItem);
    const [selectedMember, setSelectedMember] = useState(null);
    const [selectedMemberRole, setSelectedMemberRole] = useState('member');

    useEffect(() => {
        fetchProjectHierarchy();
        fetchPriorities();
        fetchStatuses();
        fetchEmployees();
        fetchTemplates();
    }, [project.id]);

    const fetchProjectHierarchy = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiBaseUrl}/api/projects/${project.id}`, { withCredentials: true });
            if (response.data.success) {
                setProjectDetails(response.data.project || project);
                setJobs(response.data.jobs || []);
                setMembers(response.data.members || []);
            }
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

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${apiBaseUrl}/api/templates`, { withCredentials: true });
            setTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
            setTemplates([]);
        }
    };

    const handleJobTemplateChange = (templateId) => {
        setSelectedJobTemplateId(templateId);
        if (!templateId) {
            setNewJob(emptyWorkItem);
            return;
        }

        const template = templates.find(t => String(t.id || t._id) === String(templateId));
        if (!template) return;

        const firstJob = Array.isArray(template.jobs) && template.jobs.length > 0 ? template.jobs[0] : {};
        const priorityName = firstJob.priority || template.priority || template.difficulty;
        const statusName = firstJob.status || template.status;
        const matchedPriority = priorities.find(p => normalizeName(p.name) === normalizeName(priorityName));
        const matchedStatus = statuses.find(s => normalizeName(s.name) === normalizeName(statusName));

        setNewJob({
            title: firstJob.title || firstJob.name || template.name || '',
            description: firstJob.description || template.description || '',
            assigned_to: firstJob.assigned_to || firstJob.assigneeId || '',
            due_date: firstJob.due_date || firstJob.dueDate || firstJob.deadline || '',
            estimated_hours: firstJob.estimated_hours || firstJob.estimatedHours || firstJob.estimated_hours_new || '',
            priority_id: firstJob.priority_id || matchedPriority?.id || '',
            status_id: firstJob.status_id || matchedStatus?.id || ''
        });
    };

    const cancelJobForm = () => {
        setShowJobForm(false);
        setSelectedJobTemplateId('');
        setNewJob(emptyWorkItem);
    };

    const handleCreateJob = async () => {
        if (!newJob.title) { showSnackbar('Job title is required', 'error'); return; }
        setLoading(true);
        try {
            const res = await axios.post(`${apiBaseUrl}/api/projects/${project.id}/jobs`, newJob, { withCredentials: true });
            if (res.data.success) {
                showSnackbar('Job created successfully', 'success');
                setNewJob(emptyWorkItem);
                setSelectedJobTemplateId('');
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
        if (newTask.assigned_to === ALL_EMPLOYEES_ASSIGNEE) {
            const employeeCount = employees.filter(employee => employee.role === 'employee').length;
            const confirmed = window.confirm(
                `Are you sure you want to assign this task to all employees${employeeCount ? ` (${employeeCount})` : ''}? This will create one task per employee and send assignment emails where email is enabled.`
            );
            if (!confirmed) return;
        }
        setLoading(true);
        try {
            const res = await axios.post(`${apiBaseUrl}/api/projects/${project.id}/tasks`, { ...newTask, job_id: jobId }, { withCredentials: true });
            if (res.data.success) {
                showSnackbar(res.data.count ? `Task assigned to ${res.data.count} employees` : 'Task created successfully', 'success');
                setNewTask(emptyWorkItem);
                setShowTaskForm(null);
                await fetchProjectHierarchy();
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to create task', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateActivity = async (activityId, values, successMessage) => {
        if (!values.title) { showSnackbar('Title is required', 'error'); return; }
        setLoading(true);
        try {
            await axios.put(`${apiBaseUrl}/api/projects/activities/${activityId}`, values, { withCredentials: true });
            showSnackbar(successMessage, 'success');
            setEditingJobId(null);
            setEditingTaskId(null);
            await fetchProjectHierarchy();
            if (onRefresh) onRefresh();
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to update', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteActivity = async (activity, type) => {
        const message = type === 'job'
            ? `Delete job "${activity.title}" and its tasks?`
            : `Delete task "${activity.title}"?`;
        if (!window.confirm(message)) return;
        setLoading(true);
        try {
            await axios.delete(`${apiBaseUrl}/api/projects/activities/${activity.id}`, { withCredentials: true });
            showSnackbar(`${type === 'job' ? 'Job' : 'Task'} deleted successfully`, 'success');
            await fetchProjectHierarchy();
            if (onRefresh) onRefresh();
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to delete', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReviewActivity = async (activity, action) => {
        const label = action === 'approve' ? 'approve' : 'request redo for';
        const comment = action === 'redo'
            ? window.prompt(`Reason for redo for "${activity.title}"?`, activity.needsChangesComments || '')
            : window.prompt(`Approval note for "${activity.title}"?`, activity.reviewerComment || '');

        if (comment === null) return;
        if (!window.confirm(`Are you sure you want to ${label} "${activity.title}"?`)) return;

        setLoading(true);
        try {
            const response = await axios.put(
                `${apiBaseUrl}/api/projects/activities/${activity.id}/review`,
                { action, comment },
                { withCredentials: true }
            );
            showSnackbar(response.data?.message || (action === 'approve' ? 'Task approved' : 'Redo requested'), 'success');
            await fetchProjectHierarchy();
            if (onRefresh) onRefresh();
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to review task', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!selectedMember?.employeeCode) {
            showSnackbar('Select an employee to add', 'error');
            return;
        }

        setLoading(true);
        try {
            await axios.post(
                `${apiBaseUrl}/api/projects/${project.id}/members`,
                { user_id: selectedMember.employeeCode, role: selectedMemberRole },
                { withCredentials: true }
            );
            showSnackbar('Member added successfully', 'success');
            setSelectedMember(null);
            setSelectedMemberRole('member');
            await fetchProjectHierarchy();
            if (onRefresh) onRefresh();
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to add member', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (member) => {
        if (!window.confirm(`Remove ${member.name || member.employeeCode} from this project?`)) return;
        setLoading(true);
        try {
            await axios.delete(`${apiBaseUrl}/api/projects/${project.id}/members/${member.employeeCode}`, { withCredentials: true });
            showSnackbar('Member removed successfully', 'success');
            await fetchProjectHierarchy();
            if (onRefresh) onRefresh();
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to remove member', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAllMembersExceptManager = async () => {
        const managerName = projectDetails.projectManager?.name || projectDetails.project_manager || 'the project manager';
        if (!window.confirm(`Remove all project members except ${managerName}?`)) return;

        setLoading(true);
        try {
            const response = await axios.delete(
                `${apiBaseUrl}/api/projects/${project.id}/members/all-except-manager`,
                { withCredentials: true }
            );
            showSnackbar(response.data?.message || 'Members removed successfully', 'success');
            await fetchProjectHierarchy();
            if (onRefresh) onRefresh();
        } catch (error) {
            showSnackbar(error.response?.data?.error || 'Failed to remove members', 'error');
        } finally {
            setLoading(false);
        }
    };

    const totalTasks = jobs.reduce((s, j) => s + (j.tasks?.length || 0), 0);
    const doneTasks = jobs.reduce((s, j) => s + (j.tasks?.filter(t => getTaskRollupProgress(t) >= 100).length || 0), 0);
    const overallProgress = getProjectRollupProgress(jobs, projectDetails.progress);
    const memberCodes = new Set(members.map(member => member.employeeCode));
    const availableMembers = employees.filter(employee => employee.employeeCode && !memberCodes.has(employee.employeeCode));
    const managerCode = projectDetails.project_manager || projectDetails.projectManager?.employeeCode;
    const hasRemovableMembers = members.some(member => member.employeeCode && member.employeeCode !== managerCode);

    return (
        <>
            {/* Header */}
            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{
                    background: ui.surface,
                    px: 3.5, pt: 3, pb: 2.5,
                    border: `0.8px solid ${ui.border}`,
                    borderRadius: '10px 10px 0 0',
                    borderBottom: `0.8px solid ${ui.border}`
                }}>
                    <Button
                        startIcon={<ArrowBackIcon fontSize="small" />}
                        onClick={onClose}
                        sx={{ textTransform: 'none', color: ui.icon, mb: 2, px: 0, '&:hover': { bgcolor: 'transparent', color: ui.blue } }}
                    >
                        Back to Projects
                    </Button>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: ui.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FolderIcon sx={{ color: ui.blue, fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                                    <Chip
                                        label="PROJECT"
                                        size="small"
                                        sx={{ height: 22, fontSize: 10, fontWeight: 800, color: '#0f766e', bgcolor: '#ccfbf1', borderRadius: '5px' }}
                                    />
                                    <Typography sx={{ color: ui.text, fontWeight: 700, fontSize: 20, lineHeight: 1.2 }}>{projectDetails.name}</Typography>
                                </Stack>
                                {projectDetails.projectManager?.name && (
                                    <Typography sx={{ color: ui.muted, fontSize: 12.5, mt: 0.25 }}>
                                        PM: {projectDetails.projectManager.name}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {projectDetails.description && (
                        <Typography sx={{ color: ui.muted, fontSize: 13, mb: 2 }}>
                            {projectDetails.description}
                        </Typography>
                    )}

                    {/* Stats row */}
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <StatBadge icon={<JobIcon sx={{ fontSize: 16 }} />} label="Jobs" value={jobs.length} color="#a78bfa" />
                        <StatBadge icon={<TaskIcon sx={{ fontSize: 16 }} />} label="Tasks" value={totalTasks} color="#818cf8" />
                        <StatBadge icon={<PeopleIcon sx={{ fontSize: 16 }} />} label="Members" value={members.length} color="#38bdf8" />
                        <StatBadge icon={<CheckCircleIcon sx={{ fontSize: 16 }} />} label="Done" value={doneTasks} color="#34d399" />
                        {projectDetails.start_date && (
                            <StatBadge
                                icon={<CalendarIcon sx={{ fontSize: 16 }} />}
                                label="Deadline"
                                value={projectDetails.end_date ? new Date(projectDetails.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                color="#f472b6"
                            />
                        )}
                    </Box>
                </Box>

                {/* Progress bar */}
                <Box sx={{ px: 3.5, pt: 1.5, pb: 1, bgcolor: ui.surface, borderBottom: `0.8px solid ${ui.border}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: ui.icon }}>Overall Progress</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: ui.blue }}>{overallProgress}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate" value={overallProgress}
                        sx={{ height: 7, borderRadius: 4, bgcolor: ui.border, '& .MuiLinearProgress-bar': { bgcolor: ui.blue, borderRadius: 4 } }}
                    />
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: ui.bg, borderLeft: `0.8px solid ${ui.border}`, borderRight: `0.8px solid ${ui.border}` }}>
                <Box sx={{ px: 3, py: 2.5 }}>
                    {/* Add Job Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 16, color: ui.text }}>
                                Jobs inside this project {jobs.length > 0 && <Typography component="span" sx={{ fontWeight: 400, fontSize: 13, color: '#94a3b8' }}>({jobs.length})</Typography>}
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: ui.muted }}>
                                Each job can contain one or more assigned tasks.
                            </Typography>
                        </Box>
                        <Button
                            size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setShowJobForm(!showJobForm)}
                            sx={{
                                textTransform: 'none', fontSize: 13, fontWeight: 600,
                                borderRadius: '6px', bgcolor: ui.blue, px: 2,
                                '&:hover': { bgcolor: ui.blueDark },
                                boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.12)'
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
                            templates={templates}
                            selectedTemplateId={selectedJobTemplateId}
                            onTemplateChange={handleJobTemplateChange}
                            showTemplatePicker
                            onCancel={cancelJobForm}
                            onSubmit={handleCreateJob}
                            submitLabel="Create Job"
                        />
                    )}

                    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: '8px', border: `0.8px solid ${ui.border}`, bgcolor: ui.surface }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                            <Box>
                                <Typography sx={{ fontWeight: 600, fontSize: 15, color: ui.text }}>Members ({members.length})</Typography>
                                <Typography sx={{ fontSize: 12.5, color: ui.muted }}>Add members manually. Job and task assignees are also added automatically.</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Autocomplete
                                    size="small"
                                    value={selectedMember}
                                    onChange={(_, value) => setSelectedMember(value)}
                                    options={availableMembers}
                                    isOptionEqualToValue={(option, value) => option.employeeCode === value.employeeCode}
                                    getOptionLabel={(option) => option ? `${option.name || 'Unnamed'} (${option.employeeCode})` : ''}
                                    sx={{ width: 300 }}
                                    renderInput={(params) => <TextField {...params} label="Search employee" />}
                                />
                                <FormControl size="small" sx={{ width: 120 }}>
                                    <InputLabel>Role</InputLabel>
                                    <Select value={selectedMemberRole} label="Role" onChange={(e) => setSelectedMemberRole(e.target.value)}>
                                        <MenuItem value="member">Member</MenuItem>
                                        <MenuItem value="manager">Manager</MenuItem>
                                        <MenuItem value="viewer">Viewer</MenuItem>
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained"
                                    startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
                                    onClick={handleAddMember}
                                    sx={{ textTransform: 'none', borderRadius: '6px', bgcolor: ui.blue, '&:hover': { bgcolor: ui.blueDark } }}
                                >
                                    Add Member
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<GroupRemoveIcon sx={{ fontSize: 16 }} />}
                                    onClick={handleRemoveAllMembersExceptManager}
                                    disabled={!hasRemovableMembers || loading}
                                    sx={{ textTransform: 'none', borderRadius: '6px' }}
                                >
                                    Remove All Members
                                </Button>
                            </Box>
                        </Box>

                        {members.length === 0 ? (
                            <Typography sx={{ fontSize: 13, color: ui.muted }}>No members added yet.</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {members.map(member => (
                                    <Chip
                                        key={member.employeeCode}
                                        avatar={<Avatar sx={{ bgcolor: ui.blueSoft, color: ui.blue }}>{(member.name || member.employeeCode || '?').charAt(0)}</Avatar>}
                                        label={`${member.name || member.employeeCode} - ${member.projectRole || 'member'}`}
                                        onDelete={member.projectRole === 'assignee' ? undefined : () => handleRemoveMember(member)}
                                        sx={{ borderRadius: '8px', bgcolor: ui.bg, border: `0.8px solid ${ui.border}` }}
                                    />
                                ))}
                            </Box>
                        )}
                    </Paper>

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
                            borderRadius: '8px', border: `0.8px dashed ${ui.border}`, bgcolor: ui.surface
                        }}>
                            <JobIcon sx={{ fontSize: 40, color: ui.blue, mb: 1.5 }} />
                            <Typography sx={{ color: ui.muted, fontWeight: 500 }}>No jobs yet</Typography>
                            <Typography sx={{ color: ui.muted, fontSize: 13, mt: 0.5 }}>Click "Add Job" to create the first one</Typography>
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
                                    editingJobId={editingJobId}
                                    editJob={editJob}
                                    setEditJob={setEditJob}
                                    onStartEditJob={(job) => {
                                        setEditingJobId(job.id);
                                        setEditJob(formFromActivity(job));
                                    }}
                                    onCancelEditJob={() => {
                                        setEditingJobId(null);
                                        setEditJob(emptyWorkItem);
                                    }}
                                    onUpdateJob={(jobId) => handleUpdateActivity(jobId, editJob, 'Job updated successfully')}
                                    onDeleteJob={(job) => handleDeleteActivity(job, 'job')}
                                    editingTaskId={editingTaskId}
                                    editTask={editTask}
                                    setEditTask={setEditTask}
                                    onStartEditTask={(task) => {
                                        setEditingTaskId(task.id);
                                        setEditTask(formFromActivity(task));
                                    }}
                                    onCancelEditTask={() => {
                                        setEditingTaskId(null);
                                        setEditTask(emptyWorkItem);
                                    }}
                                    onUpdateTask={(taskId) => handleUpdateActivity(taskId, editTask, 'Task updated successfully')}
                                    onDeleteTask={(task) => handleDeleteActivity(task, 'task')}
                                    onReviewTask={handleReviewActivity}
                                />
                            ))}
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1.5, borderTop: `0.8px solid ${ui.border}`, bgcolor: ui.surface }}>
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
