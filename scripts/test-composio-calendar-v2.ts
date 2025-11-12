import dotenv from 'dotenv';
dotenv.config();

import { Composio } from 'composio-core';

async function testComposioCalendar() {
  console.log('🧪 Testing Composio Calendar Connection (v2)...\n');

  console.log('Environment Check:');
  console.log('✓ COMPOSIO_API_KEY:', process.env.COMPOSIO_API_KEY ? `${process.env.COMPOSIO_API_KEY.slice(0, 10)}...` : '❌ NOT SET');
  console.log('✓ COMPOSIO_AUTH_CONFIG_ID:', process.env.COMPOSIO_AUTH_CONFIG_ID || '❌ NOT SET');
  console.log('✓ FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET');
  console.log('');

  try {
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY!
    });
    console.log('✓ Composio SDK initialized');
    console.log('  Available methods:', Object.keys(composio).filter(k => typeof (composio as any)[k] === 'object'));
    console.log('');

    // Test: Initiate Calendar Connection (entity will be auto-created)
    console.log('Test: Initiating Calendar connection...');
    const testUserId = 'test_user_' + Date.now();

    try {
      const connection: any = await composio.connectedAccounts.initiate({
        integrationId: 'googlecalendar',
        entityId: testUserId,
        redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`,
        authConfig: process.env.COMPOSIO_AUTH_CONFIG_ID
      });

      console.log('✅ Calendar connection initiated successfully!');
      console.log('  Redirect URL:', connection.redirectUrl);
      console.log('  Connection ID:', connection.connectionId || connection.id);
      console.log('\n✅ Test passed! Calendar integration is working.');
    } catch (error: any) {
      console.error('❌ Calendar connection failed!');
      console.error('   Error message:', error.message);
      console.error('   Error response:', JSON.stringify(error?.response?.data, null, 2));
      throw error;
    }

  } catch (error: any) {
    console.error('\n❌ Test failed!');
    console.error(error);
    process.exit(1);
  }
}

testComposioCalendar();
