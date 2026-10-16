import React, { useState, useMemo } from 'react';
import { Grid, Button, Card, CardContent, Typography, Box, TextField, IconButton, Stack, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageShellV2 from '../components/PageShellV2';
import { templatesV2 } from '../mockDataV2';

const TemplateCard = ({ t }) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle1">{t.name}</Typography>
          <Typography variant="body2" color="text.secondary">{t.description}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton size="small" aria-label="copy"><ContentCopyIcon fontSize="small" /></IconButton>
          <IconButton size="small" aria-label="edit"><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" aria-label="more"><MoreVertIcon fontSize="small" /></IconButton>
        </Stack>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={t.category} size="small" />
        <Chip label={t.difficulty} size="small" color={t.difficulty === 'High' ? 'error' : 'default'} />
      </Box>
    </CardContent>
  </Card>
);

const JobTemplatesV2 = () => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = useMemo(() => Array.from(new Set(templatesV2.map((t) => t.category))), []);

  const filtered = useMemo(() => templatesV2.filter((t) => {
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  }), [query, categoryFilter]);

  return (
    <PageShellV2
      title="Job Templates"
      description="Reusable job templates to speed up project creation"
      actions={<Button variant="contained">Create Template</Button>}
    >
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField placeholder="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} size="small" sx={{ minWidth: 280 }} />
        <TextField select size="small" label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ minWidth: 200 }}>
          <option value="">All</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </TextField>
      </Box>

      <Grid container spacing={2}>
        {filtered.map((t) => (
          <Grid key={t.id} item xs={12} sm={6} md={4} lg={3}>
            <TemplateCard t={t} />
          </Grid>
        ))}
      </Grid>
    </PageShellV2>
  );
};

export default JobTemplatesV2;
