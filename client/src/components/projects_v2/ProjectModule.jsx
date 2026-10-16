import React from 'react';
import PropTypes from 'prop-types';
import AllProjectsV2 from './pages/AllProjectsV2';
import CreateProjectWizardV2 from './pages/CreateProjectWizardV2';
import ActiveProjectsV2 from './pages/ActiveProjectsV2';
import CompletedProjectsV2 from './pages/CompletedProjectsV2';
import JobTemplatesV2 from './pages/JobTemplatesV2';
import CreateTemplateV2 from './pages/CreateTemplateV2';
import TemplateBuilderV2 from './pages/TemplateBuilderV2';
import JobManagerV2 from './pages/JobManagerV2';
import JobProgressV2 from './pages/JobProgressV2';
import JobAnalyticsV2 from './pages/JobAnalyticsV2';
import ProjectReportsV2 from './pages/ProjectReportsV2';
import TaskReportsV2 from './pages/TaskReportsV2';

const ProjectModule = ({ page }) => {
  switch (page) {
    case 'create project':
      return <CreateProjectWizardV2 />;
    case 'active projects':
      return <ActiveProjectsV2 />;
    case 'completed projects':
      return <CompletedProjectsV2 />;
    case 'job templates':
      return <JobTemplatesV2 />;
    case 'create template':
      return <CreateTemplateV2 />;
    case 'template builder':
      return <TemplateBuilderV2 />;
    case 'job manager':
      return <JobManagerV2 />;
    case 'job progress':
      return <JobProgressV2 />;
    case 'job analytics':
      return <JobAnalyticsV2 />;
    case 'project reports':
      return <ProjectReportsV2 />;
    case 'task reports':
      return <TaskReportsV2 />;
    case 'all projects':
    default:
      return <AllProjectsV2 />;
  }
};

ProjectModule.propTypes = { page: PropTypes.string };
ProjectModule.defaultProps = { page: 'all projects' };

export default ProjectModule;
