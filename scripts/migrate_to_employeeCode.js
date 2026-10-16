const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sequelize = require('../config/sequelize');

async function migrateDatabase() {
  try {
    console.log('🚀 Starting database migration to employeeCode primary key...\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get the query interface
    const queryInterface = sequelize.getQueryInterface();

    console.log('⚠️  WARNING: This will DROP and RECREATE all tables!');
    console.log('⚠️  All existing data will be LOST!');
    console.log('⚠️  Make sure you have a backup if needed.\n');

    // Drop all tables in correct order (respecting foreign keys)
    console.log('🗑️  Dropping existing tables...');
    
    const tablesToDrop = [
      'activity_time_entries',
      'activities',
      'activity_templates',
      'BranchEmployees',
      'workdays',
      'holidays',
      'leave_requests',
      'branches',
      'users',
      'departments',
    ];

    for (const table of tablesToDrop) {
      try {
        await queryInterface.dropTable(table);
        console.log(`   ✅ Dropped table: ${table}`);
      } catch (err) {
        if (err.original?.code === 'ER_BAD_TABLE_ERROR') {
          console.log(`   ℹ️  Table doesn't exist: ${table}`);
        } else {
          console.log(`   ⚠️  Error dropping ${table}: ${err.message}`);
        }
      }
    }

    console.log('\n📊 Creating new tables with employeeCode as primary key...');
    
    // Force sync to recreate all tables
    await sequelize.sync({ force: true });
    
    console.log('✅ All tables recreated successfully!\n');
    console.log('=' .repeat(60));
    console.log('🎉 Migration completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run init:production');
    console.log('   2. This will populate departments, users, and activity templates');
    console.log('=' .repeat(60));

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
if (require.main === module) {
  migrateDatabase();
}

module.exports = { migrateDatabase };
