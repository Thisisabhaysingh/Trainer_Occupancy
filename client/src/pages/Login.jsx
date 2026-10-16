import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
} from '@mui/material';
import axios from 'axios';
import { login } from '../features/auth/authSlice';
import ParticleBackground from '../components/ParticleBackground';
import { useTheme } from '@mui/material/styles';

const Login = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [resetData, setResetData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [resetMode, setResetMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [loginError, setLoginError] = useState('');
  const theme = useTheme();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const result = await dispatch(login(formData)).unwrap();
      navigate(`/${result.user.role}`);
    } catch (err) {
      setLoginError(err?.error || 'Unable to reach the server. Please check that the backend is running.');
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);
    try {
      await axios.post(`${apiBaseUrl}/api/auth/forgot-password/request-otp`, { email: resetData.email });
      setOtpSent(true);
      setResetMessage('OTP sent to your registered email.');
    } catch (err) {
      setResetError(err.response?.data?.error || 'Unable to send OTP');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (resetData.newPassword !== resetData.confirmPassword) {
      setResetError('New password and confirm password do not match');
      return;
    }

    setResetLoading(true);
    try {
      await axios.post(`${apiBaseUrl}/api/auth/forgot-password/reset`, {
        email: resetData.email,
        otp: resetData.otp,
        newPassword: resetData.newPassword,
      });
      setResetMessage('Password reset successfully. Please login with your new password.');
      setFormData({ email: resetData.email, password: '' });
      setResetData({ email: '', otp: '', newPassword: '', confirmPassword: '' });
      setOtpSent(false);
      setResetMode(false);
    } catch (err) {
      setResetError(err.response?.data?.error || 'Unable to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}`);
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 0,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #181a20 0%, #23272f 100%)'
          : 'linear-gradient(135deg, #f8fbff 0%, #e6eeff 100%)',
        transition: 'background 0.3s',
      }}
    >
      <ParticleBackground />
      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <img src="/omotec-logo.webp" alt="OMOTEC Logo" style={{ width: 200, marginBottom: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }} />
        </Box>

        <Paper
            elevation={theme.palette.mode === 'dark' ? 12 : 6}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
              borderRadius: 4,
              background: theme.palette.mode === 'dark'
                ? 'rgba(32, 36, 48, 0.98)'
                : 'rgba(255,255,255,0.98)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0,0,0,0.45)'
                : '0 8px 32px rgba(162,89,255,0.10)',
              border: theme.palette.mode === 'dark'
                ? '1.5px solid #23272f'
                : '1.5px solid #e3e8f7',
              backdropFilter: 'blur(8px)',
              transition: 'background 0.3s',
          }}
        >
            <Typography component="h1" variant="h5" sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? '#fff' : '#222', mb: 1 }}>
            {resetMode ? 'Reset Password' : 'Employee Activity Management'}
          </Typography>
            <Typography sx={{ color: theme.palette.mode === 'dark' ? '#bdbdbd' : '#666', mb: 2, fontSize: 16, textAlign: 'center' }}>
              {resetMode ? 'Enter your email to receive an OTP' : 'Welcome back to your workspace'}
            </Typography>
          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>
          )}
          {resetError && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{resetError}</Alert>
          )}
          {resetMessage && (
            <Alert severity="success" sx={{ mb: 2, width: '100%' }}>{resetMessage}</Alert>
          )}

          {!resetMode ? (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              error={!!loginError}
              helperText={loginError ? ' ' : ''}
                sx={{
                  input: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                    background: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.95)' : '#f3f6fa',
                    borderRadius: 2,
                  },
                  label: { color: theme.palette.mode === 'dark' ? '#bdbdbd' : '#666' },
                  fieldset: {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)'
                  }
                }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={!!loginError}
              helperText={loginError ? ' ' : ''}
                sx={{
                  input: {
                    color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                    background: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.95)' : '#f3f6fa',
                    borderRadius: 2,
                  },
                  label: { color: theme.palette.mode === 'dark' ? '#bdbdbd' : '#666' },
                  fieldset: {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)'
                  }
                }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
                className="animated-gradient-btn"
                sx={{
                  mt: 3,
                  mb: 2,
                  fontWeight: 700,
                  fontSize: 18,
                  py: 1.5,
                  borderRadius: 3,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(90deg, #6c3ef7 0%, #38f9d7 100%)'
                    : 'linear-gradient(90deg, #a259ff 0%, #ff6a88 100%)',
                  color: '#fff',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 2px 12px rgba(108,62,247,0.18)'
                    : '0 2px 12px rgba(162,89,255,0.18)',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.04)',
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(90deg, #38f9d7 0%, #6c3ef7 100%)'
                      : 'linear-gradient(90deg, #ff6a88 0%, #a259ff 100%)',
                  },
                }}
            >
                SIGN IN
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                onClick={() => {
                  setResetMode(true);
                  setResetData(prev => ({ ...prev, email: formData.email }));
                  setLoginError('');
                  setResetError('');
                  setResetMessage('');
                }}
                sx={{ fontWeight: 600, textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </Box>
          </Box>
          ) : (
          <Box component="form" onSubmit={otpSent ? handleResetPassword : handleRequestOtp} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Registered Email"
              name="email"
              type="email"
              value={resetData.email}
              onChange={handleResetChange}
              disabled={otpSent}
              sx={{
                input: {
                  color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                  background: theme.palette.mode === 'dark' ? 'rgba(44,48,56,0.95)' : '#f3f6fa',
                  borderRadius: 2,
                },
                label: { color: theme.palette.mode === 'dark' ? '#bdbdbd' : '#666' },
              }}
            />
            {otpSent && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="6-digit OTP"
                  name="otp"
                  value={resetData.otp}
                  onChange={handleResetChange}
                  inputProps={{ maxLength: 6 }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={resetData.newPassword}
                  onChange={handleResetChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={resetData.confirmPassword}
                  onChange={handleResetChange}
                />
              </>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={resetLoading}
              sx={{
                mt: 3,
                mb: 2,
                fontWeight: 700,
                fontSize: 16,
                py: 1.25,
                borderRadius: 3,
              }}
            >
              {resetLoading ? 'Please wait...' : (otpSent ? 'RESET PASSWORD' : 'SEND OTP')}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              {otpSent && (
                <Link
                  component="button"
                  type="button"
                  onClick={handleRequestOtp}
                  sx={{ fontWeight: 600, textDecoration: 'none' }}
                >
                  Resend OTP
                </Link>
              )}
              <Link
                component="button"
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setOtpSent(false);
                  setResetError('');
                  setResetMessage('');
                }}
                sx={{ ml: 'auto', fontWeight: 600, textDecoration: 'none' }}
              >
                Back to login
              </Link>
            </Box>
          </Box>
          )}
        </Paper>
      </Box>
    </Container>
    </Box>
  );
};

export default Login; 
