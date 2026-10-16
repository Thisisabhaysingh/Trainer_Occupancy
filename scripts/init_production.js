const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, Department, User, ActivityTemplate } = require('../models');

// ==================== Department Data ====================
const departments = [
  { name: 'Coding', description: 'Software and programming department', location: 'HQ' },
  { name: 'Electronics', description: 'Electronics and hardware department', location: 'Remote' },
  { name: 'Mechatronics', description: 'Mechatronics and automation department', location: 'HQ' },
];

// ==================== Activity Templates by Department ====================
const activityTitlesByDepartment = {
  Coding: [
    'Circuit Design',
    'Soldering/Assembly',
    'Inventory',
    'Research',
    'Workshop',
    'Project/Prototype Work',
    'Code Review',
    'Content Work',
    'Self Skilling',
    'Meeting',
    'Total No. of Sessions',
    'Time Spent In Offline Sessions',
    'Time Spent In School Sessions',
    'Time Spent In Online Sessions',
    'Time Spent In Travel',
    'Time Spent In Lunch',
    'Time Spent In LMS Update',
    'Time Spent In Summary Report',
    'Time Spent In Competition Research',
    'Time Spent In Project/Prototype work',
    'Time Spent In Workshop',
    'Time Spent In Inventory',
    'Time Spent In Meeting',
    'Time Spent In Self Skilling',
    'Other Activities',
  ],
  Electronics: [
    'Circuit Design',
    'Soldering/Assembly',
    'Inventory',
    'Research',
    'Workshop',
    'Project/Prototype Work',
    'Code Review',
    'Content Work',
    'Self Skilling',
    'Meeting',
    'Total No. of Sessions',
    'Time Spent In Offline Sessions',
    'Time Spent In School Sessions',
    'Time Spent In Online Sessions',
    'Time Spent In Travel',
    'Time Spent In Lunch',
    'Time Spent In LMS Update',
    'Time Spent In Summary Report',
    'Time Spent In Competition Research',
    'Time Spent In Project/Prototype work',
    'Time Spent In Workshop',
    'Time Spent In Inventory',
    'Time Spent In Meeting',
    'Time Spent In Self Skilling',
    'Other Activities',
  ],
  Mechatronics: [
    'Circuit Design',
    'Soldering/Assembly',
    'Inventory',
    'Research',
    'Workshop',
    'Project/Prototype Work',
    'Code Review',
    'Content Work',
    'Self Skilling',
    'Meeting',
    'Total No. of Sessions',
    'Time Spent In Offline Sessions',
    'Time Spent In School Sessions',
    'Time Spent In Online Sessions',
    'Time Spent In Travel',
    'Time Spent In Lunch',
    'Time Spent In LMS Update',
    'Time Spent In Summary Report',
    'Time Spent In Competition Research',
    'Time Spent In Project/Prototype work',
    'Time Spent In Workshop',
    'Time Spent In Inventory',
    'Time Spent In Meeting',
    'Time Spent In Self Skilling',
    'Other Activities',
  ],
};

// ==================== Default Users ====================
const defaultUsers = [
  {
    employeeCode: 'ADMIN001',
    name: 'Admin User',
    email: 'admin@omotec.com',
    password: 'Admin@123',
    role: 'admin',
    departmentName: null, // Admin doesn't need department
  },
  {
    employeeCode: 'MGR001',
    name: 'Coding Manager',
    email: 'coding.manager@omotec.com',
    password: 'Manager@123',
    role: 'manager',
    departmentName: 'Coding',
  },
  {
    employeeCode: 'MGR002',
    name: 'Electronics Manager',
    email: 'electronics.manager@omotec.com',
    password: 'Manager@123',
    role: 'manager',
    departmentName: 'Electronics',
  },
  {
    employeeCode: 'MGR003',
    name: 'Mechatronics Manager',
    email: 'mechatronics.manager@omotec.com',
    password: 'Manager@123',
    role: 'manager',
    departmentName: 'Mechatronics',
  },
];

// ==================== Initialize Departments ====================
async function initDepartments() {
  console.log('\n📁 Initializing Departments...');
  const createdDepts = {};
  
  for (const dept of departments) {
    const [record, created] = await Department.findOrCreate({
      where: { name: dept.name },
      defaults: dept,
    });
    createdDepts[dept.name] = record;
    console.log(created ? `✅ Created department: ${dept.name}` : `ℹ️  Department exists: ${dept.name}`);
  }
  
  return createdDepts;
}

// ==================== Initialize Users ====================
async function initUsers(departments) {
  console.log('\n👥 Initializing Users...');
  
  for (const userData of defaultUsers) {
    const existing = await User.findOne({ where: { employeeCode: userData.employeeCode } });
    
    if (existing) {
      console.log(`ℹ️  User exists: ${userData.name} (${userData.employeeCode})`);
      continue;
    }
    
    const userRecord = {
      employeeCode: userData.employeeCode,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
    };
    
    if (userData.departmentName && departments[userData.departmentName]) {
      userRecord.departmentId = departments[userData.departmentName].id;
    }
    
    await User.create(userRecord);
    console.log(`✅ Created user: ${userData.name} (${userData.employeeCode})`);
  }
}

// ==================== Initialize Activity Templates ====================
async function initActivityTemplates(departments) {
  console.log('\n📋 Initializing Activity Templates...');
  
  for (const dept of Object.values(departments)) {
    const titles = activityTitlesByDepartment[dept.name] || [];
    
    // Find a manager or admin to be the creator
    const manager = await User.findOne({ where: { role: 'manager', departmentId: dept.id } });
    const admin = await User.findOne({ where: { role: 'admin' } });
    const creatorCode = manager?.employeeCode || admin?.employeeCode || 'ADMIN001';
    
    for (const title of titles) {
      const exists = await ActivityTemplate.findOne({ 
        where: { title, departmentId: dept.id } 
      });
      
      if (exists) {
        console.log(`ℹ️  [${dept.name}] Template exists: ${title}`);
        continue;
      }
      
      await ActivityTemplate.create({
        title,
        departmentId: dept.id,
        createdById: creatorCode,
      });
      console.log(`✅ [${dept.name}] Created template: ${title}`);
    }
  }
}

// ==================== Main Function ====================
async function main() {
  try {
    console.log('🚀 Starting Production Initialization...\n');
    console.log('=' .repeat(60));
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync models (create tables if they don't exist)
    console.log('\n📊 Syncing database models...');
    await sequelize.sync({ alter: false }); // Don't alter in production
    console.log('✅ Database models synced');
    
    // Initialize departments
    const departments = await initDepartments();
    
    // Initialize users
    await initUsers(departments);
    
    // Initialize activity templates
    await initActivityTemplates(departments);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Production initialization completed successfully!');
    console.log('\n📝 Default Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@omotec.com');
    console.log('     Password: Admin@123');
    console.log('   Managers:');
    console.log('     Email: coding.manager@omotec.com');
    console.log('     Password: Manager@123');
    console.log('\n⚠️  IMPORTANT: Change all default passwords after first login!');
    console.log('=' .repeat(60));
    
  } catch (err) {
    console.error('\n❌ Production initialization failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
