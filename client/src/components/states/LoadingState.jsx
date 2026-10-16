import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingState = ({ message = 'Loading…', minHeight = 240 }) => (
  <Box role="status" aria-live="polite" sx={{ minHeight, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
    <Box><CircularProgress size={32} /><Typography sx={{ mt: 1.5 }} color="text.secondary">{message}</Typography></Box>
  </Box>
);

export default LoadingState;
