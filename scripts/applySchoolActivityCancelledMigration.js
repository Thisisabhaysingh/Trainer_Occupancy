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
    await connection.query(fs.readFileSync(path.join(__dirname, '..', 'migrations', '202610190001_school_activity_cancelled_status.sql'), 'utf8'));
    process.stdout.write('School activity "class cancelled" status is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`School activity cancelled-status migration failed: ${error.message}\n`);
  process.exit(1);
});
