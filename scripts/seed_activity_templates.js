const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, Department, User } = require('../models');
const { ActivityTemplate } = require('../models/Activity');

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

async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');

    const departments = await Department.findAll();
    if (!departments || departments.length === 0) {
      throw new Error('No departments found. Seed departments first.');
    }

    console.log(`Found ${departments.length} departments: ${departments.map(d => d.name).join(', ')}`);
    console.log(`Creating ${uniqueActivities.length} activity templates for each department...`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const dept of departments) {
      console.log(`\n--- Processing ${dept.name} Department ---`);

      // Assign creator as any manager in this department; fallback to first admin or first user
      const manager = await User.findOne({ where: { role: 'manager', departmentId: dept.id } });
      const admin = await User.findOne({ where: { role: 'admin' } });
      const creatorId = manager?.employeeCode || admin?.employeeCode || null;

      if (!creatorId) {
        console.log(`⚠️  Warning: No creator found for ${dept.name} department`);
      }

      for (const title of uniqueActivities) {
        // Check if template already exists for this department
        const exists = await ActivityTemplate.findOne({
          where: {
            title,
            departmentId: dept.id
          }
        });

        if (exists) {
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

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SEEDING ACTIVITY TEMPLATES COMPLETED!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   • Departments processed: ${departments.length}`);
    console.log(`   • Unique activities: ${uniqueActivities.length}`);
    console.log(`   • Templates created: ${totalCreated}`);
    console.log(`   • Templates skipped (already existed): ${totalSkipped}`);
    console.log(`   • Total operations: ${totalCreated + totalSkipped}`);

    console.log('\n📋 Activities added to all departments:');
    uniqueActivities.forEach((activity, index) => {
      console.log(`   ${index + 1}. ${activity}`);
    });

    await sequelize.close();
    console.log('\n✅ Database connection closed successfully');

  } catch (err) {
    console.error('\n❌ Seeding activity templates failed:', err.message);
    console.error('Full error:', err);
    process.exitCode = 1;
  }
}

// Run the script
main();


