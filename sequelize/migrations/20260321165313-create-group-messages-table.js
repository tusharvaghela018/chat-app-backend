const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable("group_messages", {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        sender_id: {
          type: DataTypes.INTEGER,
          allowNull: true, // null for system messages
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "text", // text | system
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
      }, { transaction });

      // index for fast message loading per group
      await queryInterface.addIndex("group_messages", ["group_id", "created_at"], {
        name: "group_messages_group_id_created_at_idx",
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
      await queryInterface.dropTable("group_messages", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};