require('dotenv').config();
const { User } = require('./models');

(async () => {
  try {
    const employees = await User.findAll({ 
      where: { role: 'employee' },
      attributes: ['employeeCode', 'name', 'email', 'role'],
      limit: 10
    });
    
    if (employees.length > 0) {
      console.log('\n📋 First 10 Employees:\n');
      employees.forEach(emp => {
        console.log(`   ${emp.employeeCode} - ${emp.name}`);
        console.log(`   Email: ${emp.email}`);
        console.log(`   Password: Employee@123\n`);
      });
    } else {
      console.log('❌ No employees found in database');
      console.log('\n💡 Run: npm run init:production:employees');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
