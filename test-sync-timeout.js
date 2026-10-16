const { sequelize } = require('./models');

async function testSyncWithTimeout() {
  try {
    console.log('Testing model sync with timeout...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('Starting sync...');

    // Set a timeout for the sync process
    const syncPromise = sequelize.sync({ alter: false, force: false });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sync timeout after 10 seconds')), 10000);
    });

    await Promise.race([syncPromise, timeoutPromise]);
    console.log('✅ All models synced successfully');

    console.log('✅ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync test failed:', error.message);
    console.error('This might indicate database schema issues or conflicts');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSyncWithTimeout();
