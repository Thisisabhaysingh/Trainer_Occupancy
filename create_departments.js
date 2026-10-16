const mongoose = require('mongoose');
const Department = require('./models/Department');

const MONGODB_URI = 'mongodb+srv://abhaysingh:Abhay@cluster0.ywddwnp.mongodb.net/omotec-mis?retryWrites=true&w=majority';

const departments = [
  { name: 'Coding', description: 'Software and programming department', location: 'HQ' },
  { name: 'Electronics', description: 'Electronics and hardware department', location: 'Remote' },
  { name: 'Mechatronics', description: 'Mechatronics and automation department', location: 'HQ' },
];

async function createDepartments() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    for (const dep of departments) {
      const exists = await Department.findOne({ name: dep.name });
      if (!exists) {
        await Department.create(dep);
        console.log(`Created department: ${dep.name}`);
      } else {
        console.log(`Department already exists: ${dep.name}`);
      }
    }
    mongoose.disconnect();
  } catch (err) {
    console.error('Error creating departments:', err);
    mongoose.disconnect();
  }
}

createDepartments(); 