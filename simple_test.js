// Very simple test for team lead dashboard
const { sequelize, User, Department, Branch } = require('./models');

async function simpleTest() {
  try {
    console.log('🧪 Simple team lead test...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    const teamLead = await User.findOne({ where: { role: 'teamlead' } });
    if (teamLead) {
      console.log(`✅ Team lead found: ${teamLead.name}`);
      console.log(`   Branch ID: ${teamLead.branchId}`);
      console.log(`   Department ID: ${teamLead.departmentId}`);

      const branch = await Branch.findByPk(teamLead.branchId);
      const department = await Department.findByPk(teamLead.departmentId);

      console.log(`   Branch: ${branch?.name || 'Not found'}`);
      console.log(`   Department: ${department?.name || 'Not found'}`);

      const depts = await Department.findAll({ where: { branchId: teamLead.branchId } });
      console.log(`   Departments in branch: ${depts.length}`);

      const emps = await User.count({ where: { role: 'employee', branchId: teamLead.branchId } });
      console.log(`   Employees in branch: ${emps}`);

      console.log('\n🎉 Everything looks good!');
    } else {
      console.log('❌ No team lead found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

simpleTest();
