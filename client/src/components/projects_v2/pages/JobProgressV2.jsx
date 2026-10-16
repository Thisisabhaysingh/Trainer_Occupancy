import React from 'react';
import { Grid, Card, CardContent, Typography, List, ListItem } from '@mui/material';
import PageShellV2 from '../components/PageShellV2';

const JobProgressV2 = () => (
  <PageShellV2 title="Job Progress" description="Track progress and activity" actions={null}>
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Progress</Typography>
            <Typography variant="body2" color="text.secondary">Overall job completion metrics (placeholder)</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6">Activity Feed</Typography>
            <List>
              <ListItem>Task completed — Design wireframes</ListItem>
              <ListItem>Job started — Development</ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </PageShellV2>
);

export default JobProgressV2;
