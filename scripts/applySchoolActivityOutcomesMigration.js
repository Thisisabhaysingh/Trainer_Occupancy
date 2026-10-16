const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mis_database',
  });

  try {
    await connection.query("ALTER TABLE `trainer_school_assignments` MODIFY COLUMN `completionStatus` ENUM('pending', 'completed', 'not_completed') NOT NULL DEFAULT 'pending'");
    process.stdout.write('School activity outcome schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  process.stderr.write(`School activity outcome migration failed: ${error.message}\n`);
  process.exit(1);
});
