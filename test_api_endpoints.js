require('dotenv').config();
const http = require('http');

const testEndpoint = (path, description) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${description}: OK (${res.statusCode})`);
        } else if (res.statusCode === 401) {
          console.log(`⚠️  ${description}: Requires authentication (${res.statusCode})`);
        } else {
          console.log(`❌ ${description}: Failed (${res.statusCode})`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description}: ${error.message}`);
      resolve();
    });

    req.end();
  });
};

(async () => {
  console.log('🧪 Testing API endpoints...\n');
  console.log('Make sure the server is running on port 5001!\n');
  
  await testEndpoint('/api/analytics', 'Analytics endpoint');
  await testEndpoint('/api/employees', 'Employees endpoint');
  await testEndpoint('/api/departments', 'Departments endpoint');
  await testEndpoint('/api/activities', 'Activities endpoint');
  await testEndpoint('/api/branches/departments', 'Branches/Departments endpoint');
  
  console.log('\n💡 Note: 401 (authentication required) is expected for protected endpoints.');
  console.log('   The admin dashboard should handle authentication with cookies.');
})();
