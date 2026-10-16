import React, { createContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export default function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    []
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'dark'
            ? {
                background: { default: '#181a20', paper: '#23272f' },
                primary: { main: '#38f9d7' },
                secondary: { main: '#6c3ef7' },
              }
            : {
                background: { default: '#f8fbff', paper: '#fff' },
                primary: { main: '#6c3ef7' },
                secondary: { main: '#38f9d7' },
              }),
        },
        shape: { borderRadius: 10 },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
} 