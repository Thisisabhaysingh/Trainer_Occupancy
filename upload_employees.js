const XLSX = require('xlsx');
const sequelize = require('./config/sequelize');
const User = require('./models/User');
const Department = require('./models/Department');
const Branch = require('./models/Branch');

// Configuration
const EXCEL_FILE_PATH = 'All Employees - OMOTEC (6) (1).xlsx';
const DEFAULT_PASSWORD = 'password123';
const DEFAULT_ROLE = 'employee';
console.log('DB creds in upload:', {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? 'set' : 'missing'
});

// Column mapping (0-indexed)
const COLUMN_MAPPING = {
  employeeNo: 0,    // Column A
  name: 1,          // Column B
  email: 2,         // Column C
  department: 6,    // Column G
  location: 8,      // Column H (Branch/Location)
};

async function uploadEmployees() {
  try {
    console.log('📂 Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`✅ Found ${data.length} rows in Excel file`);

    // Skip first 3 rows (header rows)
    const employeeRows = data.slice(3);
    console.log(`👥 Processing ${employeeRows.length} employees...\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of employeeRows) {
      const employeeNo = row[COLUMN_MAPPING.employeeNo];
      const name = row[COLUMN_MAPPING.name];
      const email = row[COLUMN_MAPPING.email] || `${employeeNo}@omotec.com`;
      const departmentName = row[COLUMN_MAPPING.department] || 'General';
      const location = row[COLUMN_MAPPING.location]; // Branch from Location column

      // Skip empty rows
      if (!employeeNo || !name) {
        continue;
      }

      try {
        // Find or create branch from Location column
        let branch = null;
        if (location && location.trim()) {
          [branch] = await Branch.findOrCreate({
            where: { name: location.trim() },
            defaults: {
              name: location.trim(),
              location: location.trim()
            }
          });
        }

        // Find or create department
        const [department] = await Department.findOrCreate({
          where: { name: departmentName },
          defaults: {
            name: departmentName,
            description: `${departmentName} department`,
            location: location || 'HQ',
            branchId: branch ? branch.id : null
          }
        });

        // Check if user exists
        const existingUser = await User.findOne({ where: { employeeCode: employeeNo } });
        
        if (existingUser) {
          // Update existing user with branch information
          await existingUser.update({
            name: name,
            email: email,
            departmentId: department.id,
            branchId: branch ? branch.id : null
          });
          console.log(`🔄 Updated: ${name} (${email}) - Branch: ${location || 'N/A'}`);
          updated++;
        } else {
          // Create new user
          await User.create({
            employeeCode: employeeNo,
            name: name,
            email: email,
            password: DEFAULT_PASSWORD,
            role: DEFAULT_ROLE,
            departmentId: department.id,
            branchId: branch ? branch.id : null
          });
          console.log(`✅ Created: ${name} (${email}) - Branch: ${location || 'N/A'}`);
          created++;
        }

      } catch (err) {
        console.error(`❌ Error creating ${name}: ${err.message}`);
        errors++;
      }
    }

    console.log('\n📊 Upload Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n🎉 Employee upload completed!');
    console.log('\n📝 Default login credentials:');
    console.log('   Password: password123');
    console.log('   (Employees should change on first login)');

    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

uploadEmployees();
