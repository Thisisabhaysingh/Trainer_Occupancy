require('dotenv').config();
const { User } = require('./models');

(async () => {
  try {
    console.log('🔍 Checking database configuration...');
    console.log('   DB_DIALECT:', process.env.DB_DIALECT || 'not set');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('   DB_NAME:', process.env.DB_NAME || 'not set');
    
    const admin = await User.findOne({ where: { email: 'admin@omotec.com' } });
    
    if (admin) {
      console.log('\n✅ Admin user found:');
      console.log('   Employee Code:', admin.employeeCode);
      console.log('   Name:', admin.name);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      
      // Test password
      const testPassword = 'Admin@123';
      const isMatch = await admin.comparePassword(testPassword);
      console.log('\n🔐 Password test (Admin@123):', isMatch ? '✅ CORRECT' : '❌ INCORRECT');
    } else {
      console.log('\n❌ Admin user NOT found in database');
      console.log('\n💡 Run: npm run init:production');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  }
})();
