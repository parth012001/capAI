import { pool, closePool } from '../../src/database/connection';

async function safeApplyMigration() {
  console.log('🔍 SAFE Migration - Checking what needs to be done...\n');

  try {
    // Check columns
    console.log('1️⃣ Checking columns...');
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name IN ('composio_entity_id', 'auth_method', 'migration_status', 'migrated_at')
    `);

    const existingColumns = columnsResult.rows.map(r => r.column_name);
    const neededColumns = ['composio_entity_id', 'auth_method', 'migration_status', 'migrated_at'];
    const missingColumns = neededColumns.filter(c => !existingColumns.includes(c));

    if (missingColumns.length === 0) {
      console.log('   ✅ All columns exist');
    } else {
      console.log(`   ⚠️  Missing columns: ${missingColumns.join(', ')}`);
    }

    // Check indexes
    console.log('\n2️⃣ Checking indexes...');
    const indexesResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'user_gmail_tokens'
      AND indexname IN ('idx_composio_entity', 'idx_auth_method', 'idx_migration_status')
    `);

    const existingIndexes = indexesResult.rows.map(r => r.indexname);
    const neededIndexes = ['idx_composio_entity', 'idx_auth_method', 'idx_migration_status'];
    const missingIndexes = neededIndexes.filter(i => !existingIndexes.includes(i));

    if (missingIndexes.length === 0) {
      console.log('   ✅ All indexes exist');
    } else {
      console.log(`   ⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
    }

    // Check constraints
    console.log('\n3️⃣ Checking constraints...');
    const constraintsResult = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user_gmail_tokens'
      AND constraint_name IN ('chk_auth_method', 'chk_migration_status')
    `);

    const existingConstraints = constraintsResult.rows.map(r => r.constraint_name);
    const neededConstraints = ['chk_auth_method', 'chk_migration_status'];
    const missingConstraints = neededConstraints.filter(c => !existingConstraints.includes(c));

    if (missingConstraints.length === 0) {
      console.log('   ✅ All constraints exist');
    } else {
      console.log(`   ⚠️  Missing constraints: ${missingConstraints.join(', ')}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    const needsMigration = missingColumns.length > 0 || missingIndexes.length > 0 || missingConstraints.length > 0;

    if (!needsMigration) {
      console.log('✅ Database is already up to date! Nothing to do.');
    } else {
      console.log('⚠️  Database needs migration!');
      console.log('\n📋 What will be added:');
      if (missingColumns.length > 0) {
        console.log(`   Columns: ${missingColumns.join(', ')}`);
      }
      if (missingIndexes.length > 0) {
        console.log(`   Indexes: ${missingIndexes.join(', ')}`);
      }
      if (missingConstraints.length > 0) {
        console.log(`   Constraints: ${missingConstraints.join(', ')}`);
      }

      console.log('\n🔧 To apply migration, run:');
      console.log('   npx tsx scripts/database/apply-migration-step-by-step.ts');
    }
    console.log('='.repeat(50) + '\n');

    await closePool();
  } catch (error) {
    console.error('❌ Error:', error);
    await closePool();
    process.exit(1);
  }
}

safeApplyMigration();
