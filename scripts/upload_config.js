// Configuration for employee upload script
module.exports = {
  // Excel file path
  EXCEL_FILE_PATH: 'All Employees - OMOTEC (6) (1).xlsx',
  
  // Default values for employees
  DEFAULT_PASSWORD: 'password123',
  DEFAULT_ROLE: 'employee',
  
  // Column mapping - adjust these based on your Excel file structure
  COLUMN_MAPPING: {
    employeeNo: ['Employee No', 'Employee Number', 'ID', 'Emp No', 'Emp ID', 'Employee ID'],
    name: ['Name', 'Full Name', 'Employee Name', 'Emp Name', 'Staff Name'],
    email: ['Email', 'Email Address', 'Mail', 'E-mail'],
    department: ['Department', 'Dept', 'Department Name', 'Division', 'Section'],
    phone: ['Phone', 'Phone Number', 'Mobile', 'Contact'],
    position: ['Position', 'Job Title', 'Role', 'Designation'],
    joiningDate: ['Joining Date', 'Start Date', 'Hire Date', 'Date of Joining']
  },
  
  // Department name mapping (Excel name -> Database name)
  DEPARTMENT_MAPPING: {
    'HR': 'Human Resources',
    'IT': 'Information Technology',
    'Admin': 'Administration',
    'Finance': 'Finance',
    'Operations': 'Operations',
    'Sales': 'Sales',
    'Marketing': 'Marketing',
    'Engineering': 'Engineering',
    'Mechatronics': 'Mechatronics',
    'Production': 'Production',
    'Quality': 'Quality Assurance',
    'Maintenance': 'Maintenance',
    'Logistics': 'Logistics',
    'Procurement': 'Procurement',
    'General': 'General'
  },
  
  // Email domain for generated emails
  EMAIL_DOMAIN: 'omotec.com',
  
  // Default department for employees without department
  DEFAULT_DEPARTMENT: 'General',
  
  // Default location for new departments
  DEFAULT_LOCATION: 'Main Office',
  
  // Validation rules
  VALIDATION: {
    requireEmployeeNo: true,
    requireName: true,
    requireEmail: false, // Will generate if not provided
    requireDepartment: false, // Will use default if not provided
    skipExistingEmployees: true, // Skip if email already exists
    updateExistingEmployees: false // Update existing employees (if skipExistingEmployees is false)
  }
};


