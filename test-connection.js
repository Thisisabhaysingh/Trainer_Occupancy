const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const TEST_EMAIL = 'admin@example.com'; // Replace with a test manager email
const TEST_PASSWORD = 'password'; // Replace with the test password

async function testConnection() {
  try {
    // 1. Test Login
    console.log('Testing login...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const { token } = loginRes.data;
    console.log('✅ Login successful');
    
    // 2. Test Analytics Endpoint
    console.log('\nTesting analytics endpoint...');
    const analyticsRes = await axios.get(`${API_URL}/api/manager/analytics?week=true`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('✅ Analytics endpoint working');
    console.log('\nAnalytics Response:');
    console.log('-------------------');
    console.log(`Status: ${analyticsRes.status}`);
    console.log(`Department: ${analyticsRes.data.department}`);
    console.log(`Employees found: ${analyticsRes.data.employees?.length || 0}`);
    
    if (analyticsRes.data.employees && analyticsRes.data.employees.length > 0) {
      console.log('\nSample Employee:');
      console.log(analyticsRes.data.employees[0]);
    }
    
  } catch (error) {
    console.error('\n❌ Error:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testConnection();
