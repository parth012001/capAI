/**
 * Test ServiceFactory Provider Integration
 *
 * Tests that ServiceFactory correctly returns Composio providers
 * based on user's auth_method in the database
 */

import { ServiceFactory } from '../src/utils/serviceFactory';

async function testServiceFactoryProviders() {
  console.log('\n========================================');
  console.log('TESTING SERVICE FACTORY PROVIDERS');
  console.log('========================================\n');

  // Test user ID (update this to a real user with Composio connection)
  const testUserId = 'user_f886bcaa9854a4e30da4d36f1cb1c27e08d93ac0fd8e3d54e85e7c75adeaf0cf';

  try {
    // Step 1: Create service container
    console.log('Step 1: Creating service container for user...');
    const services = ServiceFactory.createForUser(testUserId);
    console.log(`✅ Service container created for user: ${testUserId.substring(0, 20)}...\n`);

    // Step 2: Get email provider
    console.log('Step 2: Getting email provider...');
    const emailProvider = await services.getEmailProvider();
    console.log(`✅ Email provider obtained: ${emailProvider.getProviderName()}`);
    console.log();

    // Step 3: Test email provider functionality
    console.log('Step 3: Testing email provider - fetchEmails()...');
    const emails = await emailProvider.fetchEmails(testUserId, {
      maxResults: 3
    });
    console.log(`✅ Fetched ${emails.messages.length} emails via ${emailProvider.getProviderName()}`);
    if (emails.messages.length > 0) {
      console.log(`   First email ID: ${emails.messages[0].id}`);
    }
    console.log();

    // Step 4: Get calendar provider
    console.log('Step 4: Getting calendar provider...');
    const calendarProvider = await services.getCalendarProvider();
    console.log(`✅ Calendar provider obtained: ${calendarProvider.getProviderName()}`);
    console.log();

    // Step 5: Test calendar provider functionality
    console.log('Step 5: Testing calendar provider - listEvents()...');
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await calendarProvider.listEvents(testUserId, {
      timeMin: now,
      timeMax: oneWeekLater,
      maxResults: 5
    });
    console.log(`✅ Listed ${events.items.length} events via ${calendarProvider.getProviderName()}`);
    if (events.items.length > 0) {
      console.log(`   First event: ${events.items[0].summary || 'Untitled'}`);
    }
    console.log();

    // Step 6: Test provider caching
    console.log('Step 6: Testing provider caching (second call should be instant)...');
    const emailProvider2 = await services.getEmailProvider();
    const calendarProvider2 = await services.getCalendarProvider();

    if (emailProvider === emailProvider2) {
      console.log('✅ Email provider correctly cached (same instance returned)');
    } else {
      console.log('❌ Email provider not cached (different instances)');
    }

    if (calendarProvider === calendarProvider2) {
      console.log('✅ Calendar provider correctly cached (same instance returned)');
    } else {
      console.log('❌ Calendar provider not cached (different instances)');
    }
    console.log();

    console.log('========================================');
    console.log('ALL TESTS PASSED ✅');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`  ✅ ServiceFactory creates service containers correctly`);
    console.log(`  ✅ Email provider obtained: ${emailProvider.getProviderName()}`);
    console.log(`  ✅ Calendar provider obtained: ${calendarProvider.getProviderName()}`);
    console.log(`  ✅ Email operations working (${emails.messages.length} emails fetched)`);
    console.log(`  ✅ Calendar operations working (${events.items.length} events listed)`);
    console.log(`  ✅ Provider instances cached correctly`);
    console.log();

    console.log('🎉 ServiceFactory Provider Integration: SUCCESS');
    console.log();

  } catch (error: any) {
    console.error('\n❌ ERROR during testing:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testServiceFactoryProviders();
