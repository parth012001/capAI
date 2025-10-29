/**
 * Update Composio webhook URL for existing trigger
 * Run this whenever ngrok URL changes
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

async function updateWebhookUrl() {
  try {
    console.log('🔄 Updating Composio webhook URL...\n');

    const composio = new Composio({
      apiKey: envConfig.COMPOSIO_API_KEY!
    });

    const newWebhookUrl = `${envConfig.WEBHOOK_DOMAIN}/webhooks/composio`;
    console.log(`New webhook URL: ${newWebhookUrl}\n`);

    // Get user's entity ID from database
    const result = await pool.query(`
      SELECT composio_entity_id, composio_connected_account_id, gmail_address
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
      ORDER BY composio_connected_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Composio user found in database');
      process.exit(1);
    }

    const { composio_entity_id, composio_connected_account_id, gmail_address } = result.rows[0];

    console.log(`User: ${gmail_address}`);
    console.log(`Entity ID: ${composio_entity_id}`);
    console.log(`Connected Account ID: ${composio_connected_account_id}\n`);

    // List existing triggers
    // Per SDK docs: client.triggers.listActive() returns all active triggers
    console.log('📋 Fetching existing triggers...');
    const triggersResponse = await composio.triggers.listActive();

    console.log(`Found ${triggersResponse.items.length} total trigger(s)\n`);

    // Find Gmail trigger for this specific connected account
    const gmailTrigger = triggersResponse.items.find(
      (t: any) =>
        t.triggerName === 'gmail_new_gmail_message' &&
        t.connectedAccountId === composio_connected_account_id
    );

    if (!gmailTrigger) {
      console.log('⚠️  No Gmail trigger found for this account. Creating new one...');

      const newTrigger = await composio.triggers.create(
        composio_entity_id,
        'gmail_new_gmail_message',
        {
          connectedAccountId: composio_connected_account_id,
          triggerConfig: {
            webhookUrl: newWebhookUrl
          }
        }
      );

      console.log('✅ Trigger created successfully!');
      console.log(`   Trigger ID: ${newTrigger.triggerId}`);
      console.log(`   Webhook URL: ${newWebhookUrl}`);
    } else {
      console.log(`📍 Found existing trigger: ${gmailTrigger.id}`);
      console.log(`   Connected Account: ${gmailTrigger.connectedAccountId}`);
      console.log(`   Current webhook: ${(gmailTrigger.triggerConfig as any)?.webhookUrl || 'N/A'}\n`);

      // Delete old trigger
      console.log('🗑️  Deleting old trigger...');
      await composio.triggers.delete(gmailTrigger.id);
      console.log('✅ Old trigger deleted\n');

      // Create new trigger with updated webhook URL
      console.log('🆕 Creating new trigger with updated webhook URL...');
      const newTrigger = await composio.triggers.create(
        composio_entity_id,
        'gmail_new_gmail_message',
        {
          connectedAccountId: composio_connected_account_id,
          triggerConfig: {
            webhookUrl: newWebhookUrl
          }
        }
      );

      console.log('✅ Trigger updated successfully!');
      console.log(`   New Trigger ID: ${newTrigger.triggerId}`);
      console.log(`   Webhook URL: ${newWebhookUrl}`);
    }

    console.log('\n✅ Done! Webhook URL updated successfully.\n');
    console.log('💡 Now restart your server: npm run dev\n');

  } catch (error: any) {
    console.error('❌ Error updating webhook URL:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateWebhookUrl();
