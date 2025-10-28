import { pool, closePool } from '../../src/database/connection';
import * as fs from 'fs';
import * as path from 'path';

async function forceApplyMigration() {
  console.log('🚀 FORCE Applying Composio Migration (bypassing checks)\n');

  const migrationPath = path.join(__dirname, 'add_composio_fields.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration SQL loaded');
  console.log('🔧 Applying migration to Neon database...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('   - Transaction started');

    await client.query(migrationSQL);
    console.log('   - Migration SQL executed');

    await client.query('COMMIT');
    console.log('   - Transaction committed');
    console.log('\n✅ Migration applied successfully\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed. Rolling back...');
    console.error('Error:', error.message);
    client.release();
    await closePool();
    process.exit(1);
  }

  client.release();

  // Verify columns were added
  console.log('🔍 Verifying migration...');
  try {
    const verifyQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name IN ('composio_entity_id', 'auth_method', 'migration_status', 'migrated_at')
      ORDER BY column_name
    `;
    const result = await pool.query(verifyQuery);

    console.log(`   Found ${result.rows.length}/4 columns:`);
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });

    if (result.rows.length === 4) {
      console.log('\n✅ All Composio columns verified!');
    } else {
      console.log('\n⚠️  Some columns are missing!');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }

  await closePool();
  console.log('\n✨ Done!\n');
}

forceApplyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
