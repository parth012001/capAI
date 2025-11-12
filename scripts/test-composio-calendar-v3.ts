import dotenv from 'dotenv';
dotenv.config();

import { Composio } from 'composio-core';

async function testComposioCalendar() {
  console.log('🧪 Testing Composio Calendar Connection (v3 - without authConfig)...\n');

  try {
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY!
    });
    console.log('✓ Composio SDK initialized\n');

    const testUserId = 'test_user_' + Date.now();

    console.log('Test: Initiating Calendar connection...');
    const connection: any = await composio.connectedAccounts.initiate({
      integrationId: 'googlecalendar',
      entityId: testUserId,
      redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`
    });

    console.log('✅ SUCCESS! Calendar connection initiated!');
    console.log('  Redirect URL:', connection.redirectUrl);
    console.log('  Connection ID:', connection.connectionId || connection.id);
    console.log('\n✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed!');
    console.error('Error:', error.message);
    console.error('Description:', error.description);
    process.exit(1);
  }
}

testComposioCalendar();
