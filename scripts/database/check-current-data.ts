/**
 * Check what data we currently have in the database
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const NEON_DATABASE_URL = envConfig.DATABASE_URL;

const pool = new Pool({
  connectionString: NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    console.log('🔍 Checking current Composio data in database...\n');

    const result = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        composio_entity_id,
        composio_connected_account_id,
        auth_method,
        created_at
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('ℹ️  No Composio users found yet.\n');
    } else {
      console.log(`📊 Found ${result.rows.length} Composio user(s):\n`);
      result.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. User: ${row.gmail_address}`);
        console.log(`   user_id: ${row.user_id}`);
        console.log(`   composio_entity_id: ${row.composio_entity_id || 'NULL'}`);
        console.log(`   composio_connected_account_id: ${row.composio_connected_account_id || 'NULL'}`);
        console.log(`   created_at: ${row.created_at}`);
        console.log('');
      });
    }

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkData();
