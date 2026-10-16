import React from 'react';
import { Box } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const JobManager = () => (
  <Box>
    <PageShell title="Job Manager" description="Project Job Tree / Selected Job / Task Kanban layout." />
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '280px 1fr 360px', gap: 2 }}>
        <Box sx={{ height: 640, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>Project Job Tree mock</Box>
        <Box sx={{ height: 640, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>Selected job mock</Box>
        <Box sx={{ height: 640, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>Task Kanban mock</Box>
      </Box>
    </Box>
  </Box>
);

export default JobManager;
