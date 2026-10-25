const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "starred_messages",
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          message_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          group_message_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        },
        { transaction }
      );

      // Foreign key: user_id -> users.id
      await queryInterface.addConstraint("starred_messages", {
        fields: ["user_id"],
        type: "foreign key",
        name: "fk_starred_messages_user_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // Foreign key: message_id -> messages.id
      await queryInterface.addConstraint("starred_messages", {
        fields: ["message_id"],
        type: "foreign key",
        name: "fk_starred_messages_message_id",
        references: { table: "messages", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // Foreign key: group_message_id -> group_messages.id
      await queryInterface.addConstraint("starred_messages", {
        fields: ["group_message_id"],
        type: "foreign key",
        name: "fk_starred_messages_group_msg_id",
        references: { table: "group_messages", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // Unique index on (user_id, message_id)
      await queryInterface.addIndex(
        "starred_messages",
        ["user_id", "message_id"],
        {
          unique: true,
          name: "unique_user_starred_direct_message",
          where: {
            message_id: {
              [queryInterface.sequelize.Sequelize.Op.ne]: null,
            },
          },
          transaction,
        }
      );

      // Unique index on (user_id, group_message_id)
      await queryInterface.addIndex(
        "starred_messages",
        ["user_id", "group_message_id"],
        {
          unique: true,
          name: "unique_user_starred_group_message",
          where: {
            group_message_id: {
              [queryInterface.sequelize.Sequelize.Op.ne]: null,
            },
          },
          transaction,
        }
      );

      // Index on user_id for fast queries
      await queryInterface.addIndex("starred_messages", ["user_id"], {
        name: "idx_starred_messages_user_id",
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
      await queryInterface.dropTable("starred_messages", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
