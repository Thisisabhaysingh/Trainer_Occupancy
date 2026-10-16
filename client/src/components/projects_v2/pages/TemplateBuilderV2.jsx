import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import PageShellV2 from '../components/PageShellV2';

const TemplateBuilderV2 = () => (
  <PageShellV2 title="Template Builder" description="Compose templates from jobs and tasks">
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1">Jobs Palette</Typography>
            <Typography variant="body2" color="text.secondary">Drag jobs here to compose a template (placeholder)</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1">Template Preview</Typography>
            <Typography variant="body2" color="text.secondary">Preview of assembled template (placeholder)</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </PageShellV2>
);

export default TemplateBuilderV2;
