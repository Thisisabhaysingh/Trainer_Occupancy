const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mis_database',
    multipleStatements: true,
  });

  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '202610140004_trainer_leaderboard.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const [createTableSql, foreignKeySql] = sql.split('\nALTER TABLE');
    await connection.query(createTableSql);

    const [constraints] = await connection.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_leaderboard'
       AND CONSTRAINT_NAME = 'trainer_leaderboard_user_fk'`
    );
    if (!constraints.length) {
      // Match the users.employeeCode column definition so the foreign key can be created.
      const [[userColumn]] = await connection.query(
        `SELECT CHARACTER_SET_NAME AS charset, COLLATION_NAME AS collation FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employeeCode'`
      );
      if (userColumn?.charset && userColumn?.collation) {
        await connection.query(`ALTER TABLE \`trainer_leaderboard\` MODIFY COLUMN \`userId\` VARCHAR(255) CHARACTER SET ${userColumn.charset} COLLATE ${userColumn.collation} NOT NULL`);
      }
      try {
        await connection.query(`ALTER TABLE${foreignKeySql}`);
      } catch (error) {
        process.stderr.write(`Warning: could not add users foreign key (${error.message}). The leaderboard still works; rows are cleaned up on recompute.\n`);
      }
    }
    process.stdout.write('Trainer leaderboard schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`Trainer leaderboard migration failed: ${error.message}\n`);
  process.exit(1);
});
