import { Box, Paper, Stack, Typography } from '@mui/material';
import { managerSectionPanelSx } from './dashboardSectionStyles';

export const ManagerSectionIntro = ({ title, description, steps }) => (
  <Paper elevation={0} sx={{ ...managerSectionPanelSx, mb: 3 }}>
    <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 0.75 }}>
      {title}
    </Typography>
    <Typography sx={{ fontSize: 14, lineHeight: 1.6, color: 'text.secondary', maxWidth: 760 }}>
      {description}
    </Typography>
    {steps?.length > 0 && (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2 }}>
        {steps.map((step, index) => (
          <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#EFF6FF', color: '#0070F0', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {index + 1}
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{step}</Typography>
          </Box>
        ))}
      </Stack>
    )}
  </Paper>
);

