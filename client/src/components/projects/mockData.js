export const branches = [
  { id: 'b-1', name: 'Main Branch' },
  { id: 'b-2', name: 'East Branch' },
  { id: 'b-3', name: 'West Branch' }
];

export const users = [
  { id: 'u-1', name: 'Alice Johnson' },
  { id: 'u-2', name: 'Mohammed Ali' },
  { id: 'u-3', name: 'Grace Lee' }
];

export const templates = [
  {
    id: 't-1',
    name: 'Website Launch',
    description: 'Standard website project',
    category: 'Marketing',
    difficulty: 'Medium',
    jobs: [
      { id: 'j-1', title: 'Design', tasks: [{ id: 'task-1', title: 'Wireframes' }, { id: 'task-2', title: 'Mockups' }] },
      { id: 'j-2', title: 'Development', tasks: [{ id: 'task-3', title: 'Frontend' }, { id: 'task-4', title: 'Backend' }] }
    ]
  },
  {
    id: 't-2',
    name: 'Mobile App',
    description: 'Mobile app delivery template',
    category: 'Engineering',
    difficulty: 'High',
    jobs: [
      { id: 'j-3', title: 'Scoping', tasks: [{ id: 'task-5', title: 'Requirements' }] }
    ]
  }
];

export const projects = [
  {
    id: 'p-1',
    name: 'Q2 Website Redesign',
    code: 'PRJ-001',
    description: 'Redesign marketing site for Q2 campaign.',
    branchId: 'b-1',
    ownerId: 'u-1',
    priority: 'High',
    startDate: '2026-06-01',
    endDate: '2026-09-01',
    status: 'active',
    selectedTemplateId: 't-1'
  },
  {
    id: 'p-2',
    name: 'Mobile App MVP',
    code: 'PRJ-002',
    description: 'Build the MVP for the mobile platform.',
    branchId: 'b-2',
    ownerId: 'u-2',
    priority: 'Critical',
    startDate: '2026-05-15',
    endDate: '2026-08-15',
    status: 'planned',
    selectedTemplateId: 't-2'
  }
];
