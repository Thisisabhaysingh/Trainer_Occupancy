import React from 'react';
import { Box } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const TaskReports = () => (
  <Box>
    <PageShell title="Task Reports" description="Task analytics, exports and performance metrics." />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 420, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Task reports mock
      </Box>
    </Box>
  </Box>
);

export default TaskReports;
