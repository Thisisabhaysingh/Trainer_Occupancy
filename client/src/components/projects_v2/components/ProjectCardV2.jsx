import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

const ProjectCardV2 = ({ project, branch, owner }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1">{project.name}</Typography>
        <Chip label={project.priority} size="small" />
      </Box>
      <Typography variant="body2" color="text.secondary">{project.code}</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>{project.description}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Typography variant="caption">{branch?.name || '—'}</Typography>
        <Typography variant="caption">{owner?.name || '—'}</Typography>
      </Box>
    </CardContent>
  </Card>
);

ProjectCardV2.propTypes = { project: PropTypes.object.isRequired, branch: PropTypes.object, owner: PropTypes.object };
ProjectCardV2.defaultProps = { branch: null, owner: null };

export default ProjectCardV2;
