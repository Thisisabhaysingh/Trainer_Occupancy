import React from 'react';
import { Box } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const JobProgress = () => (
  <Box>
    <PageShell title="Job Progress" description="Execution tracking: KPIs, timeline, job/task progress and activity feed." />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 520, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Job progress mock (KPIs, timeline, feed)
      </Box>
    </Box>
  </Box>
);

export default JobProgress;
