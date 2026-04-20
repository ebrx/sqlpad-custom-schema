import Sequelize from 'sequelize';
import migrationUtils from '../lib/migration-utils.js';

/**
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('../lib/config')} config
 * @param {import('../lib/logger')} appLog
 * @param {object} sequelizeDb - sequelize instance
 */
// eslint-disable-next-line no-unused-vars
export async function up(queryInterface, config, appLog, sequelizeDb) {
  const schema = migrationUtils.getSchema(config);

  // Statements need to reference the remote execution to enable query cancellation
  await queryInterface.addColumn(migrationUtils.tableRef('statements', schema), 'execution_id', {
    type: Sequelize.STRING,
  });

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'statements',
    'statements_execution_id',
    ['execution_id'],
    {
      unique: true,
      where: {
        execution_id: {
          [Sequelize.Op.ne]: null,
        },
      },
    },
    schema
  );
}

export default {
  up,
};
