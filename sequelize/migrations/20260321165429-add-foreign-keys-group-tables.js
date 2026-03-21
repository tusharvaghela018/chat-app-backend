module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {

      // groups.created_by → users.id
      await queryInterface.addConstraint("groups", {
        fields: ["created_by"],
        type: "foreign key",
        name: "fk_groups_created_by",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_settings.group_id → groups.id
      await queryInterface.addConstraint("group_settings", {
        fields: ["group_id"],
        type: "foreign key",
        name: "fk_group_settings_group_id",
        references: { table: "groups", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_members.group_id → groups.id
      await queryInterface.addConstraint("group_members", {
        fields: ["group_id"],
        type: "foreign key",
        name: "fk_group_members_group_id",
        references: { table: "groups", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_members.user_id → users.id
      await queryInterface.addConstraint("group_members", {
        fields: ["user_id"],
        type: "foreign key",
        name: "fk_group_members_user_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_members.added_by → users.id
      await queryInterface.addConstraint("group_members", {
        fields: ["added_by"],
        type: "foreign key",
        name: "fk_group_members_added_by",
        references: { table: "users", field: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_join_requests.group_id → groups.id
      await queryInterface.addConstraint("group_join_requests", {
        fields: ["group_id"],
        type: "foreign key",
        name: "fk_group_join_requests_group_id",
        references: { table: "groups", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_join_requests.user_id → users.id
      await queryInterface.addConstraint("group_join_requests", {
        fields: ["user_id"],
        type: "foreign key",
        name: "fk_group_join_requests_user_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_join_requests.reviewed_by → users.id
      await queryInterface.addConstraint("group_join_requests", {
        fields: ["reviewed_by"],
        type: "foreign key",
        name: "fk_group_join_requests_reviewed_by",
        references: { table: "users", field: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_messages.group_id → groups.id
      await queryInterface.addConstraint("group_messages", {
        fields: ["group_id"],
        type: "foreign key",
        name: "fk_group_messages_group_id",
        references: { table: "groups", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_messages.sender_id → users.id (SET NULL for system messages)
      await queryInterface.addConstraint("group_messages", {
        fields: ["sender_id"],
        type: "foreign key",
        name: "fk_group_messages_sender_id",
        references: { table: "users", field: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_message_seen.message_id → group_messages.id
      await queryInterface.addConstraint("group_message_seen", {
        fields: ["message_id"],
        type: "foreign key",
        name: "fk_group_message_seen_message_id",
        references: { table: "group_messages", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // group_message_seen.user_id → users.id
      await queryInterface.addConstraint("group_message_seen", {
        fields: ["user_id"],
        type: "foreign key",
        name: "fk_group_message_seen_user_id",
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
      await queryInterface.removeConstraint("group_message_seen", "fk_group_message_seen_user_id", { transaction });
      await queryInterface.removeConstraint("group_message_seen", "fk_group_message_seen_message_id", { transaction });
      await queryInterface.removeConstraint("group_messages", "fk_group_messages_sender_id", { transaction });
      await queryInterface.removeConstraint("group_messages", "fk_group_messages_group_id", { transaction });
      await queryInterface.removeConstraint("group_join_requests", "fk_group_join_requests_reviewed_by", { transaction });
      await queryInterface.removeConstraint("group_join_requests", "fk_group_join_requests_user_id", { transaction });
      await queryInterface.removeConstraint("group_join_requests", "fk_group_join_requests_group_id", { transaction });
      await queryInterface.removeConstraint("group_members", "fk_group_members_added_by", { transaction });
      await queryInterface.removeConstraint("group_members", "fk_group_members_user_id", { transaction });
      await queryInterface.removeConstraint("group_members", "fk_group_members_group_id", { transaction });
      await queryInterface.removeConstraint("group_settings", "fk_group_settings_group_id", { transaction });
      await queryInterface.removeConstraint("groups", "fk_groups_created_by", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};