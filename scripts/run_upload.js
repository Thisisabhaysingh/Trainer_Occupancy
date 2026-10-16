#!/usr/bin/env node

/**
 * Employee Upload Runner Script
 * 
 * This script provides a simple interface to run the employee upload process.
 * It includes options for preview and actual upload.
 */

const { execSync } = require('child_process');
const fs = require('fs');

function showHelp() {
  console.log(`
🎯 Employee Upload Script Runner

Usage: node scripts/run_upload.js [command]

Commands:
  preview    - Show preview of what will be uploaded (no database connection)
  upload     - Actually upload employees to database
  check      - Check Excel file structure
  help       - Show this help message

Examples:
  node scripts/run_upload.js preview
  node scripts/run_upload.js upload
  node scripts/run_upload.js check

Files created:
  - scripts/upload_employees_final.js     - Main upload script
  - scripts/test_upload_preview.js        - Preview script (no DB)
  - scripts/check_excel_structure_xlsx.js - Excel structure checker
  - scripts/upload_config.js              - Configuration file
  - scripts/README_upload_employees.md    - Documentation

Excel file expected: All Employees - OMOTEC (6) (1).xlsx
`);
}

function checkExcelFile() {
  const excelFile = 'All Employees - OMOTEC (6) (1).xlsx';
  if (!fs.existsSync(excelFile)) {
    console.error(`❌ Excel file not found: ${excelFile}`);
    console.log('📁 Available Excel files:');
    fs.readdirSync('.').forEach(file => {
      if (file.toLowerCase().includes('xlsx') || file.toLowerCase().includes('xls')) {
        console.log(`  - ${file}`);
      }
    });
    return false;
  }
  return true;
}

function runCommand(command) {
  try {
    console.log(`🚀 Running: ${command}\n`);
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'preview':
      if (!checkExcelFile()) return;
      runCommand('node scripts/test_upload_preview.js');
      break;
      
    case 'upload':
      if (!checkExcelFile()) return;
      console.log('⚠️  This will upload employees to the database!');
      console.log('⚠️  Make sure your database is running and configured.');
      console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      setTimeout(() => {
        runCommand('node scripts/upload_employees_final.js');
      }, 5000);
      break;
      
    case 'check':
      if (!checkExcelFile()) return;
      runCommand('node scripts/check_excel_structure_xlsx.js');
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.log('❌ Unknown command. Use "help" to see available commands.\n');
      showHelp();
      break;
  }
}

main();


