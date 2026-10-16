import React from 'react';
import { Box, Button } from '@mui/material';
import { PageShell } from '../ProjectManagementSection.shared.jsx';

const CreateTemplate = () => (
  <Box>
    <PageShell title="Create Template" description="Wizard: Template Details → Build Jobs → Build Tasks → Review" actions={[<Button key="start" variant="contained">Start</Button>]} />
    <Box sx={{ p: 3 }}>
      <Box sx={{ height: 520, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Create Template wizard mock
      </Box>
    </Box>
  </Box>
);

export default CreateTemplate;
