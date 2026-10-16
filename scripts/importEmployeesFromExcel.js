// Script to import employees from Excel file with branch information
// This script reads the Excel file and updates the database with branch data

const XLSX = require('xlsx');
const { User, Branch, Department } = require('../models');
const bcrypt = require('bcryptjs');

// Configuration
const EXCEL_FILE_PATH = '../All Employees - OMOTEC (6) (1).xlsx';
const DEFAULT_PASSWORD = 'password123'; // Default password for new employees

async function importEmployees() {
  try {
    console.log('Starting employee import from Excel...');
    
    // Read the Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} rows in Excel file`);
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        // Extract data from Excel row
        // Adjust these field names to match your Excel columns
        const employeeCode = row['Employee Code'] || row['employeeCode'] || row['Code'];
        const name = row['Name'] || row['name'];
        const email = row['Email'] || row['email'];
        const location = row['Location'] || row['location'] || row['Branch'];
        const departmentName = row['Department'] || row['department'];
        const role = row['Role'] || row['role'] || 'employee';
        
        if (!employeeCode || !name || !email) {
          console.log(`Skipping row - missing required fields:`, row);
          errors++;
          continue;
        }
        
        // Find or create branch based on location
        let branch = null;
        if (location) {
          [branch] = await Branch.findOrCreate({
            where: { name: location },
            defaults: {
              name: location,
              location: location
            }
          });
        }
        
        // Find department
        let department = null;
        if (departmentName) {
          department = await Department.findOne({
            where: { name: departmentName }
          });
          
          if (!department) {
            console.log(`Department not found: ${departmentName}, skipping employee ${employeeCode}`);
            errors++;
            continue;
          }
        }
        
        // Check if employee exists
        const existingEmployee = await User.findByPk(employeeCode);
        
        if (existingEmployee) {
          // Update existing employee
          await existingEmployee.update({
            name: name,
            email: email,
            branchId: branch ? branch.id : null,
            departmentId: department ? department.id : null,
            role: role.toLowerCase()
          });
          console.log(`✓ Updated: ${employeeCode} - ${name} (Branch: ${location || 'N/A'})`);
          updated++;
        } else {
          // Create new employee
          const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
          
          await User.create({
            employeeCode: employeeCode,
            name: name,
            email: email,
            password: hashedPassword,
            role: role.toLowerCase(),
            departmentId: department ? department.id : null,
            branchId: branch ? branch.id : null
          });
          console.log(`✓ Created: ${employeeCode} - ${name} (Branch: ${location || 'N/A'})`);
          created++;
        }
        
      } catch (rowError) {
        console.error(`Error processing row:`, row, rowError.message);
        errors++;
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Total rows processed: ${data.length}`);
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log('=====================\n');
    
  } catch (error) {
    console.error('Error importing employees:', error);
    throw error;
  }
}

// Run the import
importEmployees()
  .then(() => {
    console.log('Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
