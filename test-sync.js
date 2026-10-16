const { sequelize } = require('./models');

async function testSync() {
  try {
    console.log('Testing model sync...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('Starting sync...');
    await sequelize.sync({ alter: false, force: false });
    console.log('✅ All models synced successfully');

    console.log('✅ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSync();
