import React, { useContext } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { ColorModeContext } from '../app/ThemeContext';
import { useTheme } from '@mui/material/styles';

function ThemeToggleButton() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  return (
    <Tooltip title={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton onClick={colorMode.toggleColorMode} color="inherit" size="large" sx={{ background: 'rgba(76,62,247,0.08)', boxShadow: 1 }}>
        {theme.palette.mode === 'dark' ? (
          <Brightness7 sx={{ color: '#FFD600' }} />
        ) : (
          <Brightness4 />
        )}
      </IconButton>
    </Tooltip>
  );
}

export default ThemeToggleButton; 