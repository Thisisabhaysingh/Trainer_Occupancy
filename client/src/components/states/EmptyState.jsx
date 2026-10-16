import { Box, Button, Typography } from '@mui/material';

const EmptyState = ({ title = 'Nothing here yet', description, actionLabel, onAction }) => (
  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
    <Typography variant="h6">{title}</Typography>
    {description && <Typography color="text.secondary" sx={{ mt: 1 }}>{description}</Typography>}
    {actionLabel && onAction && <Button sx={{ mt: 2 }} variant="contained" onClick={onAction}>{actionLabel}</Button>}
  </Box>
);

export default EmptyState;
