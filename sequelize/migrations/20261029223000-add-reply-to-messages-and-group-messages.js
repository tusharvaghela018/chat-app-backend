'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add reply_to_id to messages table if not present
    const messagesTable = await queryInterface.describeTable('messages');
    if (!messagesTable.reply_to_id) {
      await queryInterface.addColumn('messages', 'reply_to_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // 2. Add reply_to_id to group_messages table if not present
    const groupMessagesTable = await queryInterface.describeTable('group_messages');
    if (!groupMessagesTable.reply_to_id) {
      await queryInterface.addColumn('group_messages', 'reply_to_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'group_messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    const messagesTable = await queryInterface.describeTable('messages');
    if (messagesTable.reply_to_id) {
      await queryInterface.removeColumn('messages', 'reply_to_id');
    }

    const groupMessagesTable = await queryInterface.describeTable('group_messages');
    if (groupMessagesTable.reply_to_id) {
      await queryInterface.removeColumn('group_messages', 'reply_to_id');
    }
  }
};
