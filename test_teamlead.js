// Test script for team lead analytics endpoint
const axios = require('axios');

async function testTeamLeadAnalytics() {
  try {
    console.log('🧪 Testing team lead analytics endpoint...');

    // First, find a team lead user to get their credentials
    const { sequelize, User, Department, Branch } = require('./models');

    const teamLead = await User.findOne({
      where: { role: 'teamlead' },
      include: [Department, Branch]
    });

    if (!teamLead) {
      console.log('⚠️  No team lead user found in database');
      return;
    }

    console.log(`✅ Found team lead: ${teamLead.name}`);
    console.log(`   Branch: ${teamLead.branch?.name}`);
    console.log(`   Department: ${teamLead.department?.name}`);

    // Test the analytics endpoint (this would normally require authentication)
    // For now, just test that the server is responding
    try {
      const response = await axios.get('http://localhost:5001/api/teamlead/analytics', {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 401 unauthorized as it means server is working
      });

      if (response.status === 401) {
        console.log('✅ Team lead analytics endpoint is responding (requires authentication)');
      } else {
        console.log('✅ Team lead analytics endpoint response:', response.status);
        console.log('   Response data preview:', JSON.stringify(response.data).substring(0, 200) + '...');
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running on port 5001');
      } else if (err.response?.status === 401) {
        console.log('✅ Team lead analytics endpoint is responding (requires authentication)');
      } else {
        console.log('⚠️  Analytics endpoint error:', err.response?.status || err.message);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

testTeamLeadAnalytics();
