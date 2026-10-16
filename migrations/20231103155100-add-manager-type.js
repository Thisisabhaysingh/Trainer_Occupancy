'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'managerType', {
      type: Sequelize.ENUM('branch', 'department'),
      allowNull: true,
      comment: 'Type of manager: branch or department'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'managerType');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_managerType";');
  }
};
