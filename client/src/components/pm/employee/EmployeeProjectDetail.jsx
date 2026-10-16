import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Grid,
    Stack,
    Card,
    CardContent,
    LinearProgress,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Snackbar,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Collapse,
    Menu,
    MenuItem,
    Tabs,
    Tab
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Assignment as TaskIcon,
    AccessTime as TimeIcon,
    EditNote as EditNoteIcon,
    CheckCircle as CompleteIcon,
    MoreVert as MoreIcon,
    Schedule as ScheduleIcon,
    CloudUpload as UploadIcon,
    AttachFile as AttachFileIcon,
    Image as ImageIcon,
    PictureAsPdf as PdfIcon,
    Description as DocIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    Close as CloseIcon,
    Add as AddIcon,
    Work as JobIcon,
    ExpandLess as CollapseIcon,
    ExpandMore as ExpandIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { FaHourglassHalf, FaClock, FaCalendarAlt } from 'react-icons/fa';
import { MdOutlineHourglassBottom, MdOutlineAccessTimeFilled } from 'react-icons/md';
import axios from 'axios';
import TaskTimeLogger from './TaskTimeLogger';

// OMOTEC Design System Colors
const colors = {
    gray: {
        25: '#FCFCFD',
        50: '#F9FAFB',
        100: '#F2F4F7',
        200: '#E4E7F0',
        300: '#D0D5DD',
        400: '#98A2B3',
        500: '#667085',
        600: '#475467',
        700: '#344054',
        800: '#23272F',
        900: '#101828'
    },
    primary: {
        25: '#F5FAFF',
        50: '#EDF5FF',
        100: '#D1E6FF',
        200: '#B3D5FF',
        300: '#84BCFF',
        400: '#4F96FF',
        500: '#0070F0',
        600: '#005AD6',
        700: '#0056B8',
        800: '#00438F',
        900: '#003068'
    },
    success: {
        25: '#F6FEF9',
        50: '#ECFDF3',
        100: '#D1FADF',
        200: '#A6F4C5',
        300: '#6CE9A6',
        400: '#32D583',
        500: '#12B76A',
        600: '#039855',
        700: '#027A48',
        800: '#05603A',
        900: '#054F31'
    },
    warning: {
        25: '#FFFCF5',
        50: '#FFFAEB',
        100: '#FEF0C7',
        200: '#FEDF89',
        300: '#FEC84B',
        400: '#FDB022',
        500: '#F79009',
        600: '#DC6803',
        700: '#B54708',
        800: '#93370D',
        900: '#7A2E0E'
    },
    error: {
        25: '#FFFBFA',
        50: '#FFF5F2',
        100: '#FFEAE2',
        200: '#FED5CA',
        300: '#FFB299',
        400: '#FF7F50',
        500: '#F04438',
        600: '#D92D20',
        700: '#B42318',
        800: '#912018',
        900: '#7A271A'
    },
    saturated: {
        25: '#F5F3FF',
        50: '#E0DBFF',
        100: '#C2B6FF',
        200: '#AD9BFF',
        300: '#9074FF',
        400: '#6B4EE0',
        500: '#5220BE',
        600: '#4B1FA7',
        700: '#43078A',
        800: '#3B006E',
        900: '#280052'
    }
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getWorkItemTypeLabel = (item) => {
    if (item?.hierarchy_level === 'job') return 'JOB';
    if (item?.hierarchy_level === 'subtask') return 'SUBTASK';
    return 'TASK';
};

const getWorkItemTypeHelp = (item) => {
    if (item?.hierarchy_level === 'job') return 'Job is a container/group of tasks. Time should be logged on tasks or subtasks.';
    if (item?.hierarchy_level === 'subtask') return 'Subtask is a smaller part of a task.';
    return 'Task is executable work where time can be logged.';
};

const getWorkItemTypeColor = (item) => {
    if (item?.hierarchy_level === 'job') return '#0070F0';
    if (item?.hierarchy_level === 'subtask') return '#5220BE';
    return '#12B76A';
};

const getTaskTimeEntries = (item) => {
    if (Array.isArray(item?.timeEntries)) return item.timeEntries;
    if (typeof item?.timeEntries === 'string') {
        try {
            const parsed = JSON.parse(item.timeEntries);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const hasTaskLoggedTime = (item) =>
    getTaskTimeEntries(item).length > 0 || Number(item?.actual_hours_new || item?.actual_hours || 0) > 0;

const isTaskMarkedComplete = (item) => Boolean(item?.completedAt);

const isTaskSubmittedOrClosed = (item) =>
    ['submitted', 'completed', 'approved'].includes(item?.status);

const canLogTaskTime = (item) =>
    item?.hierarchy_level !== 'job' &&
    !item?.viewOnlyForLead &&
    !isTaskMarkedComplete(item) &&
    !isTaskSubmittedOrClosed(item);

const canMarkTaskComplete = (item) =>
    canLogTaskTime(item) &&
    hasTaskLoggedTime(item);

const canSubmitTaskForReview = (item) =>
    item?.hierarchy_level !== 'job' &&
    !item?.viewOnlyForLead &&
    isTaskMarkedComplete(item) &&
    !isTaskSubmittedOrClosed(item);

// OMOTEC Card Style
const getCardStyle = (isDarkMode) => ({
    background: isDarkMode ? '#23272F' : '#ffffff',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(16,24,40,0.08)',
    borderRadius: '24px',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : colors.gray[200]}`,
    transition: 'all 0.2s ease',
    '&:hover': {
        boxShadow: 'var(--omotec-shadow-md)'
    }
});

// OMOTEC Paper Style
const getPaperStyle = (isDarkMode) => ({
    background: isDarkMode ? '#23272F' : '#ffffff',
    boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(16,24,40,0.08)',
    borderRadius: '24px',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : colors.gray[200]}`
});

// Tab Panel Component
const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index} style={{ padding: 'var(--omotec-space-4) 0' }}>
        {value === index && children}
    </div>
);

const EmployeeProjectDetail = ({ projectId, onBack, onTimeLogSaved }) => {
    console.log('🔵 EmployeeProjectDetail RENDERED with projectId:', projectId);
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const textPrimary = isDarkMode ? '#F9FAFB' : colors.gray[900];
    const textSecondary = isDarkMode ? '#D0D5DD' : colors.gray[500];
    const textStrong = isDarkMode ? '#F2F4F7' : colors.gray[700];
    const innerSurface = isDarkMode ? '#111827' : colors.gray[50];
    const buttonSurface = isDarkMode ? '#111827' : '#fff';
    const buttonBorder = isDarkMode ? 'rgba(255,255,255,0.16)' : colors.gray[300];
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loggerOpen, setLoggerOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [noteDialogOpen, setNoteDialogOpen] = useState(false);
    const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
    const [currentTaskForNote, setCurrentTaskForNote] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [extensionData, setExtensionData] = useState({ new_deadline: '', reason: '' });
    const [expandedTasks, setExpandedTasks] = useState({});
    const [expandedJobs, setExpandedJobs] = useState({});
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedTaskForMenu, setSelectedTaskForMenu] = useState(null);
    const [canCreateSubtasks, setCanCreateSubtasks] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [subtaskParentId, setSubtaskParentId] = useState(null);
    const [subtaskForm, setSubtaskForm] = useState({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        estimated_hours: '',
        priority_id: '',
        status_id: ''
    });

    // File upload states
    const [uploadTabValue, setUploadTabValue] = useState(0);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [projectFiles, setProjectFiles] = useState([]);
    const [taskFiles, setTaskFiles] = useState({});
    const [selectedTaskForUpload, setSelectedTaskForUpload] = useState(null);
    const fileInputRef = useRef(null);

    // File viewer dialog
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingFile, setViewingFile] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchProjectTasks();
            fetchProjectFiles();
            fetchTeamLeadOptions();
        }
    }, [projectId]);

    const fetchTeamLeadOptions = async () => {
        try {
            const [membersRes, prioritiesRes, statusesRes] = await Promise.all([
                axios.get(`${apiBaseUrl}/api/employee/team-members`, { withCredentials: true }),
                axios.get(`${apiBaseUrl}/api/priorities`, { withCredentials: true }),
                axios.get(`${apiBaseUrl}/api/statuses`, { withCredentials: true })
            ]);
            if (membersRes.data.success) {
                setCanCreateSubtasks(true);
                setTeamMembers(membersRes.data.members || []);
            }
            if (prioritiesRes.data.success) setPriorities(prioritiesRes.data.priorities || []);
            if (statusesRes.data.success) setStatuses(statusesRes.data.statuses || []);
        } catch (error) {
            setCanCreateSubtasks(false);
            console.error('Error fetching Team Lead options:', error);
        }
    };

    const fetchProjectTasks = async () => {
        setLoading(true);
        try {
            console.log('Fetching tasks for project:', projectId);

            const response = await axios.get(`${apiBaseUrl}/api/employee/projects/${projectId}/tasks`, {
                withCredentials: true
            });

            console.log('API Response:', response.data);

            if (response.data.success) {
                const tasksData = response.data.tasks || [];

                // Map the data to ensure consistent field names
                const mappedTasks = tasksData.map(task => ({
                    ...task,
                    due_date: task.dueDate || task.due_date,  // Handle both naming conventions
                    estimated_hours: task.estimated_hours_new || task.estimated_hours,
                    actual_hours: task.actual_hours_new || task.actual_hours,
                    completion_percentage: task.completion_percentage_new || task.completion_percentage
                }));

                const projectData = response.data.project || {
                    id: projectId,
                    name: `Project ${projectId}`,
                    progress: 0,
                    userRole: 'member'
                };

                setProject(projectData);
                setTasks(mappedTasks);

                console.log(`Loaded ${mappedTasks.length} tasks for project ${projectId}`);
            } else {
                showSnackbar('Failed to load tasks', 'error');
            }
        } catch (error) {
            console.error('Error fetching project tasks:', error);
            showSnackbar('Failed to load tasks', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectFiles = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/projects/${projectId}/files`, {
                withCredentials: true
            });
            if (response.data.success) {
                setProjectFiles(response.data.files || []);
            }
        } catch (error) {
            console.error('Error fetching project files:', error);
        }
    };

    const fetchTaskFiles = async (taskId) => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/tasks/${taskId}/files`, {
                withCredentials: true
            });
            if (response.data.success) {
                setTaskFiles(prev => ({ ...prev, [taskId]: response.data.files || [] }));
            }
        } catch (error) {
            console.error('Error fetching task files:', error);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showSnackbar('File size must be less than 10MB', 'error');
            return;
        }

        setSelectedFile(file);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    const handleUploadFile = async () => {
        if (!selectedFile) {
            showSnackbar('Please select a file', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('entity_type', uploadTabValue === 0 ? 'project' : 'task');
        if (uploadTabValue === 1 && selectedTaskForUpload) {
            formData.append('entity_id', selectedTaskForUpload.id);
        }

        try {
            const url = uploadTabValue === 0
                ? `${apiBaseUrl}/api/projects/${projectId}/upload`
                : `${apiBaseUrl}/api/tasks/${selectedTaskForUpload?.id}/upload`;

            const response = await axios.post(url, formData, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                showSnackbar('File uploaded successfully!', 'success');
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setFilePreview(null);
                fetchProjectFiles();
                if (selectedTaskForUpload) {
                    fetchTaskFiles(selectedTaskForUpload.id);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            showSnackbar(error.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (fileId, entityType, entityId) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const response = await axios.delete(`${apiBaseUrl}/api/files/${fileId}`, {
                withCredentials: true
            });
            if (response.data.success) {
                showSnackbar('File deleted successfully', 'success');
                fetchProjectFiles();
                if (entityType === 'task' && entityId) {
                    fetchTaskFiles(entityId);
                }
            }
        } catch (error) {
            console.error('Delete error:', error);
            showSnackbar('Failed to delete file', 'error');
        }
    };

    const handleDownloadFile = async (file) => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/files/${file.id}/download`, {
                withCredentials: true,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.original_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            showSnackbar('Failed to download file', 'error');
        }
    };

    const handleViewFile = (file) => {
        setViewingFile(file);
        setViewerOpen(true);
    };

    const getFileIcon = (mimeType) => {
        if (mimeType.startsWith('image/')) return <ImageIcon sx={{ color: colors.primary[500] }} />;
        if (mimeType === 'application/pdf') return <PdfIcon sx={{ color: colors.error[500] }} />;
        return <DocIcon sx={{ color: colors.gray[500] }} />;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleLogTime = (task) => {
        setSelectedTask(task);
        setLoggerOpen(true);
    };

    const handleTaskUpdate = () => fetchProjectTasks();

    const resetSubtaskForm = () => {
        setSubtaskParentId(null);
        setSubtaskForm({
            title: '',
            description: '',
            assigned_to: '',
            due_date: '',
            estimated_hours: '',
            priority_id: '',
            status_id: ''
        });
    };

    const handleCreateSubtask = async () => {
        if (!subtaskParentId) return;
        if (!subtaskForm.title || !subtaskForm.assigned_to) {
            showSnackbar('Subtask title and assignee are required', 'error');
            return;
        }

        try {
            const response = await axios.post(
                `${apiBaseUrl}/api/employee/tasks/${subtaskParentId}/subtasks`,
                subtaskForm,
                { withCredentials: true }
            );
            if (response.data.success) {
                showSnackbar('Subtask created successfully', 'success');
                resetSubtaskForm();
                fetchProjectTasks();
            }
        } catch (error) {
            console.error('Error creating subtask:', error);
            showSnackbar(error.response?.data?.error || 'Failed to create subtask', 'error');
        }
    };

    const handleAddNote = (task) => {
        setCurrentTaskForNote(task);
        setNoteText(task.comment || '');
        setNoteDialogOpen(true);
    };

    const handleSaveNote = async () => {
        if (!currentTaskForNote) return;
        try {
            await axios.put(`${apiBaseUrl}/api/employee/tasks/${currentTaskForNote.id}/note`, { note: noteText }, { withCredentials: true });
            showSnackbar('Note saved successfully', 'success');
            setNoteDialogOpen(false);
            fetchProjectTasks();
        } catch (error) {
            console.error('Error saving note:', error);
            showSnackbar('Failed to save note', 'error');
        }
    };

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            const response = await axios.put(`${apiBaseUrl}/api/employee/tasks/${taskId}/status`, { status: newStatus }, { withCredentials: true });
            showSnackbar(response.data?.message || `Task marked as ${newStatus}`, 'success');
            fetchProjectTasks();
        } catch (error) {
            console.error('Error updating status:', error);
            showSnackbar('Failed to update status', 'error');
        }
    };

    const handleRequestExtension = async () => {
        if (!selectedTaskForMenu) return;
        if (!extensionData.new_deadline) {
            showSnackbar('Please select a new deadline', 'error');
            return;
        }
        try {
            await axios.post(`${apiBaseUrl}/api/employee/tasks/${selectedTaskForMenu.id}/request-extension`, extensionData, { withCredentials: true });
            showSnackbar('Extension request submitted. Manager will review.', 'success');
            setExtensionDialogOpen(false);
            setExtensionData({ new_deadline: '', reason: '' });
            setSelectedTaskForMenu(null);
            fetchProjectTasks();
        } catch (error) {
            console.error('Error requesting extension:', error);
            showSnackbar('Failed to request extension', 'error');
        }
    };

    const toggleTaskExpand = (taskId) => {
        setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    const toggleJobExpand = (jobId) => {
        setExpandedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    };

    const getStatusColor = (status) => {
        const statusColors = {
            pending: colors.warning[500],
            accepted: colors.primary[500],
            'in-progress': colors.success[500],
            submitted: colors.saturated[500],
            completed: colors.success[700],
            rejected: colors.error[500],
            needs_changes: colors.error[500]
        };
        return statusColors[status] || colors.gray[500];
    };

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Pending',
            accepted: 'Accepted',
            'in-progress': 'In Progress',
            submitted: 'Awaiting Review',
            completed: 'Completed',
            rejected: 'Rejected',
            needs_changes: 'Redo Requested'
        };
        return labels[status] || status;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getProgressColor = (task) => {
        if (task.status === 'completed') return colors.success[600];
        if (task.status === 'submitted') return colors.saturated[500];
        if (task.status === 'needs_changes') return colors.error[500];
        return colors.success[500];
    };

    const isOverdue = (dueDate) => {
        if (!dueDate) return false;
        const date = new Date(dueDate);
        if (isNaN(date.getTime())) return false;
        return date < new Date();
    };

    const executableTasks = tasks.filter((task) => task.hierarchy_level !== 'job' && !task.viewOnlyForLead);
    const jobCount = tasks.filter((task) => task.hierarchy_level === 'job').length;
    const jobs = tasks.filter((task) => task.hierarchy_level === 'job');
    const jobIds = new Set(jobs.map((job) => job.id));
    const tasksByJobId = tasks
        .filter((task) => task.hierarchy_level !== 'job')
        .reduce((groups, task) => {
            const parentJobId = task.job_id || task.parent_activity_id;
            if (parentJobId && jobIds.has(parentJobId)) {
                if (!groups[parentJobId]) groups[parentJobId] = [];
                groups[parentJobId].push(task);
            }
            return groups;
        }, {});
    const standaloneTasks = tasks.filter((task) => {
        if (task.hierarchy_level === 'job') return false;
        const parentJobId = task.job_id || task.parent_activity_id;
        return !parentJobId || !jobIds.has(parentJobId);
    });
    const displayItems = [
        ...jobs.flatMap((job) => {
            const items = [{ type: 'job', item: job, childCount: (tasksByJobId[job.id] || []).length }];
            if (expandedJobs[job.id]) {
                items.push(...(tasksByJobId[job.id] || []).map((task, nestedIndex) => ({
                    type: 'task',
                    item: task,
                    nested: true,
                    nestedIndex,
                    parentJob: job
                })));
            }
            return items;
        }),
        ...standaloneTasks.map((task) => ({ type: 'task', item: task, nested: false })),
    ];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!project) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography sx={{ fontSize: '24px', fontWeight: 600, color: colors.error[500] }}>Project not found</Typography>
                <Button
                    variant="contained"
                    onClick={() => onBack && onBack()}
                    sx={{ mt: 2, textTransform: 'none', borderRadius: 'var(--omotec-radius-lg)' }}
                >
                    Back to Projects
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: isDarkMode ? '#101828' : 'transparent', minHeight: '100%', color: textPrimary }}>
            {/* Back Button and Upload Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Button
                    startIcon={<BackIcon />}
                    onClick={() => onBack && onBack()}
                    sx={{
                        textTransform: 'none',
                        color: textSecondary,
                        '&:hover': { color: colors.primary[500], backgroundColor: 'transparent' }
                    }}
                >
                    Back to Projects
                </Button>
                <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{
                        textTransform: 'none',
                        borderRadius: 'var(--omotec-radius-lg)',
                        backgroundColor: colors.primary[500],
                        '&:hover': { backgroundColor: colors.primary[600] }
                    }}
                >
                    Upload File
                </Button>
            </Box>

            {/* Project Header */}
            <Paper elevation={0} sx={getPaperStyle(isDarkMode)}>
                <Box sx={{ p: 3 }}>
                    <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary, mb: 1 }}>
                        {project.name}
                    </Typography>
                    {project.description && (
                        <Typography sx={{ fontSize: '14px', color: textSecondary, mb: 2 }}>
                            {project.description}
                        </Typography>
                    )}

                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <Typography sx={{ fontSize: '12px', color: textSecondary, mb: 0.5 }}>Timeline</Typography>
                            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: textStrong }}>
                                {formatDate(project.start_date)} - {formatDate(project.end_date)}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <Typography sx={{ fontSize: '12px', color: colors.gray[500], mb: 0.5 }}>Progress</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={project.progress || 0}
                                    sx={{
                                        flex: 1,
                                        height: 6,
                                        borderRadius: 'var(--omotec-radius-full)',
                                        backgroundColor: isDarkMode ? '#374151' : colors.gray[100],
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: colors.primary[500],
                                            borderRadius: 'var(--omotec-radius-full)'
                                        }
                                    }}
                                />
                                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: textStrong }}>
                                    {project.progress || 0}%
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <Typography sx={{ fontSize: '12px', color: textSecondary, mb: 0.5 }}>Manager</Typography>
                            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: textStrong }}>
                                {project.projectManager?.name || 'Not assigned'}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <Typography sx={{ fontSize: '12px', color: textSecondary, mb: 0.5 }}>Your Role</Typography>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: colors.primary[500] }}>
                                {project.userRole || 'Member'}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            {/* Project Files Section */}
            {projectFiles.length > 0 && (
                <Paper elevation={0} sx={{ ...getPaperStyle(isDarkMode), p: 3, mt: 3 }}>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, mb: 2 }}>
                        Project Files
                    </Typography>
                    <Grid container spacing={1}>
                        {projectFiles.map((file) => (
                            <Grid key={file.id} size={{ xs: 6, sm: 4, md: 3 }}>
                                <Paper
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        backgroundColor: innerSurface,
                                        border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : colors.gray[200]}`,
                                        borderRadius: 'var(--omotec-radius-lg)',
                                        '&:hover': { borderColor: colors.primary[300] }
                                    }}
                                    onClick={() => handleViewFile(file)}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {getFileIcon(file.mime_type)}
                                        <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '12px', color: textSecondary }}>
                                            {file.original_name}
                                        </Typography>
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDownloadFile(file); }}>
                                            <DownloadIcon fontSize="small" sx={{ color: colors.gray[400] }} />
                                        </IconButton>
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, 'project', projectId); }}>
                                            <DeleteIcon fontSize="small" sx={{ color: colors.error[400] }} />
                                        </IconButton>
                                    </Box>
                                    <Typography sx={{ fontSize: '10px', color: colors.gray[400], display: 'block', mt: 0.5 }}>
                                        {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Tasks Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, mb: 3 }}>
                <Box>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary }}>
                        My Tasks/Subtasks ({executableTasks.length})
                    </Typography>
                    {jobCount > 0 && (
                        <Typography sx={{ fontSize: '12px', color: textSecondary, mt: 0.25 }}>
                            {jobCount} job{jobCount === 1 ? '' : 's'} shown as grouping/context, not counted as tasks.
                        </Typography>
                    )}
                </Box>
            </Box>

            {tasks.length === 0 ? (
                <Paper elevation={0} sx={{ ...getPaperStyle(isDarkMode), p: 4, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '14px', color: textSecondary }}>
                        No tasks assigned to you in this project yet.
                    </Typography>
                </Paper>
            ) : (
                <Stack spacing={2.25}>
                    {displayItems.map(({ type, item: task, nested = false, nestedIndex = 0, parentJob = null, childCount = 0 }) => (
                        <React.Fragment key={`${type}-${task.id}`}>
                            <Card
                                elevation={0}
                                sx={{
                                    ...getCardStyle(isDarkMode, isOverdue(task.dueDate) && task.status !== 'completed'),
                                    ml: nested ? { xs: '56px !important', md: '56px !important' } : 0,
                                    mr: nested ? { xs: '18px !important', md: '18px !important' } : 0,
                                    width: nested ? { xs: 'calc(100% - 74px)', md: 'calc(100% - 65px)' } : '100%',
                                    mt: nested && nestedIndex === 0 ? -1 : 0,
                                    position: 'relative',
                                    borderLeft: nested
                                        ? `8px solid ${colors.primary[500]}`
                                        : task.hierarchy_level === 'job'
                                            ? `4px solid ${colors.primary[500]}`
                                            : undefined,
                                    bgcolor: nested
                                        ? (isDarkMode ? '#0F172A' : '#F8FBFF')
                                        : undefined,
                                    boxShadow: nested
                                        ? (isDarkMode ? 'none' : '0px 1px 2px rgba(0,112,240,0.08)')
                                        : undefined,
                                    '&::before': nested ? {
                                        content: '""',
                                        position: 'absolute',
                                        left: { xs: -56, md: -96 },
                                        top: 24,
                                        width: { xs: 56, md: 96 },
                                        borderTop: `3px solid ${colors.primary[500]}`,
                                    } : undefined
                                }}
                            >
                            <CardContent sx={{ p: 3, pl: nested ? { xs: 3.5, md: 4 } : 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            alignItems="center"
                                            onClick={task.hierarchy_level === 'job' ? () => toggleJobExpand(task.id) : undefined}
                                            sx={{
                                                mb: 1,
                                                flexWrap: 'wrap',
                                                gap: 1,
                                                cursor: task.hierarchy_level === 'job' ? 'pointer' : 'default'
                                            }}
                                        >
                                            {task.hierarchy_level === 'job' ? (
                                                <JobIcon sx={{ color: getWorkItemTypeColor(task), fontSize: 18 }} />
                                            ) : (
                                                <TaskIcon sx={{ color: getWorkItemTypeColor(task), fontSize: 18 }} />
                                            )}
                                            {nested && (
                                                <Chip
                                                    label={`Task ${nestedIndex + 1}`}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        bgcolor: isDarkMode ? 'rgba(18,183,106,0.16)' : colors.success[25],
                                                        color: colors.success[600],
                                                        border: `1px solid ${colors.success[500]}33`
                                                    }}
                                                />
                                            )}
                                            <Tooltip title={getWorkItemTypeHelp(task)}>
                                                <Chip
                                                    label={getWorkItemTypeLabel(task)}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        bgcolor: `${getWorkItemTypeColor(task)}18`,
                                                        color: getWorkItemTypeColor(task),
                                                        border: `1px solid ${getWorkItemTypeColor(task)}44`
                                                    }}
                                                />
                                            </Tooltip>
                                            {task.hierarchy_level === 'job' && (
                                                <>
                                                    <Chip
                                                        label={`${childCount} task${childCount === 1 ? '' : 's'}`}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : colors.primary[25],
                                                            color: textStrong,
                                                            border: `1px solid ${buttonBorder}`
                                                        }}
                                                    />
                                                    <Tooltip title={expandedJobs[task.id] ? 'Close job' : 'Open job'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                toggleJobExpand(task.id);
                                                            }}
                                                            sx={{
                                                                width: 28,
                                                                height: 28,
                                                                border: `0.8px solid ${buttonBorder}`,
                                                                color: colors.primary[500],
                                                                bgcolor: buttonSurface,
                                                                '&:hover': { bgcolor: isDarkMode ? 'rgba(0,112,240,0.12)' : colors.primary[25] }
                                                            }}
                                                        >
                                                            {expandedJobs[task.id] ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary }}>
                                                {task.title}
                                            </Typography>
                                            {task.assignedTo?.name && (
                                                <Chip
                                                    label={`Assigned: ${task.assignedTo.name}`}
                                                    size="small"
                                                    sx={{
                                                        height: 24,
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : colors.gray[100],
                                                        color: textStrong,
                                                        border: `1px solid ${buttonBorder}`
                                                    }}
                                                />
                                            )}
                                            {task.viewOnlyForLead && (
                                                <Chip
                                                    label="View only"
                                                    size="small"
                                                    sx={{
                                                        height: 24,
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        bgcolor: isDarkMode ? 'rgba(0,112,240,0.14)' : colors.primary[25],
                                                        color: colors.primary[600],
                                                        border: `1px solid ${colors.primary[200]}`
                                                    }}
                                                />
                                            )}
                                            <Chip
                                                label={getStatusLabel(task.status)}
                                                size="small"
                                                sx={{
                                                    backgroundColor: getStatusColor(task.status),
                                                    color: '#fff',
                                                    height: 24,
                                                    fontSize: '11px',
                                                    fontWeight: 500
                                                }}
                                            />
                                            {task.priorityDef && (
                                                <Chip
                                                    label={task.priorityDef.name}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: task.priorityDef.color,
                                                        color: '#fff',
                                                        height: 24,
                                                        fontSize: '11px',
                                                        fontWeight: 500
                                                    }}
                                                />
                                            )}
                                            {isOverdue(task.dueDate) && task.status !== 'completed' && (
                                                <Chip
                                                    label="Overdue"
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: colors.error[500],
                                                        color: '#fff',
                                                        height: 24,
                                                        fontSize: '11px',
                                                        fontWeight: 500
                                                    }}
                                                />
                                            )}
                                        </Stack>

                                        {task.description && (
                                            <Box sx={{ mb: 1 }}>
                                                <Typography sx={{
                                                    fontSize: '13px',
                                                    color: textSecondary,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: expandedTasks[task.id] ? 'unset' : 1,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}>
                                                    {task.description}
                                                </Typography>
                                                {task.description.length > 100 && (
                                                    <Button
                                                        size="small"
                                                        onClick={() => toggleTaskExpand(task.id)}
                                                        sx={{
                                                            textTransform: 'none',
                                                            mt: 0.5,
                                                            p: 0,
                                                            minWidth: 'auto',
                                                            fontSize: '12px',
                                                            color: colors.primary[500]
                                                        }}
                                                    >
                                                        {expandedTasks[task.id] ? 'Show less' : 'Show more'}
                                                    </Button>
                                                )}
                                            </Box>
                                        )}

                                        {/* Task Details Row */}
                                        <Stack direction="row" spacing={3} sx={{ mt: 1, flexWrap: 'wrap', gap: 2 }}>
                                                <Tooltip title="Due Date">
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <FaCalendarAlt style={{ fontSize: 14, color: theme.palette.text.secondary }} />
                                                    <Typography variant="caption" color={isOverdue(task.due_date) && task.status !== 'completed' ? 'error.main' : 'text.secondary'}>
                                                        {formatDate(task.due_date)}
                                                    </Typography>
                                                </Stack>
                                            </Tooltip>
                                            <Tooltip title="Estimated Hours">
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <FaHourglassHalf style={{ fontSize: 14, color: colors.gray[400] }} />
                                                    <Typography sx={{ fontSize: '12px', color: textSecondary }}>
                                                        Est: {task.estimated_hours_new || 0}h
                                                    </Typography>
                                                </Stack>
                                            </Tooltip>
                                            <Tooltip title="Actual Hours Logged">
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <MdOutlineHourglassBottom style={{ fontSize: 14, color: colors.gray[400] }} />
                                                    <Typography sx={{ fontSize: '12px', color: textSecondary }}>
                                                        Logged: {task.actual_hours_new || 0}h
                                                    </Typography>
                                                </Stack>
                                            </Tooltip>
                                        </Stack>

                                        {/* Progress Bar */}
                                        <Box sx={{ mt: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography sx={{ fontSize: '11px', color: textSecondary }}>Completion Progress</Typography>
                                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textStrong }}>
                                                    {task.completion_percentage_new || 0}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={task.completion_percentage_new || 0}
                                                sx={{
                                                    height: 4,
                                                    borderRadius: 'var(--omotec-radius-full)',
                                                    backgroundColor: isDarkMode ? '#374151' : colors.gray[100],
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: getProgressColor(task),
                                                        borderRadius: 'var(--omotec-radius-full)'
                                                    }
                                                }}
                                            />
                                        </Box>

                                        {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                                            <Box sx={{ mt: 2, p: 1.5, borderRadius: '8px', bgcolor: innerSurface, border: `0.8px solid ${buttonBorder}` }}>
                                                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: textStrong, mb: 1 }}>
                                                    Subtasks assigned to team
                                                </Typography>
                                                <Stack spacing={1}>
                                                    {task.subtasks.map((subtask) => (
                                                        <Box
                                                            key={subtask.id}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                flexWrap: 'wrap',
                                                                p: 1,
                                                                borderRadius: '6px',
                                                                bgcolor: isDarkMode ? '#23272F' : '#fff',
                                                                border: `0.8px solid ${buttonBorder}`
                                                            }}
                                                        >
                                                            <TaskIcon sx={{ fontSize: 15, color: colors.primary[500] }} />
                                                            <Typography sx={{ flex: 1, minWidth: 180, fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                                                                {subtask.title}
                                                            </Typography>
                                                            {subtask.assignedTo?.name && (
                                                                <Chip label={subtask.assignedTo.name} size="small" sx={{ height: 24, fontSize: '11px' }} />
                                                            )}
                                                            <Chip
                                                                label={getStatusLabel(subtask.status)}
                                                                size="small"
                                                                sx={{ height: 24, fontSize: '11px', bgcolor: getStatusColor(subtask.status), color: '#fff' }}
                                                            />
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}

                                        {canCreateSubtasks && subtaskParentId === task.id && (
                                            <Box sx={{ mt: 2, p: 2, borderRadius: '8px', bgcolor: innerSurface, border: `0.8px solid ${buttonBorder}` }}>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: textStrong, mb: 1.5 }}>
                                                    New Subtask
                                                </Typography>
                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                                                    <TextField
                                                        size="small"
                                                        label="Title *"
                                                        value={subtaskForm.title}
                                                        onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                                                    />
                                                    <TextField
                                                        select
                                                        size="small"
                                                        label="Assign To *"
                                                        value={subtaskForm.assigned_to}
                                                        onChange={(e) => setSubtaskForm({ ...subtaskForm, assigned_to: e.target.value })}
                                                    >
                                                        {teamMembers.map((member) => (
                                                            <MenuItem key={member.employeeCode} value={member.employeeCode}>
                                                                {member.name} ({member.employeeCode})
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                    <TextField
                                                        size="small"
                                                        label="Due Date"
                                                        type="date"
                                                        value={subtaskForm.due_date}
                                                        onChange={(e) => setSubtaskForm({ ...subtaskForm, due_date: e.target.value })}
                                                        InputLabelProps={{ shrink: true }}
                                                    />
                                                    <TextField
                                                        size="small"
                                                        label="Est. Hours"
                                                        type="number"
                                                        value={subtaskForm.estimated_hours}
                                                        onChange={(e) => setSubtaskForm({ ...subtaskForm, estimated_hours: e.target.value })}
                                                    />
                                                    <TextField
                                                        select
                                                        size="small"
                                                        label="Priority"
                                                        value={subtaskForm.priority_id}
                                                        onChange={(e) => setSubtaskForm({ ...subtaskForm, priority_id: e.target.value })}
                                                    >
                                                        {priorities.map((priority) => (
                                                            <MenuItem key={priority.id} value={priority.id}>{priority.name}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        label="Status"
                                                        value={subtaskForm.status_id}
                                                        onChange={(e) => setSubtaskForm({ ...subtaskForm, status_id: e.target.value })}
                                                    >
                                                        {statuses.map((status) => (
                                                            <MenuItem key={status.id} value={status.id}>{status.name}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                </Box>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={2}
                                                    label="Description"
                                                    value={subtaskForm.description}
                                                    onChange={(e) => setSubtaskForm({ ...subtaskForm, description: e.target.value.slice(0, 250) })}
                                                    inputProps={{ maxLength: 250 }}
                                                    helperText={`${subtaskForm.description.length}/250`}
                                                    sx={{ mt: 1.5 }}
                                                />
                                                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                                                    <Button size="small" onClick={resetSubtaskForm} sx={{ textTransform: 'none', color: textSecondary }}>
                                                        Cancel
                                                    </Button>
                                                    <Button size="small" variant="contained" onClick={handleCreateSubtask} sx={{ textTransform: 'none' }}>
                                                        Create Subtask
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        )}

                                        {/* Note Display */}
                                        {task.comment && (
                                            <Typography sx={{
                                                fontSize: '11px',
                                                display: 'block',
                                                mt: 1,
                                                fontStyle: 'italic',
                                                color: textSecondary,
                                                backgroundColor: innerSurface,
                                                p: 1,
                                                borderRadius: 'var(--omotec-radius-md)'
                                            }}>
                                                <strong>Note:</strong> {task.comment}
                                            </Typography>
                                        )}

                                        {/* Task Files Section */}
                                        {!task.viewOnlyForLead && (
                                            <Button
                                                size="small"
                                                startIcon={<AttachFileIcon />}
                                                onClick={() => {
                                                    setSelectedTaskForUpload(task);
                                                    fetchTaskFiles(task.id);
                                                    setUploadTabValue(1);
                                                    setUploadDialogOpen(true);
                                                }}
                                                sx={{
                                                    mt: 1,
                                                    textTransform: 'none',
                                                    fontSize: '12px',
                                                    color: textSecondary
                                                }}
                                            >
                                                Manage Attachments
                                            </Button>
                                        )}
                                    </Box>

                                    {/* Action Buttons */}
                                    {!task.viewOnlyForLead && (
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' }, minWidth: { md: 360 } }}>
                                        {canCreateSubtasks && task.hierarchy_level !== 'subtask' && !task.viewOnlyForLead && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                                                onClick={() => setSubtaskParentId(subtaskParentId === task.id ? null : task.id)}
                                                sx={{
                                                    textTransform: 'none',
                                                    borderRadius: '6px',
                                                    borderColor: buttonBorder,
                                                    color: textStrong,
                                                    bgcolor: buttonSurface,
                                                    fontWeight: 600,
                                                    '&:hover': { borderColor: colors.primary[500], color: colors.primary[500], bgcolor: isDarkMode ? 'rgba(0,112,240,0.12)' : colors.primary[25] }
                                                }}
                                            >
                                                Add Subtask
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<EditNoteIcon sx={{ fontSize: 17 }} />}
                                            onClick={() => handleAddNote(task)}
                                            sx={{
                                                textTransform: 'none',
                                                borderRadius: '6px',
                                                borderColor: buttonBorder,
                                                color: textStrong,
                                                bgcolor: buttonSurface,
                                                fontWeight: 600,
                                                '&:hover': { borderColor: colors.primary[500], color: colors.primary[500], bgcolor: isDarkMode ? 'rgba(0,112,240,0.12)' : colors.primary[25] }
                                            }}
                                        >
                                            Add Note
                                        </Button>
                                        {task.hierarchy_level !== 'job' && (canLogTaskTime(task) || canMarkTaskComplete(task)) && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<FaClock style={{ fontSize: 15 }} />}
                                                onClick={() => handleLogTime(task)}
                                                sx={{
                                                    textTransform: 'none',
                                                    borderRadius: '6px',
                                                    borderColor: buttonBorder,
                                                    color: textStrong,
                                                    bgcolor: buttonSurface,
                                                    fontWeight: 600,
                                                    '&:hover': { borderColor: colors.primary[500], color: colors.primary[500], bgcolor: isDarkMode ? 'rgba(0,112,240,0.12)' : colors.primary[25] }
                                                }}
                                            >
                                                {canMarkTaskComplete(task) ? 'Mark Complete' : 'Log Time'}
                                            </Button>
                                        )}
                                        {canSubmitTaskForReview(task) && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<CompleteIcon sx={{ fontSize: 17 }} />}
                                                onClick={() => handleUpdateStatus(task.id, 'submitted')}
                                                disableElevation
                                                sx={{
                                                    textTransform: 'none',
                                                    borderRadius: '6px',
                                                    bgcolor: colors.success[500],
                                                    color: '#fff',
                                                    fontWeight: 600,
                                                    '&:hover': { bgcolor: colors.success[600] }
                                                }}
                                            >
                                                Submit for Review
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            endIcon={<MoreIcon sx={{ fontSize: 17 }} />}
                                            onClick={(e) => {
                                                setMenuAnchor(e.currentTarget);
                                                setSelectedTaskForMenu(task);
                                            }}
                                            sx={{
                                                textTransform: 'none',
                                                borderRadius: '6px',
                                                borderColor: buttonBorder,
                                                color: textStrong,
                                                bgcolor: buttonSurface,
                                                fontWeight: 600,
                                                '&:hover': { borderColor: colors.primary[500], color: colors.primary[500], bgcolor: isDarkMode ? 'rgba(0,112,240,0.12)' : colors.primary[25] }
                                            }}
                                        >
                                            More Options
                                        </Button>
                                    </Stack>
                                    )}
                                </Box>
                            </CardContent>
                            </Card>
                        </React.Fragment>
                    ))}
                </Stack>
            )}

            {/* Upload Dialog */}
            <Dialog
                open={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 'var(--omotec-radius-xl)',
                        background: isDarkMode ? colors.gray[800] : '#ffffff'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: textPrimary }}>Upload File</DialogTitle>
                <DialogContent>
                    <Tabs
                        value={uploadTabValue}
                        onChange={(e, v) => setUploadTabValue(v)}
                        sx={{
                            mb: 2,
                            '& .MuiTab-root': { textTransform: 'none' },
                            '& .Mui-selected': { color: colors.primary[500] },
                            '& .MuiTabs-indicator': { backgroundColor: colors.primary[500] }
                        }}
                    >
                        <Tab label="Project Level" />
                        <Tab label="Task Level" disabled={!selectedTaskForUpload} />
                    </Tabs>

                    <TabPanel value={uploadTabValue} index={0}>
                        <Typography sx={{ fontSize: '13px', color: textSecondary, mb: 2 }}>
                            Uploading to: <strong style={{ color: textPrimary }}>{project.name}</strong>
                        </Typography>
                    </TabPanel>

                    <TabPanel value={uploadTabValue} index={1}>
                        <Typography sx={{ fontSize: '13px', color: textSecondary, mb: 2 }}>
                            Uploading to task: <strong style={{ color: textPrimary }}>{selectedTaskForUpload?.title}</strong>
                        </Typography>
                    </TabPanel>

                    <Box sx={{ mt: 2 }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<AttachFileIcon />}
                            onClick={() => fileInputRef.current?.click()}
                            fullWidth
                            sx={{
                                mb: 2,
                                textTransform: 'none',
                                borderColor: colors.gray[300],
                                color: textSecondary,
                                borderRadius: 'var(--omotec-radius-lg)'
                            }}
                        >
                            Choose File
                        </Button>

                        {selectedFile && (
                            <Paper sx={{
                                p: 2,
                                backgroundColor: isDarkMode ? '#111827' : colors.gray[50],
                                borderRadius: 'var(--omotec-radius-lg)'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {filePreview ? (
                                        <img src={filePreview} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 'var(--omotec-radius-md)' }} />
                                    ) : (
                                        getFileIcon(selectedFile.type)
                                    )}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 500, color: textPrimary }}>{selectedFile.name}</Typography>
                                        <Typography sx={{ fontSize: '11px', color: colors.gray[400] }}>
                                            {formatFileSize(selectedFile.size)}
                                        </Typography>
                                    </Box>
                                    <IconButton size="small" onClick={() => { setSelectedFile(null); setFilePreview(null); }}>
                                        <CloseIcon sx={{ color: colors.gray[400] }} fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Paper>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setUploadDialogOpen(false)} sx={{ textTransform: 'none', color: textSecondary }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleUploadFile}
                        disabled={!selectedFile || uploading}
                        startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 'var(--omotec-radius-lg)',
                            backgroundColor: colors.primary[500],
                            '&:hover': { backgroundColor: colors.primary[600] }
                        }}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* File Viewer Dialog */}
            <Dialog
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 'var(--omotec-radius-xl)',
                        background: isDarkMode ? colors.gray[800] : '#ffffff'
                    }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 600, color: textPrimary }}>{viewingFile?.original_name}</Typography>
                        <IconButton onClick={() => setViewerOpen(false)}>
                            <CloseIcon sx={{ color: colors.gray[400] }} />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {viewingFile?.mime_type?.startsWith('image/') ? (
                        <Box sx={{ textAlign: 'center' }}>
                            <img
                                src={`${apiBaseUrl}/api/files/${viewingFile.id}/view`}
                                alt={viewingFile.original_name}
                                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--omotec-radius-lg)' }}
                            />
                        </Box>
                    ) : viewingFile?.mime_type === 'application/pdf' ? (
                        <iframe
                            src={`${apiBaseUrl}/api/files/${viewingFile.id}/view`}
                            style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 'var(--omotec-radius-lg)' }}
                            title={viewingFile.original_name}
                        />
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography sx={{ fontSize: '14px', color: textSecondary, mb: 2 }}>
                                Preview not available for this file type.
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={() => handleDownloadFile(viewingFile)}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: 'var(--omotec-radius-lg)',
                                    backgroundColor: colors.primary[500],
                                    '&:hover': { backgroundColor: colors.primary[600] }
                                }}
                            >
                                Download File
                            </Button>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Task Action Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                PaperProps={{
                    sx: {
                        borderRadius: 'var(--omotec-radius-lg)',
                        boxShadow: 'var(--omotec-shadow-md)',
                        minWidth: 160
                    }
                }}
            >
                <MenuItem onClick={() => {
                    setExtensionDialogOpen(true);
                    setMenuAnchor(null);
                }} sx={{ fontSize: '13px' }}>
                    <ScheduleIcon sx={{ mr: 1, fontSize: 18, color: colors.gray[500] }} />
                    Request Extension
                </MenuItem>
                <MenuItem onClick={() => {
                    if (selectedTaskForMenu) handleAddNote(selectedTaskForMenu);
                    setMenuAnchor(null);
                }} sx={{ fontSize: '13px' }}>
                    <EditNoteIcon sx={{ mr: 1, fontSize: 18, color: colors.gray[500] }} />
                    Add Note
                </MenuItem>
            </Menu>

            {/* Task Time Logger Dialog */}
            {selectedTask && (
                <TaskTimeLogger
                    open={loggerOpen}
                    onClose={() => setLoggerOpen(false)}
                    task={selectedTask}
                    onSuccess={async () => {
                        await handleTaskUpdate();
                        if (onTimeLogSaved) await onTimeLogSaved();
                    }}
                    showSnackbar={showSnackbar}
                />
            )}

            {/* Note Dialog */}
            <Dialog
                open={noteDialogOpen}
                onClose={() => setNoteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 'var(--omotec-radius-xl)',
                        background: isDarkMode ? colors.gray[800] : '#ffffff'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: textPrimary }}>Add Note to Task</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Enter your notes about this task..."
                        sx={{ mt: 1 }}
                        InputProps={{
                            sx: {
                                borderRadius: 'var(--omotec-radius-lg)',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.gray[300] },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.gray[400] },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary[500] }
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setNoteDialogOpen(false)} sx={{ textTransform: 'none', color: textSecondary }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveNote}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 'var(--omotec-radius-lg)',
                            backgroundColor: colors.primary[500],
                            '&:hover': { backgroundColor: colors.primary[600] }
                        }}
                    >
                        Save Note
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Extension Request Dialog */}
            <Dialog
                open={extensionDialogOpen}
                onClose={() => setExtensionDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 'var(--omotec-radius-xl)',
                        background: isDarkMode ? colors.gray[800] : '#ffffff'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: textPrimary }}>Request Deadline Extension</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="New Deadline"
                            type="date"
                            fullWidth
                            value={extensionData.new_deadline}
                            onChange={(e) => setExtensionData({ ...extensionData, new_deadline: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 'var(--omotec-radius-lg)',
                                    '& fieldset': { borderColor: colors.gray[300] }
                                }
                            }}
                        />
                        <TextField
                            label="Reason for Extension"
                            multiline
                            rows={3}
                            fullWidth
                            value={extensionData.reason}
                            onChange={(e) => setExtensionData({ ...extensionData, reason: e.target.value })}
                            placeholder="Please provide a reason for requesting deadline extension..."
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 'var(--omotec-radius-lg)',
                                    '& fieldset': { borderColor: colors.gray[300] }
                                }
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => {
                            setExtensionDialogOpen(false);
                            setExtensionData({ new_deadline: '', reason: '' });
                        }}
                        sx={{ textTransform: 'none', color: colors.gray[600] }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleRequestExtension}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 'var(--omotec-radius-lg)',
                            backgroundColor: colors.primary[500],
                            '&:hover': { backgroundColor: colors.primary[600] }
                        }}
                    >
                        Submit Request
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ borderRadius: 'var(--omotec-radius-lg)' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EmployeeProjectDetail;
