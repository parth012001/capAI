/**
 * Run Composio Entity ID Fix Migration on NEON database
 * Fixes incorrectly stored connectedAccountIds in entity_id column
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file explicitly (not .env.local)
const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const NEON_DATABASE_URL = envConfig.DATABASE_URL;

if (!NEON_DATABASE_URL || !NEON_DATABASE_URL.includes('neon.tech')) {
  console.error('❌ ERROR: NEON_DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('🔍 Using Neon database URL:', NEON_DATABASE_URL.substring(0, 50) + '...\n');

const pool = new Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🔄 Running Composio Entity ID fix on NEON database...\n');

    // Show BEFORE state
    console.log('📊 BEFORE migration:');
    const beforeResult = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        composio_entity_id,
        composio_connected_account_id
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
    `);

    if (beforeResult.rows.length > 0) {
      beforeResult.rows.forEach(row => {
        console.log(`  User: ${row.gmail_address}`);
        console.log(`    composio_entity_id: ${row.composio_entity_id || 'NULL'}`);
        console.log(`    composio_connected_account_id: ${row.composio_connected_account_id || 'NULL'}`);
      });
    } else {
      console.log('  No Composio users found.');
    }

    console.log('\n🔧 Applying fix...\n');

    // Run migration
    const sqlPath = path.join(__dirname, 'fix_composio_entity_ids.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);

    // Show AFTER state
    console.log('📊 AFTER migration:');
    const afterResult = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        composio_entity_id,
        composio_connected_account_id
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
    `);

    if (afterResult.rows.length > 0) {
      afterResult.rows.forEach(row => {
        console.log(`  User: ${row.gmail_address}`);
        console.log(`    composio_entity_id: ${row.composio_entity_id} ✅`);
        console.log(`    composio_connected_account_id: ${row.composio_connected_account_id} ✅`);
      });
    }

    console.log('\n✅ Migration completed successfully!\n');

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
