import React, { useEffect, useMemo, useState } from 'react';
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
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { Search, ExpandMore } from '@mui/icons-material';
import { StatCard } from '../../dashboard/DashboardComponents';
import { apiBaseUrl, statusColorMap, statusLabel, timestampLabel } from '../../ProjectManagementSection.shared.jsx';

const ProjectsPage = ({ initialStatus = '', title = 'Projects', description = 'Browse active, completed and all project work in a responsive card layout.' }) => {
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

  return (
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
        </Box>
      </Paper>

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

export default ProjectsPage;
