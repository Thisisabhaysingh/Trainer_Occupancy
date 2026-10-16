import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Alert,
    Snackbar,
    CircularProgress,
    Divider
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Flag as FlagIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../AdminLayout';
import ManagerLayout from '../ManagerLayout';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const ProjectForm = ({ isManagerView = false }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);
    const [priorities, setPriorities] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [managers, setManagers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [searchTerm, setSearchTerm] = useState('');
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

    // Conditional paths
    const backPath = isManagerView ? '/manager' : '/admin/projects';
    const Layout = isManagerView ? ManagerLayout : AdminLayout;
    const userRole = isManagerView ? 'Manager' : 'Administrator';
    const userLabel = isManagerView ? 'Manager' : 'Admin';
    const breadcrumbBase = isManagerView
        ? [{ label: 'Manager', path: '/manager', active: false }]
        : [{ label: 'Admin', path: '/admin', active: false }];
    const projectsPath = isManagerView ? '/manager' : '/admin/projects';

    useEffect(() => {
        fetchCurrentUser();
        fetchFormData();
        if (id) fetchProject();
    }, [id]);

    const fetchCurrentUser = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/auth/me`, { withCredentials: true });
            setCurrentUser(response.data);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const fetchFormData = async () => {
        try {
            // For managers, fetch only team members; for admin, fetch all employees
            const employeesEndpoint = isManagerView
                ? `${apiBaseUrl}/api/manager/team-members`
                : `${apiBaseUrl}/api/employees`;

            const [prioritiesRes, statusesRes, deptsRes, branchesRes, employeesRes] = await Promise.all([
                axios.get(`${apiBaseUrl}/api/priorities`, { withCredentials: true }).catch(() => ({ data: { success: false, priorities: [] } })),
                axios.get(`${apiBaseUrl}/api/statuses`, { withCredentials: true }).catch(() => ({ data: { success: false, statuses: [] } })),
                axios.get(`${apiBaseUrl}/api/departments`, { withCredentials: true }).catch(() => ({ data: [] })),
                axios.get(`${apiBaseUrl}/api/branches`, { withCredentials: true }).catch(() => ({ data: [] })),
                axios.get(employeesEndpoint, { withCredentials: true }).catch(() => ({ data: [] }))
            ]);

            if (prioritiesRes.data?.success) setPriorities(prioritiesRes.data.priorities || []);
            if (statusesRes.data?.success) setStatuses(statusesRes.data.statuses || []);
            setDepartments(deptsRes.data || []);
            setBranches(branchesRes.data || []);
            
            // For manager view, employees are already team members; for admin, filter managers
            if (isManagerView) {
                setManagers(employeesRes.data || []);
            } else {
                const allEmployees = employeesRes.data || [];
                setManagers(allEmployees.filter(emp => emp.role === 'manager'));
            }
        } catch (error) {
            console.error('Error fetching form data:', error);
        }
    };

    const fetchProject = async () => {
        setPageLoading(true);
        try {
            const response = await axios.get(`${apiBaseUrl}/api/projects/${id}`, { withCredentials: true });
            if (response.data.success && response.data.project) {
                const project = response.data.project;
                setFormData({
                    name: project.name || '',
                    description: project.description || '',
                    departmentId: project.departmentId || '',
                    branchId: project.branchId || '',
                    project_manager: project.project_manager || '',
                    start_date: project.start_date || '',
                    end_date: project.end_date || '',
                    priority_id: project.priority_id || '',
                    status_id: project.status_id || ''
                });
            }
        } catch (error) {
            console.error('Error fetching project:', error);
            showSnackbar('Failed to load project', 'error');
        } finally {
            setPageLoading(false);
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

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showSnackbar('Project name is required', 'error');
            return;
        }

        setLoading(true);
        try {
            const url = id ? `${apiBaseUrl}/api/projects/${id}` : `${apiBaseUrl}/api/projects`;
            const method = id ? 'put' : 'post';
            
            // For manager creating a new project, set project_manager to current user
            let payload = { ...formData };
            if (isManagerView && !id && currentUser) {
                payload.project_manager = currentUser.employeeCode;
            }
            
            const response = await axios[method](url, payload, { withCredentials: true });

            if (response.data.success) {
                showSnackbar(id ? 'Project updated successfully' : 'Project created successfully', 'success');
                setTimeout(() => navigate(backPath), 1500);
            }
        } catch (error) {
            console.error('Error saving project:', error);
            showSnackbar(error.response?.data?.error || 'Failed to save project', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(backPath);
    };

    // Loading state
    if (pageLoading) {
        return (
            <Layout
                title={id ? 'Edit Project' : 'Create Project'}
                breadcrumbItems={[
                    ...breadcrumbBase,
                    { label: 'Projects', path: projectsPath, active: false },
                    { label: id ? 'Edit' : 'Create', active: true }
                ]}
                user={{ name: user?.name || userLabel, role: userRole }}
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

    // Main view
    return (
        <Layout
            title={id ? 'Edit Project' : 'Create Project'}
            breadcrumbItems={[
                ...breadcrumbBase,
                { label: 'Projects', path: projectsPath, active: false },
                { label: id ? 'Edit' : 'Create', active: true }
            ]}
            user={{ name: user?.name || userLabel, role: userRole }}
            onLogout={handleLogout}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
        >
            <Box>
                {/* Back Button */}
                <Button
                    startIcon={<BackIcon />}
                    onClick={handleCancel}
                    sx={{
                        textTransform: 'none',
                        color: '#666',
                        mb: 3,
                        '&:hover': { bgcolor: 'transparent', color: '#1976d2' }
                    }}
                >
                    Back to {isManagerView ? 'Dashboard' : 'Projects'}
                </Button>

                {/* Form Card */}
                <Paper sx={{
                    borderRadius: 2,
                    border: '1px solid #e8e8e8',
                    boxShadow: 'none',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <Box sx={{
                        p: 3,
                        borderBottom: '1px solid #e8e8e8',
                        bgcolor: '#fafafa'
                    }}>
                        <Typography variant="h6" fontWeight={600}>
                            {id ? 'Edit Project' : 'Create New Project'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {id ? 'Update project details and settings' : 'Fill in the details to create a new project'}
                        </Typography>
                    </Box>

                    {/* Form Content */}
                    <Box sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                            {/* Project Name */}
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Project Name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </Grid>

                            {/* Description */}
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    multiline
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </Grid>

                            {/* Department & Branch */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Department</InputLabel>
                                    <Select
                                        value={formData.departmentId}
                                        label="Department"
                                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {departments.map(dept => (
                                            <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Branch</InputLabel>
                                    <Select
                                        value={formData.branchId}
                                        label="Branch"
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {branches.map(branch => (
                                            <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Dates */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Start Date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="End Date"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            {/* Project Manager - Show only for admin or when editing */}
                            {(!isManagerView || id) && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Project Manager</InputLabel>
                                        <Select
                                            value={formData.project_manager}
                                            label="Project Manager"
                                            onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
                                        >
                                            <MenuItem value="">None</MenuItem>
                                            {managers.map(manager => (
                                                <MenuItem key={manager.employeeCode} value={manager.employeeCode}>{manager.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {/* Priority & Status */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={formData.priority_id}
                                        label="Priority"
                                        onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
                                    >
                                        <MenuItem value="">Default</MenuItem>
                                        {priorities.map(p => (
                                            <MenuItem key={p.id} value={p.id}>
                                                {p.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status_id}
                                        label="Status"
                                        onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                                    >
                                        <MenuItem value="">Default</MenuItem>
                                        {statuses.map(s => (
                                            <MenuItem key={s.id} value={s.id}>
                                                {s.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, pt: 2, borderTop: '1px solid #e8e8e8' }}>
                            <Button
                                variant="outlined"
                                onClick={handleCancel}
                                sx={{ textTransform: 'none', px: 3 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={loading}
                                sx={{ textTransform: 'none', px: 3 }}
                            >
                                {loading ? <CircularProgress size={24} /> : (id ? 'Update Project' : 'Create Project')}
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
                </Snackbar>
            </Box>
        </Layout>
    );
};

export default ProjectForm;