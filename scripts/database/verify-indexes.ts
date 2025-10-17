/**
 * Verify Index Usage and Performance
 *
 * This script checks that indexes are created and being used by queries.
 */

import { pool } from '../../src/database/connection';

async function verifyIndexes() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         INDEX VERIFICATION                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  // 1. Check all indexes exist
  console.log('📋 Checking Index Existence...\n');
  const indexCheckQuery = `
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
  `;

  const indexesResult = await pool.query(indexCheckQuery);
  console.log(`✅ Found ${indexesResult.rows.length} custom indexes:\n`);

  indexesResult.rows.forEach(row => {
    console.log(`   📌 ${row.indexname} on ${row.tablename}`);
  });

  // 2. Check index usage statistics
  console.log('\n📊 Index Usage Statistics...\n');
  const statsQuery = `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan as scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes
    WHERE indexname LIKE 'idx_%'
    ORDER BY idx_scan DESC;
  `;

  const statsResult = await pool.query(statsQuery);

  if (statsResult.rows.length === 0) {
    console.log('   ⚠️  No usage stats yet (indexes just created)\n');
  } else {
    statsResult.rows.forEach(row => {
      console.log(`   📈 ${row.indexname}:`);
      console.log(`      Scans: ${row.scans}, Tuples: ${row.tuples_fetched}, Size: ${row.index_size}`);
    });
  }

  // 3. Check table sizes
  console.log('\n💾 Table Sizes (with indexes)...\n');
  const sizeQuery = `
    SELECT
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
      pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
      pg_indexes_size(schemaname||'.'||tablename) as indexes_bytes
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;
  `;

  const sizeResult = await pool.query(sizeQuery);
  sizeResult.rows.forEach(row => {
    if (row.indexes_bytes > 0) {
      console.log(`   📦 ${row.tablename}:`);
      console.log(`      Table: ${row.table_size} | Indexes: ${row.indexes_size} | Total: ${row.total_size}`);
    }
  });

  console.log('\n✅ Index verification complete!\n');

  await pool.end();
}

verifyIndexes().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
