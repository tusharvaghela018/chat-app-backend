'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add columns to conversations table
    await queryInterface.addColumn('conversations', 'status', {
      type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'accepted' // For existing records
    });

    await queryInterface.addColumn('conversations', 'blocked_by_sender', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('conversations', 'blocked_by_receiver', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // Change default status to pending for future records
    await queryInterface.changeColumn('conversations', 'status', {
      type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    });

    // 2. Add columns to messages table
    await queryInterface.addColumn('messages', 'is_hidden_for_sender_id', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('messages', 'is_hidden_for_receiver_id', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Remove columns from conversations
    await queryInterface.removeColumn('conversations', 'status');
    await queryInterface.removeColumn('conversations', 'blocked_by_sender');
    await queryInterface.removeColumn('conversations', 'blocked_by_receiver');
    
    // Drop the ENUM type if it exists (Postgres specific)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_conversations_status";');

    // 2. Remove columns from messages
    await queryInterface.removeColumn('messages', 'is_hidden_for_sender_id');
    await queryInterface.removeColumn('messages', 'is_hidden_for_receiver_id');
  }
};
