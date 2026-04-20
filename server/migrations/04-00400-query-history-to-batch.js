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
  /**
   * Creates a query history view off of batches and statements tables
   * ========================================================
   */

  let castType = 'INTEGER';
  if (config.get('backendDatabaseUri').startsWith('mysql')) {
    castType = 'UNSIGNED';
  }

  const schema = migrationUtils.getSchema(config);
  const s = schema ? `"${schema}".` : '';

  await sequelizeDb.query(
    `
      CREATE VIEW ${s}vw_query_history AS
      SELECT
        b.id,
        b.query_id,
        b.name AS query_name,
        b.connection_id,
        c.name AS connection_name,
        b.status,
        b.start_time,
        b.stop_time,
        b.duration_ms,
        b.selected_text AS query_text,
        b.user_id,
        u.email AS user_email,
        ss.row_count,
        ss.incomplete
      FROM
        ${s}batches b
        LEFT JOIN ${s}users u ON b.user_id = u.id
        LEFT JOIN ${s}connections c ON b.connection_id = c.id
        LEFT JOIN (
          SELECT
            batch_id,
            SUM(row_count) AS row_count,
            MAX(CAST(incomplete AS ${castType})) AS incomplete
          FROM
            ${s}statements
          GROUP BY
            batch_id
        ) ss ON b.id = ss.batch_id
    `,
    {
      type: Sequelize.QueryTypes.RAW,
    }
  );
}

export default {
  up,
};
