const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable("group_settings", {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true, // 1-to-1 with groups
        },
        who_can_send: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "members", // members | admins
        },
        who_can_edit_info: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "admins", // admins | members
        },
        who_can_add_members: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "admins", // admins | members
        },
        who_can_remove_members: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "admins", // admins only
        },
        who_can_share_link: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "admins", // admins | members
        },
        who_can_change_settings: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "admins", // admins only
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

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable("group_settings", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};