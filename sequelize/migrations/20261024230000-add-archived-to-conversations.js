'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('conversations');
    if (!tableInfo.archived_by_sender) {
      await queryInterface.addColumn('conversations', 'archived_by_sender', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!tableInfo.archived_by_receiver) {
      await queryInterface.addColumn('conversations', 'archived_by_receiver', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('conversations');
    if (tableInfo.archived_by_sender) {
      await queryInterface.removeColumn('conversations', 'archived_by_sender');
    }
    if (tableInfo.archived_by_receiver) {
      await queryInterface.removeColumn('conversations', 'archived_by_receiver');
    }
  }
};
