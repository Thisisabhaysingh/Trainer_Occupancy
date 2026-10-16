import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    Chip,
    LinearProgress,
    Stack,
    TextField,
    InputAdornment,
    Alert,
    Snackbar,
    CircularProgress,
    Tooltip,
    Divider
} from '@mui/material';
import {
    Search as SearchIcon,
    Assignment as TaskIcon,
    Visibility as ViewIcon,
    AccessTime as TimeIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Folder as FolderIcon,
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Business as BusinessIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';

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
    shadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
    shadowMedium: '0px 2px 4px rgba(16, 24, 40, 0.06)'
};

// OMOTEC Card Style
const getProjectCardStyle = (isDarkMode) => ({
    background: isDarkMode ? '#23272F' : ui.surface,
    boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(16, 24, 40, 0.08)',
    borderRadius: '24px',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border}`,
    boxSizing: 'border-box',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    '&:hover': {
        boxShadow: isDarkMode ? 'none' : ui.shadowMedium,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : colors.gray[300]
    }
});

// OMOTEC Stats Card Style
const getStatsCardStyle = (accent, soft, isDarkMode = false) => ({
    background: isDarkMode ? '#23272F' : ui.surface,
    boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(16, 24, 40, 0.08)',
    borderRadius: '24px',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : accent + '33'}`,
    p: 3,
    cursor: 'default',
    minHeight: 144,
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: accent
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '50%',
        width: '42%',
        height: 14,
        transform: 'translateX(-50%)',
        borderRadius: '0 0 10px 10px',
        backgroundColor: accent
    },
    '&:hover': {
        boxShadow: isDarkMode ? 'none' : ui.shadowMedium,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : accent
    }
});

const StatTile = ({ label, value, icon, accent, soft, isDarkMode }) => (
    <Paper elevation={0} sx={getStatsCardStyle(accent, soft, isDarkMode)}>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: isDarkMode ? '#D0D5DD' : ui.muted, mb: 2 }}>
            {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography sx={{ fontSize: { xs: 32, md: 36 }, lineHeight: 1.2, fontWeight: 700, color: isDarkMode ? '#F9FAFB' : ui.text }}>
                {value}
            </Typography>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </Box>
        </Box>
    </Paper>
);

const EmployeeProjects = ({ onSelectProject }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [stats, setStats] = useState({ totalProjects: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0 });

    useEffect(() => {
        fetchMyProjects();
    }, []);

    useEffect(() => {
        filterProjects();
    }, [searchTerm, projects]);

    const fetchMyProjects = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiBaseUrl}/api/employee/my-projects`, { withCredentials: true });
            if (response.data.success) {
                setProjects(response.data.projects);
                setFilteredProjects(response.data.projects);
                calculateStats(response.data.projects);
            }
        } catch (error) {
            console.error('Error fetching my projects:', error);
            showSnackbar('Failed to fetch your projects', 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (projectsList) => {
        let totalTasks = 0;
        let completedTasks = 0;
        projectsList.forEach(project => {
            totalTasks += project.my_tasks_count || 0;
            completedTasks += project.completed_tasks_count || 0;
        });
        setStats({
            totalProjects: projectsList.length,
            totalTasks: totalTasks,
            completedTasks: completedTasks,
            pendingTasks: totalTasks - completedTasks
        });
    };

    const filterProjects = () => {
        if (!searchTerm.trim()) {
            setFilteredProjects(projects);
        } else {
            const filtered = projects.filter(project =>
                project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredProjects(filtered);
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleViewProject = (project) => {
        if (onSelectProject) onSelectProject(project.id);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getPriorityLabel = (priority, priorityDef) => {
        if (priorityDef?.name) return priorityDef.name;
        const labels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
        return labels[priority] || 'Medium';
    };

    const getStatusLabel = (status, statusDef) => {
        if (statusDef?.name) return statusDef.name;
        const labels = {
            planning: 'Planning',
            active: 'Active',
            on_hold: 'On Hold',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return labels[status] || 'Planning';
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: 'transparent', minHeight: '100%', p: 0 }}>
            <Paper elevation={0} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, p: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, bgcolor: isDarkMode ? '#23272F' : ui.surface, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border}`, borderRadius: '24px', boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(16,24,40,0.08)' }}>
                <Box>
                    <Typography sx={{ fontSize: 18, lineHeight: '26px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : ui.text }}>
                        Find a project
                    </Typography>
                    <Typography sx={{ fontSize: 14, lineHeight: '20px', color: isDarkMode ? '#D0D5DD' : ui.muted, mt: 0.5 }}>
                        Search by project name or description.
                    </Typography>
                </Box>
                <TextField
                    placeholder="Search projects..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                        width: { xs: '100%', sm: 320 },
                        '& .MuiOutlinedInput-root': {
                            height: 40,
                            borderRadius: '12px',
                            bgcolor: isDarkMode ? '#23272F' : ui.surface,
                            color: isDarkMode ? '#F9FAFB' : ui.text,
                            '& fieldset': { borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : ui.border }
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: ui.muted, fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 3, mb: 3, width: '100%' }}>
                <Box>
                    <StatTile isDarkMode={isDarkMode} label="Assigned Projects" value={stats.totalProjects} accent={ui.blue} soft={ui.blueSoft} icon={<FolderIcon sx={{ fontSize: 21, color: ui.blue }} />} />
                </Box>
                <Box>
                    <StatTile isDarkMode={isDarkMode} label="Tasks/Subtasks" value={stats.totalTasks} accent={ui.blue} soft={ui.blueSoft} icon={<TaskIcon sx={{ fontSize: 21, color: ui.blue }} />} />
                </Box>
                <Box>
                    <StatTile isDarkMode={isDarkMode} label="Completed Work" value={stats.completedTasks} accent={ui.green} soft={ui.greenSoft} icon={<CheckCircleIcon sx={{ fontSize: 21, color: ui.green }} />} />
                </Box>
                <Box>
                    <StatTile isDarkMode={isDarkMode} label="Pending Work" value={stats.pendingTasks} accent={ui.amber} soft={ui.amberSoft} icon={<PendingIcon sx={{ fontSize: 21, color: ui.amber }} />} />
                </Box>
            </Box>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <Paper elevation={0} sx={{ 
                    bgcolor: isDarkMode ? '#23272F' : ui.surface,
                    border: `1px dashed ${ui.border}`,
                    textAlign: 'center', 
                    py: 8, 
                    borderRadius: '24px'
                }}>
                    <FolderIcon sx={{ fontSize: 42, color: ui.blue, mb: 1.5 }} />
                    <Typography sx={{ fontSize: 18, fontWeight: 600, color: isDarkMode ? '#F9FAFB' : ui.text }}>
                        {searchTerm ? 'No projects match your search' : 'You are not assigned to any projects yet'}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: isDarkMode ? '#D0D5DD' : ui.muted, mt: 0.5 }}>
                        {searchTerm ? 'Try another project name or description.' : 'Assigned projects will appear here once a manager adds tasks for you.'}
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {filteredProjects.map((project) => (
                        <Grid item xs={12} md={6} lg={4} key={project.id}>
                            <Paper elevation={0} sx={getProjectCardStyle(isDarkMode)}>
                                {/* Priority top bar */}
                                <Box sx={{ height: 2, bgcolor: project.priorityDefinition?.color || ui.blue }} />

                                <Box sx={{ p: 3, flexGrow: 1 }}>
                                    <Typography sx={{ fontSize: 17, lineHeight: '25px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : ui.text, mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.name}>
                                        {project.name}
                                    </Typography>

                                    {/* Department chip */}
                                    {project.projectDepartment && (
                                        <Chip
                                            size="small"
                                            icon={<BusinessIcon sx={{ fontSize: 14 }} />}
                                            label={project.projectDepartment.name}
                                            variant="outlined"
                                            sx={{ 
                                                mb: 1.5, 
                                                height: 24, 
                                                fontSize: '12px', 
                                                borderColor: ui.border,
                                                color: ui.muted
                                            }}
                                        />
                                    )}

                                    {project.description && (
                                        <Typography sx={{ fontSize: 13, color: isDarkMode ? '#D0D5DD' : ui.muted, mb: 2, lineHeight: '20px', minHeight: 40 }}>
                                            {project.description.length > 100 ? project.description.substring(0, 100) + '...' : project.description}
                                        </Typography>
                                    )}

                                    {project.assigned_by && (
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                            <PersonIcon sx={{ fontSize: 14, color: ui.muted }} />
                                            <Typography sx={{ fontSize: 12, color: ui.muted }}>
                                                Assigned by: {project.assigned_by}
                                            </Typography>
                                        </Stack>
                                    )}

                                    {/* Chips with OMOTEC colors */}
                                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                                        <Chip
                                            size="small"
                                            label={getPriorityLabel(project.priority, project.priorityDefinition)}
                                            sx={{ 
                                                bgcolor: `${project.priorityDefinition?.color || colors.primary[500]}15`,
                                                color: project.priorityDefinition?.color || colors.primary[500],
                                                fontWeight: 500,
                                                fontSize: 12,
                                                height: 26 
                                            }}
                                        />
                                        <Chip
                                            size="small"
                                            label={getStatusLabel(project.status, project.statusDefinition)}
                                            sx={{ 
                                                bgcolor: `${project.statusDefinition?.color || colors.gray[500]}15`,
                                                color: project.statusDefinition?.color || colors.gray[600],
                                                fontWeight: 500,
                                                fontSize: 12,
                                                height: 26 
                                            }}
                                        />
                                        <Chip
                                            size="small"
                                            label={project.userRole === 'owner' ? 'Owner' : project.userRole === 'manager' ? 'Manager' : 'Member'}
                                            variant="outlined"
                                            sx={{ 
                                                fontSize: 12,
                                                height: 26, 
                                                borderColor: ui.border,
                                                color: ui.muted
                                            }}
                                        />
                                    </Stack>

                                    <Divider sx={{ my: 2, borderColor: ui.border }} />

                                    {/* Stats Section */}
                                    <Box sx={{ bgcolor: isDarkMode ? '#111827' : ui.bg, borderRadius: '12px', p: 2, mb: 2, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.10)' : ui.border}` }}>
                                        <Grid container spacing={1}>
                                            <Grid item xs={4}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <TaskIcon sx={{ fontSize: 18, color: colors.success[500], mb: 0.5 }} />
                                                    <Typography sx={{ fontSize: '20px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : colors.gray[900] }}>
                                                        {project.my_tasks_count || 0}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '12px', color: isDarkMode ? '#D0D5DD' : colors.gray[500] }}>Tasks/Subtasks</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={4}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <TimeIcon sx={{ fontSize: 18, color: colors.warning[500], mb: 0.5 }} />
                                                    <Typography sx={{ fontSize: '20px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : colors.gray[900] }}>
                                                        {project.total_estimated_hours || 0}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '12px', color: isDarkMode ? '#D0D5DD' : colors.gray[500] }}>Est. Hours</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={4}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <CalendarIcon sx={{ fontSize: 18, color: ui.blue, mb: 0.5 }} />
                                                    <Typography sx={{ fontSize: '12px', color: isDarkMode ? '#D0D5DD' : colors.gray[500], mt: 0.5 }}>
                                                        {formatDate(project.start_date)}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '10px', color: colors.gray[400] }}>to</Typography>
                                                    <Typography sx={{ fontSize: '12px', color: isDarkMode ? '#D0D5DD' : colors.gray[500] }}>
                                                        {formatDate(project.end_date)}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    {/* Progress Bar */}
                                    <Box sx={{ mt: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography sx={{ fontSize: '12px', color: colors.gray[500], fontWeight: 500 }}>Progress</Typography>
                                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#F9FAFB' : colors.gray[700] }}>
                                                {project.progress || 0}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={project.progress || 0} 
                                            sx={{ 
                                                height: 6,
                                                borderRadius: 99,
                                                backgroundColor: isDarkMode ? '#374151' : colors.gray[100],
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 99,
                                                    backgroundColor: ui.blue
                                                }
                                            }} 
                                        />
                                    </Box>

                                    {/* Manager */}
                                    {project.projectManager && (
                                        <Typography sx={{ fontSize: '12px', color: colors.gray[500], display: 'block', mt: 1.5 }}>
                                            <PersonIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle', color: colors.gray[400] }} />
                                            Manager: {project.projectManager.name}
                                        </Typography>
                                    )}
                                </Box>
                                
                                {/* Action Button */}
                                <Box sx={{ p: 3, pt: 0 }}>
                                    <Button 
                                        variant="contained"
                                        onClick={() => handleViewProject(project)}
                                        startIcon={<ViewIcon />}
                                        fullWidth
                                        disableElevation
                                        sx={{ 
                                            textTransform: 'none', 
                                            fontWeight: 600,
                                            fontSize: 14,
                                            py: 1,
                                            color: '#fff',
                                            bgcolor: ui.blue,
                                            borderRadius: '10px',
                                            '&:hover': {
                                                bgcolor: ui.blueDark
                                            }
                                        }}
                                    >
                                        View Work Items
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ borderRadius: 'var(--omotec-radius-lg)' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EmployeeProjects;
