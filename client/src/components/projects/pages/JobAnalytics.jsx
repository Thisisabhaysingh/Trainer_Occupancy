import React from 'react';
import { Box } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const JobAnalytics = () => (
  <Box>
    <PageShell title="Job Analytics" description="Charts: job status, priority distribution, completion trend, productivity." />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 520, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Analytics charts mock
      </Box>
    </Box>
  </Box>
);

export default JobAnalytics;
