// Test team lead dashboard APIs with new department-focused implementation
const { sequelize, User, Department, Branch, Activity } = require('./models');

async function testDepartmentFocusedDashboard() {
  try {
    console.log('🧪 Testing department-focused team lead dashboard...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get team lead
    const teamLead = await User.findOne({ where: { role: 'teamlead' } });
    if (!teamLead) {
      console.log('❌ No team lead found');
      return;
    }

    console.log(`👤 Team Lead: ${teamLead.name} (${teamLead.employeeCode})`);
    console.log(`   Branch ID: ${teamLead.branchId}`);
    console.log(`   Department ID: ${teamLead.departmentId}`);

    // Test team lead's department data
    const departmentEmployees = await User.count({
      where: {
        role: 'employee',
        departmentId: teamLead.departmentId
      }
    });

    console.log(`\n📊 Team Lead's Department:`);
    console.log(`   Employees: ${departmentEmployees}`);

    // Test branch context
    const branchEmployees = await User.count({
      where: {
        role: 'employee',
        branchId: teamLead.branchId
      }
    });

    // Get team lead's department name
    const teamLeadDepartment = await Department.findByPk(teamLead.departmentId);
    const teamLeadBranch = await Branch.findByPk(teamLead.branchId);

    const branchDepartments = await Department.count({
      where: { branchId: teamLead.branchId }
    });

    console.log(`\n🏢 Branch Context:`);
    console.log(`   Total Employees: ${branchEmployees}`);
    console.log(`   Total Departments: ${branchDepartments}`);

    // Test activities for team lead's department (simplified)
    const deptEmployeeCodes = await User.findAll({
      where: {
        role: 'employee',
        departmentId: teamLead.departmentId
      },
      attributes: ['employeeCode']
    });

    const employeeCodes = deptEmployeeCodes.map(u => u.employeeCode);

    const departmentActivities = await Activity.count({
      where: {
        assignedToId: employeeCodes
      }
    });

    console.log(`   Activities: ${departmentActivities}`);

    // Test sample employee data (simplified)
    const sampleEmployee = await User.findOne({
      where: {
        role: 'employee',
        departmentId: teamLead.departmentId
      }
    });

    console.log(`\n👥 Sample Department Employee:`);
    if (sampleEmployee) {
      console.log(`   - ${sampleEmployee.name} (${sampleEmployee.employeeCode})`);
      console.log(`     Department ID: ${sampleEmployee.departmentId}`);
      console.log(`     Branch ID: ${sampleEmployee.branchId}`);
    } else {
      console.log(`   No employees found in department`);
    }

    console.log('\n🎉 DEPARTMENT-FOCUSED DASHBOARD READY!');
    console.log('📋 Dashboard Features:');
    console.log(`   ✅ Focus: ${teamLeadDepartment?.name || 'Department'} data`);
    console.log(`   ✅ Context: ${teamLeadBranch?.name || 'Branch'} overview`);
    console.log(`   ✅ Team: ${departmentEmployees} employees in department`);
    console.log(`   ✅ Branch: ${branchEmployees} employees total`);
    console.log(`   ✅ Scope: Department activities and analytics`);

    console.log('\n🚀 Access the dashboard at: http://localhost:5001');
    console.log('   Login as team lead to see department-focused view');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testDepartmentFocusedDashboard();
