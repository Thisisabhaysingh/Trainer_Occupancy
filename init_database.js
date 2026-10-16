const sequelize = require('./config/sequelize');
const Department = require('./models/Department');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const departments = [
  { name: 'Coding', description: 'Software and programming department', location: 'HQ' },
  { name: 'Electronics', description: 'Electronics and hardware department', location: 'Remote' },
  { name: 'Mechatronics', description: 'Mechatronics and automation department', location: 'HQ' },
];

async function initDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    console.log('🔄 Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synced');

    // Create departments
    console.log('🔄 Creating departments...');
    for (const dep of departments) {
      const [department, created] = await Department.findOrCreate({
        where: { name: dep.name },
        defaults: dep
      });
      if (created) {
        console.log(`✅ Created department: ${dep.name}`);
      } else {
        console.log(`ℹ️  Department already exists: ${dep.name}`);
      }
    }

    // Create admin user
    console.log('🔄 Creating admin user...');
    const existingAdmin = await User.findOne({ where: { email: 'admin@omotec.com' } });
    
    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: 'admin@omotec.com',
        password: 'admin123',  // The model hook will hash this
        employeeCode: 'ADMIN001',
        role: 'admin',
        departmentId: 1,
        branchId: 1  // Assign to first branch
      });
      console.log('✅ Created admin user');
      console.log('   Email: admin@omotec.com');
      console.log('   Password: admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@omotec.com');
    console.log('   Password: admin123');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  }
}

initDatabase();
