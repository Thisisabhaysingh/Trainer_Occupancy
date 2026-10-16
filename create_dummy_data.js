const mongoose = require('mongoose');
const Department = require('./models/Department');
const User = require('./models/User');
const { Activity } = require('./models/Activity');
const bcrypt = require('bcryptjs');
const { ActivityTemplate } = require('./models/Activity');

const MONGODB_URI = 'mongodb+srv://abhaysingh:Abhay@cluster0.ywddwnp.mongodb.net/omotec-mis?retryWrites=true&w=majority';

const departments = [
  { name: 'Coding', description: 'Software and programming department', location: 'HQ' },
  { name: 'Electronics', description: 'Electronics and hardware department', location: 'Remote' },
  { name: 'Mechatronics', description: 'Mechatronics and automation department', location: 'HQ' },
];

const employees = [
  { name: 'John Smith', email: 'john@company.com', password: 'password123', department: 'Coding' },
  { name: 'Sarah Johnson', email: 'sarah@company.com', password: 'password123', department: 'Mechatronics' },
  { name: 'Mike Chen', email: 'mike@company.com', password: 'password123', department: 'Electronics' },
  { name: 'Emma Davis', email: 'emma@company.com', password: 'password123', department: 'Coding' },
  { name: 'Alex Rodriguez', email: 'alex@company.com', password: 'password123', department: 'Mechatronics' },
];

const activities = [
  {
    title: 'Frontend Development',
    description: 'Worked on UI components',
    department: 'Coding',
    status: 'completed',
    hours: 8,
  },
  {
    title: 'Code Review',
    description: 'Reviewed PRs',
    department: 'Coding',
    status: 'completed',
    hours: 7,
  },
  {
    title: 'Bug Fixes',
    description: 'Fixed bugs in the system',
    department: 'Coding',
    status: 'in-progress',
    hours: 6,
  },
  {
    title: 'Automation Design',
    description: 'Designed automation systems',
    department: 'Mechatronics',
    status: 'completed',
    hours: 8,
  },
  {
    title: 'Robotics Integration',
    description: 'Integrated robotics systems',
    department: 'Mechatronics',
    status: 'completed',
    hours: 7,
  },
  {
    title: 'Testing',
    description: 'Tested mechatronics systems',
    department: 'Mechatronics',
    status: 'in-progress',
    hours: 6,
  },
  {
    title: 'Circuit Design',
    description: 'Designed circuits',
    department: 'Electronics',
    status: 'completed',
    hours: 8,
  },
  {
    title: 'PCB Layout',
    description: 'Created PCB layouts',
    department: 'Electronics',
    status: 'completed',
    hours: 7,
  },
  {
    title: 'Testing',
    description: 'Tested electronics',
    department: 'Electronics',
    status: 'in-progress',
    hours: 6,
  },
];

// List of activity names to create for Mechatronics department
const mechatronicsActivities = [
  'Total No. of Sessions',
  'Time Spent In Offline Sessions',
  'Time Spent In School Sessions',
  'Time Spent In Online Sessions',
  'Time Spent In Travel',
  'Time Spent In Lunch',
  'Time Spent In LMS Update',
  'Time Spent In Summary Report',
  'Time Spend In STEM/ NEWS Letter Update',
  'Time Spent In WRO Session',
  'Time Spent In WRO Work',
  'Time Spent In WSRO Session',
  'Time Spent In WSRO Work',
  'Time Spent in Internal Operations',
  'Time Spent in PTM/PRM',
  'Time Spent in Meeting',
  'Time Spent in Self Skilling',
  'Time Spent in Content Work',
  'Time Spent in FTC Session',
  'Time Spent in FTC Work',
  'Time Spent in FTC outreach',
  'Time Spent in Competition Research',
  'Time Spent in Project/Prototype work',
  'Time Spent in VEX Session',
  'Time Spent in VEX Work',
  'Time Spent in codeavour Session',
  'Time Spent in codeavour work',
  'Time Spent in Retail event/preparation',
  'Time Spent in Workshop',
  'Time Spent in School Visits',
  'Time Spent in Inventory',
  'Time Spent in Teacher Training',
  'Time Spent in giving Assessment',
  'Time Spent in taking Assessment',
  'Time spent in other activity'
];

async function createDummyData() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create departments
    const departmentDocs = {};
    for (const dep of departments) {
      let doc = await Department.findOne({ name: dep.name });
      if (!doc) {
        doc = await Department.create(dep);
        console.log(`Created department: ${dep.name}`);
      }
      departmentDocs[dep.name] = doc;
    }

    // Create employees
    const employeeDocs = {};
    for (const emp of employees) {
      let doc = await User.findOne({ email: emp.email });
      if (!doc) {
        const hashed = await bcrypt.hash(emp.password, 10);
        doc = await User.create({
          name: emp.name,
          email: emp.email,
          password: hashed,
          role: 'employee',
          department: departmentDocs[emp.department]._id
        });
        console.log(`Created employee: ${emp.name}`);
      }
      employeeDocs[emp.name] = doc;
    }

    // Assign employees to departments
    for (const deptName in departmentDocs) {
      const dept = departmentDocs[deptName];
      const emps = Object.values(employeeDocs).filter(e => String(e.department) === String(dept._id));
      dept.employees = emps.map(e => e._id);
      await dept.save();
    }

    // Create activities for each employee
    for (const empName in employeeDocs) {
      const emp = employeeDocs[empName];
      // Assign 2-3 activities per employee, matching their department
      const empDept = employees.find(e => e.name === empName).department;
      const deptActs = activities.filter(a => a.department === empDept);
      for (let i = 0; i < deptActs.length; i++) {
        const act = deptActs[i];
        // Randomize status and hours
        const status = act.status;
        const hours = act.hours + Math.floor(Math.random() * 3) - 1; // 1-2 hr variation
        const now = new Date();
        const punchIn = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 9, 0, 0);
        const punchOut = new Date(punchIn.getTime() + hours * 60 * 60 * 1000);
        await Activity.create({
          title: act.title,
          description: act.description,
          assignedTo: emp._id,
          status,
          timeEntries: [{
            date: punchIn,
            duration: hours * 60,
            punchIn,
            punchOut,
            description: act.description,
          }],
          department: departmentDocs[empDept]._id,
          createdBy: emp._id,
          startTime: punchIn.toTimeString().slice(0, 5),
          endTime: punchOut.toTimeString().slice(0, 5),
        });
        console.log(`Created activity '${act.title}' for ${emp.name}`);
      }
    }

    mongoose.disconnect();
    console.log('Dummy data creation complete.');
  } catch (err) {
    console.error('Error creating dummy data:', err);
    mongoose.disconnect();
  }
}

async function createMechatronicsActivityTemplates() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const department = await Department.findOne({ name: 'Mechatronics' });
    if (!department) throw new Error('Mechatronics department not found');
    const manager = await User.findOne({ role: 'manager', department: department._id });
    if (!manager) throw new Error('Manager for Mechatronics not found');
    for (const title of mechatronicsActivities) {
      const exists = await ActivityTemplate.findOne({ title, department: department._id });
      if (!exists) {
        await ActivityTemplate.create({
          title,
          department: department._id,
          createdBy: manager._id
        });
        console.log('Created activity template:', title);
      } else {
        console.log('Already exists:', title);
      }
    }
    mongoose.disconnect();
    console.log('Mechatronics activity templates creation complete.');
  } catch (err) {
    console.error('Error creating Mechatronics activity templates:', err);
    mongoose.disconnect();
  }
}

createDummyData();
// Uncomment to run:
createMechatronicsActivityTemplates(); 