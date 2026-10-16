export const branchesV2 = [
  { id: 'b1', name: 'Main Branch' },
  { id: 'b2', name: 'East Branch' },
  { id: 'b3', name: 'West Branch' }
];

export const usersV2 = [
  { id: 'u1', name: 'Alice Johnson' },
  { id: 'u2', name: 'Mohammed Ali' },
  { id: 'u3', name: 'Grace Lee' }
];

export const templatesV2 = [
  { id: 'tpl1', name: 'Website Launch', description: 'Standard website project', category: 'Marketing', difficulty: 'Medium', jobs: [] },
  { id: 'tpl2', name: 'Mobile App', description: 'Mobile app delivery', category: 'Engineering', difficulty: 'High', jobs: [] }
];

export const projectsV2 = [
  { id: 'p1', name: 'Q2 Website Redesign', code: 'PRJ-001', description: 'Redesign marketing site', branchId: 'b1', ownerId: 'u1', priority: 'High', startDate: '2026-06-01', endDate: '2026-09-01', status: 'active', templateId: 'tpl1' },
  { id: 'p2', name: 'Mobile App MVP', code: 'PRJ-002', description: 'Build MVP', branchId: 'b2', ownerId: 'u2', priority: 'Critical', startDate: '2026-05-15', endDate: '2026-08-15', status: 'planned', templateId: 'tpl2' }
];
