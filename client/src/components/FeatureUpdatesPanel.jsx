import PropTypes from 'prop-types';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { featureUpdates as defaultFeatures } from '../utils/featureUpdates';

const FeatureUpdatesPanel = ({ features = defaultFeatures }) => {
  const theme = useTheme();

  if (!features || features.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(35, 39, 47, 0.95)' : '#fff',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          No feature updates yet
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          Check back soon to see what's new.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        py: 3,
      }}
    >
      {features.map((feature, idx) => (
        <Paper
          key={`${feature.title}-${idx}`}
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            bgcolor: theme.palette.mode === 'dark' ? '#1e2433' : '#ffffff',
            color: theme.palette.text.primary,
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.12)'
              : '1px solid rgba(17,17,26,0.08)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 12px 30px rgba(0,0,0,0.5)'
              : '0 12px 30px rgba(31,41,55,0.15)',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              letterSpacing: 1.2,
              fontWeight: 700,
              color: theme.palette.mode === 'dark' ? '#38f9d7' : '#6c3ef7',
            }}
          >
            FEATURE RELEASE
          </Typography>
          <Typography variant="h6" fontWeight={800} sx={{ mt: 1, mb: 2 }}>
            {feature.title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.primary,
              fontSize: { xs: 14, md: 16 },
              lineHeight: 1.6,
              mb: 3,
            }}
          >
            {feature.description}
          </Typography>
          {feature.comment && (
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
                mb: 3,
              }}
            >
              “{feature.comment}”
            </Typography>
          )}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: theme.palette.mode === 'dark' ? '#fff' : '#1f2561',
              }}
            >
              Developed by {feature.developer}
            </Typography>
            {feature.releasedOn && (
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Released on {feature.releasedOn}
              </Typography>
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

FeatureUpdatesPanel.propTypes = {
  features: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      developer: PropTypes.string.isRequired,
      releasedOn: PropTypes.string,
    })
  ),
};

export default FeatureUpdatesPanel;
