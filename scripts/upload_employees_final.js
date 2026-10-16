const XLSX = require('xlsx');
const sequelize = require('../config/sequelize');
const User = require('../models/User');
const Department = require('../models/Department');

// Configuration
const EXCEL_FILE_PATH = 'All Employees - OMOTEC (6) (1).xlsx';
const DEFAULT_PASSWORD = 'password123';
const DEFAULT_ROLE = 'employee';

// Column mapping based on the Excel structure we found
const COLUMN_MAPPING = {
  employeeNo: 0,    // 'Employee Number'
  name: 1,          // 'Full Name'
  email: 2,         // 'Email'
  joiningDate: 3,   // 'Date of Joining'
  jobTitle: 4,      // 'Job Title'
  businessUnit: 5,  // 'Business Unit'
  department: 6,    // 'Department'
  subDepartment: 7, // 'Sub Department'
  location: 8,      // 'Location'
  costCenter: 9,    // 'Cost Center'
  band: 10,         // 'Band'
  reportingTo: 11,  // 'Reporting To'
  dottedLineManager: 12 // 'Dotted Line Manager'
};

// Department name mapping
const DEPARTMENT_MAPPING = {
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
};

async function readExcelFile() {
  try {
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`📊 Worksheet: ${sheetName}`);
    console.log(`📊 Range: ${worksheet['!ref']}`);
    
    // Convert to JSON array (starting from row 3 where headers are)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      range: 2 // Start from row 3 (0-indexed)
    });
    
    console.log(`📊 Total rows with data: ${jsonData.length}`);
    
    return jsonData;
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    throw error;
  }
}

function extractEmployeeData(jsonData) {
  const employees = [];
  const errors = [];
  
  console.log('🔍 Processing employee data...');
  
  // First row should be headers
  const headers = jsonData[0];
  console.log('📋 Headers found:', headers);
  
  // Process each row starting from index 1 (skip headers)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 3; // +3 because we started from row 3 in Excel
    
    // Skip empty rows
    if (!row || row.length === 0 || !row[COLUMN_MAPPING.employeeNo]) {
      continue;
    }
    
    try {
      const employee = {
        employeeNo: row[COLUMN_MAPPING.employeeNo]?.toString().trim(),
        name: row[COLUMN_MAPPING.name]?.toString().trim(),
        email: row[COLUMN_MAPPING.email]?.toString().trim(),
        joiningDate: row[COLUMN_MAPPING.joiningDate],
        jobTitle: row[COLUMN_MAPPING.jobTitle]?.toString().trim(),
        businessUnit: row[COLUMN_MAPPING.businessUnit]?.toString().trim(),
        department: row[COLUMN_MAPPING.department]?.toString().trim(),
        subDepartment: row[COLUMN_MAPPING.subDepartment]?.toString().trim(),
        location: row[COLUMN_MAPPING.location]?.toString().trim(),
        costCenter: row[COLUMN_MAPPING.costCenter]?.toString().trim(),
        band: row[COLUMN_MAPPING.band]?.toString().trim(),
        reportingTo: row[COLUMN_MAPPING.reportingTo]?.toString().trim(),
        dottedLineManager: row[COLUMN_MAPPING.dottedLineManager]?.toString().trim(),
        rowNumber: rowNumber
      };
      
      // Validate required fields
      if (!employee.employeeNo) {
        errors.push(`Row ${rowNumber}: Missing Employee Number`);
        continue;
      }
      
      if (!employee.name) {
        errors.push(`Row ${rowNumber}: Missing Name`);
        continue;
      }
      
      // Generate email if not provided
      if (!employee.email) {
        employee.email = `${employee.employeeNo.toLowerCase()}@omotec.com`;
        console.log(`⚠️  Row ${rowNumber}: Generated email: ${employee.email}`);
      }
      
      // Set default department if not provided
      if (!employee.department) {
        employee.department = 'General';
        console.log(`⚠️  Row ${rowNumber}: Using default department: ${employee.department}`);
      }
      
      employees.push(employee);
    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }
  
  console.log(`✅ Extracted ${employees.length} employees`);
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} errors found:`);
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return { employees, errors };
}

async function getOrCreateDepartment(departmentName) {
  // Map department name if needed
  const mappedName = DEPARTMENT_MAPPING[departmentName] || departmentName;
  
  try {
    // Try to find existing department
    let department = await Department.findOne({
      where: { name: mappedName }
    });
    
    if (!department) {
      // Create new department
      department = await Department.create({
        name: mappedName,
        description: `${mappedName} Department`,
        location: 'Main Office' // Default location
      });
      console.log(`✅ Created new department: ${mappedName}`);
    }
    
    return department;
  } catch (error) {
    console.error(`❌ Error with department ${mappedName}:`, error.message);
    throw error;
  }
}

async function uploadEmployees(employees) {
  const results = {
    success: 0,
    skipped: 0,
    errors: []
  };
  
  console.log('🚀 Starting employee upload...');
  
  for (const employeeData of employees) {
    try {
      // Check if employee already exists by email
      const existingEmployee = await User.findOne({
        where: { email: employeeData.email }
      });
      
      if (existingEmployee) {
        console.log(`⏭️  Skipping existing employee: ${employeeData.name} (${employeeData.email})`);
        results.skipped++;
        continue;
      }
      
      // Get or create department
      const department = await getOrCreateDepartment(employeeData.department);
      
      // Create employee
      const employee = await User.create({
        name: employeeData.name,
        email: employeeData.email,
        password: DEFAULT_PASSWORD,
        role: DEFAULT_ROLE,
        departmentId: department.id
      });
      
      console.log(`✅ Created employee: ${employee.name} (ID: ${employee.id}, Email: ${employee.email}, Employee No: ${employeeData.employeeNo})`);
      results.success++;
      
    } catch (error) {
      const errorMsg = `Row ${employeeData.rowNumber}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log('🎯 Starting Employee Upload Process...\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Read Excel file
    const jsonData = await readExcelFile();
    
    // Extract employee data
    const { employees, errors: extractionErrors } = extractEmployeeData(jsonData);
    
    if (employees.length === 0) {
      console.log('❌ No valid employee data found in Excel file');
      return;
    }
    
    // Show sample of employees to be uploaded
    console.log('\n📋 Sample employees to be uploaded:');
    employees.slice(0, 5).forEach(emp => {
      console.log(`  - ${emp.employeeNo}: ${emp.name} (${emp.email}) - ${emp.department}`);
    });
    
    if (employees.length > 5) {
      console.log(`  ... and ${employees.length - 5} more employees`);
    }
    
    // Ask for confirmation (in a real scenario, you might want to add a prompt)
    console.log('\n⚠️  This will create new employee accounts with default password: "password123"');
    console.log('⚠️  Employees should change their passwords on first login');
    
    // Upload employees
    const results = await uploadEmployees(employees);
    
    // Print summary
    console.log('\n📊 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${results.success} employees`);
    console.log(`⏭️  Skipped (already exist): ${results.skipped} employees`);
    console.log(`❌ Errors: ${results.errors.length} employees`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Error Details:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (extractionErrors.length > 0) {
      console.log('\n⚠️  Extraction Errors:');
      extractionErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Employee upload process completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Inform employees about their new accounts');
    console.log('2. Share login credentials (email and default password)');
    console.log('3. Ask employees to change their passwords on first login');
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, readExcelFile, extractEmployeeData, uploadEmployees };
