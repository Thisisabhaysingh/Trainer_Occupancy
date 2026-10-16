const { sequelize, Branch, User } = require('./models');

async function testAssociations() {
  try {
    console.log('Testing Sequelize associations...');

    // Test basic connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Test associations
    console.log('Branch associations:', Branch.associations);
    console.log('User associations:', User.associations);

    // Test query without includes first
    const branches = await Branch.findAll();
    console.log('✅ Basic Branch query works:', branches.length, 'branches found');

    // Test query with includes
    const branchesWithUsers = await Branch.findAll({
      include: [
        { model: User, as: "manager", attributes: ["employeeCode", "name", "email"] },
        { model: User, as: "branchUsers", attributes: ["employeeCode", "name", "email"] },
      ],
    });
    console.log('✅ Branch query with includes works:', branchesWithUsers.length, 'branches found');

    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testAssociations();
