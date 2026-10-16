import React from 'react';
import { Grid, Button } from '@mui/material';
import PageShellV2 from '../components/PageShellV2';
import StatCardV2 from '../components/StatCardV2';
import ProjectCardV2 from '../components/ProjectCardV2';
import { projectsV2, branchesV2, usersV2 } from '../mockDataV2';

const CompletedProjectsV2 = () => {
  const completed = projectsV2.filter((p) => p.status === 'completed');
  return (
    <PageShellV2 title="Completed Projects" description="Recently completed projects" actions={<Button variant="outlined">Archive</Button>}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4} md={3}><StatCardV2 label="Completed" value={completed.length} /></Grid>
        <Grid item xs={12} sm={4} md={3}><StatCardV2 label="Total Projects" value={projectsV2.length} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        {completed.map((p) => (
          <Grid key={p.id} item xs={12} sm={6} md={4}>
            <ProjectCardV2 project={p} branch={branchesV2.find((b) => b.id === p.branchId)} owner={usersV2.find((u) => u.id === p.ownerId)} />
          </Grid>
        ))}
      </Grid>
    </PageShellV2>
  );
};

export default CompletedProjectsV2;
