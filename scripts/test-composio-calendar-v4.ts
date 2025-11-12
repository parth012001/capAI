import dotenv from 'dotenv';
dotenv.config();

import { Composio } from 'composio-core';

async function testComposioCalendar() {
  console.log('🧪 Testing Composio Calendar Connection (v4 - with config object)...\n');

  try {
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY!
    });
    console.log('✓ Composio SDK initialized\n');

    const testUserId = 'test_user_' + Date.now();

    console.log('Test 1: Try with useComposioAuth=true...');
    try {
      const connection: any = await composio.connectedAccounts.initiate({
        integrationId: 'googlecalendar',
        entityId: testUserId,
        redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`,
        config: {
          useComposioAuth: true
        }
      });

      console.log('✅ SUCCESS with useComposioAuth=true!');
      console.log('  Redirect URL:', connection.redirectUrl);
      console.log('  Connection ID:', connection.connectionId || connection.id);
    } catch (error: any) {
      console.log('❌ Failed with useComposioAuth=true');
      console.log('   Error:', error.message);
      console.log('');

      // Try Test 2
      console.log('Test 2: Try with authConfigId...');
      const connection2: any = await composio.connectedAccounts.initiate({
        integrationId: 'googlecalendar',
        entityId: testUserId,
        redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`,
        config: {
          authConfigId: process.env.COMPOSIO_AUTH_CONFIG_ID
        }
      });

      console.log('✅ SUCCESS with authConfigId!');
      console.log('  Redirect URL:', connection2.redirectUrl);
      console.log('  Connection ID:', connection2.connectionId || connection2.id);
    }

  } catch (error: any) {
    console.error('\n❌ All tests failed!');
    console.error('Error:', error.message);
    console.error('Description:', error.description);
    process.exit(1);
  }
}

testComposioCalendar();
