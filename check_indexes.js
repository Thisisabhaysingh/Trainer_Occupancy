// Script to check database indexes and fix the Branch model issue
const { sequelize } = require('./models');

async function checkIndexes() {
  try {
    console.log('🔍 Checking database indexes...\n');

    // Check indexes on Branches table
    const [indexes] = await sequelize.query(`
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        INDEX_TYPE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'mis_database'}'
      AND TABLE_NAME = 'Branches'
      ORDER BY INDEX_NAME
    `);

    console.log('📊 BRANCHES TABLE INDEXES:');
    console.log('═'.repeat(60));
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.INDEX_NAME} on ${index.COLUMN_NAME} (${index.INDEX_TYPE}, ${index.NON_UNIQUE ? 'NON-UNIQUE' : 'UNIQUE'})`);
    });
    console.log(`\nTotal indexes on Branches table: ${indexes.length}`);
    console.log('═'.repeat(60));

    // Check total indexes across all tables
    const [allIndexes] = await sequelize.query(`
      SELECT
        TABLE_NAME,
        COUNT(*) as index_count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'mis_database'}'
      GROUP BY TABLE_NAME
      ORDER BY index_count DESC
      LIMIT 10
    `);

    console.log('\n📊 TOP 10 TABLES BY INDEX COUNT:');
    console.log('═'.repeat(60));
    allIndexes.forEach((table, i) => {
      console.log(`${i + 1}. ${table.TABLE_NAME}: ${table.index_count} indexes`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    process.exit(1);
  }
}

checkIndexes();
