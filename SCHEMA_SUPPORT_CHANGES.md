# SQLPad 7.5.7 元数据自定义 Schema 支持改造说明

## 背景

SQLPad 原版本的元数据（schema_version、users、connections 等系统表）默认写入 PostgreSQL 的 `public` schema。本次改造目标是支持通过 `SQLPAD_BACKEND_DB_URI` 连接串中的 `search_path` 参数指定元数据写入的 schema，例如：

```
SQLPAD_BACKEND_DB_URI=postgresql://user:pass@host:5432/dbname?search_path=myschema
```

---

## 修改文件清单

### 1. `server/lib/migration-utils.js`

新增两个工具函数，以及更新 `addOrReplaceIndex` 函数签名：

**新增 `getSchema(config)`**
从 `backendDatabaseUri` 的查询参数中提取 `search_path` 或 `schema` 值（仅对 postgres 生效）：

```js
function getSchema(config) {
  const uri = config.get('backendDatabaseUri');
  if (!uri || !uri.startsWith('postgres')) return null;
  try {
    const parsedUrl = new URL(uri);
    return parsedUrl.searchParams.get('search_path') ||
           parsedUrl.searchParams.get('schema') || null;
  } catch (e) {
    return null;
  }
}
```

**新增 `tableRef(tableName, schema)`**
为 Sequelize `queryInterface` 方法生成带 schema 的表引用对象：

```js
function tableRef(tableName, schema) {
  return schema ? { tableName, schema } : tableName;
}
```

**更新 `addOrReplaceIndex`**
新增 `schema` 参数，内部使用 `tableRef` 传递给 queryInterface：

```js
async function addOrReplaceIndex(queryInterface, tableName, indexName, fields, options, schema) {
  // 删除旧索引（忽略失败）
  // 创建新索引，传入 tableRef(tableName, schema)
}
```

---

### 2. `server/lib/make-migrator.js`

在创建 Umzug 迁移器时，将 schema 信息传入 `storageOptions`，确保 `schema_version` 迁移记录表也创建在指定 schema 下：

```js
import migrationUtils from './migration-utils.js';

const schema = migrationUtils.getSchema(config);
const storageOptions = {
  sequelize: sequelizeInstance,
  tableName: 'schema_version',
};
if (schema) {
  storageOptions.schema = schema;
}
```

---

### 3. 所有迁移文件（12 个）

涉及文件：
- `server/migrations/04-00100-init.js`
- `server/migrations/04-00200-add-driver-to-connections.js`
- `server/migrations/04-00300-connections-add-idle-timeout.js`
- `server/migrations/04-00400-create-batch-statement-tables.js`
- `server/migrations/04-00500-statements-add-columns.js`
- `server/migrations/04-00600-add-service-tokens-table.js`
- `server/migrations/04-00700-schema-from-v5.js`
- `server/migrations/05-00800-auth-role.js`
- `server/migrations/05-00900-add-session-table.js`
- `server/migrations/06-00010-fix-query-history-view.js`
- `server/migrations/06-00200-statement-execution-id.js`
- `server/migrations/06-00700-service-token-id-column.js`

**统一改造模式：**

每个迁移文件在 `up()` 函数开头增加：

```js
const schema = migrationUtils.getSchema(config);
```

所有 `queryInterface` 调用的表名参数替换为 `tableRef`：

```js
// 改前
queryInterface.createTable('users', { ... })
queryInterface.addColumn('users', 'role', { ... })
queryInterface.changeColumn('service_tokens', 'id', { ... })

// 改后
queryInterface.createTable(migrationUtils.tableRef('users', schema), { ... })
queryInterface.addColumn(migrationUtils.tableRef('users', schema), 'role', { ... })
queryInterface.changeColumn(migrationUtils.tableRef('service_tokens', schema), 'id', { ... })
```

**原始 SQL 迁移文件**（使用 `sequelizeDb.query` 执行原始 SQL）额外增加：

```js
const s = schema ? `"${schema}".` : '';
// SQL 中所有表名/视图名加前缀 ${s}
await sequelizeDb.query(`DROP VIEW ${s}vw_query_history`);
await sequelizeDb.query(`CREATE VIEW ${s}vw_query_history AS SELECT ... FROM ${s}batches ...`);
```

**Bug 修复（`06-00700`）：**

`postgresql://` 协议解析后 protocol 字段为 `postgresql`，而非 `postgres`，导致走了错误的 else 分支：

```js
// 改前
if (dialect === 'postgres') { ... }

// 改后
if (dialect === 'postgres' || dialect === 'postgresql') { ... }
```

---

## 构建说明

### 环境准备

本次构建在 macOS（x86）上进行，需要以下工具：
- Docker Desktop（已启用 Buildx）
- QEMU（用于跨平台 ARM64 构建）

### 网络优化（中国大陆环境）

由于网络访问限制，需要配置以下镜像：

**1. Docker Hub 镜像（`~/.docker/daemon.json`）：**

```json
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
```

修改后重启 Docker Desktop 生效。

**2. Buildx 构建容器镜像（`buildkitd.toml`，位于项目根目录）：**

Buildx 使用独立容器运行，不继承 `daemon.json` 配置，需单独配置：

```toml
[registry."docker.io"]
  mirrors = ["mirror.ccs.tencentyun.com"]
```

**3. Dockerfile 中的优化：**

- apt 包源替换为阿里云镜像：
  ```dockerfile
  RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
      sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true
  ```

- npm/yarn 使用华为云镜像，增大超时和重试次数：
  ```dockerfile
  RUN yarn config set network-timeout 600000 -g && \
      yarn config set registry https://mirrors.huaweicloud.com/repository/npm/ -g && \
      yarn config set network-retries 10 -g
  ```

---

### x86 本地镜像构建

```bash
docker build -t sqlpad:cv7.5.7 .
```

### ARM64 跨平台镜像构建

**第一步：注册 QEMU 多平台支持**

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

**第二步：创建支持镜像加速的 Buildx 构建器**

```bash
docker buildx create \
  --name mybuilder \
  --driver docker-container \
  --config ./buildkitd.toml \
  --use

docker buildx inspect --bootstrap
```

**第三步：执行 ARM64 构建**

```bash
docker buildx build \
  --platform linux/arm64 \
  -t sqlpad:cv7.5.7-arm64 \
  --load \
  .
```

> `--load` 参数将构建结果加载到本地 Docker 镜像列表，便于直接 `docker run` 使用。

---

### 运行验证

```bash
docker run -d \
  --name sqlpad-test \
  -p 3000:3000 \
  -e SQLPAD_BACKEND_DB_URI="postgresql://user:pass@host:5432/dbname?search_path=myschema" \
  -e SQLPAD_ADMIN="admin@example.com" \
  -e SQLPAD_ADMIN_PASSWORD="your_password" \
  sqlpad:cv7.5.7
```

启动后检查数据库，所有系统表（`users`、`connections`、`schema_version` 等）应创建在 `myschema` 下，而非默认的 `public`。

```sql
-- 验证
\dt myschema.*
```

---

## 技术说明

### 为何 Sequelize queryInterface 需要特殊处理

Sequelize 的 `queryInterface` 方法（`createTable`、`addColumn` 等）不遵循连接串的 `search_path` 设置，始终操作 `public` schema。必须显式传入 `{ tableName, schema }` 对象才能指定目标 schema。

### 原始 SQL 与 queryInterface 的区别

通过 `sequelizeDb.query()` 执行的原始 SQL 会遵循连接的 `search_path`，但为保持一致性和明确性，仍在 SQL 中显式添加了 `"schema".` 前缀。
