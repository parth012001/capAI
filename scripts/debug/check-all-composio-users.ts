/**
 * Check all Composio users in database
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const pool = new Pool({
  connectionString: envConfig.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAllUsers() {
  try {
    console.log('🔍 Checking ALL Composio users...\n');

    const result = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        auth_method,
        webhook_active,
        composio_entity_id,
        composio_connected_account_id,
        migrated_at,
        created_at
      FROM user_gmail_tokens
      WHERE auth_method = 'composio' OR composio_entity_id IS NOT NULL
      ORDER BY migrated_at DESC NULLS LAST
    `);

    console.log(`Found ${result.rows.length} user(s) with Composio data:\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.user_id.substring(0, 16)}...`);
      console.log(`   Email: ${user.gmail_address}`);
      console.log(`   Auth Method: ${user.auth_method}`);
      console.log(`   Webhook Active: ${user.webhook_active} ${!user.webhook_active ? '❌' : '✅'}`);
      console.log(`   Entity ID: ${user.composio_entity_id || 'NULL'}`);
      console.log(`   Connected Account: ${user.composio_connected_account_id || 'NULL'}`);
      console.log(`   Migrated At: ${user.migrated_at || 'NULL'}`);
      console.log(`   Created At: ${user.created_at}`);
      console.log('');
    });

    // Check for the specific user ID from logs
    const legacyUserId = '09d94485bd9a445d373044011f7cdc2b';
    const legacyUser = result.rows.find(u => u.user_id === legacyUserId);

    if (legacyUser) {
      console.log(`⚠️  Found user from OAuth logs: ${legacyUserId}`);
      console.log(`   Webhook Active: ${legacyUser.webhook_active}\n`);
    } else {
      console.log(`⚠️  User ID ${legacyUserId} from OAuth logs NOT FOUND\n`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAllUsers();
