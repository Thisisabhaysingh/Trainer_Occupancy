import React from 'react';
import { Box } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const ActiveProjects = () => (
  <Box>
    <PageShell title="Active Projects" description="Enterprise table with progress bars, owner avatars and quick actions." />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 420, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Active projects table mock
      </Box>
    </Box>
  </Box>
);

export default ActiveProjects;
