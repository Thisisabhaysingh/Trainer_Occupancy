const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, Department } = require('../models');

const departments = [
  { name: 'Coding', description: 'Software and programming department', location: 'HQ' },
  { name: 'Electronics', description: 'Electronics and hardware department', location: 'Remote' },
  { name: 'Mechatronics', description: 'Mechatronics and automation department', location: 'HQ' },
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');

    for (const dep of departments) {
      const [record, created] = await Department.findOrCreate({
        where: { name: dep.name },
        defaults: dep,
      });
      console.log(created ? `Created department: ${dep.name}` : `Department exists: ${dep.name}`);
    }

    console.log('All done.');
    await sequelize.close();
  } catch (err) {
    console.error('Seeding departments failed:', err.message);
    process.exitCode = 1;
  }
}

main();


