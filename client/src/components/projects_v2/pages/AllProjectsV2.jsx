import React, { useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, Button, Chip, Avatar, Stack } from '@mui/material';
import { projectsV2, usersV2, branchesV2 } from '../mockDataV2';

const KPI = ({ label, value }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }} elevation={0}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
  </Paper>
);

const ProjectCardV2 = ({ p }) => {
  const owner = usersV2.find(u => u.id === p.ownerId);
  const branch = branchesV2.find(b => b.id === p.branchId);
  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <Box>
          <Typography fontWeight={800}>{p.name}</Typography>
          <Typography variant="caption" color="text.secondary">{p.description}</Typography>
        </Box>
        <Chip label={p.priority} size="small" />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', mt: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">{branch?.name}</Typography>
          <Typography variant="caption">{p.startDate} — {p.endDate}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28 }}>{owner?.name?.charAt(0) || 'U'}</Avatar>
          <Typography variant="caption">{owner?.name}</Typography>
        </Stack>
      </Box>
    </Paper>
  );
};

const AllProjectsV2 = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => projectsV2.filter(p => {
    const q = search.trim().toLowerCase();
    const matches = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
    const statusOk = !statusFilter || p.status === statusFilter;
    return matches && statusOk;
  }), [search, statusFilter]);

  const metrics = useMemo(() => ({ total: projectsV2.length, active: projectsV2.filter(p => p.status === 'active').length, completed: projectsV2.filter(p => p.status === 'completed').length }), []);

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }} elevation={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Projects</Typography>
            <Typography color="text.secondary">Modern dashboard — matching reference layout</Typography>
          </Box>
          <Box>
            <Button variant="contained">Create Project</Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}><KPI label="Total Projects" value={metrics.total} /></Grid>
        <Grid item xs={12} md={4}><KPI label="Active" value={metrics.active} /></Grid>
        <Grid item xs={12} md={4}><KPI label="Completed" value={metrics.completed} /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}><TextField fullWidth size="small" placeholder="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} /></Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant={statusFilter === '' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('')}>All</Button>
            <Button variant={statusFilter === 'active' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('active')}>Active</Button>
            <Button variant={statusFilter === 'planned' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('planned')}>Planned</Button>
            <Button variant={statusFilter === 'completed' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('completed')}>Completed</Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {filtered.map(p => (
          <Grid key={p.id} item xs={12} sm={6} md={4}>
            <ProjectCardV2 p={p} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AllProjectsV2;
