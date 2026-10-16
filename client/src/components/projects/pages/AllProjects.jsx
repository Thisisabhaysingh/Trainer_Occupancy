import React, { useMemo, useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, Button, Chip, Avatar, Stack } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';
import { projects as mockProjects, users, branches } from '../mockData';

const Stat = ({ title, value }) => (
  <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
    <Typography variant="caption" color="text.secondary">{title}</Typography>
    <Typography fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
  </Paper>
);

const ProjectCard = ({ p }) => {
  const owner = users.find(u => u.id === p.ownerId);
  const branch = branches.find(b => b.id === p.branchId);
  return (
    <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>{p.name}</Typography>
          <Chip label={p.priority} size="small" />
        </Box>
        <Typography variant="body2" color="text.secondary">{p.description}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">{branch?.name || '—'}</Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>{p.startDate} — {p.endDate}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 28, height: 28 }}>{owner?.name?.charAt(0) || 'U'}</Avatar>
            <Typography variant="caption">{owner?.name}</Typography>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

const AllProjects = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => mockProjects.filter(p => {
    const q = search.trim().toLowerCase();
    const matches = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
    const statusOk = !statusFilter || p.status === statusFilter;
    return matches && statusOk;
  }), [search, statusFilter]);

  const metrics = useMemo(() => ({ total: mockProjects.length, active: mockProjects.filter(p => p.status === 'active').length, completed: mockProjects.filter(p => p.status === 'completed').length }), []);

  return (
    <Box>
      <PageShell
        title="All Projects"
        description="Modern project dashboard with KPI cards, project grid, filters and pagination."
      />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}><Stat title="Total Projects" value={metrics.total} /></Grid>
          <Grid item xs={12} sm={4}><Stat title="Active" value={metrics.active} /></Grid>
          <Grid item xs={12} sm={4}><Stat title="Completed" value={metrics.completed} /></Grid>
        </Grid>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" placeholder="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} /></Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <Button variant={statusFilter === '' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('')}>All</Button>
              <Button variant={statusFilter === 'active' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('active')}>Active</Button>
              <Button variant={statusFilter === 'planned' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('planned')}>Planned</Button>
              <Button variant={statusFilter === 'completed' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('completed')}>Completed</Button>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid key={p.id} item xs={12} sm={6} md={4}>
              <ProjectCard p={p} />
            </Grid>
          ))}
          {!filtered.length && (
            <Grid item xs={12}><Typography color="text.secondary">No projects match your filters.</Typography></Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default AllProjects;
