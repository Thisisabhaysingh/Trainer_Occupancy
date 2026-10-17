const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'course';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mis_database',
  });
  const columnExists = async (table, column) => (await connection.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, column]
  ))[0].length > 0;
  const indexExists = async (table, index) => (await connection.query(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?', [table, index]
  ))[0].length > 0;

  try {
    const statements = fs.readFileSync(path.join(__dirname, '..', 'migrations', '202610210001_school_management.sql'), 'utf8')
      .replace(/^\s*--.*$/gm, '').split(';').map(statement => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      const addColumn = statement.match(/ALTER TABLE `(\w+)` ADD COLUMN `(\w+)`/);
      if (addColumn && await columnExists(addColumn[1], addColumn[2])) continue;
      const addIndex = statement.match(/ALTER TABLE `(\w+)` ADD UNIQUE KEY `(\w+)`/);
      if (addIndex) {
        if (await indexExists(addIndex[1], addIndex[2])) continue;
        // Give existing courses a unique code before enforcing uniqueness.
        const [courses] = await connection.query('SELECT id, courseName FROM school_curriculum_courses WHERE code IS NULL OR code = ""');
        for (const course of courses) {
          await connection.query('UPDATE school_curriculum_courses SET code = ? WHERE id = ?', [`${slug(course.courseName)}_${course.id}`, course.id]);
        }
      }
      await connection.query(statement);
    }
    process.stdout.write('School management schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`School management migration failed: ${error.message}\n`);
  process.exit(1);
});
