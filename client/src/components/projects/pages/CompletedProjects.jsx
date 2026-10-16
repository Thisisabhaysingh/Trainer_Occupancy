import React from 'react';
import { Box } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const CompletedProjects = () => (
  <Box>
    <PageShell title="Completed Projects" description="Archive view with completion metrics and export actions." />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 420, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Completed projects archive mock
      </Box>
    </Box>
  </Box>
);

export default CompletedProjects;
