/**
 * Fix webhook URL for existing trigger
 * The trigger exists but has no webhook URL configured
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

async function fixWebhookUrl() {
  try {
    console.log('🔧 Fixing webhook URL for existing trigger...\n');

    const composio = new Composio({
      apiKey: envConfig.COMPOSIO_API_KEY!
    });

    const webhookUrl = `${envConfig.WEBHOOK_DOMAIN}/webhooks/composio`;
    console.log(`Target webhook URL: ${webhookUrl}\n`);

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
    const triggersResponse = await composio.triggers.listActive();

    // Find triggers for this user
    const userTriggers = triggersResponse.items.filter(
      (t: any) => t.connectedAccountId === user.composio_connected_account_id
    );

    if (userTriggers.length === 0) {
      console.log('❌ No triggers found for this user');
      console.log('   Creating new trigger...\n');

      // Create new trigger with webhook URL
      const newTrigger = await composio.triggers.create(
        user.composio_entity_id,
        'gmail_new_gmail_message',
        {
          connectedAccountId: user.composio_connected_account_id,
          triggerConfig: {
            webhookUrl: webhookUrl
          }
        }
      );

      console.log('✅ Trigger created successfully!');
      console.log(`   Trigger ID: ${newTrigger.triggerId}`);
      console.log(`   Webhook URL: ${webhookUrl}`);
      console.log('');
      process.exit(0);
    }

    console.log(`Found ${userTriggers.length} trigger(s) for this user\n`);

    // Delete old triggers and create new one
    for (const trigger of userTriggers) {
      console.log(`🗑️  Deleting trigger ${trigger.id}...`);
      await composio.triggers.delete(trigger.id);
      console.log('   ✅ Deleted\n');
    }

    // Create new trigger with correct webhook URL
    console.log('🆕 Creating new trigger with webhook URL...\n');

    const newTrigger = await composio.triggers.create(
      user.composio_entity_id,
      'gmail_new_gmail_message',
      {
        connectedAccountId: user.composio_connected_account_id,
        triggerConfig: {
          webhookUrl: webhookUrl
        }
      }
    );

    console.log('✅ Trigger created successfully!');
    console.log(`   Trigger ID: ${newTrigger.triggerId}`);
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log('');

    // Verify the trigger was created correctly
    console.log('🔍 Verifying trigger...\n');
    const verifyResponse = await composio.triggers.listActive();
    const verifyTrigger = verifyResponse.items.find(
      (t: any) => t.connectedAccountId === user.composio_connected_account_id
    );

    if (verifyTrigger) {
      const configuredUrl = (verifyTrigger.triggerConfig as any)?.webhookUrl;
      console.log('Verification:');
      console.log(`   Trigger ID: ${verifyTrigger.id}`);
      console.log(`   Webhook URL: ${configuredUrl || 'N/A'}`);
      console.log(`   Status: ${verifyTrigger.disabledAt ? '❌ DISABLED' : '✅ ACTIVE'}`);
      console.log('');

      if (configuredUrl === webhookUrl) {
        console.log('✅ Webhook URL is correctly configured!');
        console.log('');
        console.log('💡 Now send yourself an email to test:\n');
        console.log(`   1. Send email to: ${user.gmail_address}`);
        console.log('   2. Watch backend logs for webhook');
        console.log('   3. Check dashboard for new draft\n');
      } else {
        console.log('⚠️  Webhook URL still not set correctly!');
        console.log(`   Expected: ${webhookUrl}`);
        console.log(`   Got: ${configuredUrl || 'N/A'}`);
        console.log('');
        console.log('💡 You may need to configure this manually in Composio dashboard:');
        console.log('   https://app.composio.dev/\n');
      }
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

fixWebhookUrl();
