/**
 * Fix webhook_active for Composio users
 * Set webhook_active=true for all Composio users
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

async function fixWebhookActive() {
  try {
    console.log('🔧 Fixing webhook_active for Composio users...\n');

    // First, show current status
    const before = await pool.query(`
      SELECT user_id, gmail_address, auth_method, webhook_active
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
    `);

    console.log('📊 Current Status:');
    console.log('=' .repeat(60));
    before.rows.forEach(user => {
      console.log(`${user.gmail_address}: webhook_active = ${user.webhook_active}`);
    });
    console.log('=' .repeat(60));

    // Update webhook_active to true for all Composio users
    const result = await pool.query(`
      UPDATE user_gmail_tokens
      SET webhook_active = true,
          updated_at = NOW()
      WHERE auth_method = 'composio'
        AND webhook_active = false
      RETURNING user_id, gmail_address
    `);

    if (result.rowCount === 0) {
      console.log('\n✅ All Composio users already have webhook_active = true\n');
    } else {
      console.log(`\n✅ Fixed ${result.rowCount} Composio user(s):\n`);
      result.rows.forEach(user => {
        console.log(`   - ${user.gmail_address}`);
      });
      console.log('\n💡 Now restart your server: npm run dev\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixWebhookActive();
