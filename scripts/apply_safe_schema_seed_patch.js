const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DEFAULT_PATCH_PATH = path.join(__dirname, '..', 'migrations', 'server_safe_schema_seed_patch.sql');
const DEFAULT_BASE_BACKUP_PATH = path.join(__dirname, '..', 'mis_database_backup.sql');

function splitSqlByDelimiter(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = [];

  for (const rawLine of sql.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (/^DELIMITER\s+/i.test(line)) {
      const statement = buffer.join('\n').trim();
      if (statement) statements.push(statement);
      buffer = [];
      delimiter = line.replace(/^DELIMITER\s+/i, '').trim();
      continue;
    }

    if (delimiter === ';') {
      buffer.push(rawLine);
      const joined = buffer.join('\n');
      if (joined.trimEnd().endsWith(';')) {
        statements.push(joined.trim().replace(/;$/, '').trim());
        buffer = [];
      }
      continue;
    }

    if (rawLine.trimEnd().endsWith(delimiter)) {
      buffer.push(rawLine.slice(0, rawLine.lastIndexOf(delimiter)));
      const statement = buffer.join('\n').trim();
      if (statement) statements.push(statement);
      buffer = [];
    } else {
      buffer.push(rawLine);
    }
  }

  const trailing = buffer.join('\n').trim();
  if (trailing) statements.push(trailing);

  return statements.filter(statement =>
    statement
      .split(/\r?\n/)
      .some(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--');
      })
  );
}

async function applySafeSchemaSeedPatch(options = {}) {
  const patchPath = options.patchPath || process.env.SAFE_SCHEMA_SEED_PATCH || DEFAULT_PATCH_PATH;
  const baseBackupPath = options.baseBackupPath || process.env.BASE_DB_BACKUP_PATH || DEFAULT_BASE_BACKUP_PATH;

  if (!fs.existsSync(patchPath)) {
    throw new Error(`Safe schema seed patch not found: ${patchPath}`);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mis_database',
    multipleStatements: true,
  });

  try {
    const [[usersTable]] = await connection.query(
      'SELECT COUNT(*) AS tableCount FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      ['users']
    );

    if (Number(usersTable.tableCount) === 0) {
      if (process.env.AUTO_BASE_BACKUP_IMPORT === 'false') {
        throw new Error('Base MIS tables are missing and AUTO_BASE_BACKUP_IMPORT=false. Import mis_database_backup.sql first.');
      }

      if (!fs.existsSync(baseBackupPath)) {
        throw new Error(`Base MIS backup not found: ${baseBackupPath}`);
      }

      const baseSql = fs.readFileSync(baseBackupPath, 'utf8');
      await connection.query(baseSql);
    }

    const sql = fs.readFileSync(patchPath, 'utf8');
    const statements = splitSqlByDelimiter(sql);

    for (const statement of statements) {
      await connection.query(statement);
    }

    return { patchPath, statementCount: statements.length };
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  applySafeSchemaSeedPatch()
    .then(({ patchPath, statementCount }) => {
      console.log(`Safe schema/seed patch applied: ${patchPath}`);
      console.log(`Statements executed: ${statementCount}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to apply safe schema/seed patch:', error);
      process.exit(1);
    });
}

module.exports = { applySafeSchemaSeedPatch, splitSqlByDelimiter };
