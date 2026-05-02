'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'username', {
      type: Sequelize.STRING,
      allowNull: true, // Initially true to allow existing records
      unique: true
    });

    // Populate existing users' usernames using their email prefix
    await queryInterface.sequelize.query(
      `UPDATE "users" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL`
    );

    // After populating, make it non-nullable
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'username');
  }
};
