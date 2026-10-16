import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { MenuBook, Assessment } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { reportcardSsoUrl } from '../../core/integrations/reportcard';
import { hasPermission } from '../../core/auth/permissions';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
export default function ToolsDashboard({ user }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [toolAssignments, setToolAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${apiBaseUrl}/api/admin/tool-assignments/me`, { withCredentials: true, signal: controller.signal })
      .then(({ data }) => setToolAssignments(data))
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.error || 'Could not load assigned tools.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  if (loading) return <CircularProgress aria-label="Loading tools" />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
          <Box sx={{ width: '100%' }}>
            {/* Tools Header */}
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: isDarkMode ? '#F2F4F7' : '#101828' }}>
              Tools
            </Typography>
            <Typography variant="body2" sx={{ mb: 4, color: isDarkMode ? '#9CA3AF' : '#667085' }}>
              Access available tools and preview upcoming tools.
            </Typography>

            {/* Tools Grid - Square cards aligned top-left */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
              {/* Workbook Card */}
              {toolAssignments.workbook && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 0,
                    width: 280,
                    bgcolor: isDarkMode ? 'rgba(138,100,255,0.08)' : '#ffffff',
                    border: `1px solid ${isDarkMode ? 'rgba(138,100,255,0.2)' : '#E4E7F0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      borderColor: isDarkMode ? 'rgba(138,100,255,0.4)' : '#8a64ff'
                    }
                  }}
                  component="a"
                  href="https://time.onmyowntechnology.com/workbook/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 0,
                      bgcolor: '#8a64ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff'
                    }}>
                      <MenuBook sx={{ fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: isDarkMode ? '#F2F4F7' : '#101828', mb: 0.5 }}>Workbook</Typography>
                      <Typography variant="caption" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085' }}>Track learning progress</Typography>
                    </Box>
                  </Box>
                </Paper>
              )}

              {/* Report Card */}
              {toolAssignments.reportCard && hasPermission(user, 'reportcard.view') && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 0,
                    width: 280,
                    bgcolor: isDarkMode ? 'rgba(56,249,215,0.08)' : '#ffffff',
                    border: `1px solid ${isDarkMode ? 'rgba(56,249,215,0.2)' : '#E4E7F0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  component="a"
                  href={reportcardSsoUrl('/admin/dashboard')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 0,
                      bgcolor: '#38f9d7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff'
                    }}>
                      <Assessment sx={{ fontSize: 24 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: isDarkMode ? '#F2F4F7' : '#101828', mb: 0.5 }}>Report Card</Typography>
                      <Typography variant="caption" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', fontWeight: 700 }}>Open with MIS</Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 0, width: 280, opacity: 0.72, bgcolor: isDarkMode ? 'rgba(138,100,255,0.08)' : '#fff', border: `1px solid ${isDarkMode ? 'rgba(138,100,255,0.2)' : '#E4E7F0'}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, bgcolor: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Assessment /></Box>
                  <Box><Typography variant="subtitle1" fontWeight={600}>Employee Assessment</Typography><Typography variant="caption" sx={{ color: isDarkMode ? '#9CA3AF' : '#667085', fontWeight: 700 }}>Coming soon</Typography></Box>
                </Box>
              </Paper>
            </Box>
          </Box>
); }
