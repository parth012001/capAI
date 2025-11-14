/**
 * Setup Composio Gmail Triggers for All Connected Users
 *
 * This script sets up Gmail triggers for all users who have connected
 * their accounts via Composio. Each user gets their own trigger that
 * monitors for new Gmail messages.
 *
 * Usage:
 *   npx tsx scripts/setup-composio-triggers.ts
 *
 * Environment Variables Required:
 *   COMPOSIO_API_KEY - Composio API key
 *   COMPOSIO_WEBHOOK_URL - Webhook endpoint URL (or defaults to production)
 */

import { ServiceFactory } from '../src/utils/serviceFactory';
import { queryWithRetry } from '../src/database/connection';
import { logger } from '../src/utils/pino-logger';

async function setupTriggersForAllUsers() {
  console.log('🔄 Setting up Composio Gmail triggers for all connected users...\n');

  try {
    // Get all users with Composio connected accounts
    const result = await queryWithRetry(`
      SELECT
        user_id,
        composio_connected_account_id,
        gmail_address,
        composio_connected_at,
        auth_method
      FROM user_gmail_tokens
      WHERE composio_connected_account_id IS NOT NULL
        AND auth_method = 'composio'
      ORDER BY composio_connected_at DESC
    `);

    const users = result.rows;

    if (users.length === 0) {
      console.log('⚠️  No users with Composio connections found.');
      console.log('   Users must connect via Composio before triggers can be set up.\n');
      process.exit(0);
    }

    console.log(`📊 Found ${users.length} user${users.length === 1 ? '' : 's'} with Composio connections\n`);

    // Get webhook URL from environment or use production default
    const webhookUrl = process.env.COMPOSIO_WEBHOOK_URL ||
                       'https://chief-production.up.railway.app/webhooks/composio';

    console.log(`🔗 Webhook URL: ${webhookUrl}\n`);
    console.log('─'.repeat(80));

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    // Set up trigger for each user
    for (const user of users) {
      try {
        console.log(`\n📧 Processing: ${user.gmail_address}`);
        console.log(`   User ID: ${user.user_id.substring(0, 12)}...`);
        console.log(`   Connected Account: ${user.composio_connected_account_id}`);

        // Create service container for this user
        const services = ServiceFactory.createForUser(user.user_id);
        const composio = services.getComposioService();

        // Set up Gmail trigger
        console.log('   ⏳ Setting up trigger...');
        const triggerId = await composio.setupGmailTrigger(
          user.composio_connected_account_id,
          webhookUrl
        );

        if (triggerId) {
          console.log(`   ✅ Trigger created successfully!`);
          console.log(`   📍 Trigger ID: ${triggerId}`);
          successCount++;
        } else {
          console.log(`   ⚠️  Trigger setup returned no ID (may already exist)`);
          successCount++;
        }

      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        failCount++;
        errors.push({
          email: user.gmail_address,
          error: error.message
        });

        // Log error details for debugging
        if (error.response?.data) {
          console.error(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '─'.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);

    if (errors.length > 0) {
      console.log('\n❌ Failed Users:');
      errors.forEach(({ email, error }) => {
        console.log(`   • ${email}: ${error}`);
      });
    }

    console.log('\n✅ Trigger setup complete!\n');

    // Log to Pino for production tracking
    logger.info({
      totalUsers: users.length,
      successCount,
      failCount,
      webhookUrl
    }, 'composio.triggers.bulk_setup.complete');

    process.exit(failCount > 0 ? 1 : 0);

  } catch (error: any) {
    console.error('\n💥 Fatal error:', error.message);
    console.error(error.stack);

    logger.error({
      error: error.message,
      stack: error.stack
    }, 'composio.triggers.bulk_setup.failed');

    process.exit(1);
  }
}

// Run the script
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         Composio Gmail Trigger Setup Script                  ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

setupTriggersForAllUsers();
