require('dotenv').config();
const { User, Department, Branch } = require('./models');

async function checkTeamLeadUsers() {
  try {
    console.log('🔍 Checking TeamLead users...\n');

    await require('./models').sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find all teamlead users
    const teamLeads = await User.findAll({
      where: { role: 'teamlead' },
      attributes: ['employeeCode', 'name', 'email', 'departmentId', 'branchId'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'branchId'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ]
    });

    console.log(`📊 Found ${teamLeads.length} teamlead users:\n`);

    teamLeads.forEach(user => {
      console.log(`👤 ${user.name} (${user.employeeCode})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   DepartmentId: ${user.departmentId || 'NULL'}`);
      console.log(`   BranchId: ${user.branchId || 'NULL'}`);
      console.log(`   Department: ${user.department?.name || 'No department assigned'}`);
      console.log(`   Department BranchId: ${user.department?.branchId || 'N/A'}`);
      console.log(`   Branch: ${user.branch?.name || 'No branch assigned'}`);
      console.log('');
    });

    // Check for inconsistencies
    const issues = teamLeads.filter(user => {
      return !user.departmentId || !user.branchId ||
             (user.department && user.department.branchId !== user.branchId);
    });

    if (issues.length > 0) {
      console.log(`⚠️  Found ${issues.length} users with issues:`);
      issues.forEach(user => {
        console.log(`   - ${user.name}: Missing departmentId or branchId, or mismatch`);
      });
    } else {
      console.log('✅ All teamlead users have proper departmentId and branchId assignments');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTeamLeadUsers();
