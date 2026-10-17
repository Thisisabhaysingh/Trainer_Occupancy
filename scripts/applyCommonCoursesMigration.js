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
  });
  const indexExists = async name => (await connection.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'school_curriculum_courses' AND INDEX_NAME = ?", [name]
  ))[0].length > 0;

  try {
    const [duplicates] = await connection.query(
      'SELECT academicYear, term, gradeBand, courseName, COUNT(*) AS total FROM school_curriculum_courses GROUP BY academicYear, term, gradeBand, courseName HAVING total > 1'
    );
    if (duplicates.length) {
      throw new Error(`These courses exist for more than one school and must be merged first: ${duplicates.map(row => `${row.academicYear} ${row.term} ${row.gradeBand} ${row.courseName}`).join('; ')}`);
    }
    const statements = fs.readFileSync(path.join(__dirname, '..', 'migrations', '202610200002_common_courses_and_manager_assignments.sql'), 'utf8')
      .replace(/^\s*--.*$/gm, '').split(';').map(statement => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      if (statement.includes('DROP INDEX `school_curriculum_course_unique`') && !(await indexExists('school_curriculum_course_unique'))) continue;
      if (statement.includes('ADD UNIQUE KEY `school_curriculum_course_common_unique`') && await indexExists('school_curriculum_course_common_unique')) continue;
      await connection.query(statement);
    }
    process.stdout.write('Common courses and manager assignments schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`Common courses migration failed: ${error.message}\n`);
  process.exit(1);
});
