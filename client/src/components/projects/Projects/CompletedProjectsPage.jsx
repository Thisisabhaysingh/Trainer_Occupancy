import React from 'react';
import ProjectsPage from './ProjectsPage';

const CompletedProjectsPage = () => (
  <ProjectsPage
    initialStatus="completed"
    title="Completed Projects"
    description="Review successfully finished projects and inspect completed work summaries."
  />
);

export default CompletedProjectsPage;
