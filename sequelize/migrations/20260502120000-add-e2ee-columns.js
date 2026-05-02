'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'public_key', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('group_messages', 'encrypted_keys', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'public_key');
    await queryInterface.removeColumn('group_messages', 'encrypted_keys');
  }
};
