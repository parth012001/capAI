/**
 * Run Composio database migration
 * Adds support for Composio authentication alongside legacy Google OAuth
 */

import { pool } from '../../src/database/connection';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running Composio migration...\n');

    const sqlPath = path.join(__dirname, 'add_composio_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('\n✅ Migration completed successfully!');

    // Verify the change
    const result = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name = 'refresh_token_encrypted'
    `);

    console.log('\n📊 Verification - refresh_token_encrypted is now nullable:');
    console.log(result.rows[0]);

    // Check new columns exist
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      AND column_name IN ('composio_entity_id', 'auth_method', 'migration_status', 'migrated_at')
      ORDER BY column_name
    `);

    console.log('\n📊 New Composio columns added:');
    columnsResult.rows.forEach(row => console.log(`  - ${row.column_name}`));

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

runMigration();
