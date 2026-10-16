import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    IconButton,
    Chip,
    LinearProgress,
    Stack,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Snackbar,
    CircularProgress,
    Tooltip,
    Divider,
    Avatar
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    MoreVert as MoreIcon,
    Delete as DeleteIcon,
    ContentCopy as CloneIcon,
    Visibility as ViewIcon,
    Work as JobIcon,
    Assignment as TaskIcon,
    People as PeopleIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon,
    Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '@mui/material/styles';
import AdminLayout from '../AdminLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const normalizeStatus = (project) => {
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

// Clean card style - matching ProjectDetail
const getProjectCardStyle = (isDarkMode) => ({
    background: isDarkMode ? 'rgba(35,39,47,0.95)' : '#fff',
    boxShadow: 'none',
    borderRadius: 2,
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : '#e8e8e8'}`,
    boxSizing: 'border-box',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'none'
});

const ProjectsList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        filterProjects();
    }, [searchTerm, projects]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiBaseUrl}/api/projects`, { withCredentials: true });
            if (response.data.success) {
                setProjects(response.data.projects);
                setFilteredProjects(response.data.projects);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            showSnackbar('Failed to fetch projects', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterProjects = () => {
        if (!searchTerm.trim()) {
            setFilteredProjects(projects);
        } else {
            const filtered = projects.filter(project =>
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredProjects(filtered);
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleViewProject = (project) => {
        navigate(`/admin/projects/${project.id}`);
    };

    const handleCloneProject = async () => {
        if (!selectedProject) return;
        
        try {
            const response = await axios.post(`${apiBaseUrl}/api/projects/${selectedProject.id}/clone`, {
                name: `${selectedProject.name} (Copy)`,
                copy_members: true,
                edit_mode: true
            }, { withCredentials: true });
            
            if (response.data.success) {
                showSnackbar('Project cloned successfully', 'success');
                fetchProjects();
                if (response.data.edit_mode && response.data.project) {
                    navigate(`/admin/projects/${response.data.project.id}`);
                }
            }
        } catch (error) {
            console.error('Error cloning project:', error);
            showSnackbar('Failed to clone project', 'error');
        } finally {
            setMenuAnchor(null);
        }
    };

    const handleDeleteProject = async () => {
        if (!selectedProject) return;
        
        try {
            await axios.delete(`${apiBaseUrl}/api/projects/${selectedProject.id}`, { withCredentials: true });
            showSnackbar('Project deleted successfully', 'success');
            fetchProjects();
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error deleting project:', error);
            showSnackbar('Failed to delete project', 'error');
        } finally {
            setMenuAnchor(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getPriorityColor = (priority, priorityDef) => {
        if (priorityDef?.color) return priorityDef.color;
        const colors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626' };
        return colors[priority] || '#6b7280';
    };

    const getPriorityLabel = (priority, priorityDef) => {
        if (priorityDef?.name) return priorityDef.name;
        const labels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
        return labels[priority] || 'Medium';
    };

    const getStatusColor = (status, statusDef) => {
        if (statusDef?.color) return statusDef.color;
        const colors = {
            planning: '#3b82f6',
            active: '#10b981',
            on_hold: '#f59e0b',
            completed: '#8b5cf6',
            cancelled: '#ef4444'
        };
        return colors[status] || '#6b7280';
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

    // Calculate total stats
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => ACTIVE_STATUSES.has(normalizeStatus(p))).length;
    const totalTasks = projects.reduce((sum, p) => sum + (p.tasks_count || 0), 0);
    const totalMembers = projects.reduce((sum, p) => sum + (p.members_count || 0), 0);

    if (loading) {
        return (
            <AdminLayout
                title="Projects"
                breadcrumbItems={[
                    { label: 'Admin', path: '/admin', active: false },
                    { label: 'Projects', active: true }
                ]}
                user={{ name: user?.name || 'Admin', role: 'Administrator' }}
                onLogout={handleLogout}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <CircularProgress />
                </Box>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Projects"
            breadcrumbItems={[
                { label: 'Admin', path: '/admin', active: false },
                { label: 'Projects', active: true }
            ]}
            user={{ name: user?.name || 'Admin', role: 'Administrator' }}
            onLogout={handleLogout}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
        >
            <Box>
                {/* Header Section */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h5" fontWeight={600} color="text.primary">
                        All Projects
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            placeholder="Search projects..."
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ width: 260 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#999' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/admin/projects/new')}
                            sx={{ 
                                borderRadius: 1.5, 
                                textTransform: 'none', 
                                fontWeight: 600,
                                px: 3,
                                py: 0.75,
                                bgcolor: '#1976d2',
                                '&:hover': { bgcolor: '#1565c0' }
                            }}
                        >
                            Create Project
                        </Button>
                    </Box>
                </Box>

                {/* Stats Overview Cards - Matching ProjectDetail style */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={700} sx={{ fontSize: '2rem', mb: 0.5, color: '#1976d2' }}>
                                {totalProjects}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Projects</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={700} sx={{ fontSize: '2rem', mb: 0.5, color: '#4caf50' }}>
                                {activeProjects}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Active Projects</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={700} sx={{ fontSize: '2rem', mb: 0.5, color: '#ff9800' }}>
                                {totalTasks}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Tasks</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={0} sx={{ p: 2.5, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={700} sx={{ fontSize: '2rem', mb: 0.5, color: '#9c27b0' }}>
                                {totalMembers}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Team Members</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Projects Grid */}
                {filteredProjects.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid #e8e8e8', borderRadius: 2 }}>
                        <Typography variant="h6" color="text.secondary">
                            {searchTerm ? 'No projects match your search' : 'No projects yet. Create your first project!'}
                        </Typography>
                        {!searchTerm && (
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/admin/projects/new')}
                                sx={{ mt: 2, textTransform: 'none' }}
                            >
                                Create Project
                            </Button>
                        )}
                    </Paper>
                ) : (
                    <Grid container spacing={3}>
                        {filteredProjects.map((project) => {
                            const jobsCount = project.jobs_count || 0;
                            const tasksCount = project.tasks_count || 0;
                            const membersCount = project.members_count || 0;
                            const priorityColor = getPriorityColor(project.priority, project.priorityDefinition);
                            const statusColor = getStatusColor(project.status, project.statusDefinition);
                            
                            return (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
                                    <Paper elevation={0} sx={getProjectCardStyle(isDarkMode)}>
                                        <Box sx={{ p: 2.5 }}>
                                            {/* Header with menu */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                                <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: '1rem', lineHeight: 1.3 }}>
                                                    {project.name}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        setMenuAnchor(e.currentTarget);
                                                        setSelectedProject(project);
                                                    }}
                                                    sx={{ color: '#999', p: 0.5 }}
                                                >
                                                    <MoreIcon fontSize="small" />
                                                </IconButton>
                                            </Box>

                                            {/* Description */}
                                            {project.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem', lineHeight: 1.4 }}>
                                                    {project.description.length > 100 ? project.description.substring(0, 100) + '...' : project.description}
                                                </Typography>
                                            )}

                                            {/* Priority & Status Chips */}
                                            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                                                <Chip
                                                    size="small"
                                                    label={getPriorityLabel(project.priority, project.priorityDefinition)}
                                                    sx={{ bgcolor: priorityColor, color: '#fff', fontSize: '0.7rem', height: 24 }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={getStatusLabel(project.status, project.statusDefinition)}
                                                    sx={{ bgcolor: statusColor, color: '#fff', fontSize: '0.7rem', height: 24 }}
                                                />
                                            </Stack>

                                            <Divider sx={{ my: 1.5 }} />

                                            {/* Stats Row */}
                                            <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'space-around' }}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <JobIcon sx={{ fontSize: 20, color: '#666', mb: 0.5 }} />
                                                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                                                        {jobsCount}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">Jobs</Typography>
                                                </Box>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <TaskIcon sx={{ fontSize: 20, color: '#666', mb: 0.5 }} />
                                                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                                                        {tasksCount}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">Tasks</Typography>
                                                </Box>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <PeopleIcon sx={{ fontSize: 20, color: '#666', mb: 0.5 }} />
                                                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                                                        {membersCount}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">Members</Typography>
                                                </Box>
                                            </Stack>

                                            <Divider sx={{ my: 1.5 }} />

                                            {/* Timeline */}
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                                <CalendarIcon sx={{ fontSize: 14, color: '#999' }} />
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                    {formatDate(project.start_date)} — {formatDate(project.end_date)}
                                                </Typography>
                                            </Stack>

                                            {/* Progress Bar */}
                                            <Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Progress</Typography>
                                                    <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>{project.progress || 0}%</Typography>
                                                </Box>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={project.progress || 0} 
                                                    sx={{ height: 4, borderRadius: 2 }} 
                                                />
                                            </Box>

                                            {/* Project Manager */}
                                            {project.projectManager && (
                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1.5 }}>
                                                    <PersonIcon sx={{ fontSize: 12, color: '#999' }} />
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                        {project.projectManager.name}
                                                    </Typography>
                                                </Stack>
                                            )}
                                        </Box>

                                        {/* Action Button */}
                                        <Box sx={{ p: 2.5, pt: 0 }}>
                                            <Button 
                                                fullWidth
                                                variant="outlined"
                                                onClick={() => handleViewProject(project)}
                                                startIcon={<ViewIcon />}
                                                size="medium"
                                                sx={{ 
                                                    borderRadius: 1.5, 
                                                    textTransform: 'none', 
                                                    fontWeight: 500,
                                                    color: '#555',
                                                    borderColor: '#d0d0d0',
                                                    '&:hover': {
                                                        borderColor: '#1976d2',
                                                        color: '#1976d2'
                                                    }
                                                }}
                                            >
                                                Manage Project
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}

                {/* Project Menu */}
                <Menu 
                    anchorEl={menuAnchor} 
                    open={Boolean(menuAnchor)} 
                    onClose={() => setMenuAnchor(null)}
                    PaperProps={{
                        sx: {
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            minWidth: 140
                        }
                    }}
                >
                    <MenuItem onClick={() => { handleViewProject(selectedProject); setMenuAnchor(null); }} sx={{ fontSize: '0.85rem' }}>
                        <ViewIcon sx={{ mr: 1, fontSize: 18 }} /> View Details
                    </MenuItem>
                    <MenuItem onClick={handleCloneProject} sx={{ fontSize: '0.85rem' }}>
                        <CloneIcon sx={{ mr: 1, fontSize: 18 }} /> Clone Project
                    </MenuItem>
                    <MenuItem onClick={() => { setDeleteDialogOpen(true); setMenuAnchor(null); }} sx={{ color: '#d32f2f', fontSize: '0.85rem' }}>
                        <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
                    </MenuItem>
                </Menu>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 600 }}>Delete Project</DialogTitle>
                    <DialogContent>
                        <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                            Are you sure you want to delete <strong>"{selectedProject?.name}"</strong>?
                            <Box sx={{ mt: 1, fontSize: '0.8rem' }}>
                                This will also delete all jobs and tasks under this project.
                                This action cannot be undone.
                            </Box>
                        </Alert>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, pt: 0 }}>
                        <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                        <Button onClick={handleDeleteProject} color="error" variant="contained" sx={{ textTransform: 'none' }}>Delete</Button>
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
        </AdminLayout>
    );
};

export default ProjectsList;
