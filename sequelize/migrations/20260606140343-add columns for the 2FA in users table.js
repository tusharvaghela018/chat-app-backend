'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.sequelize.transaction(async (transaction) => {

      await queryInterface.addColumn('users', 'two_factor_enabled', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: true
      }, { transaction })

      await queryInterface.addColumn('users', 'two_factor_secret', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction })

      await queryInterface.addColumn('users', 'two_factor_iv', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction })

      await queryInterface.addColumn('users', 'two_factor_tag', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction })

      await queryInterface.addColumn('users', 'two_factor_recovery_codes', {
        type: Sequelize.TEXT,
        allowNull: true
      }, { transaction })
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('users', 'two_factor_enabled', { transaction });
      await queryInterface.removeColumn('users', 'two_factor_secret', { transaction });
      await queryInterface.removeColumn('users', 'two_factor_iv', { transaction })
      await queryInterface.removeColumn('users', 'two_factor_tag', { transaction })
      await queryInterface.removeColumn('users', 'two_factor_recovery_codes', { transaction })
    })
  }
};
