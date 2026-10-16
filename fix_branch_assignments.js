const dotenv = require('dotenv');
dotenv.config();

const { sequelize, User, Department, Branch } = require('./models');

async function fixBranchAssignments() {
  try {
    console.log('🔧 Fixing branch assignments...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create or find main branch
    const [branch, branchCreated] = await Branch.findOrCreate({
      where: { name: 'Main Branch' },
      defaults: { name: 'Main Branch', location: 'HQ' }
    });
    console.log(branchCreated ? `✅ Created branch: ${branch.name}` : `ℹ️  Branch exists: ${branch.name}`);

    // Update departments to set branchId if null
    const updatedDepts = await Department.update(
      { branchId: branch.id },
      { where: { branchId: null } }
    );
    console.log(`✅ Updated ${updatedDepts[0]} departments with branchId`);

    // Update users to set branchId if null
    const updatedUsers = await User.update(
      { branchId: branch.id },
      { where: { branchId: null, role: { [require('sequelize').Op.ne]: 'admin' } } }
    );
    console.log(`✅ Updated ${updatedUsers[0]} users with branchId`);

    console.log('\n🎉 Branch assignments fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBranchAssignments();
