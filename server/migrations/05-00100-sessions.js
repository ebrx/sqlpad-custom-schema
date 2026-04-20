import Sequelize from 'sequelize';
import migrationUtils from '../lib/migration-utils.js';

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('../lib/config')} config
 * @param {import('../lib/logger')} appLog
 */
// eslint-disable-next-line no-unused-vars
export async function up(queryInterface, config, appLog) {
  const schema = migrationUtils.getSchema(config);

  /**
   * sessions table is used for web user sessions
   */
  await queryInterface.createTable(migrationUtils.tableRef('sessions', schema), {
    sid: {
      type: Sequelize.STRING(36),
      primaryKey: true,
    },
    expires: {
      type: Sequelize.DATE,
    },
    data: {
      type: Sequelize.TEXT,
    },
    created_at: {
      type: Sequelize.DATE,
    },
    updated_at: {
      type: Sequelize.DATE,
    },
  });
}

export default {
  up,
};
