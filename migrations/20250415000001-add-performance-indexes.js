'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes for faster queries on Activities table
    await queryInterface.addIndex('Activities', ['assignedToId'], {
      name: 'idx_activities_assigned_to'
    });
    await queryInterface.addIndex('Activities', ['departmentId'], {
      name: 'idx_activities_department'
    });
    await queryInterface.addIndex('Activities', ['date'], {
      name: 'idx_activities_date'
    });
    
    // Add composite index for common query patterns
    await queryInterface.addIndex('Activities', ['assignedToId', 'date'], {
      name: 'idx_activities_assigned_to_date'
    });
    
    // Add indexes for Users table
    await queryInterface.addIndex('Users', ['departmentId'], {
      name: 'idx_users_department'
    });
    await queryInterface.addIndex('Users', ['branchId'], {
      name: 'idx_users_branch'
    });
    await queryInterface.addIndex('Users', ['role'], {
      name: 'idx_users_role'
    });
    
    // Add index for Workdays table
    await queryInterface.addIndex('Workdays', ['employeeCode', 'date'], {
      name: 'idx_workdays_employee_date'
    });
    
    // Add index for TimeEntries (if stored separately)
    await queryInterface.addIndex('TimeEntries', ['activityId', 'date'], {
      name: 'idx_timeentries_activity_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Activities', 'idx_activities_assigned_to');
    await queryInterface.removeIndex('Activities', 'idx_activities_department');
    await queryInterface.removeIndex('Activities', 'idx_activities_date');
    await queryInterface.removeIndex('Activities', 'idx_activities_assigned_to_date');
    await queryInterface.removeIndex('Users', 'idx_users_department');
    await queryInterface.removeIndex('Users', 'idx_users_branch');
    await queryInterface.removeIndex('Users', 'idx_users_role');
    await queryInterface.removeIndex('Workdays', 'idx_workdays_employee_date');
    await queryInterface.removeIndex('TimeEntries', 'idx_timeentries_activity_date');
  }
};
