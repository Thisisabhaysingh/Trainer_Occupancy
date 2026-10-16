import React, { useEffect } from 'react';
import { Box, Typography, Grid, Button, Paper, Avatar } from '@mui/material';
import { AccessTime, BarChart, AdminPanelSettings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';

const Home = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const theme = useTheme();
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}`);
    }
  }, [isAuthenticated, user, navigate]);
  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'transparent',
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #181a20 0%, #23272f 100%)'
        : 'linear-gradient(135deg, #f8fbff 0%, #e6eeff 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <img src="https://onmyowntechnology.com/images/omotec_logo.webp" alt="OMOTEC Logo" style={{ width: 120, marginBottom: 16 }} />
        <Typography variant="h3" fontWeight={900} sx={{
          letterSpacing: 2, mb: 2, textShadow: theme.palette.mode === 'dark' ? '0 2px 8px #23272f' : '0 2px 8px #e3e8f7',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, #38f9d7 0%, #6c3ef7 100%)'
            : 'linear-gradient(90deg, #a259ff 0%, #38f9d7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          OMOTEC
        </Typography>
      </Box>
      <Typography variant="h3" fontWeight={800} sx={{ mb: 1, textAlign: 'center',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(90deg, #38f9d7 0%, #6c3ef7 100%)'
          : 'linear-gradient(90deg, #a259ff 0%, #38f9d7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Workday Productivity Tracker
      </Typography>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 500, color: theme.palette.mode === 'dark' ? '#fff' : '#222', textShadow: theme.palette.mode === 'dark' ? '0 1px 8px #181a20' : '0 1px 8px #a259ff44' }}>
        Streamline productivity tracking across all departments with transparency<br />and insights
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 4, textAlign: 'center', fontWeight: 700, letterSpacing: 2, color: theme.palette.mode === 'dark' ? '#fff' : '#888', opacity: 0.85 }}>
        OMOTEC
      </Typography>
      <Grid container spacing={4} justifyContent="center" sx={{ mb: 6, maxWidth: { xs: '100%', md: 1200 }, px: { xs: 1, sm: 2, md: 0 }, width: '100%' }} wrap="wrap">
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={theme.palette.mode === 'dark' ? 8 : 0} sx={{
            p: { xs: 2, md: 4 }, borderRadius: 4, textAlign: 'center',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(32,36,48,0.98)' : 'rgba(255,255,255,0.95)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.45)'
              : '0 8px 32px rgba(162,89,255,0.10)',
            backdropFilter: 'blur(6px)',
          }}>
            <Avatar sx={{ bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#e3e8f7', color: theme.palette.mode === 'dark' ? '#38f9d7' : '#1976d2', width: 64, height: 64, mx: 'auto', mb: 2 }}>
              <AccessTime sx={{ fontSize: 38 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>Employee Portal</Typography>
            <Typography sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#bdbdbd' : '#444' }}>
              Log your daily activities, track time, and manage your work hours
            </Typography>
            <Button fullWidth variant="contained" sx={{
              fontWeight: 700,
              background: 'linear-gradient(90deg, #a259ff 0%, #38f9d7 100%)',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(162,89,255,0.18)',
              '&:hover': {
                background: 'linear-gradient(90deg, #38f9d7 0%, #a259ff 100%)',
              },
            }} onClick={() => navigate('/login')}>
              Enter as Employee
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={theme.palette.mode === 'dark' ? 8 : 0} sx={{
            p: { xs: 2, md: 4 }, borderRadius: 4, textAlign: 'center',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(32,36,48,0.98)' : 'rgba(255,255,255,0.95)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.45)'
              : '0 8px 32px rgba(162,89,255,0.10)',
            backdropFilter: 'blur(6px)',
          }}>
            <Avatar sx={{ bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#f3e8fd', color: theme.palette.mode === 'dark' ? '#6c3ef7' : '#a142f4', width: 64, height: 64, mx: 'auto', mb: 2 }}>
              <BarChart sx={{ fontSize: 38 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>Manager Dashboard</Typography>
            <Typography sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#bdbdbd' : '#444' }}>
              View analytics, track productivity, and manage team performance
            </Typography>
            <Button fullWidth variant="contained" sx={{
              fontWeight: 700,
              background: 'linear-gradient(90deg, #a259ff 0%, #38f9d7 100%)',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(162,89,255,0.18)',
              '&:hover': {
                background: 'linear-gradient(90deg, #38f9d7 0%, #a259ff 100%)',
              },
            }} onClick={() => navigate('/login')}>
              Enter as Manager
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={theme.palette.mode === 'dark' ? 8 : 0} sx={{
            p: { xs: 2, md: 4 }, borderRadius: 4, textAlign: 'center',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(32,36,48,0.98)' : 'rgba(255,255,255,0.95)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.45)'
              : '0 8px 32px rgba(162,89,255,0.10)',
            backdropFilter: 'blur(6px)',
          }}>
            <Avatar sx={{ bgcolor: theme.palette.mode === 'dark' ? '#23272f' : '#ffe6e6', color: theme.palette.mode === 'dark' ? '#e53935' : '#e53935', width: 64, height: 64, mx: 'auto', mb: 2 }}>
              <AdminPanelSettings sx={{ fontSize: 38 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: theme.palette.mode === 'dark' ? '#fff' : '#222' }}>Admin Portal</Typography>
            <Typography sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#bdbdbd' : '#444' }}>
              Manage users, departments, and system settings
            </Typography>
            <Button fullWidth variant="contained" sx={{
              fontWeight: 700,
              background: 'linear-gradient(90deg, #a259ff 0%, #38f9d7 100%)',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(162,89,255,0.18)',
              '&:hover': {
                background: 'linear-gradient(90deg, #38f9d7 0%, #a259ff 100%)',
              },
            }} onClick={() => navigate('/login')}>
              Enter as Admin
            </Button>
          </Paper>
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 4 }, justifyContent: 'center', alignItems: 'center', color: theme.palette.mode === 'dark' ? '#fff' : '#888', fontWeight: 600, fontSize: { xs: 16, sm: 18 }, px: { xs: 1, sm: 0, md: 0 }, textShadow: theme.palette.mode === 'dark' ? '0 1px 8px #181a20' : '0 1px 8px #a259ff44' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart sx={{ fontSize: 22 }} /> Visual Analytics
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime sx={{ fontSize: 22 }} /> Real-time Tracking
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminPanelSettings sx={{ fontSize: 22 }} /> Multi-Department Support
        </Box>
      </Box>
    </Box>
  );
};

export default Home; 