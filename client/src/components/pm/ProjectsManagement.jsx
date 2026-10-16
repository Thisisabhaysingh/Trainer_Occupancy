import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Tooltip,
    Snackbar,
    Alert,
    LinearProgress,
    Stack,
    Divider
} from '@mui/material';
import {
    Add,
    Delete,
    ContentCopy,
    Task as TaskIcon,
    Work as JobIcon,
    Edit as EditIcon,
    Folder as FolderIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Assignment as AssignmentIcon,
    People as PeopleIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import axios from 'axios';
import ProjectDetail from './projects/ProjectsManagement';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

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
    greenSoft: '#F0FDF4',
    amber: '#F79009',
    amberSoft: '#FFFBEB',
    red: '#D92D20',
    redSoft: '#FEF3F2',
    shadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
    shadowMedium: '0px 2px 4px rgba(16, 24, 40, 0.06)'
};

const PROJECT_CARD_HEIGHT = 430;
const STAT_CARD_HEIGHT = 145;

const getPanelStyle = (isDarkMode) => ({
    background: isDarkMode ? '#1F2937' : ui.surface,
    border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border}`,
    boxShadow: isDarkMode ? 'none' : ui.shadow,
    borderRadius: '12px'
});

const getCardStyle = (isDarkMode) => ({
    ...getPanelStyle(isDarkMode),
    width: '100%',
    height: PROJECT_CARD_HEIGHT,
    minHeight: PROJECT_CARD_HEIGHT,
    maxHeight: PROJECT_CARD_HEIGHT,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
    '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: isDarkMode ? 'none' : ui.shadowMedium,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : '#D0D5DD'
    }
});

const getStatCardStyle = (isDarkMode) => ({
    ...getPanelStyle(isDarkMode),
    width: '100%',
    height: STAT_CARD_HEIGHT,
    minHeight: STAT_CARD_HEIGHT,
    maxHeight: STAT_CARD_HEIGHT,
    p: 2.5,
    boxSizing: 'border-box',
    overflow: 'hidden'
});

const normalizeProjectStatus = (project) => {
    const statusCategory = project.statusDefinition?.category || project.status?.category;
    const statusValue = statusCategory && statusCategory !== 'other'
        ? statusCategory
        : project.statusDefinition?.name
        || project.status?.category
        || project.status?.name
        || project.statusName
        || project.status
        || '';
    return String(statusValue).trim().toLowerCase().replace(/[\s-]+/g, '_');
};

const ACTIVE_STATUSES = new Set(['active', 'in_progress', 'planning', 'not_started', 'review', 'ongoing', 'open']);
const COMPLETED_STATUSES = new Set(['completed', 'complete', 'done', 'closed']);
const ON_HOLD_STATUSES = new Set(['on_hold', 'hold', 'paused']);
const emptyTemplateJob = { title: '', description: '', estimated_hours: '', priority_id: '', status_id: '' };

const ProjectsManagement = ({ page = 'all projects' }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    const [projects, setProjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [managers, setManagers] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const [viewProject, setViewProject] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, onHold: 0 });
    const [templateForm, setTemplateForm] = useState({
        name: '',
        description: '',
        category: '',
        difficulty: 'Medium',
        jobs: [{ ...emptyTemplateJob }]
    });

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        departmentId: '',
        branchId: '',
        project_manager: '',
        start_date: '',
        end_date: '',
        priority_id: '',
        status_id: ''
    });

    const [cloneData, setCloneData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        copy_members: true,
        edit_mode: true
    });

    useEffect(() => {
        fetchProjects();
        fetchDepartments();
        fetchBranches();
        fetchManagers();
        fetchPriorities();
        fetchStatuses();
        fetchTemplates();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [projects]);

    useEffect(() => {
        if (page === 'create project') {
            setDialogOpen(true);
        }
    }, [page]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiBaseUrl}/api/projects`, { withCredentials: true });
            if (response.data.success) {
                setProjects(response.data.projects);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        let active = 0;
        let completed = 0;
        let onHold = 0;

        projects.forEach(project => {
            const status = normalizeProjectStatus(project);
            if (ACTIVE_STATUSES.has(status)) active++;
            else if (COMPLETED_STATUSES.has(status)) completed++;
            else if (ON_HOLD_STATUSES.has(status)) onHold++;
        });

        setStats({
            total: projects.length,
            active,
            completed,
            onHold
        });
    };

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/departments`, { withCredentials: true });
            setDepartments(response.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/branches`, { withCredentials: true });
            setBranches(response.data);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchManagers = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/employees`, { withCredentials: true });
            const allEmployees = response.data;
            const managersList = allEmployees.filter(emp => emp.role === 'manager');
            setManagers(managersList);
        } catch (error) {
            console.error('Error fetching managers:', error);
            setManagers([]);
        }
    };

    const fetchPriorities = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/priorities`, { withCredentials: true });
            if (response.data.success) {
                setPriorities(response.data.priorities);
            }
        } catch (error) {
            console.error('Error fetching priorities:', error);
        }
    };

    const fetchStatuses = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/statuses`, { withCredentials: true });
            if (response.data.success) {
                setStatuses(response.data.statuses);
            }
        } catch (error) {
            console.error('Error fetching statuses:', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/templates`, { withCredentials: true });
            setTemplates(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setTemplates([]);
        }
    };

    const updateTemplateJob = (index, field, value) => {
        setTemplateForm(prev => ({
            ...prev,
            jobs: prev.jobs.map((job, idx) => idx === index ? { ...job, [field]: value } : job)
        }));
    };

    const addTemplateJob = () => {
        setTemplateForm(prev => ({ ...prev, jobs: [...prev.jobs, { ...emptyTemplateJob }] }));
    };

    const removeTemplateJob = (index) => {
        setTemplateForm(prev => ({
            ...prev,
            jobs: prev.jobs.length === 1 ? prev.jobs : prev.jobs.filter((_, idx) => idx !== index)
        }));
    };

    const resetTemplateForm = () => {
        setTemplateForm({
            name: '',
            description: '',
            category: '',
            difficulty: 'Medium',
            jobs: [{ ...emptyTemplateJob }]
        });
    };

    const handleCreateTemplate = async () => {
        const jobs = templateForm.jobs
            .filter(job => job.title.trim())
            .map(job => ({
                ...job,
                title: job.title.trim(),
                description: job.description.trim()
            }));

        if (!templateForm.name.trim()) {
            setSnackbar({ open: true, message: 'Template name is required', severity: 'error' });
            return;
        }

        if (jobs.length === 0) {
            setSnackbar({ open: true, message: 'Add at least one job title in the template', severity: 'error' });
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${apiBaseUrl}/api/templates`, {
                name: templateForm.name.trim(),
                description: templateForm.description.trim(),
                category: templateForm.category.trim() || 'General',
                difficulty: templateForm.difficulty,
                jobs
            }, { withCredentials: true });
            await fetchTemplates();
            resetTemplateForm();
            setSnackbar({ open: true, message: 'Job template created successfully', severity: 'success' });
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to create template',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm('Delete this job template?')) return;
        try {
            await axios.delete(`${apiBaseUrl}/api/templates/${templateId}`, { withCredentials: true });
            await fetchTemplates();
            setSnackbar({ open: true, message: 'Template deleted', severity: 'success' });
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to delete template',
                severity: 'error'
            });
        }
    };

    const handleCreateProject = async () => {
        setLoading(true);
        try {
            const projectData = {
                name: formData.name,
                description: formData.description,
                departmentId: formData.departmentId || null,
                branchId: formData.branchId || null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                project_manager: formData.project_manager || null,
                priority_id: formData.priority_id || null,
                status_id: formData.status_id || null
            };

            const response = await axios.post(`${apiBaseUrl}/api/projects`, projectData, { withCredentials: true });

            if (response.data.success) {
                await fetchProjects();
                setDialogOpen(false);
                resetForm();
                setSnackbar({ open: true, message: 'Project created successfully!', severity: 'success' });
            }
        } catch (error) {
            console.error('Error creating project:', error);
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to create project',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloneProject = async () => {
        setLoading(true);
        try {
            const response = await axios.post(
                `${apiBaseUrl}/api/projects/${selectedProject.id}/clone`,
                cloneData,
                { withCredentials: true }
            );

            if (response.data.success) {
                await fetchProjects();
                setCloneDialogOpen(false);
                setSelectedProject(null);
                setCloneData({
                    name: '',
                    start_date: '',
                    end_date: '',
                    copy_members: true,
                    edit_mode: true
                });

                if (response.data.edit_mode && response.data.project) {
                    setViewProject(response.data.project);
                    setSnackbar({
                        open: true,
                        message: 'Project cloned successfully! You can now edit details.',
                        severity: 'success'
                    });
                } else {
                    setSnackbar({
                        open: true,
                        message: 'Project cloned successfully!',
                        severity: 'success'
                    });
                }
            }
        } catch (error) {
            console.error('Error cloning project:', error);
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to clone project',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project? All tasks and jobs will be deleted.')) return;

        setLoading(true);
        try {
            await axios.delete(`${apiBaseUrl}/api/projects/${projectId}`, { withCredentials: true });
            await fetchProjects();
            setSnackbar({ open: true, message: 'Project deleted successfully!', severity: 'success' });
        } catch (error) {
            console.error('Error deleting project:', error);
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to delete project',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            departmentId: '',
            branchId: '',
            project_manager: '',
            start_date: '',
            end_date: '',
            priority_id: '',
            status_id: ''
        });
    };

    const getPriorityColor = (priorityName, priorityDefinition) => {
        if (priorityDefinition?.color) return priorityDefinition.color;

        const colors = {
            low: ui.green,
            medium: ui.blue,
            high: ui.amber,
            urgent: ui.red
        };

        return colors[priorityName] || ui.muted;
    };

    const getStatusColor = (statusName, statusDefinition) => {
        if (statusDefinition?.color) return statusDefinition.color;

        const colors = {
            planning: ui.muted,
            active: ui.blue,
            on_hold: ui.amber,
            completed: ui.green,
            cancelled: ui.red
        };

        return colors[statusName] || ui.muted;
    };

    const getSoftBg = (color, fallback = ui.blueSoft) => {
        try {
            return alpha(color, 0.09);
        } catch {
            return fallback;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';

        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const pageTitle = {
        'all projects': 'Projects',
        'create project': 'Create Project',
        'active projects': 'Active Projects',
        'completed projects': 'Completed Projects',
        'job templates': 'Job Templates',
        'create template': 'Create Template'
    }[page] || 'Projects';

    const visibleProjects = projects.filter(project => {
        const status = normalizeProjectStatus(project);
        if (page === 'active projects') return ACTIVE_STATUSES.has(status);
        if (page === 'completed projects') return COMPLETED_STATUSES.has(status);
        return true;
    });

    const showProjectCards = ['all projects', 'create project', 'active projects', 'completed projects'].includes(page);

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : ui.bg,
            fontSize: 14,
            '& fieldset': {
                borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : ui.border
            },
            '&:hover fieldset': {
                borderColor: isDarkMode ? 'rgba(255,255,255,0.22)' : '#D0D5DD'
            },
            '&.Mui-focused fieldset': {
                borderColor: ui.blue
            }
        },
        '& .MuiInputLabel-root': {
            fontSize: 14
        }
    };

    if (loading && projects.length === 0) {
        return (
            <Box
                sx={{
                    minHeight: 320,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: isDarkMode ? 'transparent' : ui.bg
                }}
            >
                <CircularProgress size={34} />
            </Box>
        );
    }

    if (viewProject) {
        return (
            <Box
                sx={{
                    pb: 3,
                    px: { xs: 1.5, md: 2.5 },
                    pt: { xs: 1.5, md: 2.5 },
                    bgcolor: isDarkMode ? 'transparent' : ui.bg,
                    minHeight: '100%',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}
            >
                <ProjectDetail
                    project={viewProject}
                    onClose={() => setViewProject(null)}
                    onRefresh={fetchProjects}
                    showSnackbar={showSnackbar}
                />

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        severity={snackbar.severity}
                        sx={{
                            borderRadius: '8px',
                            boxShadow: ui.shadowMedium
                        }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                pb: 3,
                px: { xs: 1.5, md: 2.5 },
                pt: { xs: 1.5, md: 2.5 },
                bgcolor: isDarkMode ? 'transparent' : ui.bg,
                minHeight: '100%',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }}
        >
            <Box sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: '20px',
                            fontWeight: 400,
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        Home
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: '20px',
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        /
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: '20px',
                            fontWeight: 500,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        Projects
                    </Typography>
                </Stack>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'flex-end' }}
                    spacing={2}
                >
                    <Box>
                        <Typography
                            component="h1"
                            sx={{
                                fontSize: { xs: 24, md: 28 },
                                lineHeight: { xs: '36px', md: '42px' },
                                fontWeight: 600,
                                color: isDarkMode ? 'text.primary' : ui.text
                            }}
                        >
                            {pageTitle}
                        </Typography>

                        <Typography
                            sx={{
                                fontSize: 14,
                                lineHeight: '21px',
                                fontWeight: 400,
                                color: isDarkMode ? 'text.secondary' : ui.muted,
                                mt: 0.25
                            }}
                        >
                            Manage project progress, jobs, tasks, members, and timelines.
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setDialogOpen(true)}
                        disableElevation
                        sx={{
                            minHeight: 40,
                            px: 2,
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: 14,
                            background: `linear-gradient(180deg, ${ui.blue} 0%, ${ui.blueDark} 100%)`,
                            boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.12)',
                            '&:hover': {
                                background: ui.blueDark,
                                boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.16)'
                            }
                        }}
                    >
                        Create Project
                    </Button>
                </Stack>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        lg: 'repeat(4, minmax(0, 1fr))'
                    },
                    gap: 2.5,
                    mb: 3,
                    width: '100%'
                }}
            >
                <Paper elevation={0} sx={getStatCardStyle(isDarkMode)}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: ui.blueSoft,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                        }}
                    >
                        <FolderIcon sx={{ fontSize: 21, color: ui.blue }} />
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 28,
                            lineHeight: '42px',
                            fontWeight: 600,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        {stats.total}
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: '20px',
                            fontWeight: 400,
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        Total Projects
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={getStatCardStyle(isDarkMode)}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: ui.blueSoft,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                        }}
                    >
                        <AssignmentIcon sx={{ fontSize: 21, color: ui.blue }} />
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 28,
                            lineHeight: '42px',
                            fontWeight: 600,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        {stats.active}
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: '20px',
                            fontWeight: 400,
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        Active Projects
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={getStatCardStyle(isDarkMode)}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: ui.greenSoft,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                        }}
                    >
                        <CheckCircleIcon sx={{ fontSize: 21, color: ui.green }} />
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 28,
                            lineHeight: '42px',
                            fontWeight: 600,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        {stats.completed}
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: '20px',
                            fontWeight: 400,
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        Completed
                    </Typography>
                </Paper>

                <Paper elevation={0} sx={getStatCardStyle(isDarkMode)}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: ui.amberSoft,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                        }}
                    >
                        <PendingIcon sx={{ fontSize: 21, color: ui.amber }} />
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 28,
                            lineHeight: '42px',
                            fontWeight: 600,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        {stats.onHold}
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 13,
                            lineHeight: '20px',
                            fontWeight: 400,
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        On Hold
                    </Typography>
                </Paper>
            </Box>

            {page === 'create template' ? (
                <Paper elevation={0} sx={{ ...getPanelStyle(isDarkMode), p: 3, mb: 2.5 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 600, color: isDarkMode ? 'text.primary' : ui.text }}>
                        Create Job Template
                    </Typography>
                    <Typography sx={{ mt: 0.5, mb: 2.5, fontSize: 14, color: isDarkMode ? 'text.secondary' : ui.muted }}>
                        Save reusable job formats. Manual job entry remains available while creating jobs.
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 0.8fr' }, gap: 2, mb: 2 }}>
                        <TextField
                            label="Template Name"
                            required
                            value={templateForm.name}
                            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                            sx={inputSx}
                        />
                        <TextField
                            label="Category"
                            value={templateForm.category}
                            onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                            sx={inputSx}
                        />
                        <FormControl sx={inputSx}>
                            <InputLabel>Difficulty</InputLabel>
                            <Select
                                value={templateForm.difficulty}
                                label="Difficulty"
                                onChange={(e) => setTemplateForm({ ...templateForm, difficulty: e.target.value })}
                            >
                                <MenuItem value="Low">Low</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="High">High</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Template Description"
                            multiline
                            rows={2}
                            value={templateForm.description}
                            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                            sx={{ ...inputSx, gridColumn: '1 / -1' }}
                        />
                    </Box>

                    <Stack spacing={1.5}>
                        {templateForm.jobs.map((job, index) => (
                            <Paper key={index} elevation={0} sx={{ p: 2, borderRadius: '8px', border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border}`, bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : ui.bg }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? 'text.primary' : ui.text }}>
                                        Job {index + 1}
                                    </Typography>
                                    <IconButton size="small" onClick={() => removeTemplateJob(index)} disabled={templateForm.jobs.length === 1} sx={{ color: ui.red }}>
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Stack>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1.5fr 0.8fr 0.9fr 0.9fr' }, gap: 1.5 }}>
                                    <TextField
                                        label="Job Title"
                                        required
                                        value={job.title}
                                        onChange={(e) => updateTemplateJob(index, 'title', e.target.value)}
                                        sx={inputSx}
                                    />
                                    <TextField
                                        label="Description"
                                        value={job.description}
                                        onChange={(e) => updateTemplateJob(index, 'description', e.target.value.slice(0, 250))}
                                        sx={inputSx}
                                    />
                                    <TextField
                                        label="Est. Hours"
                                        type="number"
                                        value={job.estimated_hours}
                                        onChange={(e) => updateTemplateJob(index, 'estimated_hours', e.target.value)}
                                        sx={inputSx}
                                    />
                                    <FormControl sx={inputSx}>
                                        <InputLabel>Priority</InputLabel>
                                        <Select
                                            value={job.priority_id}
                                            label="Priority"
                                            onChange={(e) => updateTemplateJob(index, 'priority_id', e.target.value)}
                                        >
                                            <MenuItem value="">Default</MenuItem>
                                            {priorities.map(priority => (
                                                <MenuItem key={priority.id} value={priority.id}>{priority.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl sx={inputSx}>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={job.status_id}
                                            label="Status"
                                            onChange={(e) => updateTemplateJob(index, 'status_id', e.target.value)}
                                        >
                                            <MenuItem value="">Default</MenuItem>
                                            {statuses.map(status => (
                                                <MenuItem key={status.id} value={status.id}>{status.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Paper>
                        ))}
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                        <Button startIcon={<Add />} onClick={addTemplateJob} sx={{ textTransform: 'none', color: ui.blue }}>
                            Add Job Row
                        </Button>
                        <Stack direction="row" spacing={1}>
                            <Button onClick={resetTemplateForm} sx={{ textTransform: 'none', color: isDarkMode ? 'text.secondary' : ui.icon }}>
                                Clear
                            </Button>
                            <Button variant="contained" onClick={handleCreateTemplate} disabled={loading} sx={{ textTransform: 'none', bgcolor: ui.blue, '&:hover': { bgcolor: ui.blueDark } }}>
                                Save Template
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            ) : null}

            {page === 'job templates' || page === 'create template' ? (
                <Paper elevation={0} sx={{ ...getPanelStyle(isDarkMode), p: 3 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 600, color: isDarkMode ? 'text.primary' : ui.text }}>
                        Job Templates
                    </Typography>
                    <Typography sx={{ mt: 0.5, mb: 2, fontSize: 14, color: isDarkMode ? 'text.secondary' : ui.muted }}>
                        These templates appear in the Add Job form. Users can still choose Manual Entry.
                    </Typography>
                    {templates.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: '8px' }}>
                            No job templates created yet.
                        </Alert>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                            {templates.map(template => (
                                <Paper key={template.id || template._id} elevation={0} sx={{ p: 2, borderRadius: '8px', border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border}`, bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : ui.bg }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 15, fontWeight: 600, color: isDarkMode ? 'text.primary' : ui.text }}>
                                                {template.name}
                                            </Typography>
                                            {template.description && (
                                                <Typography sx={{ mt: 0.5, fontSize: 13, color: isDarkMode ? 'text.secondary' : ui.muted }}>
                                                    {template.description}
                                                </Typography>
                                            )}
                                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                                <Chip size="small" label={template.category || 'General'} />
                                                <Chip size="small" label={template.difficulty || 'Medium'} />
                                                <Chip size="small" label={`${Array.isArray(template.jobs) ? template.jobs.length : 0} jobs`} />
                                            </Stack>
                                            {Array.isArray(template.jobs) && template.jobs.length > 0 && (
                                                <Typography sx={{ mt: 1, fontSize: 12, color: isDarkMode ? 'text.secondary' : ui.muted }}>
                                                    First job: {template.jobs[0]?.title || template.jobs[0]?.name || 'Untitled'}
                                                </Typography>
                                            )}
                                        </Box>
                                        <IconButton size="small" onClick={() => handleDeleteTemplate(template.id || template._id)} sx={{ color: ui.red }}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Paper>
                            ))}
                        </Box>
                    )}
                </Paper>
            ) : null}

            {showProjectCards && visibleProjects.length === 0 ? (
                <Paper
                    elevation={0}
                    sx={{
                        ...getPanelStyle(isDarkMode),
                        textAlign: 'center',
                        py: 8,
                        px: 2
                    }}
                >
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            mx: 'auto',
                            borderRadius: '10px',
                            bgcolor: ui.blueSoft,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                        }}
                    >
                        <FolderIcon sx={{ fontSize: 24, color: ui.blue }} />
                    </Box>

                    <Typography
                        sx={{
                            fontSize: 16,
                            lineHeight: '24px',
                            fontWeight: 600,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        No projects found
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 14,
                            lineHeight: '21px',
                            color: isDarkMode ? 'text.secondary' : ui.muted,
                            mt: 0.5
                        }}
                    >
                        Create your first project to start tracking work.
                    </Typography>

                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setDialogOpen(true)}
                        disableElevation
                        sx={{
                            mt: 2.5,
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontWeight: 500,
                            background: `linear-gradient(180deg, ${ui.blue} 0%, ${ui.blueDark} 100%)`
                        }}
                    >
                        Create Project
                    </Button>
                </Paper>
            ) : showProjectCards ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: 'repeat(2, minmax(0, 1fr))',
                            lg: 'repeat(3, minmax(0, 1fr))',
                            xl: 'repeat(3, minmax(0, 1fr))'
                        },
                        gap: 2.5,
                        width: '100%',
                        alignItems: 'stretch'
                    }}
                >
                    {visibleProjects.map((project) => {
                        const priorityColor = getPriorityColor(project.priority, project.priorityDefinition);
                        const statusColor = getStatusColor(project.status, project.statusDefinition);
                        const managerName = project.projectManager?.name || 'Unassigned';

                        return (
                            <Card elevation={0} sx={getCardStyle(isDarkMode)} key={project.id}>
                                <CardContent
                                    sx={{
                                        p: 2.5,
                                        flexGrow: 1,
                                        height: 304,
                                        minHeight: 304,
                                        maxHeight: 304,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="flex-start"
                                        spacing={1.5}
                                        sx={{ mb: 1.5 }}
                                    >
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: 17,
                                                    lineHeight: '25px',
                                                    fontWeight: 600,
                                                    color: isDarkMode ? 'text.primary' : ui.text,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title={project.name}
                                            >
                                                {project.name}
                                            </Typography>

                                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                                                <PersonIcon sx={{ fontSize: 15, color: isDarkMode ? 'text.secondary' : ui.muted }} />
                                                <Typography
                                                    sx={{
                                                        fontSize: 13,
                                                        lineHeight: '20px',
                                                        fontWeight: 400,
                                                        color: isDarkMode ? 'text.secondary' : ui.muted,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {managerName}
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        <Box
                                            sx={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: '10px',
                                                bgcolor: getSoftBg(priorityColor),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}
                                        >
                                            <FolderIcon sx={{ fontSize: 21, color: priorityColor }} />
                                        </Box>
                                    </Stack>

                                    <Typography
                                        sx={{
                                            height: 42,
                                            minHeight: 42,
                                            maxHeight: 42,
                                            mb: 1.75,
                                            fontSize: 14,
                                            lineHeight: '21px',
                                            fontWeight: 400,
                                            color: isDarkMode ? 'text.secondary' : ui.muted,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {project.description || 'No description added for this project.'}
                                    </Typography>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{
                                            height: 26,
                                            mb: 1.75,
                                            flexWrap: 'wrap',
                                            overflow: 'hidden',
                                            rowGap: 0.75
                                        }}
                                    >
                                        <Chip
                                            size="small"
                                            label={project.priorityDefinition?.name || project.priority || 'Medium'}
                                            sx={{
                                                height: 24,
                                                borderRadius: '6px',
                                                fontSize: 12,
                                                fontWeight: 500,
                                                bgcolor: getSoftBg(priorityColor),
                                                color: priorityColor,
                                                border: `0.8px solid ${alpha(priorityColor, 0.18)}`
                                            }}
                                        />

                                        <Chip
                                            size="small"
                                            label={project.statusDefinition?.name || project.status || 'Planning'}
                                            sx={{
                                                height: 24,
                                                borderRadius: '6px',
                                                fontSize: 12,
                                                fontWeight: 500,
                                                bgcolor: getSoftBg(statusColor),
                                                color: statusColor,
                                                border: `0.8px solid ${alpha(statusColor, 0.18)}`
                                            }}
                                        />
                                    </Stack>

                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                            gap: 1.25,
                                            mb: 1.75
                                        }}
                                    >
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.15,
                                                height: 76,
                                                borderRadius: '8px',
                                                bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : ui.bg,
                                                border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.10)' : ui.border}`,
                                                textAlign: 'center',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <JobIcon sx={{ fontSize: 17, color: isDarkMode ? 'text.secondary' : ui.icon }} />
                                            <Typography sx={{ fontSize: 14, lineHeight: '21px', fontWeight: 600 }}>
                                                {project.jobs_count || 0}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, lineHeight: '18px', color: isDarkMode ? 'text.secondary' : ui.muted }}>
                                                Jobs
                                            </Typography>
                                        </Paper>

                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.15,
                                                height: 76,
                                                borderRadius: '8px',
                                                bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : ui.bg,
                                                border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.10)' : ui.border}`,
                                                textAlign: 'center',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <TaskIcon sx={{ fontSize: 17, color: isDarkMode ? 'text.secondary' : ui.icon }} />
                                            <Typography sx={{ fontSize: 14, lineHeight: '21px', fontWeight: 600 }}>
                                                {project.tasks_count || 0}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, lineHeight: '18px', color: isDarkMode ? 'text.secondary' : ui.muted }}>
                                                Tasks
                                            </Typography>
                                        </Paper>

                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.15,
                                                height: 76,
                                                borderRadius: '8px',
                                                bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : ui.bg,
                                                border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.10)' : ui.border}`,
                                                textAlign: 'center',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <PeopleIcon sx={{ fontSize: 17, color: isDarkMode ? 'text.secondary' : ui.icon }} />
                                            <Typography sx={{ fontSize: 14, lineHeight: '21px', fontWeight: 600 }}>
                                                {project.members_count || 0}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, lineHeight: '18px', color: isDarkMode ? 'text.secondary' : ui.muted }}>
                                                Members
                                            </Typography>
                                        </Paper>
                                    </Box>

                                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                                        <CalendarIcon sx={{ fontSize: 15, color: isDarkMode ? 'text.secondary' : ui.muted }} />
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                lineHeight: '18px',
                                                color: isDarkMode ? 'text.secondary' : ui.muted,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                                        </Typography>
                                    </Stack>

                                    <Box>
                                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    lineHeight: '18px',
                                                    fontWeight: 500,
                                                    color: isDarkMode ? 'text.secondary' : ui.muted
                                                }}
                                            >
                                                Progress
                                            </Typography>

                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    lineHeight: '18px',
                                                    fontWeight: 600,
                                                    color: isDarkMode ? 'text.primary' : ui.text
                                                }}
                                            >
                                                {project.progress || 0}%
                                            </Typography>
                                        </Stack>

                                        <LinearProgress
                                            variant="determinate"
                                            value={project.progress || 0}
                                            sx={{
                                                height: 7,
                                                borderRadius: 99,
                                                bgcolor: isDarkMode ? 'rgba(255,255,255,0.10)' : '#EEF2F6',
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 99,
                                                    bgcolor: statusColor || ui.blue
                                                }
                                            }}
                                        />
                                    </Box>
                                </CardContent>

                                <Divider sx={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : ui.border }} />

                                <CardActions
                                    sx={{
                                        p: 1.75,
                                        gap: 1,
                                        height: 86,
                                        minHeight: 86,
                                        maxHeight: 86,
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<EditIcon fontSize="small" />}
                                        onClick={() => setViewProject(project)}
                                        disableElevation
                                        sx={{
                                            minHeight: 36,
                                            borderRadius: '6px',
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            fontSize: 14,
                                            background: `linear-gradient(180deg, ${ui.blue} 0%, ${ui.blueDark} 100%)`,
                                            '&:hover': {
                                                background: ui.blueDark
                                            }
                                        }}
                                    >
                                        Manage
                                    </Button>

                                    <Tooltip title="Clone Project">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setSelectedProject(project);
                                                setCloneData({
                                                    name: `${project.name} (Copy)`,
                                                    start_date: project.start_date || '',
                                                    end_date: project.end_date || '',
                                                    copy_members: true,
                                                    edit_mode: true
                                                });
                                                setCloneDialogOpen(true);
                                            }}
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '6px',
                                                color: isDarkMode ? 'text.secondary' : ui.icon,
                                                border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.14)' : ui.border}`,
                                                bgcolor: isDarkMode ? 'transparent' : ui.surface,
                                                '&:hover': {
                                                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : ui.bg
                                                }
                                            }}
                                        >
                                            <ContentCopy fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Delete Project">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteProject(project.id)}
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '6px',
                                                color: ui.red,
                                                border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.14)' : ui.border}`,
                                                bgcolor: isDarkMode ? 'transparent' : ui.surface,
                                                '&:hover': {
                                                    bgcolor: ui.redSoft
                                                }
                                            }}
                                        >
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </CardActions>
                            </Card>
                        );
                    })}
                </Box>
            ) : null}

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        bgcolor: isDarkMode ? '#1F2937' : ui.surface,
                        border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border}`,
                        boxShadow: '0px 20px 28px rgba(16, 24, 40, 0.18)'
                    }
                }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                    <Typography
                        sx={{
                            fontSize: 18,
                            lineHeight: '27px',
                            fontWeight: 600,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        Create New Project
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.25,
                            fontSize: 14,
                            lineHeight: '21px',
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        Add basic project information, owner, timeline, priority, and status.
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ px: 3 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(2, minmax(0, 1fr))'
                            },
                            gap: 2,
                            mt: 0.5
                        }}
                    >
                        <TextField
                            fullWidth
                            label="Project Name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            sx={{ ...inputSx, gridColumn: '1 / -1' }}
                        />

                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            sx={{ ...inputSx, gridColumn: '1 / -1' }}
                        />

                        <FormControl fullWidth sx={inputSx}>
                            <InputLabel>Department</InputLabel>
                            <Select
                                value={formData.departmentId}
                                label="Department"
                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                            >
                                {departments.map(dept => (
                                    <MenuItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={inputSx}>
                            <InputLabel>Branch</InputLabel>
                            <Select
                                value={formData.branchId}
                                label="Branch"
                                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                            >
                                {branches.map(branch => (
                                    <MenuItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Start Date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={inputSx}
                        />

                        <TextField
                            fullWidth
                            label="End Date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={inputSx}
                        />

                        <FormControl fullWidth sx={inputSx}>
                            <InputLabel>Project Manager</InputLabel>
                            <Select
                                value={formData.project_manager}
                                label="Project Manager"
                                onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
                            >
                                <MenuItem value="">None</MenuItem>
                                {managers.map(manager => (
                                    <MenuItem key={manager.employeeCode} value={manager.employeeCode}>
                                        {manager.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={inputSx}>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={formData.priority_id}
                                label="Priority"
                                onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
                            >
                                <MenuItem value="">Default</MenuItem>
                                {priorities.map(priority => (
                                    <MenuItem key={priority.id} value={priority.id}>
                                        <Chip
                                            label={priority.name}
                                            size="small"
                                            sx={{
                                                height: 24,
                                                borderRadius: '6px',
                                                bgcolor: getSoftBg(priority.color),
                                                color: priority.color,
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={inputSx}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status_id}
                                label="Status"
                                onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                            >
                                <MenuItem value="">Default</MenuItem>
                                {statuses.map(status => (
                                    <MenuItem key={status.id} value={status.id}>
                                        <Chip
                                            label={status.name}
                                            size="small"
                                            sx={{
                                                height: 24,
                                                borderRadius: '6px',
                                                bgcolor: getSoftBg(status.color),
                                                color: status.color,
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.10)' : ui.border}` }}>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        sx={{
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontSize: 14,
                            fontWeight: 500,
                            color: isDarkMode ? 'text.secondary' : ui.icon
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleCreateProject}
                        disabled={!formData.name}
                        disableElevation
                        sx={{
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontSize: 14,
                            fontWeight: 500,
                            background: `linear-gradient(180deg, ${ui.blue} 0%, ${ui.blueDark} 100%)`
                        }}
                    >
                        Create Project
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={cloneDialogOpen}
                onClose={() => setCloneDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        bgcolor: isDarkMode ? '#1F2937' : ui.surface,
                        border: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border}`,
                        boxShadow: '0px 20px 28px rgba(16, 24, 40, 0.18)'
                    }
                }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                    <Typography
                        sx={{
                            fontSize: 18,
                            lineHeight: '27px',
                            fontWeight: 600,
                            color: isDarkMode ? 'text.primary' : ui.text
                        }}
                    >
                        Clone Project
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.25,
                            fontSize: 14,
                            lineHeight: '21px',
                            color: isDarkMode ? 'text.secondary' : ui.muted
                        }}
                    >
                        {selectedProject?.name}
                    </Typography>
                </DialogTitle>

                <DialogContent sx={{ px: 3 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(2, minmax(0, 1fr))'
                            },
                            gap: 2,
                            mt: 0.5
                        }}
                    >
                        <TextField
                            fullWidth
                            label="New Project Name"
                            required
                            value={cloneData.name}
                            onChange={(e) => setCloneData({ ...cloneData, name: e.target.value })}
                            sx={{ ...inputSx, gridColumn: '1 / -1' }}
                        />

                        <TextField
                            fullWidth
                            label="Start Date"
                            type="date"
                            value={cloneData.start_date}
                            onChange={(e) => setCloneData({ ...cloneData, start_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={inputSx}
                        />

                        <TextField
                            fullWidth
                            label="End Date"
                            type="date"
                            value={cloneData.end_date}
                            onChange={(e) => setCloneData({ ...cloneData, end_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={inputSx}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: `0.8px solid ${isDarkMode ? 'rgba(255,255,255,0.10)' : ui.border}` }}>
                    <Button
                        onClick={() => setCloneDialogOpen(false)}
                        sx={{
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontSize: 14,
                            fontWeight: 500,
                            color: isDarkMode ? 'text.secondary' : ui.icon
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleCloneProject}
                        disabled={!cloneData.name}
                        disableElevation
                        sx={{
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontSize: 14,
                            fontWeight: 500,
                            background: `linear-gradient(180deg, ${ui.blue} 0%, ${ui.blueDark} 100%)`
                        }}
                    >
                        Clone Project
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{
                        borderRadius: '8px',
                        boxShadow: ui.shadowMedium
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProjectsManagement;
