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
   * QUERIES
   * ========================================================
   */
  await queryInterface.createTable(migrationUtils.tableRef('queries', schema), {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    name: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    connection_id: {
      type: Sequelize.STRING,
    },
    query_text: {
      type: Sequelize.TEXT,
    },
    // With addition of multiple queries per query...
    // unsure what direction charts will go.
    // Leaving this as a JSON object
    chart: {
      type: Sequelize.JSON,
    },
    // email address
    // (possibly weird, but user ids may not be known ahead of time
    // email is human friendly too
    created_by: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    // also email address
    updated_by: {
      type: Sequelize.STRING,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'queries',
    'queries_created_by',
    ['created_by'],
    {},
    schema
  );

  await queryInterface.createTable(
    migrationUtils.tableRef('query_tags', schema),
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      query_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tag: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    },
    {
      uniqueKeys: {
        query_tags_query_id_tag: {
          fields: ['query_id', 'tag'],
        },
      },
    }
  );

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'query_tags',
    'query_tags_tag',
    ['tag'],
    {},
    schema
  );

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'query_tags',
    'query_tags_tag',
    ['tag'],
    {},
    schema
  );

  /**
   * CONNECTIONS
   * ========================================================
   */
  await queryInterface.createTable(migrationUtils.tableRef('connections', schema), {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    driver: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    multi_statement_transaction_enabled: {
      type: Sequelize.BOOLEAN,
    },
    idle_timeout_seconds: {
      type: Sequelize.INTEGER,
    },
    // Holds all driver-specific fields
    // It is encrypted JSON
    data: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  /**
   * CONNECTION ACCESSES
   * ========================================================
   */
  await queryInterface.createTable(migrationUtils.tableRef('connection_accesses', schema), {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    connection_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    connection_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    user_id: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    user_email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    duration: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    expiry_date: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'connection_accesses',
    'connection_accesses_connection_id',
    ['connection_id'],
    {},
    schema
  );

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'connection_accesses',
    'connection_accesses_user_id',
    ['user_id'],
    {},
    schema
  );

  /**
   * USERS
   * ========================================================
   */
  await queryInterface.createTable(
    migrationUtils.tableRef('users', schema),
    {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
      },
      passhash: {
        type: Sequelize.STRING,
      },
      password_reset_id: {
        type: Sequelize.UUID,
      },
      data: {
        type: Sequelize.JSON,
      },
      signup_at: {
        type: Sequelize.DATE,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      disabled: {
        type: Sequelize.BOOLEAN,
      },
    },
    {
      uniqueKeys: {
        users_email: {
          fields: ['email'],
        },
      },
    }
  );

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'users',
    'users_password_reset_id',
    ['password_reset_id'],
    {
      unique: true,
      where: {
        password_reset_id: {
          [Sequelize.Op.ne]: null,
        },
      },
    },
    schema
  );

  /**
   * CACHE
   * ========================================================
   */
  await queryInterface.createTable(migrationUtils.tableRef('cache', schema), {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    data: {
      type: Sequelize.JSON,
    },
    expiry_date: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await migrationUtils.addOrReplaceIndex(
    queryInterface,
    'cache',
    'cache_expiry_date',
    ['expiry_date'],
    {},
    schema
  );
}

export default {
  up,
};
