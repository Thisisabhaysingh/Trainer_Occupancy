const axios = require('axios');

// Production API URL
const API_URL = 'https://time.onmyowntechnology.com';

// Test credentials - please replace these with actual credentials
const TEST_EMAIL = 'admin@example.com'; // Replace with actual admin email
const TEST_PASSWORD = 'password'; // Replace with actual password

async function testManagerAnalytics() {
  try {
    console.log('🚀 Testing Manager Analytics API...');
    
    // 1. First, log in to get the token
    console.log('\n🔑 Attempting login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { token } = loginResponse.data;
    console.log('✅ Login successful!');
    
    // 2. Now test the manager analytics endpoint
    console.log('\n📊 Testing manager analytics endpoint...');
    const analyticsResponse = await axios.get(`${API_URL}/api/manager/analytics?week=true`, {
      withCredentials: true,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Analytics Endpoint Response:');
    console.log('----------------------------');
    console.log(`Status: ${analyticsResponse.status}`);
    console.log(`Department: ${analyticsResponse.data.department || 'Not specified'}`);
    console.log(`Employees found: ${analyticsResponse.data.employees?.length || 0}`);
    
    if (analyticsResponse.data.employees?.length > 0) {
      console.log('\n👥 Sample Employee Data:');
      console.log(analyticsResponse.data.employees[0]);
    }
    
    // 3. Check for any errors in the response
    if (analyticsResponse.data.error) {
      console.error('\n❌ Error in response:', analyticsResponse.data.error);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Is the server running?');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error:', error.message);
    }
    
    console.error('\n💡 Please check:');
    console.log('1. Is the server running?');
    console.log('2. Are the API credentials correct?');
    console.log('3. Is the API URL correct?');
    console.log('4. Are you connected to the internet?');
  }
}

// Run the test
testManagerAnalytics();
