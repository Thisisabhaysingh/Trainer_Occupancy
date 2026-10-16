// Debug script to check what branches and departments exist
const { sequelize, User, Department, Branch } = require('./models');

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database records...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check all branches
    const branches = await Branch.findAll();
    console.log(`📊 Total branches: ${branches.length}`);
    branches.forEach((branch, i) => {
      console.log(`   ${i + 1}. ID: ${branch.id} - ${branch.name} (${branch.location})`);
    });

    // Check all departments
    const departments = await Department.findAll();
    console.log(`\n📋 Total departments: ${departments.length}`);
    departments.forEach((dept, i) => {
      console.log(`   ${i + 1}. ID: ${dept.id} - ${dept.name} (Branch ID: ${dept.branchId})`);
    });

    // Check team lead user details
    const teamLead = await User.findOne({ where: { role: 'teamlead' } });
    if (teamLead) {
      console.log(`\n👤 Team Lead User:`);
      console.log(`   Name: ${teamLead.name}`);
      console.log(`   Employee Code: ${teamLead.employeeCode}`);
      console.log(`   Branch ID: ${teamLead.branchId}`);
      console.log(`   Department ID: ${teamLead.departmentId}`);

      // Check if referenced records exist
      const userBranch = await Branch.findByPk(teamLead.branchId);
      const userDepartment = await Department.findByPk(teamLead.departmentId);

      console.log(`   Referenced Branch exists: ${userBranch ? '✅' : '❌'}`);
      console.log(`   Referenced Department exists: ${userDepartment ? '✅' : '❌'}`);

      if (userBranch) console.log(`   Branch Name: ${userBranch.name}`);
      if (userDepartment) console.log(`   Department Name: ${userDepartment.name}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    process.exit(1);
  }
}

debugDatabase();
