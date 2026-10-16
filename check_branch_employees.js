const { User, Branch, Department } = require('./models');
const sequelize = require('./config/sequelize');

async function checkBranchEmployees() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    const branchId = 7;

    // Get branch details
    const branch = await Branch.findByPk(branchId);
    console.log('\n=== Branch Details ===');
    console.log('Branch ID:', branchId);
    console.log('Branch Name:', branch?.name || 'Not found');
    console.log('Branch Location:', branch?.location || 'N/A');

    // Get all employees in this branch
    const employees = await User.findAll({
      where: {
        branchId: branchId,
        role: 'employee'
      },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ]
    });

    console.log('\n=== Employees in Branch ===');
    console.log('Total employees:', employees.length);
    
    if (employees.length > 0) {
      console.log('\nEmployee List:');
      employees.forEach((emp, idx) => {
        console.log(`${idx + 1}. ${emp.name} (${emp.employeeCode}) - Department: ${emp.department?.name || 'None'}`);
      });
    } else {
      console.log('\n⚠️  No employees found in this branch!');
      console.log('\nChecking all employees in database...');
      
      const allEmployees = await User.findAll({
        where: { role: 'employee' },
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] }
        ]
      });
      
      console.log(`\nTotal employees in system: ${allEmployees.length}`);
      if (allEmployees.length > 0) {
        console.log('\nEmployees by branch:');
        const byBranch = {};
        allEmployees.forEach(emp => {
          const branchName = emp.branch?.name || 'No Branch';
          if (!byBranch[branchName]) byBranch[branchName] = [];
          byBranch[branchName].push(emp.name);
        });
        Object.entries(byBranch).forEach(([branch, emps]) => {
          console.log(`  ${branch}: ${emps.length} employees`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBranchEmployees();
