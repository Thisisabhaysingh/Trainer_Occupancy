import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const APP_SHELL_SIDEBAR_WIDTH = 240;

const AppShell = ({ children, sx = {} }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#F9FAFB', ...sx }}>
      {children}
    </Box>
  );
};

export const AppShellMain = ({ children, sx = {} }) => (
  <Box sx={{ flex: 1, ml: `${APP_SHELL_SIDEBAR_WIDTH}px`, minWidth: 0, display: 'flex', flexDirection: 'column', ...sx }}>
    {children}
  </Box>
);

export const AppShellContent = ({ children, sx = {} }) => (
  <Box component="main" sx={{ flex: 1, width: '100%', boxSizing: 'border-box', p: { xs: 2, md: 4 }, ...sx }}>
    {children}
  </Box>
);

export default AppShell;
