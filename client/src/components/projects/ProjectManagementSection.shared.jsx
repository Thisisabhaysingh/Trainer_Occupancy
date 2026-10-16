import React, { useCallback, useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Stack, Chip, Divider } from '@mui/material';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const TEMPLATE_STORAGE_KEY = 'projectJobTemplates_v2';

export const statusColorMap = {
  active: 'primary',
  completed: 'success',
  planned: 'warning',
  'on-hold': 'warning',
  cancelled: 'error',
  pending: 'default',
  'in-progress': 'info',
  review: 'secondary',
  blocked: 'error'
};

export const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
export const assigneeTypes = ['User', 'Team', 'Role'];
export const kanbanStatuses = [
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'completed', label: 'Completed' }
];

export const generateItemId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const emptyTemplate = () => ({
  id: generateItemId('template'),
  name: '',
  description: '',
  jobs: []
});

export const emptyJob = () => ({
  id: generateItemId('job'),
  title: '',
  description: '',
  order: 0,
  tasks: []
});

export const emptyTask = () => ({
  id: generateItemId('task'),
  title: '',
  description: '',
  priority: 'Medium',
  estimatedHours: '',
  assigneeType: 'User',
  dependencies: [],
  order: 0,
  status: 'pending'
});

export const timestampLabel = (value) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const statusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in-progress':
      return 'In Progress';
    case 'review':
      return 'Review';
    case 'completed':
      return 'Completed';
    case 'blocked':
      return 'Blocked';
    default:
      return status;
  }
};

export const PageShell = ({ title, description, children, actions }) => (
  <Box>
    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { xs: 'flex-start', sm: 'center' }
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Box>
        {actions ? <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box> : null}
      </Box>
      {children}
    </Paper>
  </Box>
);

export const useJobTemplates = () => {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (stored) {
      try {
        setTemplates(JSON.parse(stored));
      } catch (error) {
        console.error('Unable to parse saved project templates', error);
      }
    }
  }, []);

  const saveTemplates = useCallback((nextTemplates) => {
    setTemplates(nextTemplates);
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
  }, []);

  return [templates, saveTemplates];
};

export const TemplateCard = ({ template, selected, onSelect, onView, onEdit, onDuplicate, onDelete }) => (
  <Paper
    elevation={selected ? 8 : 1}
    sx={{
      p: 3,
      borderRadius: 3,
      border: selected ? '2px solid #0070F0' : '1px solid',
      borderColor: selected ? '#0070F0' : 'divider',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.05)'
      }
    }}
    onClick={onSelect}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          {template.name || 'Untitled Template'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {template.description || 'Job template with reusable jobs and task definitions.'}
        </Typography>
      </Box>
      <Chip
        label={`${template.jobs?.length || 0} jobs`}
        size="small"
        sx={{ bgcolor: '#EFF6FF', color: '#0B69FF', fontWeight: 600 }}
      />
    </Box>
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
      <Chip label={`${template.jobs?.reduce((sum, job) => sum + (job.tasks?.length || 0), 0)} tasks`} size="small" />
      <Chip label="Reusable" size="small" color="secondary" />
    </Stack>
    <Divider sx={{ my: 2 }} />
    <Stack direction="row" spacing={1}>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onView();
        }}
        sx={{ textTransform: 'none' }}
      >
        View
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        sx={{ textTransform: 'none' }}
      >
        Edit
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onDuplicate();
        }}
        sx={{ textTransform: 'none' }}
      >
        Duplicate
      </Button>
      <Button
        size="small"
        color="error"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        sx={{ textTransform: 'none' }}
      >
        Delete
      </Button>
    </Stack>
  </Paper>
);
