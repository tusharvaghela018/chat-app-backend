const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "calls",
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          caller_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          receiver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          conversation_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          type: {
            type: DataTypes.ENUM("audio", "video"),
            allowNull: false,
            defaultValue: "audio",
          },
          status: {
            type: DataTypes.ENUM("completed", "missed", "declined", "busy", "cancelled"),
            allowNull: false,
            defaultValue: "missed",
          },
          duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          started_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          ended_at: {
            type: DataTypes.DATE,
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

      // Foreign key: caller_id -> users.id
      await queryInterface.addConstraint("calls", {
        fields: ["caller_id"],
        type: "foreign key",
        name: "fk_calls_caller_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // Foreign key: receiver_id -> users.id
      await queryInterface.addConstraint("calls", {
        fields: ["receiver_id"],
        type: "foreign key",
        name: "fk_calls_receiver_id",
        references: { table: "users", field: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        transaction,
      });

      // Foreign key: conversation_id -> conversations.id
      await queryInterface.addConstraint("calls", {
        fields: ["conversation_id"],
        type: "foreign key",
        name: "fk_calls_conversation_id",
        references: { table: "conversations", field: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        transaction,
      });

      // Indexes for fast lookups by caller/receiver
      await queryInterface.addIndex("calls", ["caller_id"], {
        name: "idx_calls_caller_id",
        transaction,
      });
      await queryInterface.addIndex("calls", ["receiver_id"], {
        name: "idx_calls_receiver_id",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("calls");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_calls_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_calls_status";');
  },
};
