/**
 * Check Composio trigger status and configuration
 */

import { Composio } from '@composio/core';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';

const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const pool = new Pool({
  connectionString: envConfig.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTriggerStatus() {
  try {
    console.log('🔍 Checking Composio trigger status...\n');

    const composio = new Composio({
      apiKey: envConfig.COMPOSIO_API_KEY!
    });

    // Get user from database
    const result = await pool.query(`
      SELECT user_id, gmail_address, composio_entity_id, composio_connected_account_id
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
    console.log('📧 User:', user.gmail_address);
    console.log('🆔 Entity ID:', user.composio_entity_id);
    console.log('🔗 Connected Account:', user.composio_connected_account_id);
    console.log('');

    // List all active triggers
    console.log('📋 Fetching active triggers...\n');
    const triggersResponse = await composio.triggers.listActive();

    console.log(`Found ${triggersResponse.items.length} total active trigger(s)\n`);

    if (triggersResponse.items.length === 0) {
      console.log('❌ NO ACTIVE TRIGGERS FOUND!');
      console.log('   This is why webhooks are not working.\n');
      console.log('💡 Solution: Run the trigger setup again');
      console.log('   npx tsx scripts/composio/setup-trigger.ts\n');
      process.exit(1);
    }

    // Find triggers for this user
    const userTriggers = triggersResponse.items.filter(
      (t: any) => t.connectedAccountId === user.composio_connected_account_id
    );

    if (userTriggers.length === 0) {
      console.log('⚠️  NO TRIGGERS found for this user!');
      console.log(`   Connected Account: ${user.composio_connected_account_id}`);
      console.log('');
      console.log('All triggers in system:');
      triggersResponse.items.forEach((t: any) => {
        console.log(`   - ${t.id}: ${t.triggerName} (${t.connectedAccountId})`);
      });
      console.log('');
      console.log('💡 Solution: Create trigger for this user');
      console.log('   Run: npx tsx scripts/composio/update-webhook-url.ts\n');
      process.exit(1);
    }

    console.log('✅ Found triggers for this user:\n');
    userTriggers.forEach((trigger: any) => {
      console.log(`📍 Trigger ID: ${trigger.id}`);
      console.log(`   Name: ${trigger.triggerName}`);
      console.log(`   Connected Account: ${trigger.connectedAccountId}`);
      console.log(`   Webhook URL: ${(trigger.triggerConfig as any)?.webhookUrl || 'N/A'}`);
      console.log(`   Status: ${trigger.disabledAt ? '❌ DISABLED' : '✅ ACTIVE'}`);
      console.log(`   Updated: ${trigger.updatedAt}`);
      console.log('');
    });

    // Check Gmail trigger specifically
    const gmailTrigger = userTriggers.find((t: any) => t.triggerName === 'gmail_new_gmail_message');

    if (!gmailTrigger) {
      console.log('⚠️  No Gmail trigger found!');
      console.log('   User needs gmail_new_gmail_message trigger\n');
    } else {
      const webhookUrl = (gmailTrigger.triggerConfig as any)?.webhookUrl;
      const expectedUrl = `${envConfig.WEBHOOK_DOMAIN}/webhooks/composio`;

      console.log('📨 Gmail Trigger Check:');
      console.log(`   Trigger ID: ${gmailTrigger.id}`);
      console.log(`   Status: ${gmailTrigger.disabledAt ? '❌ DISABLED' : '✅ ACTIVE'}`);
      console.log(`   Webhook URL: ${webhookUrl}`);
      console.log(`   Expected URL: ${expectedUrl}`);

      if (webhookUrl !== expectedUrl) {
        console.log('');
        console.log('⚠️  Webhook URL MISMATCH!');
        console.log('   The trigger is pointing to the wrong URL.');
        console.log('   Run: npx tsx scripts/composio/update-webhook-url.ts\n');
      } else if (gmailTrigger.disabledAt) {
        console.log('');
        console.log('❌ Trigger is DISABLED!');
        console.log('   This is why webhooks are not working.\n');
      } else {
        console.log('');
        console.log('✅ Gmail trigger is configured correctly!');
        console.log('');
        console.log('💡 If webhooks still not working:');
        console.log('   1. Check if ngrok is running');
        console.log('   2. Test webhook endpoint: curl -X POST http://localhost:3000/webhooks/composio');
        console.log('   3. Check Composio dashboard for webhook delivery logs');
        console.log('   4. Verify trigger in Composio dashboard: https://app.composio.dev/');
        console.log('');
      }
    }

    // Check connected account status
    console.log('🔗 Checking connected account...\n');
    const connection = await composio.connectedAccounts.get(user.composio_connected_account_id);

    console.log('Connected Account Status:');
    console.log(`   Status: ${connection.status}`);
    console.log(`   Integration: ${connection.toolkit.slug}`);
    console.log(`   Created: ${connection.createdAt}`);
    console.log('');

    if (connection.status !== 'ACTIVE') {
      console.log('❌ Connected account is NOT ACTIVE!');
      console.log('   This might be why webhooks are not working.');
      console.log('   User needs to reconnect their account.\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkTriggerStatus();
