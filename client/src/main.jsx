import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import './index.css';
import ThemeContextProvider from './app/ThemeContext.jsx';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './core/api/queryClient';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <ThemeContextProvider>
    <Provider store={store}>
    <App />
    </Provider>
      </ThemeContextProvider>
    </LocalizationProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
