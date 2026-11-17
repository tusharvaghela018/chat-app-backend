const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "user_sessions",
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          },
          device_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: "desktop",
          },
          device_name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            defaultValue: "Unknown Device",
          },
          browser: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: "Unknown Browser",
          },
          os: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: "Unknown OS",
          },
          ip_address: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: "127.0.0.1",
          },
          location: {
            type: DataTypes.STRING(200),
            allowNull: true,
            defaultValue: "Local Network",
          },
          city: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          region: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          country: {
            type: DataTypes.STRING(100),
            allowNull: true,
          },
          country_code: {
            type: DataTypes.STRING(10),
            allowNull: true,
          },
          is_revoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          last_active_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
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

      await queryInterface.addIndex("user_sessions", ["user_id"], {
        name: "idx_user_sessions_user_id",
        transaction,
      });

      await queryInterface.addIndex("user_sessions", ["is_revoked"], {
        name: "idx_user_sessions_is_revoked",
        transaction,
      });

      await queryInterface.addIndex("user_sessions", ["last_active_at"], {
        name: "idx_user_sessions_last_active_at",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("user_sessions");
  },
};
