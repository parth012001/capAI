import { pool, closePool } from '../../src/database/connection';

async function applyMigrationStepByStep() {
  console.log('🔧 Applying Composio Migration Step-by-Step (SAFE)\n');
  console.log('This will add missing columns, indexes, and constraints.\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('✓ Transaction started (can rollback if anything fails)\n');

    // Step 1: Add columns (IF NOT EXISTS is safe)
    console.log('1️⃣ Adding columns...');

    await client.query(`
      ALTER TABLE user_gmail_tokens
      ADD COLUMN IF NOT EXISTS composio_entity_id VARCHAR(255)
    `);
    console.log('   ✓ composio_entity_id');

    await client.query(`
      ALTER TABLE user_gmail_tokens
      ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'google_oauth'
    `);
    console.log('   ✓ auth_method');

    await client.query(`
      ALTER TABLE user_gmail_tokens
      ADD COLUMN IF NOT EXISTS migration_status VARCHAR(20) DEFAULT 'pending'
    `);
    console.log('   ✓ migration_status');

    await client.query(`
      ALTER TABLE user_gmail_tokens
      ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP
    `);
    console.log('   ✓ migrated_at');

    // Step 2: Add indexes (IF NOT EXISTS is safe)
    console.log('\n2️⃣ Adding indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_composio_entity
      ON user_gmail_tokens(composio_entity_id)
    `);
    console.log('   ✓ idx_composio_entity');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_method
      ON user_gmail_tokens(auth_method)
    `);
    console.log('   ✓ idx_auth_method');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_migration_status
      ON user_gmail_tokens(migration_status)
    `);
    console.log('   ✓ idx_migration_status');

    // Step 3: Add constraints (check if exists first to avoid error)
    console.log('\n3️⃣ Adding constraints...');

    const checkAuthConstraint = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user_gmail_tokens'
      AND constraint_name = 'chk_auth_method'
    `);

    if (checkAuthConstraint.rows.length === 0) {
      await client.query(`
        ALTER TABLE user_gmail_tokens
        ADD CONSTRAINT chk_auth_method
        CHECK (auth_method IN ('google_oauth', 'composio', 'pending_composio_migration'))
      `);
      console.log('   ✓ chk_auth_method');
    } else {
      console.log('   ✓ chk_auth_method (already exists)');
    }

    const checkMigrationConstraint = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user_gmail_tokens'
      AND constraint_name = 'chk_migration_status'
    `);

    if (checkMigrationConstraint.rows.length === 0) {
      await client.query(`
        ALTER TABLE user_gmail_tokens
        ADD CONSTRAINT chk_migration_status
        CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed'))
      `);
      console.log('   ✓ chk_migration_status');
    } else {
      console.log('   ✓ chk_migration_status (already exists)');
    }

    await client.query('COMMIT');
    console.log('\n✅ Transaction committed - Migration successful!\n');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error occurred - Transaction rolled back (database unchanged)');
    console.error('Error:', error.message);
    client.release();
    await closePool();
    process.exit(1);
  }

  client.release();

  // Verify
  console.log('🔍 Verifying migration...');
  const verifyResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'user_gmail_tokens'
    AND column_name IN ('composio_entity_id', 'auth_method', 'migration_status', 'migrated_at')
    ORDER BY column_name
  `);

  console.log(`   Found ${verifyResult.rows.length}/4 columns:`);
  verifyResult.rows.forEach(row => {
    console.log(`   ✓ ${row.column_name}`);
  });

  if (verifyResult.rows.length === 4) {
    console.log('\n✅ All Composio columns verified! Database is ready.\n');
  } else {
    console.log('\n⚠️  Warning: Not all columns were added.\n');
  }

  await closePool();
}

applyMigrationStepByStep().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
