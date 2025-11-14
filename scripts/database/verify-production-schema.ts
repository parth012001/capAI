/**
 * Verify Production Database Schema - Composio Migration Phase 0
 *
 * This script connects to the production database and verifies:
 * 1. What columns actually exist in user_gmail_tokens table
 * 2. Which Composio-related columns are present
 * 3. What indexes exist
 * 4. Generates a report of the current schema state
 */

import { pool, queryWithRetry } from '../../src/database/connection';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

async function verifyProductionSchema() {
  console.log('\n========================================');
  console.log('PRODUCTION SCHEMA VERIFICATION');
  console.log('========================================\n');

  try {
    // Step 1: Verify user_gmail_tokens table exists
    console.log('Step 1: Checking if user_gmail_tokens table exists...');
    const tableCheck = await queryWithRetry(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_gmail_tokens'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ ERROR: user_gmail_tokens table does NOT exist!');
      process.exit(1);
    }
    console.log('✅ user_gmail_tokens table exists\n');

    // Step 2: Get all columns in user_gmail_tokens
    console.log('Step 2: Fetching all columns in user_gmail_tokens...');
    const columnsResult = await queryWithRetry(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_gmail_tokens'
      ORDER BY ordinal_position;
    `);

    const columns: ColumnInfo[] = columnsResult.rows;
    console.log(`Found ${columns.length} columns:\n`);

    // Print all columns in a formatted table
    console.log('┌─────────────────────────────────────┬─────────────────┬──────────┬──────────────────┐');
    console.log('│ Column Name                         │ Data Type       │ Nullable │ Default          │');
    console.log('├─────────────────────────────────────┼─────────────────┼──────────┼──────────────────┤');

    columns.forEach(col => {
      const name = col.column_name.padEnd(35);
      const type = col.data_type.padEnd(15);
      const nullable = col.is_nullable.padEnd(8);
      const defaultVal = (col.column_default || 'NULL').substring(0, 16).padEnd(16);
      console.log(`│ ${name} │ ${type} │ ${nullable} │ ${defaultVal} │`);
    });
    console.log('└─────────────────────────────────────┴─────────────────┴──────────┴──────────────────┘\n');

    // Step 3: Check for Composio-specific columns
    console.log('Step 3: Checking for Composio-related columns...');
    const composioColumns = [
      'composio_entity_id',
      'composio_connected_account_id',
      'composio_connected_at',
      'auth_method',
      'migration_status',
      'migrated_at'
    ];

    const existingComposioColumns = columns
      .map(c => c.column_name)
      .filter(name => composioColumns.includes(name));

    const missingComposioColumns = composioColumns
      .filter(name => !columns.find(c => c.column_name === name));

    console.log('\n✅ Existing Composio columns:');
    if (existingComposioColumns.length > 0) {
      existingComposioColumns.forEach(col => {
        const colInfo = columns.find(c => c.column_name === col);
        console.log(`   - ${col} (${colInfo?.data_type})`);
      });
    } else {
      console.log('   (none)');
    }

    console.log('\n❌ Missing Composio columns:');
    if (missingComposioColumns.length > 0) {
      missingComposioColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('   (none)');
    }

    // Step 4: Check for indexes
    console.log('\n\nStep 4: Checking indexes on user_gmail_tokens...');
    const indexesResult = await queryWithRetry(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'user_gmail_tokens'
      ORDER BY indexname;
    `);

    const indexes: IndexInfo[] = indexesResult.rows;
    console.log(`Found ${indexes.length} indexes:\n`);

    indexes.forEach(idx => {
      console.log(`   ${idx.indexname}:`);
      console.log(`   ${idx.indexdef}\n`);
    });

    // Step 5: Check for Composio-specific indexes
    const composioIndexes = indexes.filter(idx =>
      idx.indexname.includes('composio') ||
      idx.indexdef.toLowerCase().includes('composio')
    );

    if (composioIndexes.length > 0) {
      console.log('✅ Composio-related indexes found:');
      composioIndexes.forEach(idx => console.log(`   - ${idx.indexname}`));
    } else {
      console.log('⚠️  No Composio-specific indexes found');
    }

    // Step 6: Count records and check data
    console.log('\n\nStep 5: Checking data in table...');
    const countResult = await queryWithRetry(`
      SELECT COUNT(*) as total FROM user_gmail_tokens;
    `);
    const totalUsers = parseInt(countResult.rows[0].total);
    console.log(`Total users in database: ${totalUsers}`);

    if (totalUsers > 0 && existingComposioColumns.length > 0) {
      const dataCheckResult = await queryWithRetry(`
        SELECT
          COUNT(*) as total,
          COUNT(composio_entity_id) as with_entity_id,
          COUNT(composio_connected_account_id) as with_account_id,
          COUNT(CASE WHEN auth_method = 'composio' THEN 1 END) as using_composio,
          COUNT(CASE WHEN auth_method = 'google_oauth' THEN 1 END) as using_google
        FROM user_gmail_tokens;
      `);

      const stats = dataCheckResult.rows[0];
      console.log(`\nUser Statistics:`);
      console.log(`   - Users with composio_entity_id: ${stats.with_entity_id || 0}`);
      console.log(`   - Users with composio_connected_account_id: ${stats.with_account_id || 0}`);
      console.log(`   - Users using Composio auth: ${stats.using_composio || 0}`);
      console.log(`   - Users using Google OAuth auth: ${stats.using_google || 0}`);
    }

    // Step 7: Generate migration recommendations
    console.log('\n\n========================================');
    console.log('MIGRATION RECOMMENDATIONS');
    console.log('========================================\n');

    if (missingComposioColumns.length === 0) {
      console.log('✅ All Composio columns already exist!');
      console.log('   No schema migration needed.');
      console.log('   You can proceed directly to Phase 1 (Composio documentation review).\n');
    } else {
      console.log('⚠️  Some Composio columns are missing.');
      console.log('   You need to run a migration script to add:\n');
      missingComposioColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n   Migration script: scripts/database/add-missing-composio-columns.ts');
    }

    // Step 8: Generate schema documentation
    console.log('\n\n========================================');
    console.log('SCHEMA DOCUMENTATION (for CLAUDE.md)');
    console.log('========================================\n');

    console.log('```sql');
    console.log('CREATE TABLE user_gmail_tokens (');
    columns.forEach((col, idx) => {
      const comma = idx < columns.length - 1 ? ',' : '';
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : '';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`    ${col.column_name} ${col.data_type.toUpperCase()} ${nullable}${defaultVal}${comma}`);
    });
    console.log(');');
    console.log('```\n');

    console.log('========================================');
    console.log('VERIFICATION COMPLETE');
    console.log('========================================\n');

  } catch (error: any) {
    console.error('\n❌ Error during schema verification:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
verifyProductionSchema();
