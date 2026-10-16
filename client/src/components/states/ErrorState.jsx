import { Alert, Button, Stack } from '@mui/material';

const ErrorState = ({ error, message = 'Something went wrong.', onRetry }) => (
  <Stack spacing={2} alignItems="flex-start" role="alert">
    <Alert severity="error">{error?.message || message}</Alert>
    {onRetry && <Button variant="outlined" onClick={onRetry}>Try again</Button>}
  </Stack>
);

export default ErrorState;
