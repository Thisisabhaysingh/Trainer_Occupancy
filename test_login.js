require('dotenv').config();
const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('🧪 Testing login endpoint...\n');
    
    const credentials = {
      email: 'admin@omotec.com',
      password: 'Admin@123'
    };
    
    console.log('📤 Sending login request with:');
    console.log('   Email:', credentials.email);
    console.log('   Password:', credentials.password);
    
    const port = process.env.PORT || 5000;
    const loginUrl = `http://localhost:${port}/api/auth/login`;

    const response = await axios.post(
      loginUrl,
      credentials,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ Login successful!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Login failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received from server');
      console.error(`   Is the server running on port ${process.env.PORT || 5000}?`);
    } else {
      console.error('   Error:', error.message);
    }
  }
};

testLogin();
