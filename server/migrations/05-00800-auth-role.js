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

  await queryInterface.addColumn(migrationUtils.tableRef('users', schema), 'sync_auth_role', {
    type: Sequelize.BOOLEAN,
  });
}

export default {
  up,
};
