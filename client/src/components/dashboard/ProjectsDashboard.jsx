import { Box } from '@mui/material';
import PMProjectsManagement from '../pm/ProjectsManagement';
import { ManagerSectionIntro } from './DashboardSectionIntro';
export default function ProjectsDashboard() { return (
          <Box sx={{ width: '100%' }}>
            <ManagerSectionIntro
              title="Plan and track project work"
              description="Create projects, assign ownership, and follow delivery progress from one place. Start with the project list to understand what is active before adding new work."
              steps={['Review projects', 'Open a project', 'Update work and progress']}
            />
            <PMProjectsManagement />
          </Box>
); }
