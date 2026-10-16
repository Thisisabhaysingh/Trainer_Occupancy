const axios = require('axios');

async function testTeamLeadAPI() {
  try {
    console.log('=== TESTING TEAM LEAD API ===');

    // Login as admin first
    const adminLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@omotex.com',
      password: 'admin123'
    }, { withCredentials: true });

    console.log('Admin login successful');

    // Get team leads
    const teamLeadsResponse = await axios.get('http://localhost:5000/api/employees', {
      withCredentials: true
    });

    const teamLeads = teamLeadsResponse.data.filter(u => u.role === 'teamlead');
    console.log('Found team leads:', teamLeads.length);

    if (teamLeads.length > 0) {
      const teamLead = teamLeads[0];
      console.log('Testing team lead:', teamLead.name);

      // Login as team lead
      const teamLeadLogin = await axios.post('http://localhost:5000/api/auth/login', {
        email: teamLead.email,
        password: 'password123' // Assuming default password
      }, { withCredentials: true });

      console.log('Team lead login successful');

      // Test employees endpoint
      console.log('Testing /api/teamlead/employees...');
      try {
        const employeesResponse = await axios.get('http://localhost:5000/api/teamlead/employees', {
          withCredentials: true
        });

        console.log('Employees API Response:');
        console.log('Status:', employeesResponse.status);
        console.log('Data keys:', Object.keys(employeesResponse.data));
        console.log('Employees array length:', employeesResponse.data.employees?.length || 'N/A');
        console.log('Department count:', employeesResponse.data.departmentEmployeeCount || 'N/A');

        if (employeesResponse.data.employees) {
          console.log('First employee:', employeesResponse.data.employees[0]?.name || 'None');
        }

      } catch (empError) {
        console.log('Employees API Error:', empError.response?.status, empError.response?.data);
      }

      // Test analytics endpoint
      console.log('Testing /api/teamlead/analytics...');
      try {
        const analyticsResponse = await axios.get('http://localhost:5000/api/teamlead/analytics', {
          withCredentials: true
        });

        console.log('Analytics API Response:');
        console.log('Status:', analyticsResponse.status);
        console.log('Has branch info:', !!analyticsResponse.data.branchInfo);
        console.log('Team lead department:', analyticsResponse.data.teamLeadDepartment);

      } catch (anaError) {
        console.log('Analytics API Error:', anaError.response?.status, anaError.response?.data);
      }
    }

  } catch (error) {
    console.error('Test error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testTeamLeadAPI();
