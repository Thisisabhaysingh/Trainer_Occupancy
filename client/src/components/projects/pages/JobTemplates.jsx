import React from 'react';
import { Box, Button } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const JobTemplates = () => (
  <Box>
    <PageShell title="Job Templates" description="Template marketplace: card grid, search & filters." actions={[<Button key="create" variant="contained">Create Template</Button>]} />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 420, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Job templates marketplace mock
      </Box>
    </Box>
  </Box>
);

export default JobTemplates;
