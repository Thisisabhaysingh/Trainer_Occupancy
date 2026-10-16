const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department'); // Import Department model

const MONGODB_URI = 'mongodb+srv://abhaysingh:Abhay@cluster0.ywddwnp.mongodb.net/omotec-mis?retryWrites=true&w=majority';

async function createManager() {
  await mongoose.connect(MONGODB_URI);
  const email = 'manager.coding@company.com';
  const password = 'Manager@123';
  const name = 'Coding Manager';
  const departmentName = 'Mechatronics';
  const role = 'manager';

  // Check if manager already exists
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Manager already exists:', email);
    process.exit();
  }

  // ✅ Find or create department
  let department = await Department.findOne({ name: departmentName });
  if (!department) {
    department = await Department.create({
      name: departmentName,
      description: 'Auto-created department',
      location: 'HQ'
    });
    console.log('Created new department:', departmentName);
  }

  // ✅ Create user with ObjectId reference to department
  await User.create({
    name,
    email,
    password,
    role,
    department: department._id
  });

  console.log('Manager created:', email);
  process.exit();
}

createManager();
