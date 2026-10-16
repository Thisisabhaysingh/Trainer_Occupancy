require('dotenv').config();
const { User, Department } = require('./models');

async function fixBranchMismatch() {
  try {
    console.log('🔧 Fixing branch mismatch for teamleads...\n');

    await require('./models').sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all teamlead users
    const teamLeads = await User.findAll({
      where: { role: 'teamlead' },
      include: [{ model: Department, as: 'department' }]
    });

    console.log(`📊 Processing ${teamLeads.length} teamleads...\n`);

    for (const user of teamLeads) {
      if (user.department && user.branchId !== user.department.branchId) {
        console.log(`🔄 Fixing ${user.name} (${user.employeeCode})`);
        console.log(`   User branchId: ${user.branchId}`);
        console.log(`   Department branchId: ${user.department.branchId}`);

        // Update department to match user's branch
        await Department.update(
          { branchId: user.branchId },
          { where: { id: user.departmentId } }
        );

        console.log(`   ✅ Updated department ${user.department.name} to branchId ${user.branchId}\n`);
      }
    }

    // Verify the fix
    const updatedTeamLeads = await User.findAll({
      where: { role: 'teamlead' },
      include: [{ model: Department, as: 'department', attributes: ['name', 'branchId'] }]
    });

    let allGood = true;
    updatedTeamLeads.forEach(user => {
      if (user.branchId !== user.department.branchId) {
        console.log(`❌ Still mismatch for ${user.name}: User=${user.branchId}, Dept=${user.department.branchId}`);
        allGood = false;
      }
    });

    if (allGood) {
      console.log('🎉 All teamlead branch assignments are now consistent!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBranchMismatch();
