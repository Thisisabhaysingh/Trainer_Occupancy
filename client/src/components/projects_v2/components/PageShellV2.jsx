import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

const PageShellV2 = ({ title, description, actions, children }) => (
  <Box sx={{ p: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography variant="h5" component="h1">{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Box>
      <Box>{actions}</Box>
    </Box>
    <Box>{children}</Box>
  </Box>
);

PageShellV2.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node
};

PageShellV2.defaultProps = { title: '', description: '', actions: null, children: null };

export default PageShellV2;
