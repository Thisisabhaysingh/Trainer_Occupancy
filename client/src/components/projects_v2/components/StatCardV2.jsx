import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography } from '@mui/material';

const StatCardV2 = ({ label, value }) => (
  <Card>
    <CardContent>
      <Typography variant="h6">{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

StatCardV2.propTypes = { label: PropTypes.string, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
StatCardV2.defaultProps = { label: '', value: '' };

export default StatCardV2;
