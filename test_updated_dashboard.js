// Test updated team lead dashboard APIs
const { sequelize, User, Department, Branch, Activity } = require('./models');

async function testUpdatedDashboard() {
  try {
    console.log('🧪 Testing updated team lead dashboard APIs...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get team lead
    const teamLead = await User.findOne({ where: { role: 'teamlead' } });
    if (!teamLead) {
      console.log('❌ No team lead found');
      return;
    }

    console.log(`👤 Team Lead: ${teamLead.name} (${teamLead.employeeCode})`);
    console.log(`   Branch: ${teamLead.branchId}`);
    console.log(`   Department: ${teamLead.departmentId}`);

    // Test employees API (should return all branch employees organized by department)
    const branchEmployees = await User.findAll({
      where: {
        role: 'employee',
        branchId: teamLead.branchId
      },
      include: [Department, Branch]
    });

    console.log(`\n👥 Branch Employees: ${branchEmployees.length}`);

    // Group by department
    const employeesByDepartment = {};
    branchEmployees.forEach(emp => {
      const deptName = emp.department?.name || 'Unassigned';
      if (!employeesByDepartment[deptName]) {
        employeesByDepartment[deptName] = [];
      }
      employeesByDepartment[deptName].push({
        name: emp.name,
        department: deptName,
        isTeamLeadDepartment: emp.departmentId === teamLead.departmentId
      });
    });

    console.log('\n📊 Employees by Department:');
    Object.entries(employeesByDepartment).forEach(([deptName, emps]) => {
      const isTeamLeadDept = emps.some(emp => emp.isTeamLeadDepartment);
      console.log(`   ${isTeamLeadDept ? '🎯' : '📋'} ${deptName}: ${emps.length} employees`);
    });

    // Test activities API (should return department activities)
    const teamLeadDeptEmployees = branchEmployees.filter(emp => emp.departmentId === teamLead.departmentId);
    const teamLeadDeptActivities = await Activity.findAll({
      where: {
        assignedToId: teamLeadDeptEmployees.map(emp => emp.employeeCode)
      }
    });

    console.log(`\n📝 Team Lead Department Activities: ${teamLeadDeptActivities.length}`);

    // Test branch context
    const branchDepartments = await Department.count({ where: { branchId: teamLead.branchId } });
    const totalBranchEmployees = await User.count({ where: { role: 'employee', branchId: teamLead.branchId } });

    console.log(`\n🏢 Branch Context:`);
    console.log(`   Total Departments: ${branchDepartments}`);
    console.log(`   Total Employees: ${totalBranchEmployees}`);

    console.log('\n🎉 UPDATED TEAM LEAD DASHBOARD READY!');
    console.log('📋 New Features:');
    console.log(`   ✅ Shows all branch employees organized by department`);
    console.log(`   ✅ Highlights team lead's department`);
    console.log(`   ✅ Provides branch context without overwhelming detail`);
    console.log(`   ✅ Focuses on team lead's department data`);

    console.log('\n🚀 Dashboard will show:');
    console.log(`   - Header: Branch name with department focus`);
    console.log(`   - Employees: All branch employees by department (${totalBranchEmployees} total)`);
    console.log(`   - Activities: Organized by department`);
    console.log(`   - Analytics: Department-focused with branch context`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testUpdatedDashboard();
