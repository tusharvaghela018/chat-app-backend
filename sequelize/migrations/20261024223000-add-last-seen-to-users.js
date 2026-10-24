'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.last_seen) {
      await queryInterface.addColumn('users', 'last_seen', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.last_seen) {
      await queryInterface.removeColumn('users', 'last_seen');
    }
  }
};
