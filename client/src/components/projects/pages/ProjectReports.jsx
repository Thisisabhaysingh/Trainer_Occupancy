import React from 'react';
import { Box } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const ProjectReports = () => (
  <Box>
    <PageShell title="Project Reports" description="Report generator with filters, history and download actions." />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 420, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Project reports mock
      </Box>
    </Box>
  </Box>
);

export default ProjectReports;
