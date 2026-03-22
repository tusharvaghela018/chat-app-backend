'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {

    const password = await bcrypt.hash('Test@123', 10);

    const users = [
      "Amos",
      "narendra",
      "priyank",
      "vishvas",
      "sairaj",
      "bhavik",
      "sagar",
      "nepal",
      "bhargav",
      "bind",
      "jatraj"
    ].map((name, index) => ({
      name,
      email: `${name.toLowerCase()}${index}@example.com`,
      password,
      google_id: null,
      avatar: null,
      is_online: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null
    }));

    await queryInterface.bulkInsert('users', users, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};