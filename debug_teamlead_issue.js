const { User, Department, Branch } = require('./models');

async function debugTeamLeadIssue() {
  try {
    console.log('=== TEAM LEAD DASHBOARD DEBUG ===');

    // Find all team leads
    const teamLeads = await User.findAll({
      where: { role: 'teamlead' },
      include: [
        { model: Department, as: 'department', required: false },
        { model: Branch, as: 'branch', required: false }
      ]
    });

    for (const tl of teamLeads) {
      console.log(`\n=== TEAM LEAD: ${tl.name} (${tl.employeeCode}) ===`);
      console.log(`Department: ${tl.department?.name || 'NONE'} (ID: ${tl.departmentId})`);
      console.log(`Branch: ${tl.branch?.name || 'NONE'} (ID: ${tl.branchId})`);

      if (tl.departmentId && tl.branchId) {
        // Check if department belongs to team lead's branch
        const dept = await Department.findByPk(tl.departmentId);
        if (dept) {
          console.log(`Department "${dept.name}" belongs to branch ID: ${dept.branchId}`);
          console.log(`Team lead branch: ${tl.branchId}`);
          console.log(`Department-branch match: ${dept.branchId === tl.branchId ? 'YES' : 'NO ❌'}`);
        }

        // Find employees that should be visible to this team lead
        const visibleEmployees = await User.findAll({
          where: {
            role: 'employee',
            departmentId: tl.departmentId,
            branchId: tl.branchId
          },
          include: [
            { model: Department, as: 'department', required: false },
            { model: Branch, as: 'branch', required: false }
          ]
        });

        console.log(`\nEmployees this team lead should see (${visibleEmployees.length}):`);
        for (const emp of visibleEmployees) {
          console.log(`  - ${emp.name} (${emp.employeeCode}): ${emp.department?.name}, ${emp.branch?.name}`);
        }
      } else {
        console.log('ERROR: Team lead missing departmentId or branchId!');
      }
    }

    // Check all departments and their branches
    console.log('\n=== ALL DEPARTMENTS ===');
    const allDepts = await Department.findAll({
      include: [{ model: Branch, as: 'branch', required: false }]
    });

    for (const dept of allDepts) {
      console.log(`${dept.name} (ID: ${dept.id}) -> Branch: ${dept.branch?.name || 'NONE'} (ID: ${dept.branchId})`);
    }

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

debugTeamLeadIssue();
