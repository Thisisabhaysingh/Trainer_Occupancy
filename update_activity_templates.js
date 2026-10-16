const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import models
const { sequelize, Department, User } = require('./models');
const { ActivityTemplate } = require('./models/Activity');

// Comprehensive list of activities for all departments
const comprehensiveActivityList = [
  'Circuit Design',
  'Soldering/Assembly',
  'Inventory',
  'Research',
  'Workshop',
  'Other Activities',
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
  'Time Spent In Self Skilling'
];

// Remove duplicates and standardize
const uniqueActivities = [...new Set(comprehensiveActivityList.map(title =>
  title.trim()
))].filter(title => title.length > 0);

async function seedActivityTemplates() {
  try {
    console.log('🚀 Starting Activity Templates Seeding...');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get all departments
    const departments = await Department.findAll();
    if (!departments || departments.length === 0) {
      throw new Error('❌ No departments found. Please seed departments first.');
    }

    console.log(`📂 Found ${departments.length} departments: ${departments.map(d => d.name).join(', ')}`);
    console.log(`📋 Creating ${uniqueActivities.length} activity templates for each department...`);

    let totalCreated = 0;
    let totalSkipped = 0;

    // Process each department
    for (const dept of departments) {
      console.log(`\n--- Processing ${dept.name} Department ---`);

      // Find a creator (manager in this department, or admin, or any user)
      const manager = await User.findOne({ where: { role: 'manager', departmentId: dept.id } });
      const admin = await User.findOne({ where: { role: 'admin' } });
      const creatorId = manager?.employeeCode || admin?.employeeCode || null;

      if (!creatorId) {
        console.log(`⚠️  Warning: No creator found for ${dept.name} department. Using null creator.`);
      }

      // Create activity templates for this department
      for (const title of uniqueActivities) {
        // Check if template already exists
        const existingTemplate = await ActivityTemplate.findOne({
          where: {
            title,
            departmentId: dept.id
          }
        });

        if (existingTemplate) {
          console.log(`⏭️  [${dept.name}] Template already exists: ${title}`);
          totalSkipped++;
          continue;
        }

        // Create new activity template
        await ActivityTemplate.create({
          title,
          departmentId: dept.id,
          createdById: creatorId,
        });

        console.log(`✅ [${dept.name}] Created template: ${title}`);
        totalCreated++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ACTIVITY TEMPLATES SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`📊 SEEDING SUMMARY:`);
    console.log(`   • Departments processed: ${departments.length}`);
    console.log(`   • Unique activities per department: ${uniqueActivities.length}`);
    console.log(`   • Templates created: ${totalCreated}`);
    console.log(`   • Templates skipped (already existed): ${totalSkipped}`);
    console.log(`   • Total operations: ${totalCreated + totalSkipped}`);

    console.log('\n📋 COMPREHENSIVE ACTIVITIES ADDED TO ALL DEPARTMENTS:');
    uniqueActivities.forEach((activity, index) => {
      console.log(`   ${index + 1}. ${activity}`);
    });

    console.log('\n✅ All departments now have access to the same comprehensive activity list');
    console.log('✅ Activities are available for all employees in Electronics, Mechatronics, and Coding departments');

    await sequelize.close();
    console.log('\n🔐 Database connection closed successfully');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED!');
    console.error('Error details:', error.message);
    console.error('Full error:', error);

    if (error.message.includes('No departments found')) {
      console.log('\n💡 SOLUTION: Please run the department seeding script first:');
      console.log('   node scripts/seed_departments.js');
    }

    process.exit(1);
  }
}

// Run the script
console.log('🔄 Initializing activity templates seeding...');
seedActivityTemplates();
