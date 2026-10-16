import { Box, Typography } from '@mui/material';

const InventoryPageHeading = ({ title, subtitle }) => (
  <Box sx={{ mb: 3 }}>
    <Typography sx={{ fontSize: 20, lineHeight: '28px', fontWeight: 600, color: 'text.primary' }}>{title}</Typography>
    {subtitle && <Typography sx={{ mt: 0.25, fontSize: 14, lineHeight: '20px', color: 'text.secondary' }}>{subtitle}</Typography>}
  </Box>
);

export default InventoryPageHeading;
