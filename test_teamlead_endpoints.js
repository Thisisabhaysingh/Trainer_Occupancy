const axios = require('axios');

async function testTeamLeadEndpoints() {
  try {
    console.log('=== TESTING TEAM LEAD ENDPOINTS ===');

    // First, login as admin to get the team lead data
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@omotex.com',
      password: 'admin123'
    }, { withCredentials: true });

    console.log('Admin login successful');

    // Get team leads
    const teamLeadsResponse = await axios.get('http://localhost:5000/api/employees', {
      withCredentials: true
    });

    const teamLeads = teamLeadsResponse.data.filter(user => user.role === 'teamlead');
    console.log('Found team leads:', teamLeads.length);

    if (teamLeads.length > 0) {
      const teamLead = teamLeads[0];
      console.log('Testing team lead:', teamLead.name, teamLead.employeeCode);

      // Try to login as team lead
      const teamLeadLogin = await axios.post('http://localhost:5000/api/auth/login', {
        email: teamLead.email,
        password: 'password123' // Default password
      }, { withCredentials: true });

      console.log('Team lead login successful');

      // Test team lead analytics endpoint
      console.log('Testing analytics endpoint...');
      const analyticsResponse = await axios.get('http://localhost:5000/api/teamlead/analytics', {
        withCredentials: true
      });

      console.log('Analytics response:', {
        hasData: !!analyticsResponse.data,
        branchInfo: analyticsResponse.data?.branchInfo?.name,
        departmentCards: analyticsResponse.data?.departmentCards?.length
      });

      // Test team lead employees endpoint
      console.log('Testing employees endpoint...');
      const employeesResponse = await axios.get('http://localhost:5000/api/teamlead/employees', {
        withCredentials: true
      });

      console.log('Employees response:', {
        hasEmployees: !!employeesResponse.data?.employees,
        employeeCount: employeesResponse.data?.employees?.length || 0,
        departmentEmployeeCount: employeesResponse.data?.departmentEmployeeCount || 0
      });

    } else {
      console.log('No team leads found to test');
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testTeamLeadEndpoints();
