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
    const migrationPath = path.join(__dirname, '..', 'migrations', '202610140002_trainer_school_timetable_templates.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const createTableSql = sql.split('\nALTER TABLE')[0];
    await connection.query(createTableSql);

    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments'
       AND COLUMN_NAME = 'timetableTemplateId'`
    );
    const [indexes] = await connection.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments'
       AND INDEX_NAME = 'trainer_school_template_week_unique'`
    );
    const [startActivityPositionColumn] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_timetable_templates'
       AND COLUMN_NAME = 'startActivityPosition'`
    );
    if (!columns.length) await connection.query('ALTER TABLE `trainer_school_assignments` ADD COLUMN `timetableTemplateId` INT NULL');
    if (!indexes.length) await connection.query('ALTER TABLE `trainer_school_assignments` ADD UNIQUE KEY `trainer_school_template_week_unique` (`timetableTemplateId`, `weekStart`)');
    if (!startActivityPositionColumn.length) await connection.query('ALTER TABLE `trainer_school_timetable_templates` ADD COLUMN `startActivityPosition` INT NOT NULL DEFAULT 1 AFTER `courseId`');
    process.stdout.write('Recurring school timetable schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`Recurring school timetable migration failed: ${error.message}\n`);
  process.exit(1);
});
