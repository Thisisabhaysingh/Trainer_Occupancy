// Consistent department colors across the entire application
export const DEPT_COLORS = {
  'Coding': '#4285F4',           // Blue
  'Electronics': '#EA4335',      // Red
  'Mechatronics': '#FBBC04',     // Yellow/Orange
  'Human Resources': '#34A853',  // Green
  'Information Technology': '#A142F4', // Purple
  'Administration': '#FF6D00',   // Deep Orange
  'Finance': '#00897B',          // Teal
  'Operations': '#E91E63',       // Pink
  'Sales': '#3F51B5',            // Indigo
  'Marketing': '#9C27B0',        // Purple
  'Engineering': '#00BCD4',      // Cyan
  'Production': '#795548',       // Brown
  'Quality Assurance': '#607D8B', // Blue Grey
  'Maintenance': '#FF9800',      // Orange
  'Logistics': '#009688',        // Teal
  'Procurement': '#673AB7',      // Deep Purple
  'General': '#9E9E9E',          // Grey
};

// Fallback colors for departments not in the map
export const FALLBACK_COLORS = [
  '#4285F4', '#EA4335', '#FBBC04', '#34A853', '#A142F4',
  '#FF6D00', '#00897B', '#E91E63', '#3F51B5', '#9C27B0'
];

// Get color for a department
export const getDepartmentColor = (departmentName) => {
  return DEPT_COLORS[departmentName] || FALLBACK_COLORS[0];
};

// Session type colors
export const SESSION_COLORS = {
  offlineInstitute: '#FF8042',
  onlineInstitute: '#00C49F',
  school: '#0088FE'
};
