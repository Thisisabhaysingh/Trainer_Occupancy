export const managerSectionPanelSx = {
  p: { xs: 2.5, md: 3 }, borderRadius: 3, bgcolor: 'background.paper',
  border: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#EAECF0'}`,
  boxShadow: theme => theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(16,24,40,0.08)',
};
