const dotenv = require('dotenv');
const path = require('path');
const XLSX = require('xlsx');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, Department, User, ActivityTemplate, Branch } = require('../models');

// ==================== Configuration ====================
const EXCEL_FILE_PATH = path.resolve(__dirname, '..', 'All Employees - OMOTEC (6) (1).xlsx');
const DEFAULT_PASSWORD = 'Employee@123';

// ==================== Branch Data ====================
const defaultBranch = {
  name: 'Main Branch',
  location: 'HQ'
};

// ==================== Activity Templates by Department ====================
const activityTitlesByDepartment = {
  Coding: [
    'Circuit Design',
    'Soldering/Assembly',
    'Inventory',
    'Research',
    'Workshop',
    'Project/Prototype Work',
    'Code Review',
    'Content Work',
    'Self Skilling',
    'Meeting',
    'Total No. of Sessions',
    'Time Spent In Offline Sessions',
    'Time Spent In School Sessions',
    'Time Spent In Online Sessions',
    'Time Spent In Travel',
    'Time Spent In Lunch',
    'Time Spent In LMS Update',
    'Time Spent In Summary Report',
    'Time Spent In Competition Research',
    'Time Spent In Project/Prototype work',
    'Time Spent In Workshop',
    'Time Spent In Inventory',
    'Time Spent In Meeting',
    'Time Spent In Self Skilling',
    'Other Activities',
  ],
  Electronics: [
    'Circuit Design',
    'Soldering/Assembly',
    'Inventory',
    'Research',
    'Workshop',
    'Project/Prototype Work',
    'Code Review',
    'Content Work',
    'Self Skilling',
    'Meeting',
    'Total No. of Sessions',
    'Time Spent In Offline Sessions',
    'Time Spent In School Sessions',
    'Time Spent In Online Sessions',
    'Time Spent In Travel',
    'Time Spent In Lunch',
    'Time Spent In LMS Update',
    'Time Spent In Summary Report',
    'Time Spent In Competition Research',
    'Time Spent In Project/Prototype work',
    'Time Spent In Workshop',
    'Time Spent In Inventory',
    'Time Spent In Meeting',
    'Time Spent In Self Skilling',
    'Other Activities',
  ],
  Mechatronics: [
    'Circuit Design',
    'Soldering/Assembly',
    'Inventory',
    'Research',
    'Workshop',
    'Project/Prototype Work',
    'Code Review',
    'Content Work',
    'Self Skilling',
    'Meeting',
    'Total No. of Sessions',
    'Time Spent In Offline Sessions',
    'Time Spent In School Sessions',
    'Time Spent In Online Sessions',
    'Time Spent In Travel',
    'Time Spent In Lunch',
    'Time Spent In LMS Update',
    'Time Spent In Summary Report',
    'Time Spent In Competition Research',
    'Time Spent In Project/Prototype work',
    'Time Spent In Workshop',
    'Time Spent In Inventory',
    'Time Spent In Meeting',
    'Time Spent In Self Skilling',
    'Other Activities',
  ],
};

const coreDepartments = Object.keys(activityTitlesByDepartment).map(name => ({
  name,
  description: `${name} Department`,
  location: 'Main Office',
}));

// ==================== Default Admin User ====================
const defaultAdmin = {
  employeeCode: 'ADMIN001',
  name: 'Admin User',
  email: 'admin@omotec.com',
  password: 'Admin@123',
  role: 'admin',
};

// ==================== Column Mapping for Excel ====================
const COLUMN_MAPPING = {
  employeeNo: 0,
  name: 1,
  email: 2,
  joiningDate: 3,
  jobTitle: 4,
  businessUnit: 5,
  department: 6,
  subDepartment: 7,
  location: 8,
  costCenter: 9,
  band: 10,
  reportingTo: 11,
  dottedLineManager: 12
};

// Department name mapping
const DEPARTMENT_MAPPING = {
  'Coding': 'Coding',
  'Electronics': 'Electronics',
  'Mechatronics': 'Mechatronics',
  'HR': 'Human Resources',
  'IT': 'Information Technology',
  'Admin': 'Administration',
  'Finance': 'Finance',
  'Operations': 'Operations',
  'Sales': 'Sales',
  'Marketing': 'Marketing',
  'Engineering': 'Engineering',
  'Production': 'Production',
  'Quality': 'Quality Assurance',
  'Maintenance': 'Maintenance',
  'Logistics': 'Logistics',
  'Procurement': 'Procurement',
  'General': 'General'
};

// ==================== Initialize Departments ====================
async function initDepartments(branch) {
  console.log('\n📁 Initializing Core Departments...');
  const createdDepts = {};
  
  for (const dept of coreDepartments) {
    const [record, created] = await Department.findOrCreate({
      where: { name: dept.name },
      defaults: { ...dept, branchId: branch.id },
    });
    createdDepts[dept.name] = record;
    console.log(created ? `✅ Created department: ${dept.name}` : `ℹ️  Department exists: ${dept.name}`);
  }
  
  return createdDepts;
}

// ==================== Initialize Branch ====================
async function initBranch() {
  console.log('\n🏢 Initializing Branch...');
  const [branch, created] = await Branch.findOrCreate({
    where: { name: defaultBranch.name },
    defaults: defaultBranch,
  });
  console.log(created ? `✅ Created branch: ${branch.name}` : `ℹ️  Branch exists: ${branch.name}`);
  return branch;
}

// ==================== Initialize Admin User ====================
async function initAdmin() {
  console.log('\n👤 Initializing Admin User...');
  
  const existing = await User.findOne({ where: { employeeCode: defaultAdmin.employeeCode } });
  
  if (existing) {
    console.log(`ℹ️  Admin user exists: ${defaultAdmin.name} (${defaultAdmin.employeeCode})`);
    return existing;
  }
  
  const admin = await User.create(defaultAdmin);
  console.log(`✅ Created admin user: ${defaultAdmin.name} (${defaultAdmin.employeeCode})`);
  return admin;
}

// ==================== Read Excel File ====================
async function readExcelFile() {
  try {
    console.log('\n📖 Reading Excel file for employees...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`📊 Worksheet: ${sheetName}`);
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      range: 2
    });
    
    console.log(`📊 Total rows: ${jsonData.length}`);
    return jsonData;
  } catch (error) {
    console.error('⚠️  Excel file not found or error reading:', error.message);
    console.log('ℹ️  Skipping employee import from Excel');
    return null;
  }
}

// ==================== Extract Employee Data ====================
function extractEmployeeData(jsonData) {
  const employees = [];
  const errors = [];
  
  if (!jsonData || jsonData.length === 0) return { employees, errors };
  
  console.log('🔍 Processing employee data...');
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 3;
    
    if (!row || row.length === 0 || !row[COLUMN_MAPPING.employeeNo]) {
      continue;
    }
    
    try {
      const employeeNo = row[COLUMN_MAPPING.employeeNo]?.toString().trim();
      const name = row[COLUMN_MAPPING.name]?.toString().trim();
      const email = row[COLUMN_MAPPING.email]?.toString().trim();
      const department = row[COLUMN_MAPPING.department]?.toString().trim() || 'General';
      
      if (!employeeNo || !name) {
        errors.push(`Row ${rowNumber}: Missing required fields`);
        continue;
      }
      
      employees.push({
        employeeCode: employeeNo,
        name: name,
        email: email || `${employeeNo.toLowerCase()}@omotec.com`,
        department: department,
        jobTitle: row[COLUMN_MAPPING.jobTitle]?.toString().trim(),
        location: row[COLUMN_MAPPING.location]?.toString().trim(),
        rowNumber: rowNumber
      });
    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }
  
  console.log(`✅ Extracted ${employees.length} employees`);
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} rows had errors`);
  }
  
  return { employees, errors };
}

// ==================== Get or Create Department ====================
async function getOrCreateDepartment(departmentName, branchId) {
  const mappedName = DEPARTMENT_MAPPING[departmentName] || departmentName;
  
  let department = await Department.findOne({ where: { name: mappedName } });
  
  if (!department) {
    department = await Department.create({
      name: mappedName,
      description: `${mappedName} Department`,
      location: 'Main Office',
      branchId: branchId
    });
    console.log(`✅ Created new department: ${mappedName}`);
  }
  
  return department;
}

// ==================== Upload Employees ====================
async function uploadEmployees(employees, branch) {
  const results = { success: 0, skipped: 0, errors: [] };
  
  console.log('\n👥 Uploading Employees...');
  
  for (const employeeData of employees) {
    try {
      // Check if employee already exists
      const existing = await User.findOne({
        where: { employeeCode: employeeData.employeeCode }
      });
      
      if (existing) {
        results.skipped++;
        continue;
      }
      
      // Get or create department
      const department = await getOrCreateDepartment(employeeData.department, branch.id);
      
      // Determine role based on job title or default to employee
      let role = 'employee';
      const jobTitle = (employeeData.jobTitle || '').toLowerCase();
      if (jobTitle.includes('manager') || jobTitle.includes('head')) {
        role = 'manager';
      }
      
      // Create employee
      await User.create({
        employeeCode: employeeData.employeeCode,
        name: employeeData.name,
        email: employeeData.email,
        password: DEFAULT_PASSWORD,
        role: role,
        departmentId: department.id,
        branchId: branch.id
      });
      
      console.log(`✅ Created: ${employeeData.name} (${employeeData.employeeCode}) - ${role}`);
      results.success++;
      
    } catch (error) {
      const errorMsg = `${employeeData.employeeCode}: ${error.message}`;
      results.errors.push(errorMsg);
    }
  }
  
  return results;
}

// ==================== Initialize Activity Templates ====================
async function initActivityTemplates(departments) {
  console.log('\n📋 Initializing Activity Templates...');
  
  const admin = await User.findOne({ where: { role: 'admin' } });
  const creatorCode = admin?.employeeCode || 'ADMIN001';
  
  for (const dept of Object.values(departments)) {
    const titles = activityTitlesByDepartment[dept.name] || [];
    
    for (const title of titles) {
      const exists = await ActivityTemplate.findOne({ 
        where: { title, departmentId: dept.id } 
      });
      
      if (exists) continue;
      
      await ActivityTemplate.create({
        title,
        departmentId: dept.id,
        createdById: creatorCode,
      });
      console.log(`✅ [${dept.name}] Created template: ${title}`);
    }
  }
}

// ==================== Main Function ====================
async function main() {
  try {
    console.log('🚀 Starting Production Initialization with Employee Import...\n');
    console.log('='.repeat(70));
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync models
    console.log('\n📊 Syncing database models...');
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synced');
    
    // Initialize branch
    const branch = await initBranch();
    
    // Initialize core departments
    const departments = await initDepartments(branch);
    
    // Initialize admin user
    await initAdmin();
    
    // Read and upload employees from Excel
    const jsonData = await readExcelFile();
    if (jsonData) {
      const { employees, errors } = extractEmployeeData(jsonData);
      
      if (employees.length > 0) {
        console.log(`\n📋 Found ${employees.length} employees to import`);
        const results = await uploadEmployees(employees, branch);
        
        console.log('\n📊 Employee Import Summary:');
        console.log(`✅ Successfully created: ${results.success} employees`);
        console.log(`⏭️  Skipped (already exist): ${results.skipped} employees`);
        console.log(`❌ Errors: ${results.errors.length}`);
        
        if (results.errors.length > 0 && results.errors.length <= 10) {
          console.log('\n❌ Error Details:');
          results.errors.forEach(error => console.log(`  - ${error}`));
        }
      }
    }
    
    // Initialize activity templates
    await initActivityTemplates(departments);
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 Production initialization completed successfully!');
    console.log('\n📝 Default Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@omotec.com');
    console.log('     Password: Admin@123');
    console.log('\n   Employees:');
    console.log('     Email: <as per Excel file>');
    console.log('     Password: Employee@123');
    console.log('\n⚠️  IMPORTANT: All users should change their passwords after first login!');
    console.log('='.repeat(70));
    
  } catch (err) {
    console.error('\n❌ Production initialization failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
