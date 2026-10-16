const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize with your MySQL database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || "mis_database",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    dialect: "mysql",
    logging: console.log
  }
);

// Define User model (simplified)
const User = sequelize.define('User', {
  employeeCode: { type: DataTypes.STRING, primaryKey: true },
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  role: DataTypes.STRING,
  departmentId: DataTypes.INTEGER,
  branchId: DataTypes.INTEGER
}, { tableName: 'Users', timestamps: false });

// Define Workday model
const Workday = sequelize.define('Workday', {
  userId: DataTypes.STRING,
  date: DataTypes.DATEONLY,
  attendanceType: DataTypes.ENUM('full_day', 'half_day', 'leave'),
  clockIn: DataTypes.DATE,
  clockOut: DataTypes.DATE
}, { tableName: 'Workdays', timestamps: false });

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Get all users
    console.log('=== All Users ===');
    console.log('Today:', new Date().toISOString().slice(0, 10));
    console.log('========================');
    
    const employees = await User.findAll({
      order: [['name', 'ASC']]
    });
    employees.forEach(emp => {
      console.log(`Code: ${emp.employeeCode}, Name: ${emp.name}, Dept: ${emp.departmentId}, Branch: ${emp.branchId}`);
    });
    console.log(`\nTotal users: ${employees.length}`);

    // Get workdays for today
    console.log('\n--- Workdays for Today ---');
    const todayWorkdays = await Workday.findAll({
      where: {
        date: new Date().toISOString().slice(0, 10)
      }
    });
    todayWorkdays.forEach(wd => {
      console.log(`User: ${wd.userId}, Date: ${wd.date}, Type: ${wd.attendanceType}, ClockIn: ${wd.clockIn}`);
    });
    console.log(`\nTotal workdays for today: ${todayWorkdays.length}`);

    // Check Abhay Singh and Harsh Gupta specifically
    console.log('\n--- Specific User Check ---');
    const abhayUsers = await User.findAll({
      where: {
        name: { [Op.like]: '%Abhay%' }
      }
    });
    const harshUsers = await User.findAll({
      where: {
        name: { [Op.like]: '%Harsh%' }
      }
    });

    console.log('Abhay users found:', abhayUsers.length);
    abhayUsers.forEach(emp => {
      console.log(`  - Code: ${emp.employeeCode}, Name: ${emp.name}`);
      const workday = todayWorkdays.find(wd => wd.userId === emp.employeeCode);
      console.log(`  - Workday today:`, workday ? 'YES' : 'NO');
      if (workday) console.log(`  - Workday details:`, workday.toJSON());
    });

    console.log('Harsh users found:', harshUsers.length);
    harshUsers.forEach(emp => {
      console.log(`  - Code: ${emp.employeeCode}, Name: ${emp.name}`);
      const workday = todayWorkdays.find(wd => wd.userId === emp.employeeCode);
      console.log(`  - Workday today:`, workday ? 'YES' : 'NO');
      if (workday) console.log(`  - Workday details:`, workday.toJSON());
    });

    // Check recent workdays for these users
    console.log('\n--- Recent Workdays (Last 7 days) ---');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentWorkdays = await Workday.findAll({
      where: {
        date: { [Op.gte]: sevenDaysAgo.toISOString().slice(0, 10) }
      },
      order: [['date', 'DESC'], ['userId', 'ASC']]
    });

    console.log('Recent workdays:');
    recentWorkdays.forEach(wd => {
      console.log(`  ${wd.date} - ${wd.userId} - ${wd.attendanceType}`);
    });

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await sequelize.close();
  }
}

checkDatabase();
