// Script to monitor database indexes and prevent hitting MySQL's 64-index limit
const { sequelize } = require('./models');

async function monitorIndexes() {
  try {
    console.log('🔍 Monitoring database indexes...\n');

    // Check indexes on all tables
    const [indexes] = await sequelize.query(`
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        INDEX_TYPE,
        COUNT(*) OVER (PARTITION BY TABLE_NAME) as table_index_count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'mis_database'}'
      ORDER BY TABLE_NAME, INDEX_NAME
    `);

    console.log('📊 DATABASE INDEX SUMMARY:');
    console.log('═'.repeat(80));

    let currentTable = '';
    indexes.forEach((index) => {
      if (currentTable !== index.TABLE_NAME) {
        console.log(`\n📋 ${index.TABLE_NAME} (${index.table_index_count} indexes):`);
        currentTable = index.TABLE_NAME;
      }
      console.log(`   ${index.INDEX_NAME} on ${index.COLUMN_NAME} (${index.INDEX_TYPE}, ${index.NON_UNIQUE ? 'NON-UNIQUE' : 'UNIQUE'})`);
    });

    // Check tables approaching the 64-index limit
    const [tableCounts] = await sequelize.query(`
      SELECT
        TABLE_NAME,
        COUNT(*) as index_count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'mis_database'}'
      GROUP BY TABLE_NAME
      HAVING COUNT(*) > 50
      ORDER BY index_count DESC
    `);

    if (tableCounts.length > 0) {
      console.log('\n⚠️  WARNING - TABLES APPROACHING 64-INDEX LIMIT:');
      console.log('═'.repeat(80));
      tableCounts.forEach((table) => {
        const risk = table.index_count >= 60 ? '🔴 HIGH' : table.index_count >= 55 ? '🟡 MEDIUM' : '🟢 LOW';
        console.log(`${risk} ${table.TABLE_NAME}: ${table.index_count}/64 indexes`);
      });
    } else {
      console.log('\n✅ All tables are well below the 64-index limit.');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('💡 Tips to avoid index limit issues:');
    console.log('   - Remove unused unique constraints');
    console.log('   - Use application-level validation instead of database unique constraints');
    console.log('   - Consider composite indexes instead of multiple single-column indexes');
    console.log('   - Monitor indexes regularly in production');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error monitoring indexes:', error);
    process.exit(1);
  }
}

monitorIndexes();
