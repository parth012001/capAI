/**
 * Test Composio Webhook Delivery
 *
 * This script helps test the Composio webhook endpoint by providing
 * instructions for manual testing. Since we can't trigger Composio
 * webhooks programmatically, this guides the testing process.
 *
 * Usage:
 *   npx tsx scripts/test-composio-webhook.ts <userId>
 *
 * Example:
 *   npx tsx scripts/test-composio-webhook.ts user_abc123
 */

import { queryWithRetry } from '../src/database/connection';
import { logger } from '../src/utils/pino-logger';

async function testComposioWebhook() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Composio Webhook Delivery Test                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const userId = process.argv[2];
  if (!userId) {
    console.error('❌ Error: Please provide a userId as argument');
    console.log('Usage: npx tsx scripts/test-composio-webhook.ts <userId>');
    process.exit(1);
  }

  try {
    // Verify user exists and has Composio connection
    console.log(`📋 Checking user: ${userId}\n`);

    const userResult = await queryWithRetry(
      `SELECT
        user_id,
        gmail_address,
        composio_connected_account_id,
        auth_method,
        migration_status
      FROM user_gmail_tokens
      WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found in database');
      process.exit(1);
    }

    const user = userResult.rows[0];

    console.log('👤 User Details:');
    console.log(`   Email: ${user.gmail_address}`);
    console.log(`   Auth Method: ${user.auth_method || 'google_oauth'}`);
    console.log(`   Migration Status: ${user.migration_status || 'pending'}`);
    console.log(`   Connected Account: ${user.composio_connected_account_id || 'Not connected'}\n`);

    if (!user.composio_connected_account_id) {
      console.log('⚠️  User is not connected via Composio');
      console.log('   Please connect via: POST /api/integrations/gmail/connect');
      process.exit(1);
    }

    // Check webhook URL configuration
    const webhookUrl = process.env.COMPOSIO_WEBHOOK_URL ||
                       'https://chief-production.up.railway.app/webhooks/composio';

    console.log('🔗 Webhook Configuration:');
    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Endpoint: POST /webhooks/composio\n`);

    // Provide testing instructions
    console.log('─'.repeat(80));
    console.log('\n🧪 Test Instructions:\n');

    console.log('1. 📧 Send a test email to your Gmail account');
    console.log(`   • To: ${user.gmail_address}`);
    console.log('   • Subject: Test Composio Webhook');
    console.log('   • Body: This is a test email for Composio webhook delivery\n');

    console.log('2. ⏱️  Wait up to 60 seconds');
    console.log('   • Composio triggers use polling (60-second interval)');
    console.log('   • Webhook should fire within 1 minute of email arrival\n');

    console.log('3. 📊 Check Railway logs for webhook receipt:');
    console.log('   • Look for log entry: webhook.composio.received');
    console.log('   • Check for: webhook.composio.notification_parsed');
    console.log('   • Verify: webhook.composio.processing_complete\n');

    console.log('4. ✅ Verify email processing:');
    console.log('   • Check: webhook.email.processing_start');
    console.log('   • Check: gmail.emails.fetched');
    console.log('   • Check: router.email.routing\n');

    console.log('─'.repeat(80));
    console.log('\n📝 Expected Log Sequence:\n');

    const expectedLogs = [
      { level: 'INFO', message: 'webhook.composio.received', desc: 'Webhook received from Composio' },
      { level: 'INFO', message: 'webhook.composio.notification_parsed', desc: 'Payload parsed successfully' },
      { level: 'DEBUG', message: 'webhook.composio.lock_acquired', desc: 'Deduplication lock acquired' },
      { level: 'DEBUG', message: 'webhook.composio.user.processing_start', desc: 'Processing started for user' },
      { level: 'INFO', message: 'webhook.email.processing_start', desc: 'Email fetch initiated' },
      { level: 'INFO', message: 'gmail.emails.fetched', desc: 'Emails fetched via provider' },
      { level: 'INFO', message: 'router.email.routing', desc: 'Email routed through pipeline' },
      { level: 'INFO', message: 'webhook.composio.processing_complete', desc: 'Webhook fully processed' }
    ];

    expectedLogs.forEach((log, index) => {
      const icon = log.level === 'INFO' ? '📘' : '🔍';
      console.log(`   ${index + 1}. ${icon} [${log.level.padEnd(5)}] ${log.message}`);
      console.log(`      → ${log.desc}`);
    });

    console.log('\n─'.repeat(80));
    console.log('\n🚨 Troubleshooting:\n');

    console.log('If webhook doesn\'t fire:');
    console.log('   • Verify trigger setup: npx tsx scripts/setup-composio-triggers.ts');
    console.log('   • Check Composio dashboard for active triggers');
    console.log('   • Verify webhook URL is publicly accessible');
    console.log('   • Check Railway deployment logs for errors\n');

    console.log('If webhook fires but processing fails:');
    console.log('   • Check error logs in Railway');
    console.log('   • Verify EmailProvider.fetchEmails() works');
    console.log('   • Test manually: POST /api/integrations/test/fetch-emails');
    console.log('   • Check database permissions\n');

    console.log('─'.repeat(80));
    console.log('\n✅ Test prepared! Now send an email and watch the logs.\n');

    // Log to Pino for tracking
    logger.info({
      userId,
      gmailAddress: user.gmail_address,
      webhookUrl
    }, 'composio.webhook.test.prepared');

  } catch (error: any) {
    console.error('\n❌ Test preparation failed:', error.message);
    console.error(error.stack);

    logger.error({
      userId,
      error: error.message
    }, 'composio.webhook.test.failed');

    process.exit(1);
  }
}

// Run the test preparation
testComposioWebhook().then(() => {
  process.exit(0);
});
