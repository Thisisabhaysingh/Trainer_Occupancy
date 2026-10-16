'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'teamLeadId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Assigned team lead employee code for an employee'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'teamLeadId');
  }
};
    