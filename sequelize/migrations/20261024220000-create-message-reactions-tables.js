const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Direct message reactions table
      await queryInterface.createTable(
        "message_reactions",
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          message_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          emoji: {
            type: DataTypes.STRING(16),
            allowNull: false,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addConstraint("message_reactions", {
        fields: ["message_id"],
        type: "foreign key",
        name: "fk_message_reactions_message_id",
        references: { table: "messages", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.addConstraint("message_reactions", {
        fields: ["user_id"],
        type: "foreign key",
        name: "fk_message_reactions_user_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.addIndex(
        "message_reactions",
        ["message_id", "user_id", "emoji"],
        {
          unique: true,
          name: "unique_message_reaction_user_emoji",
          transaction,
        }
      );

      // 2. Group message reactions table
      await queryInterface.createTable(
        "group_message_reactions",
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          group_message_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          emoji: {
            type: DataTypes.STRING(16),
            allowNull: false,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addConstraint("group_message_reactions", {
        fields: ["group_message_id"],
        type: "foreign key",
        name: "fk_group_message_reactions_msg_id",
        references: { table: "group_messages", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.addConstraint("group_message_reactions", {
        fields: ["user_id"],
        type: "foreign key",
        name: "fk_group_message_reactions_user_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      await queryInterface.addIndex(
        "group_message_reactions",
        ["group_message_id", "user_id", "emoji"],
        {
          unique: true,
          name: "unique_group_message_reaction_user_emoji",
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable("group_message_reactions", { transaction });
      await queryInterface.dropTable("message_reactions", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
