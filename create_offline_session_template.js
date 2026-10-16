const mongoose = require('mongoose');
const { ActivityTemplate } = require('./models/Activity');
const { User } = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mis_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createOfflineSessionTemplate = async () => {
  try {
    // Find a manager user to assign as creator
    const manager = await User.findOne({ role: 'manager' });
    if (!manager) {
      console.error('No manager found in the database');
      return;
    }

    // Check if the template already exists
    const existingTemplate = await ActivityTemplate.findOne({
      title: 'Total No Offline Sessions Per Day',
      department: manager.department
    });

    if (existingTemplate) {
      console.log('Offline session template already exists for this department');
      return;
    }

    // Create the offline session template
    const template = new ActivityTemplate({
      title: 'Total No Offline Sessions Per Day',
      department: manager.department,
      createdBy: manager._id
    });

    await template.save();
    console.log('Offline session template created successfully');
    console.log('Template:', template);

  } catch (error) {
    console.error('Error creating offline session template:', error);
  } finally {
    mongoose.connection.close();
  }
};

createOfflineSessionTemplate(); 