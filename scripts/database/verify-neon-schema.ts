/**
 * Verify Neon database schema for Composio migration
 * Checks constraint status directly on Neon
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file explicitly (not .env.local)
const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const NEON_DATABASE_URL = envConfig.DATABASE_URL;

console.log('🔍 Connecting to Neon database...\n');

const pool = new Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifySchema() {
  try {
    // Check all columns and their nullable status
    const columnsResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      ORDER BY ordinal_position
    `);

    console.log('📊 user_gmail_tokens schema on NEON:\n');
    columnsResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '✅ NULL' : '❌ NOT NULL';
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${nullable}`);
    });

    // Check for NOT NULL constraints specifically on refresh_token_encrypted
    const constraintsResult = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        cc.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'user_gmail_tokens'
        AND cc.column_name = 'refresh_token_encrypted'
    `);

    console.log('\n📊 Constraints on refresh_token_encrypted:\n');
    if (constraintsResult.rows.length === 0) {
      console.log('  ✅ No constraints (column is nullable)');
    } else {
      constraintsResult.rows.forEach(row => {
        console.log(`  - ${row.constraint_type}: ${row.constraint_name}`);
      });
    }

    // Try inserting a test row with NULL refresh_token_encrypted
    console.log('\n🧪 Testing NULL insert (will rollback)...\n');

    await pool.query('BEGIN');
    try {
      await pool.query(`
        INSERT INTO user_gmail_tokens (
          user_id,
          refresh_token_encrypted,
          composio_entity_id,
          auth_method
        ) VALUES (
          'test_user_' || gen_random_uuid()::text,
          NULL,
          'test_entity_' || gen_random_uuid()::text,
          'composio'
        )
      `);
      console.log('  ✅ NULL insert successful - constraint is gone!');
      await pool.query('ROLLBACK');
    } catch (error: any) {
      await pool.query('ROLLBACK');
      console.log('  ❌ NULL insert failed - constraint still exists!');
      console.log('  Error:', error.message);
    }

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifySchema();
