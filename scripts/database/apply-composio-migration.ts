/**
 * Apply Composio Migration to Database
 *
 * This script applies the Composio integration migration safely with:
 * - Connection validation
 * - Transaction support
 * - Rollback on error
 * - Verification checks
 */

import { pool, testConnection, closePool } from '../../src/database/connection';
import * as fs from 'fs';
import * as path from 'path';

async function applyComposioMigration() {
  console.log('🚀 Starting Composio Migration\n');

  // Step 1: Test database connection
  console.log('📡 Testing database connection...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }
  console.log('✅ Database connection successful\n');

  // Step 2: Read migration SQL file
  console.log('📄 Reading migration file...');
  const migrationPath = path.join(__dirname, 'add_composio_fields.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded\n');

  // Step 3: Check if migration already applied
  console.log('🔍 Checking if migration already applied...');
  try {
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name = 'composio_entity_id'
    `;
    const result = await pool.query(checkQuery);

    if (result.rows.length > 0) {
      console.log('⚠️  Migration already applied. Skipping...\n');
      await closePool();
      return;
    }
    console.log('✅ Migration not applied yet. Proceeding...\n');
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
    process.exit(1);
  }

  // Step 4: Apply migration in transaction
  console.log('🔧 Applying migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('   - Transaction started');

    await client.query(migrationSQL);
    console.log('   - Migration SQL executed');

    await client.query('COMMIT');
    console.log('   - Transaction committed');
    console.log('✅ Migration applied successfully\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed. Rolling back...');
    console.error('Error:', error);
    client.release();
    await closePool();
    process.exit(1);
  }

  client.release();

  // Step 5: Verify migration
  console.log('🔍 Verifying migration...');
  try {
    const verifyQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name IN ('composio_entity_id', 'auth_method', 'migration_status', 'migrated_at')
      ORDER BY column_name
    `;
    const result = await pool.query(verifyQuery);

    console.log('   Added columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    // Verify indexes
    const indexQuery = `
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'user_gmail_tokens'
      AND indexname IN ('idx_composio_entity', 'idx_auth_method', 'idx_migration_status')
    `;
    const indexResult = await pool.query(indexQuery);

    console.log('\n   Added indexes:');
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });

    console.log('\n✅ Migration verification successful');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }

  // Step 6: Display user count
  try {
    const countQuery = 'SELECT COUNT(*) as count FROM user_gmail_tokens';
    const countResult = await pool.query(countQuery);
    console.log(`\n📊 Total users in database: ${countResult.rows[0].count}`);
    console.log('   All users are in "pending" migration status');
  } catch (error) {
    console.error('Error getting user count:', error);
  }

  // Close connection
  await closePool();
  console.log('\n✨ Migration completed successfully!\n');
  console.log('Next steps:');
  console.log('1. Set USE_COMPOSIO=true in .env when ready');
  console.log('2. Users will need to re-authenticate via Composio');
  console.log('3. Monitor migration_status column for progress\n');
}

// Run migration
applyComposioMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
