require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');
const { backfillFromTimesheet } = require('../services/schoolClassSync');

// Copies every class onboarded in the timesheet into School Management.
// Safe to run repeatedly: existing classes and assignments are kept.
backfillFromTimesheet()
  .then(stats => {
    process.stdout.write(`School classes synced: ${JSON.stringify(stats)}\n`);
    return sequelize.close();
  })
  .catch(error => {
    process.stderr.write(`School class sync failed: ${error.message}\n`);
    process.exit(1);
  });
