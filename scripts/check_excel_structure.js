const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function checkExcelStructure() {
  try {
    console.log('🔍 Checking Excel file structure...\n');
    
    const filePath = 'All Employees - OMOTEC (6) (1).xlsx';
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.log('📁 Current directory files:');
      fs.readdirSync('.').forEach(file => {
        if (file.toLowerCase().includes('xlsx') || file.toLowerCase().includes('xls')) {
          console.log(`  - ${file}`);
        }
      });
      return;
    }
    
    console.log(`📄 File found: ${filePath}`);
    console.log(`📊 File size: ${fs.statSync(filePath).size} bytes`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    console.log(`📊 Number of worksheets: ${workbook.worksheets ? workbook.worksheets.length : 'Unknown'}`);
    
    if (workbook.worksheets && workbook.worksheets.length > 0) {
      workbook.worksheets.forEach((worksheet, index) => {
      console.log(`\n📋 Worksheet ${index + 1}: "${worksheet.name}"`);
      console.log(`   Rows: ${worksheet.rowCount}`);
      console.log(`   Columns: ${worksheet.columnCount}`);
      
      if (worksheet.rowCount > 0) {
        console.log('   Headers:');
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          console.log(`     Column ${colNumber}: "${cell.value}"`);
        });
        
        if (worksheet.rowCount > 1) {
          console.log('   Sample data (Row 2):');
          const sampleRow = worksheet.getRow(2);
          sampleRow.eachCell((cell, colNumber) => {
            console.log(`     Column ${colNumber}: "${cell.value}"`);
          });
        }
      }
    });
    } else {
      console.log('❌ No worksheets found or workbook structure is invalid');
      console.log('Available properties:', Object.keys(workbook));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkExcelStructure();
