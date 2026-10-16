const { User } = require('./models');
const sequelize = require('./config/sequelize');

async function fixManagerType() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Find the manager with email ramu123@gmail.com
    const manager = await User.findOne({
      where: { email: 'ramu123@gmail.com' }
    });

    if (!manager) {
      console.log('Manager not found');
      process.exit(1);
    }

    console.log('\n=== Current Manager Details ===');
    console.log('Name:', manager.name);
    console.log('Email:', manager.email);
    console.log('Role:', manager.role);
    console.log('Manager Type:', manager.managerType);
    console.log('Department ID:', manager.departmentId);
    console.log('Branch ID:', manager.branchId);

    // Update manager type to 'branch'
    manager.managerType = 'branch';
    await manager.save();

    console.log('\n=== Updated Manager Details ===');
    console.log('Name:', manager.name);
    console.log('Email:', manager.email);
    console.log('Role:', manager.role);
    console.log('Manager Type:', manager.managerType);
    console.log('Department ID:', manager.departmentId);
    console.log('Branch ID:', manager.branchId);

    console.log('\n✅ Manager type updated successfully!');
    console.log('Now the manager will see all employees in branch ID:', manager.branchId);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixManagerType();
