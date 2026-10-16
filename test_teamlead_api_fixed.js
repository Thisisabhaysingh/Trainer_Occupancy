const http = require('http');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

function makeRequest(options, data = '') {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testTeamLeadAPI() {
  try {
    console.log('🧪 Testing TeamLead API endpoints...\n');

    // Find a teamlead user
    const teamLead = await User.findOne({ where: { role: 'teamlead' } });

    if (!teamLead) {
      console.log('❌ No teamlead users found in database');
      return;
    }

    console.log(`👤 Testing with user: ${teamLead.name} (${teamLead.employeeCode})\n`);

    // Generate token for this user (simulating login)
    const token = jwt.sign(
      { employeeCode: teamLead.employeeCode },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1d" }
    );

    // Test each endpoint
    const endpoints = ['analytics', 'employees', 'activities'];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing /api/teamlead/${endpoint}...`);

        const options = {
          hostname: 'localhost',
          port: 5000,
          path: `/api/teamlead/${endpoint}`,
          method: 'GET',
          headers: {
            'Cookie': `token=${token}`,
            'Content-Type': 'application/json'
          }
        };

        const response = await makeRequest(options);

        console.log(`   📊 Status: ${response.statusCode}`);

        if (response.statusCode === 200) {
          console.log(`   ✅ API call successful`);
          console.log(`   📋 Response keys: ${Object.keys(response.body).join(', ')}`);
        } else {
          console.log(`   ❌ Error: ${response.body?.error || 'Unknown error'}`);
        }
        console.log('');
      } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}\n`);
      }
    }

    console.log('🎉 API testing completed');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testTeamLeadAPI();
