import { useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';

// Cross-fades between slides on a timer. All slides share one grid cell so the
// carousel keeps the height of its tallest slide and never shifts the layout.
export default function AutoCarousel({ slides, interval = 6000, sx }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const timer = setInterval(() => setActive(current => (current + 1) % slides.length), interval);
    return () => clearInterval(timer);
  }, [paused, slides.length, interval]);

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      sx={{ position: 'relative', display: 'grid', width: '100%', height: '100%', ...sx }}
    >
      {slides.map((slide, index) => (
        <Box
          key={slide.key}
          aria-hidden={index !== active}
          sx={{
            gridArea: '1 / 1',
            display: 'flex',
            minWidth: 0,
            opacity: index === active ? 1 : 0,
            visibility: index === active ? 'visible' : 'hidden',
            transform: index === active ? 'translateX(0)' : 'translateX(12px)',
            transition: 'opacity 0.45s ease, transform 0.45s ease, visibility 0.45s',
          }}
        >
          {slide.content}
        </Box>
      ))}
      {slides.length > 1 && (
        <Box sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.5, zIndex: 3 }}>
          {slides.map((slide, index) => (
            <IconButton
              key={slide.key}
              size="small"
              aria-label={`Show ${slide.label}`}
              onClick={() => setActive(index)}
              sx={{ p: 0.5 }}
            >
              <Box sx={{
                width: index === active ? 16 : 6,
                height: 6,
                borderRadius: 3,
                bgcolor: index === active ? 'primary.main' : 'action.disabled',
                transition: 'width 0.3s ease',
              }} />
            </IconButton>
          ))}
        </Box>
      )}
    </Box>
  );
}
