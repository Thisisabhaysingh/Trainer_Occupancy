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
    const migrationPath = path.join(__dirname, '..', 'migrations', '202610160001_school_activity_mail.sql');
    await connection.query(fs.readFileSync(migrationPath, 'utf8'));

    // Follow-up columns: daily send time look-back and full delivered mail in the log.
    const columns = [
      ['school_activity_mail_settings', 'lookbackDays'],
      ['school_activity_mail_logs', 'bodyHtml'],
      ['school_activity_mail_logs', 'details'],
      ['school_activity_mail_logs', 'sentAt'],
    ];
    const statements = fs.readFileSync(path.join(__dirname, '..', 'migrations', '202610170001_school_activity_mail_schedule.sql'), 'utf8')
      .split(';').map(statement => statement.trim()).filter(Boolean);
    for (const [index, [table, column]] of columns.entries()) {
      const [existing] = await connection.query(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, column]
      );
      if (!existing.length) await connection.query(statements[index]);
    }

    // School mail content options (which details the summary table shows).
    const [contentColumn] = await connection.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'school_activity_mail_settings' AND COLUMN_NAME = 'contentOptions'"
    );
    if (!contentColumn.length) {
      await connection.query(fs.readFileSync(path.join(__dirname, '..', 'migrations', '202610170002_school_mail_content_options.sql'), 'utf8'));
    }
    process.stdout.write('School activity mail schema is ready.\n');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  process.stderr.write(`School activity mail migration failed: ${error.message}\n`);
  process.exit(1);
});
