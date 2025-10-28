/**
 * Run Composio database migration on NEON database
 * Forces use of Neon DATABASE_URL from .env, not .env.local
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file explicitly (not .env.local)
const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Extract Neon DATABASE_URL
const NEON_DATABASE_URL = envConfig.DATABASE_URL;

if (!NEON_DATABASE_URL || !NEON_DATABASE_URL.includes('neon.tech')) {
  console.error('❌ ERROR: NEON_DATABASE_URL not found in .env file');
  console.error('Expected URL containing "neon.tech" but got:', NEON_DATABASE_URL);
  process.exit(1);
}

console.log('🔍 Using Neon database URL:', NEON_DATABASE_URL.substring(0, 50) + '...');

// Create pool specifically for Neon database
const pool = new Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🔄 Running Composio migration on NEON database...\n');

    const sqlPath = path.join(__dirname, 'add_composio_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('\n✅ Migration completed successfully on NEON!');

    // Verify the change on NEON
    const result = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name = 'refresh_token_encrypted'
    `);

    console.log('\n📊 Verification - refresh_token_encrypted is now nullable on NEON:');
    console.log(result.rows[0]);

    // Check new columns exist on NEON
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name IN ('composio_entity_id', 'auth_method', 'migration_status', 'migrated_at')
      ORDER BY column_name
    `);

    console.log('\n📊 New Composio columns added on NEON:');
    columnsResult.rows.forEach(row => console.log(`  - ${row.column_name}`));

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed on NEON:', error.message);
    console.error('\nDetails:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
