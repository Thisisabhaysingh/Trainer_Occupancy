import React from 'react';
import { Grid } from '@mui/material';
import PageShellV2 from '../components/PageShellV2';
import StatCardV2 from '../components/StatCardV2';

const JobAnalyticsV2 = () => (
  <PageShellV2 title="Job Analytics" description="High level job analytics and charts">
    <Grid container spacing={2}>
      <Grid item xs={12} md={3}><StatCardV2 label="Open Jobs" value={12} /></Grid>
      <Grid item xs={12} md={3}><StatCardV2 label="Avg Completion (days)" value={6} /></Grid>
      <Grid item xs={12} md={3}><StatCardV2 label="Overdue" value={2} /></Grid>
    </Grid>
  </PageShellV2>
);

export default JobAnalyticsV2;
