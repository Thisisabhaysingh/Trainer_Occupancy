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

  try {
    const statements = fs.readFileSync(path.join(__dirname, '..', 'migrations', '202610180001_school_activity_completion_evidence.sql'), 'utf8')
      .split(';').map(statement => statement.trim()).filter(Boolean);
    for (const [index, column] of ['studentCount', 'photosLink'].entries()) {
      const [existing] = await connection.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments' AND COLUMN_NAME = ?",
        [column]
      );
      if (!existing.length) await connection.query(statements[index]);
    }
    process.stdout.write('School activity completion evidence schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`School activity completion evidence migration failed: ${error.message}\n`);
  process.exit(1);
});
