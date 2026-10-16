import React from 'react';
import { Grid, List, ListItemButton, Card, CardContent, Typography, Box } from '@mui/material';
import PageShellV2 from '../components/PageShellV2';
import { projectsV2 } from '../mockDataV2';

const KanbanColumn = ({ title, items }) => (
  <Card sx={{ minHeight: 200 }}>
    <CardContent>
      <Typography variant="subtitle2">{title}</Typography>
      {items.map((it) => <Box key={it.id} sx={{ p: 1, mt: 1, bgcolor: 'background.paper', borderRadius: 1 }}>{it.name}</Box>)}
    </CardContent>
  </Card>
);

const JobManagerV2 = () => (
  <PageShellV2 title="Job Manager" description="Manage jobs across projects">
    <Grid container spacing={2}>
      <Grid item xs={12} md={3}>
        <List>
          {projectsV2.map((p) => (
            <ListItemButton key={p.id}>{p.name}</ListItemButton>
          ))}
        </List>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1">Jobs</Typography>
            <Typography variant="body2" color="text.secondary">List of jobs for the selected project (placeholder)</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <KanbanColumn title="To Do" items={[{ id: 'j1', name: 'Design' }, { id: 'j2', name: 'Setup' }]} />
        <Box sx={{ height: 8 }} />
        <KanbanColumn title="In Progress" items={[{ id: 'j3', name: 'Development' }]} />
        <Box sx={{ height: 8 }} />
        <KanbanColumn title="Done" items={[{ id: 'j4', name: 'QA' }]} />
      </Grid>
    </Grid>
  </PageShellV2>
);

export default JobManagerV2;
