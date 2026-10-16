const { User, Department, Branch } = require('./models');

async function debugTeamLeadDashboard() {
  try {
    console.log('=== TEAM LEAD DASHBOARD DEBUG ===');

    // Find team leads
    const teamLeads = await User.findAll({
      where: { role: 'teamlead' },
      include: [
        { model: Department, as: 'department', required: false },
        { model: Branch, as: 'branch', required: false }
      ]
    });

    console.log(`Found ${teamLeads.length} team leads`);

    if (teamLeads.length > 0) {
      const teamLead = teamLeads[0]; // First team lead
      console.log(`\nTesting team lead: ${teamLead.name} (${teamLead.employeeCode})`);
      console.log(`Department ID: ${teamLead.departmentId}`);
      console.log(`Branch ID: ${teamLead.branchId}`);

      // Check department
      if (teamLead.departmentId) {
        const dept = await Department.findByPk(teamLead.departmentId);
        console.log(`Department: ${dept?.name} (Branch: ${dept?.branchId})`);
      }

      // Run the exact query from teamlead.js
      console.log('\nRunning team lead employee query...');

      const departmentEmployees = await User.findAll({
        where: {
          role: 'employee',
          departmentId: teamLead.departmentId,
          branchId: teamLead.branchId
        },
        attributes: { exclude: ['password'] },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name', 'location'] }
        ]
      });

      console.log(`Query returned ${departmentEmployees.length} employees`);

      if (departmentEmployees.length === 0) {
        console.log('No employees found. Checking why...');

        // Check total employees
        const allEmployees = await User.findAll({ where: { role: 'employee' } });
        console.log(`Total employees in system: ${allEmployees.length}`);

        // Check employees in department
        const deptEmployees = await User.findAll({
          where: { departmentId: teamLead.departmentId, role: 'employee' }
        });
        console.log(`Employees in team lead's department: ${deptEmployees.length}`);

        // Check employees in branch
        const branchEmployees = await User.findAll({
          where: { branchId: teamLead.branchId, role: 'employee' }
        });
        console.log(`Employees in team lead's branch: ${branchEmployees.length}`);

        // Check employees in department but wrong branch
        const deptWrongBranch = await User.findAll({
          where: {
            departmentId: teamLead.departmentId,
            role: 'employee'
          },
          include: [{ model: Branch, as: 'branch', required: false }]
        });

        console.log('Employees in department (any branch):');
        deptWrongBranch.forEach(emp => {
          console.log(`  ${emp.name}: Branch ${emp.branch?.name} (${emp.branchId})`);
        });
      } else {
        console.log('Found employees:');
        departmentEmployees.forEach(emp => {
          console.log(`  ${emp.name} (${emp.employeeCode})`);
        });
      }
    } else {
      console.log('No team leads found in database!');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

debugTeamLeadDashboard();
