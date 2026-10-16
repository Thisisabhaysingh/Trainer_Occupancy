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
    const migrationPath = path.join(__dirname, '..', 'migrations', '202610140001_school_curriculum.sql');
    await connection.query(fs.readFileSync(migrationPath, 'utf8'));
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('school_curriculum_courses', 'school_curriculum_sessions')`
    );
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments'
       AND COLUMN_NAME IN ('curriculumSessionId', 'completionStatus', 'completedAt', 'trainerNote')`
    );
    if (tables.length !== 2 || columns.length !== 4) {
      throw new Error('Migration verification failed: expected curriculum tables and assignment columns are missing.');
    }
    process.stdout.write('School curriculum schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  process.stderr.write(`School curriculum migration failed: ${error.message}\n`);
  process.exit(1);
});
