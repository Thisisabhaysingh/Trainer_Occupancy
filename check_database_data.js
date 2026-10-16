require('dotenv').config();
const { User, Department, Activity, Branch } = require('./models');

(async () => {
  try {
    console.log('🔍 Checking database data...\n');
    
    // Count users by role
    const adminCount = await User.count({ where: { role: 'admin' } });
    const managerCount = await User.count({ where: { role: 'manager' } });
    const employeeCount = await User.count({ where: { role: 'employee' } });
    const totalUsers = await User.count();
    
    console.log('👥 Users:');
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Managers: ${managerCount}`);
    console.log(`   Employees: ${employeeCount}`);
    console.log(`   Total: ${totalUsers}\n`);
    
    // Count branches
    const branchCount = await Branch.count();
    const branches = await Branch.findAll({ attributes: ['id', 'name', 'location'] });
    console.log('🏢 Branches:');
    console.log(`   Total: ${branchCount}`);
    if (branches.length > 0) {
      branches.forEach(b => console.log(`   - ${b.name} (${b.location}) (ID: ${b.id})`));
    }
    console.log('');

    // Check users with branchId
    const usersWithBranchId = await User.count({ where: { branchId: { [require('sequelize').Op.ne]: null } } });
    const usersWithoutBranchId = await User.count({ where: { branchId: null } });
    console.log('👥 Users with BranchId:');
    console.log(`   With branchId: ${usersWithBranchId}`);
    console.log(`   Without branchId: ${usersWithoutBranchId}\n`);

    // Check departments with branchId
    const deptsWithBranchId = await Department.count({ where: { branchId: { [require('sequelize').Op.ne]: null } } });
    const deptsWithoutBranchId = await Department.count({ where: { branchId: null } });
    console.log('📁 Departments with BranchId:');
    console.log(`   With branchId: ${deptsWithBranchId}`);
    console.log(`   Without branchId: ${deptsWithoutBranchId}\n`);
    
    // Diagnosis
    console.log('💡 Diagnosis:');
    if (totalUsers === 0) {
      console.log('   ❌ No users found! Run: npm run init:production');
    } else if (employeeCount === 0) {
      console.log('   ⚠️  No employees found! Only admins/managers exist.');
      console.log('   💡 To add employees, run: npm run init:production:employees');
      console.log('   💡 Or add them manually via the Admin Dashboard > Manage Employees tab');
    } else {
      console.log('   ✅ Database has users');
    }
    
    if (branchCount === 0) {
      console.log('   ❌ No branches found! Run: npm run init:production');
    } else {
      console.log('   ✅ Database has branches');
    }
    
    if (usersWithoutBranchId > 0) {
      console.log(`   ⚠️  ${usersWithoutBranchId} users without branchId! Run fix script.`);
    } else {
      console.log('   ✅ All users have branchId');
    }
    
    if (deptsWithoutBranchId > 0) {
      console.log(`   ⚠️  ${deptsWithoutBranchId} departments without branchId! Run fix script.`);
    } else {
      console.log('   ✅ All departments have branchId');
    }
    
    if (activityCount === 0) {
      console.log('   ⚠️  No activities found. Employees need to log activities.');
    } else {
      console.log('   ✅ Database has activities');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
