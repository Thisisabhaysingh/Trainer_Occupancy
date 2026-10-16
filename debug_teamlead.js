const { User, Department, Branch } = require('./models');

async function debugTeamLead() {
  try {
    console.log('=== CHECKING TEAM LEAD SETUP ===');

    // Find all team leads
    const teamLeads = await User.findAll({
      where: { role: 'teamlead' },
      include: [
        { model: Department, as: 'department', required: false },
        { model: Branch, as: 'branch', required: false }
      ]
    });

    console.log('\n=== TEAM LEADS ===');
    for (const tl of teamLeads) {
      console.log(`Name: ${tl.name}, Code: ${tl.employeeCode}`);
      console.log(`  Department: ${tl.department?.name || 'NONE'} (ID: ${tl.departmentId})`);
      console.log(`  Branch: ${tl.branch?.name || 'NONE'} (ID: ${tl.branchId})`);

      // Check if this team lead can see employees
      if (tl.departmentId && tl.branchId) {
        const employees = await User.findAll({
          where: {
            role: 'employee',
            departmentId: tl.departmentId,
            branchId: tl.branchId
          }
        });
        console.log(`  Can see ${employees.length} employees in their dept/branch`);
      }
      console.log('---');
    }

    // Check Electronics department
    const electronicsDept = await Department.findOne({ where: { name: 'Electronics' } });
    console.log('\n=== ELECTRONICS DEPARTMENT ===');
    if (electronicsDept) {
      console.log(`ID: ${electronicsDept.id}, Branch ID: ${electronicsDept.branchId}`);

      // Find branch name
      const branch = await Branch.findByPk(electronicsDept.branchId);
      console.log(`Department belongs to branch: ${branch?.name || 'UNKNOWN'}`);

      // Find employees in Electronics
      const electronicsEmployees = await User.findAll({
        where: {
          role: 'employee',
          departmentId: electronicsDept.id
        },
        include: [
          { model: Branch, as: 'branch', required: false }
        ]
      });

      console.log('\n=== EMPLOYEES IN ELECTRONICS ===');
      for (const emp of electronicsEmployees) {
        console.log(`- ${emp.name}: Branch=${emp.branch?.name || 'NONE'} (ID: ${emp.branchId})`);
        console.log(`  Match Electronics branch? ${emp.branchId === electronicsDept.branchId ? 'YES' : 'NO'}`);
      }
    } else {
      console.log('Electronics department not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

debugTeamLead();
