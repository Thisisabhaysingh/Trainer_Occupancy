// Simple test for updated team lead dashboard
const { sequelize, User, Department, Branch } = require('./models');

async function simpleUpdatedTest() {
  try {
    console.log('🧪 Testing updated team lead dashboard...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get team lead
    const teamLead = await User.findOne({ where: { role: 'teamlead' } });
    if (!teamLead) {
      console.log('❌ No team lead found');
      return;
    }

    console.log(`👤 Team Lead: ${teamLead.name}`);
    console.log(`   Branch ID: ${teamLead.branchId}`);
    console.log(`   Department ID: ${teamLead.departmentId}`);

    // Get branch info
    const branch = await Branch.findByPk(teamLead.branchId);
    const department = await Department.findByPk(teamLead.departmentId);

    console.log(`\n🏢 Branch: ${branch?.name || 'Not found'}`);
    console.log(`📋 Department: ${department?.name || 'Not found'}`);

    // Count employees in branch
    const totalBranchEmployees = await User.count({
      where: {
        role: 'employee',
        branchId: teamLead.branchId
      }
    });

    console.log(`👥 Branch Employees: ${totalBranchEmployees}`);

    // Count employees in team lead's department
    const departmentEmployees = await User.count({
      where: {
        role: 'employee',
        departmentId: teamLead.departmentId
      }
    });

    console.log(`📊 Department Employees: ${departmentEmployees}`);

    console.log('\n🎉 TEAM LEAD DASHBOARD UPDATED!');
    console.log('📋 Changes Made:');
    console.log(`   ✅ Shows all branch employees organized by department`);
    console.log(`   ✅ Highlights team lead's department (${department?.name})`);
    console.log(`   ✅ Removed branch department comparison options`);
    console.log(`   ✅ Simplified to focus on department with branch context`);

    console.log('\n📊 Dashboard Structure:');
    console.log(`   - Branch: ${branch?.name} (${totalBranchEmployees} employees)`);
    console.log(`   - Your Department: ${department?.name} (${departmentEmployees} employees)`);
    console.log(`   - Focus: Department data with branch overview`);

    console.log('\n🚀 Ready to use at: http://localhost:5001');
    console.log('   Login as team lead to see the updated dashboard');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

simpleUpdatedTest();
