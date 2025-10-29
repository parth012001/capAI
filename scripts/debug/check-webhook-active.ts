/**
 * Check webhook_active status for Composio user
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

async function checkWebhookStatus() {
  try {
    console.log('🔍 Checking webhook_active status...\n');

    const result = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        auth_method,
        webhook_active,
        composio_entity_id,
        composio_connected_account_id,
        onboarding_completed
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
      ORDER BY composio_connected_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Composio user found\n');
      process.exit(1);
    }

    const user = result.rows[0];

    console.log('📊 User Status:');
    console.log('=' .repeat(60));
    console.log(`Email: ${user.gmail_address}`);
    console.log(`User ID: ${user.user_id}`);
    console.log(`Auth Method: ${user.auth_method}`);
    console.log(`Webhook Active: ${user.webhook_active} ⚠️`);
    console.log(`Onboarding Completed: ${user.onboarding_completed}`);
    console.log(`Entity ID: ${user.composio_entity_id}`);
    console.log(`Connected Account ID: ${user.composio_connected_account_id}`);
    console.log('=' .repeat(60));

    if (!user.webhook_active) {
      console.log('\n❌ PROBLEM FOUND: webhook_active is FALSE');
      console.log('   This is why auth middleware is rejecting requests!\n');
      console.log('💡 Solution: Set webhook_active to TRUE');
      console.log('   Run: npx tsx scripts/debug/fix-webhook-active.ts\n');
    } else {
      console.log('\n✅ webhook_active is TRUE - no issue here\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkWebhookStatus();
