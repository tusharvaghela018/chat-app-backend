'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users');

    if (!tableInfo.last_seen_privacy) {
      await queryInterface.addColumn('users', 'last_seen_privacy', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'contacts',
      });
    }

    if (!tableInfo.avatar_privacy) {
      await queryInterface.addColumn('users', 'avatar_privacy', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'contacts',
      });
    }

    if (!tableInfo.read_receipts) {
      await queryInterface.addColumn('users', 'read_receipts', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!tableInfo.search_discoverable) {
      await queryInterface.addColumn('users', 'search_discoverable', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!tableInfo.find_by_email_phone) {
      await queryInterface.addColumn('users', 'find_by_email_phone', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('users');

    if (tableInfo.last_seen_privacy) {
      await queryInterface.removeColumn('users', 'last_seen_privacy');
    }
    if (tableInfo.avatar_privacy) {
      await queryInterface.removeColumn('users', 'avatar_privacy');
    }
    if (tableInfo.read_receipts) {
      await queryInterface.removeColumn('users', 'read_receipts');
    }
    if (tableInfo.search_discoverable) {
      await queryInterface.removeColumn('users', 'search_discoverable');
    }
    if (tableInfo.find_by_email_phone) {
      await queryInterface.removeColumn('users', 'find_by_email_phone');
    }
  }
};
