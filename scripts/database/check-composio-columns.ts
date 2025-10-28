import { pool, closePool } from '../../src/database/connection';

async function checkComposioColumns() {
  try {
    console.log('🔍 Checking if Composio columns exist in Neon database...\n');

    const result = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
        AND column_name IN ('composio_entity_id', 'auth_method', 'migration_status', 'migrated_at')
      ORDER BY column_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ NO COMPOSIO COLUMNS FOUND');
      console.log('   The database is NOT migrated yet.\n');
      console.log('📝 Missing columns:');
      console.log('   - composio_entity_id');
      console.log('   - auth_method');
      console.log('   - migration_status');
      console.log('   - migrated_at\n');
      console.log('💡 Run migration: npx tsx scripts/database/apply-composio-migration.ts\n');
    } else {
      console.log(`✅ COMPOSIO COLUMNS EXIST (${result.rows.length}/4)\n`);

      result.rows.forEach((col) => {
        console.log(`✓ ${col.column_name}`);
        console.log(`  Type: ${col.data_type}`);
        console.log(`  Nullable: ${col.is_nullable}`);
        console.log(`  Default: ${col.column_default || 'NULL'}`);
        console.log('');
      });

      if (result.rows.length < 4) {
        console.log('⚠️  WARNING: Some columns are missing!');
      }
    }

    await closePool();
  } catch (error) {
    console.error('❌ Error:', error);
    await closePool();
    process.exit(1);
  }
}

checkComposioColumns();
