const { Activity, User } = require('./models');
const { Op } = require('sequelize');

async function testActivityQuery() {
  try {
    console.log('Testing Activity.findAll query...');
    
    // Test the same query that was failing in manager.js
    const activities = await Activity.findAll({
      where: { 
        status: { [Op.ne]: 'deleted' }
      },
      attributes: ['id', 'title', 'description', 'comment', 'assignedToId', 'status', 'timeEntries', 'createdAt', 'updatedAt', 'startTime', 'endTime', 'institute', 'school', 'sessionType', 'sessionsCount'],
      include: [
        { 
          model: User, 
          as: 'assignedTo', 
          attributes: ['employeeCode', 'name', 'email', 'departmentId'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`✅ Query successful! Found ${activities.length} activities`);
    console.log('Sample activity:', activities[0]?.toJSON()?.title || 'No activities found');
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testActivityQuery();
