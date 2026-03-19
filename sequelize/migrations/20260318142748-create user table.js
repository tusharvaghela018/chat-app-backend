'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "users",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
          },

          name: {
            type: Sequelize.STRING,
            allowNull: false
          },

          email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
          },

          password: {
            type: Sequelize.STRING
          },

          google_id: {
            type: Sequelize.STRING
          },

          avatar: {
            type: Sequelize.STRING
          },

          is_online: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
          },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW")
          },

          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW")
          },

          deleted_at: {
            type: Sequelize.DATE
          }
        },
        { transaction }
      );
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("users", { transaction })
    })
  }
};
