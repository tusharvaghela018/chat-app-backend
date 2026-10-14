'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      'users',
      'conversations',
      'messages',
      'groups',
      'group_settings',
      'group_members',
      'group_join_requests',
      'group_messages',
      'group_message_seen'
    ];

    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of tables) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
          { transaction }
        );
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const tables = [
      'users',
      'conversations',
      'messages',
      'groups',
      'group_settings',
      'group_members',
      'group_join_requests',
      'group_messages',
      'group_message_seen'
    ];

    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of tables) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`,
          { transaction }
        );
      }
    });
  }
};
