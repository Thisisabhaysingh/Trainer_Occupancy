// Simple script to update employee branches from CSV file
// First export your Excel to CSV, then run this script

const fs = require('fs');
const { User, Branch } = require('../models');

// Configuration
const CSV_FILE_PATH = '../employees.csv'; // Change this to your CSV file path

async function updateBranchesFromCSV() {
  try {
    console.log('Reading CSV file...');
    
    // Read CSV file
    const csvData = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const lines = csvData.split('\n');
    
    // Skip header row
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('CSV Columns:', header);
    
    // Find column indexes
    const codeIndex = header.findIndex(h => h.toLowerCase().includes('code') || h.toLowerCase().includes('employee'));
    const locationIndex = header.findIndex(h => h.toLowerCase().includes('location') || h.toLowerCase().includes('branch'));
    
    if (codeIndex === -1 || locationIndex === -1) {
      throw new Error('Could not find Employee Code or Location columns in CSV');
    }
    
    console.log(`Employee Code column: ${header[codeIndex]}`);
    console.log(`Location column: ${header[locationIndex]}`);
    console.log(`\nProcessing ${lines.length - 1} employees...\n`);
    
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    
    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const employeeCode = values[codeIndex];
        const location = values[locationIndex];
        
        if (!employeeCode || !location) {
          console.log(`Skipping row ${i}: Missing employee code or location`);
          errors++;
          continue;
        }
        
        // Find or create branch
        const [branch] = await Branch.findOrCreate({
          where: { name: location },
          defaults: {
            name: location,
            location: location
          }
        });
        
        // Find and update employee
        const employee = await User.findByPk(employeeCode);
        
        if (employee) {
          await employee.update({ branchId: branch.id });
          console.log(`✓ Updated ${employeeCode} → Branch: ${location}`);
          updated++;
        } else {
          console.log(`✗ Employee not found: ${employeeCode}`);
          notFound++;
        }
        
      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError.message);
        errors++;
      }
    }
    
    console.log('\n=== Update Summary ===');
    console.log(`Total rows: ${lines.length - 1}`);
    console.log(`Updated: ${updated}`);
    console.log(`Not found: ${notFound}`);
    console.log(`Errors: ${errors}`);
    console.log('======================\n');
    
  } catch (error) {
    console.error('Error updating branches:', error);
    throw error;
  }
}

// Run the update
updateBranchesFromCSV()
  .then(() => {
    console.log('Update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });
