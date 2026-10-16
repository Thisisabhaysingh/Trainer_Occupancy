const XLSX = require('xlsx');
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
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    console.log(`📊 Number of worksheets: ${workbook.SheetNames.length}`);
    console.log(`📋 Worksheet names: ${workbook.SheetNames.join(', ')}`);
    
    // Process each worksheet
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n📋 Worksheet ${index + 1}: "${sheetName}"`);
      
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      console.log(`   Range: ${worksheet['!ref']}`);
      console.log(`   Rows: ${range.e.r + 1}`);
      console.log(`   Columns: ${range.e.c + 1}`);
      
      // Get headers from first row
      if (range.e.r >= 0) {
        console.log('   Headers:');
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = worksheet[cellAddress];
          const value = cell ? cell.v : '';
          console.log(`     Column ${col + 1}: "${value}"`);
        }
        
        // Show sample data from second row
        if (range.e.r >= 1) {
          console.log('   Sample data (Row 2):');
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
            const cell = worksheet[cellAddress];
            const value = cell ? cell.v : '';
            console.log(`     Column ${col + 1}: "${value}"`);
          }
        }
      }
    });
    
    // Convert to JSON to see the structure
    console.log('\n📊 Converting first worksheet to JSON (first 3 rows):');
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    console.log('JSON structure:');
    jsonData.slice(0, 3).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkExcelStructure();


