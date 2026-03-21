module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addConstraint("conversations", {
        fields: ["sender_id"],
        type: "foreign key",
        name: "fk_conversations_sender_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.addConstraint("conversations", {
        fields: ["receiver_id"],
        type: "foreign key",
        name: "fk_conversations_receiver_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.addConstraint("messages", {
        fields: ["conversation_id"],
        type: "foreign key",
        name: "fk_messages_conversation_id",
        references: { table: "conversations", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.addConstraint("messages", {
        fields: ["sender_id"],
        type: "foreign key",
        name: "fk_messages_sender_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint("messages", "fk_messages_sender_id", { transaction });
      await queryInterface.removeConstraint("messages", "fk_messages_conversation_id", { transaction });
      await queryInterface.removeConstraint("conversations", "fk_conversations_receiver_id", { transaction });
      await queryInterface.removeConstraint("conversations", "fk_conversations_sender_id", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};