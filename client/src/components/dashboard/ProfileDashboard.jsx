import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Divider, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const displayName = (value) => typeof value === 'string' ? value : value?.name || 'Not assigned';
const displayDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const card = { p: { xs: 2.5, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(16,24,40,0.08)' };

export default function ProfileDashboard({ user, manager, branch }) {
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setProfileLoading(true);
    setProfileError('');
    axios.get(`${apiBaseUrl}/api/auth/me`, { withCredentials: true, signal: controller.signal })
      .then(({ data }) => setProfile(data))
      .catch(err => { if (!controller.signal.aborted) setProfileError(err.response?.data?.error || 'Could not load all profile details.'); })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const account = { ...user, ...profile };
  const roleLabel = account.role === 'senior_manager' ? 'Senior Manager' : 'Manager';
  const department = displayName(manager?.department || account.department);
  const branchName = displayName(branch || manager?.branch || account.branch);
  const scope = account.managerType || manager?.managerType;
  const details = [
    ['Full name', account.name || '—'],
    ['Employee code', account.employeeCode || '—'],
    ['Email address', account.email || '—'],
    ['Role', roleLabel],
    ['Department', department],
    ['Branch', branchName],
    ['Management scope', scope === 'department' ? 'Department' : scope === 'branch' ? 'Branch' : 'Not assigned'],
    ['Account created', displayDate(account.createdAt)],
  ];

  const changePassword = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSuccess('');
    if (passwords.newPassword.trim().length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { setError('New passwords do not match.'); return; }
    if (passwords.oldPassword === passwords.newPassword) { setError('Choose a password different from your current password.'); return; }
    setSaving(true);
    try {
      await axios.post(`${apiBaseUrl}/api/auth/change-password`, {
        oldPassword: passwords.oldPassword, newPassword: passwords.newPassword,
      }, { withCredentials: true });
      setSuccess('Password updated successfully.');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setVisible({});
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update password. Please try again.');
    } finally { setSaving(false); }
  };

  return <Stack spacing={3}>
    {profileError && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => setRetry(value => value + 1)}>Retry</Button>}>{profileError}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
      <Paper elevation={0} sx={{ ...card, textAlign: 'center', background: theme => theme.palette.mode === 'dark' ? theme.palette.background.paper : 'linear-gradient(145deg, #f6f1ff 0%, #e5f6ff 60%, #fff6f2 100%)' }}>
        <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, fontSize: 30, fontWeight: 700, color: 'primary.main', bgcolor: theme => alpha(theme.palette.primary.main, 0.12) }}>
          {(account.name || roleLabel).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
        </Avatar>
        <Typography variant="h6" fontWeight={700}>{account.name || roleLabel}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{account.email || '—'}</Typography>
        <Chip label={roleLabel} color="primary" variant="outlined" size="small" sx={{ mt: 2 }} />
        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary">Employee code</Typography>
        <Typography fontWeight={600} sx={{ mt: 0.5 }}>{account.employeeCode || '—'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{department} · {branchName}</Typography>
      </Paper>
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <Paper elevation={0} sx={card}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>Account Details</Typography>
            {profileLoading && <CircularProgress size={18} aria-label="Loading profile details" />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Your personal information and organization assignments.</Typography>
          <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            {details.map(([label, value]) => <Box key={label}>
              <Typography component="dt" variant="body2" color="text.secondary">{label}</Typography>
              <Typography component="dd" sx={{ m: 0, mt: 0.5, fontWeight: 500, overflowWrap: 'anywhere' }}>{value}</Typography>
            </Box>)}
          </Box>
        </Paper>
        <Paper elevation={0} sx={card}>
          <Stack direction="row" spacing={1} alignItems="center"><LockOutlined color="primary" /><Typography variant="h6" fontWeight={700}>Change Password</Typography></Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>Enter your current password and choose a new password with at least 6 characters.</Typography>
          <Box component="form" onSubmit={changePassword}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              {[['oldPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([key, label]) => <TextField
                key={key} label={label} name={key} required fullWidth size="small" disabled={saving}
                type={visible[key] ? 'text' : 'password'} autoComplete={key === 'oldPassword' ? 'current-password' : 'new-password'}
                value={passwords[key]} onChange={event => { setPasswords(values => ({ ...values, [key]: event.target.value })); setError(''); setSuccess(''); }}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton edge="end" disabled={saving}
                  aria-label={`${visible[key] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                  onClick={() => setVisible(values => ({ ...values, [key]: !values[key] }))}>
                  {visible[key] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton></InputAdornment> }}
              />)}
              <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ alignSelf: 'flex-start' }}>
                {saving ? 'Updating…' : 'Update Password'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </Box>
  </Stack>;
}
