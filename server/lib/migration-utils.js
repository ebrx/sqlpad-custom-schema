/**
 * Extracts the PostgreSQL schema from backendDatabaseUri.
 * Returns null for non-postgres or when no schema is specified.
 *
 * @param {import('./config')} config
 * @returns {string|null}
 */
function getSchema(config) {
  const uri = config.get('backendDatabaseUri');
  if (!uri || !uri.startsWith('postgres')) return null;
  try {
    const parsedUrl = new URL(uri);
    return (
      parsedUrl.searchParams.get('search_path') ||
      parsedUrl.searchParams.get('schema') ||
      null
    );
  } catch (e) {
    return null;
  }
}

/**
 * Returns a Sequelize table reference object when schema is set,
 * or the plain table name string when no schema is needed.
 *
 * @param {string} tableName
 * @param {string|null} schema
 * @returns {string|{tableName: string, schema: string}}
 */
function tableRef(tableName, schema) {
  return schema ? { tableName, schema } : tableName;
}

/**
 * Allows creating idempotentish migrations that include index creation.
 * The queryInterface does not have a create index if not exists option,
 * so this creates that.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {String} tableName
 * @param {String} indexName
 * @param {Array<String>} fields - array of field names
 * @param {object} [options] - additional options to apply to addIndex
 * @param {string|null} [schema] - optional schema name
 */
async function addOrReplaceIndex(
  queryInterface,
  tableName,
  indexName,
  fields,
  options = {},
  schema = null
) {
  const table = tableRef(tableName, schema);
  const indexes = await queryInterface.showIndex(table);

  const found = indexes.find((index) => index.name === indexName);

  // If not found create the index
  if (!found) {
    return queryInterface.addIndex(table, {
      fields,
      name: indexName,
      ...options,
    });
  }

  // If found, figure out if it is the *same* index
  // If it is the same, do nothing
  // Name and table already match, but the fields need to as well
  // fields is something like [ { attribute: 'colname', length: undefined, order: undefined } ]
  // Unsure if length/order are populated. They are not for sqlite.
  // we'll assume order in array is order of fields
  let sameIndex = true;
  if (fields.length !== found.fields.length) {
    sameIndex = false;
  } else {
    // iterate and check
    fields.forEach((field, index) => {
      const indexCol = found.fields[index];
      if (!indexCol || field !== indexCol.attribute) {
        sameIndex = false;
      }
    });
  }

  if (!sameIndex) {
    await queryInterface.removeIndex(table, indexName);
    await queryInterface.addIndex(table, {
      fields,
      name: indexName,
      ...options,
    });
  }
}

export default {
  getSchema,
  tableRef,
  addOrReplaceIndex,
};
