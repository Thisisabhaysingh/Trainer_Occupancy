const mongoose = require('mongoose');
const Department = require('./models/Department');
const User = require('./models/User');
const { ActivityTemplate } = require('./models/Activity');

const MONGODB_URI = 'mongodb+srv://abhaysingh:Abhay@cluster0.ywddwnp.mongodb.net/omotec-mis?retryWrites=true&w=majority';

const mechatronicsActivities = [
  'Total no offline Sessions Per Day',
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

createMechatronicsActivityTemplates(); 