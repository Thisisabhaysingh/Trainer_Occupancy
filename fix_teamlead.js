// Fix team lead department association
const { sequelize, User, Department, Branch } = require('./models');

async function fixTeamLeadAssociation() {
  try {
    console.log('🔧 Fixing team lead department association...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find the team lead
    const teamLead = await User.findOne({ where: { role: 'teamlead' } });
    if (!teamLead) {
      console.log('❌ No team lead found');
      return;
    }

    console.log(`👤 Team Lead: ${teamLead.name} (${teamLead.employeeCode})`);
    console.log(`   Current Branch ID: ${teamLead.branchId}`);
    console.log(`   Current Department ID: ${teamLead.departmentId}`);

    // Get the branch
    const branch = await Branch.findByPk(teamLead.branchId);
    console.log(`🏢 Branch: ${branch?.name || 'Not found'}`);

    // Get the department
    const department = await Department.findByPk(teamLead.departmentId);
    console.log(`📋 Department: ${department?.name || 'Not found'} (Branch ID: ${department?.branchId})`);

    // Find departments that actually belong to the team lead's branch
    const branchDepartments = await Department.findAll({
      where: { branchId: teamLead.branchId }
    });

    console.log(`\n📊 Departments in team lead's branch (${teamLead.branchId}):`);
    if (branchDepartments.length === 0) {
      console.log('   ❌ No departments found in branch!');

      // Create a department for this branch
      console.log('   🔨 Creating a default department for this branch...');
      const newDepartment = await Department.create({
        name: 'General',
        description: 'General Department',
        location: branch?.location || 'Branch Location',
        branchId: teamLead.branchId
      });

      console.log(`   ✅ Created department: ${newDepartment.name} (ID: ${newDepartment.id})`);

      // Update team lead to use this department
      await teamLead.update({ departmentId: newDepartment.id });
      console.log('   ✅ Updated team lead to use new department');

    } else {
      console.log('   ✅ Departments found:');
      branchDepartments.forEach(dept => {
        console.log(`      - ${dept.name} (ID: ${dept.id})`);
      });

      // If team lead's current department is not in their branch, assign them to the first available department
      const currentDeptInBranch = branchDepartments.find(dept => dept.id === teamLead.departmentId);

      if (!currentDeptInBranch) {
        console.log('   ⚠️  Team lead\'s department is not in their branch');
        console.log('   🔄 Assigning team lead to first available department...');

        await teamLead.update({ departmentId: branchDepartments[0].id });
        console.log(`   ✅ Updated team lead to department: ${branchDepartments[0].name}`);
      } else {
        console.log('   ✅ Team lead\'s department is correctly assigned to their branch');
      }
    }

    // Verify the fix (without associations to avoid errors)
    console.log('\n🔍 Verifying fix...');
    const updatedTeamLead = await User.findOne({
      where: { employeeCode: teamLead.employeeCode }
    });

    const updatedBranch = await Branch.findByPk(updatedTeamLead.branchId);
    const updatedDepartment = await Department.findByPk(updatedTeamLead.departmentId);

    console.log(`   ✅ Team lead: ${updatedTeamLead.name}`);
    console.log(`   ✅ Branch: ${updatedBranch?.name || 'Not found'}`);
    console.log(`   ✅ Department: ${updatedDepartment?.name || 'Not found'}`);
    console.log(`   ✅ Department Branch ID: ${updatedDepartment?.branchId || 'Not found'}`);

    console.log('\n🎉 Team lead association fixed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fix error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

fixTeamLeadAssociation();
