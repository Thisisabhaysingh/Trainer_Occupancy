const navigationByRole = Object.freeze({
  employee: [
    {
      title: 'GENERAL',
      items: [
        { id: 'overview', label: 'Activity Log', icon: 'dashboard' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar' },
        { id: 'projects', label: 'My Projects', icon: 'projects' },
        { id: 'inventory', label: 'Inventory', icon: 'documents', route: '/inventory', badge: 'Coming soon' },
        { id: 'tools', label: 'Tools', icon: 'settings', children: [
          { id: 'reportcard', label: 'Report Card' },
          { id: 'assessments', label: 'Employee Assessment', badge: 'Coming soon' },
        ] },
        { id: 'history', label: 'Activity History', icon: 'history' },
        { id: 'profile', label: 'Profile', icon: 'profile' },
      ],
    },
  ],
  teamlead: [
    {
      title: 'MAIN',
      items: [
        { id: 'overview', label: 'Overview', icon: 'home', tabIndex: 0 },
        { id: 'employees', label: 'My Team', icon: 'users', tabIndex: 2 },
        { id: 'projects', label: 'My Projects', icon: 'projects', tabIndex: 6 },
        { id: 'myactivity', label: 'My Activity', icon: 'session', tabIndex: 4 },
        { id: 'calendar', label: 'Calendar', icon: 'calendar', tabIndex: 7 },
        { id: 'tools', label: 'Tools', icon: 'settings', tabIndex: 8, children: [
          { id: 'reportcard', label: 'Report Card' },
          { id: 'assessments', label: 'Employee Assessment', badge: 'Coming soon' },
        ] },
        { id: 'inventory', label: 'Inventory', icon: 'documents', route: '/inventory', badge: 'Coming soon' },
        { id: 'activityhistory', label: 'Activity History', icon: 'history', tabIndex: 5 },
        { id: 'profile', label: 'Profile', icon: 'profile', tabIndex: 9 },
      ],
    },
  ],
  manager: [
    {
      title: 'MAIN',
      items: [
        { id: 'overview', label: 'Overview', icon: 'home', tabIndex: 0 },
        { id: 'departments', label: 'Departments', icon: 'branch', tabIndex: 1 },
        { id: 'employees', label: 'Employees', icon: 'users', tabIndex: 2 },
        { id: 'myactivity', label: 'My Activity', icon: 'documents', tabIndex: 3 },
        { id: 'datewisereport', label: 'Datewise Report', icon: 'calendar', tabIndex: 4 },
        { id: 'profile', label: 'Profile', icon: 'profile', tabIndex: 5 },
        { id: 'activitytemplates', label: 'Activity Templates', icon: 'course', tabIndex: 6 },
        { id: 'tools', label: 'Tools', icon: 'settings', tabIndex: 7 },
        { id: 'projectmanagement', label: 'Project Management', icon: 'projects', tabIndex: 8 },
        { id: 'calendar', label: 'Calendar', icon: 'calendar', tabIndex: 9 },
        { id: 'traineroccupancy', label: 'Trainer Occupancy', icon: 'calendar', tabIndex: 10 },
        { id: 'mailautomation', label: 'Mail Automation', icon: 'messages', tabIndex: 11 },
        { id: 'schoolreport', label: 'School Report', icon: 'reports', tabIndex: 12 },
        { id: 'schoolmanagement', label: 'School Management', icon: 'trainer', tabIndex: 13 },
        { id: 'inventory', label: 'Inventory', icon: 'documents', route: '/inventory' },
      ],
    },
  ],
  admin: [
    {
      title: 'MAIN',
      items: [
        { id: 'overview', label: 'Overview', icon: 'home' },
        { id: 'departments', label: 'Departments', icon: 'course', route: '/admin/departments' },
        { id: 'employees', label: 'Employees', icon: 'users' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar' },
        { id: 'reports', label: 'Reports', icon: 'reports' },
        { id: 'tools', label: 'Tools', icon: 'settings', route: '/admin?section=tools' },
        { id: 'inventory', label: 'Inventory', icon: 'documents', route: '/inventory', badge: 'Coming soon' },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'branches', label: 'Branches', icon: 'branch', route: '/admin/branches' },
        { id: 'manage employees', label: 'Manage Employees', icon: 'people' },
        { id: 'manage departments', label: 'Manage Departments', icon: 'department' },
        { id: 'activity templates', label: 'Activity Templates', icon: 'documents' },
        { id: 'school catalog', label: 'School Catalog', icon: 'school' },
        { id: 'trainer occupancy', label: 'Trainer Occupancy', icon: 'calendar' },
        { id: 'mail automation', label: 'Mail Automation', icon: 'messages' },
        { id: 'school report', label: 'School Report', icon: 'reports' },
        { id: 'school management', label: 'School Management', icon: 'trainer' },
        { id: 'manager assignments', label: 'Manager Assignments', icon: 'users' },
        { id: 'team lead management', label: 'Team Lead Management', icon: 'people' },
        {
          id: 'project management', label: 'Project Management', icon: 'projects',
          children: [
            { id: 'all projects', label: 'All Projects' },
            { id: 'create project', label: 'Create Project' },
            { id: 'active projects', label: 'Active Projects' },
            { id: 'completed projects', label: 'Completed Projects' },
            { id: 'job templates', label: 'Job Templates' },
            { id: 'create template', label: 'Create Template' },
            { id: 'job progress', label: 'Job Progress' },
            { id: 'job analytics', label: 'Job Analytics' },
          ],
        },
      ],
    },
  ],
});

// Both management dashboards use this section configuration.
export const getNavigationForRole = (role) => navigationByRole[role === 'senior_manager' ? 'manager' : role] || [];
export const flattenNavigation = (sections) => sections.flatMap((section) => section.items);
export const createNavigationSearchOptions = (sections) => sections.flatMap((section) =>
  section.items.flatMap((item) => [
    { id: item.id, label: item.label, group: section.title },
    ...(item.children || []).map((child) => ({
      id: child.id,
      label: child.label,
      group: item.label,
      keywords: [section.title],
    })),
  ]),
);

export default navigationByRole;
