const XLSX = require('xlsx');

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
  const departments = new Set();
  
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
      
      // Track departments
      if (employee.department) {
        departments.add(employee.department);
      }
      
      employees.push(employee);
    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }
  
  console.log(`✅ Extracted ${employees.length} employees`);
  console.log(`🏢 Found ${departments.size} unique departments:`, Array.from(departments).join(', '));
  
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} errors found:`);
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return { employees, errors, departments: Array.from(departments) };
}

async function main() {
  try {
    console.log('🎯 Employee Upload Preview (No Database Connection)\n');
    
    // Read Excel file
    const jsonData = await readExcelFile();
    
    // Extract employee data
    const { employees, errors: extractionErrors, departments } = extractEmployeeData(jsonData);
    
    if (employees.length === 0) {
      console.log('❌ No valid employee data found in Excel file');
      return;
    }
    
    // Show sample of employees to be uploaded
    console.log('\n📋 Sample employees to be uploaded:');
    employees.slice(0, 10).forEach(emp => {
      console.log(`  - ${emp.employeeNo}: ${emp.name} (${emp.email}) - ${emp.department}`);
    });
    
    if (employees.length > 10) {
      console.log(`  ... and ${employees.length - 10} more employees`);
    }
    
    // Show departments that will be created
    console.log('\n🏢 Departments that will be created:');
    departments.forEach(dept => {
      console.log(`  - ${dept}`);
    });
    
    // Show statistics
    console.log('\n📊 Upload Statistics:');
    console.log(`✅ Total employees to upload: ${employees.length}`);
    console.log(`🏢 Total departments: ${departments.length}`);
    console.log(`⚠️  Extraction errors: ${extractionErrors.length}`);
    
    // Show default values
    console.log('\n⚙️  Default Values:');
    console.log(`  - Password: ${DEFAULT_PASSWORD}`);
    console.log(`  - Role: ${DEFAULT_ROLE}`);
    console.log(`  - Email domain: @omotec.com`);
    
    if (extractionErrors.length > 0) {
      console.log('\n⚠️  Extraction Errors:');
      extractionErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Preview completed!');
    console.log('\n📝 To actually upload the data, run:');
    console.log('   node scripts/upload_employees_final.js');
    console.log('\n⚠️  Make sure your database is running and configured properly!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    console.error(error.stack);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, readExcelFile, extractEmployeeData };


