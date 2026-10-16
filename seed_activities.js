const sequelize = require('./config/sequelize');
const ActivityTemplate = require('./models/ActivityTemplate');
const Department = require('./models/Department');
const User = require('./models/User');

const activityTemplates = {
  'Coding': [
    { name: 'Code Development', description: 'Writing and developing code', estimatedHours: 4 },
    { name: 'Code Review', description: 'Reviewing code changes', estimatedHours: 2 },
    { name: 'Bug Fixing', description: 'Fixing bugs and issues', estimatedHours: 3 },
    { name: 'Testing', description: 'Testing functionality', estimatedHours: 2 },
    { name: 'Documentation', description: 'Writing technical documentation', estimatedHours: 2 },
  ],
  'Electronics': [
    { name: 'Circuit Design', description: 'Designing electronic circuits', estimatedHours: 4 },
    { name: 'PCB Layout', description: 'Creating PCB layouts', estimatedHours: 3 },
    { name: 'Hardware Testing', description: 'Testing hardware components', estimatedHours: 2 },
    { name: 'Prototyping', description: 'Building prototypes', estimatedHours: 4 },
    { name: 'Component Selection', description: 'Selecting electronic components', estimatedHours: 2 },
  ],
  'Mechatronics': [
    { name: 'System Integration', description: 'Integrating mechanical and electronic systems', estimatedHours: 4 },
    { name: 'Automation Programming', description: 'Programming automation systems', estimatedHours: 3 },
    { name: 'Robotics Development', description: 'Developing robotic systems', estimatedHours: 4 },
    { name: 'Sensor Calibration', description: 'Calibrating sensors', estimatedHours: 2 },
    { name: 'Testing & Debugging', description: 'Testing mechatronic systems', estimatedHours: 3 },
  ]
};

async function seedActivities() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get admin user as creator
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.error('❌ No admin user found. Please run init_database.js first.');
      process.exit(1);
    }

    let created = 0;
    let skipped = 0;

    for (const [deptName, templates] of Object.entries(activityTemplates)) {
      console.log(`📁 Processing ${deptName} department...`);
      
      const department = await Department.findOne({ where: { name: deptName } });
      
      if (!department) {
        console.log(`   ⚠️  Department ${deptName} not found, skipping...`);
        continue;
      }

      for (const template of templates) {
        const existing = await ActivityTemplate.findOne({
          where: {
            name: template.name,
            departmentId: department.id
          }
        });

        if (existing) {
          console.log(`   ⏭️  Skipped: ${template.name} (already exists)`);
          skipped++;
          continue;
        }

        await ActivityTemplate.create({
          name: template.name,
          description: template.description,
          estimatedHours: template.estimatedHours,
          departmentId: department.id,
          createdById: admin.employeeCode
        });

        console.log(`   ✅ Created: ${template.name}`);
        created++;
      }
      console.log('');
    }

    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created} templates`);
    console.log(`   ⏭️  Skipped: ${skipped} templates`);
    console.log('\n🎉 Activity templates seeded successfully!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

seedActivities();
