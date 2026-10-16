import React from 'react';
import ProjectsPage from './ProjectsPage';

const ActiveProjectsPage = () => (
  <ProjectsPage
    initialStatus="active"
    title="Active Projects"
    description="Track and manage your active projects with live status and task summary cards."
  />
);

export default ActiveProjectsPage;
