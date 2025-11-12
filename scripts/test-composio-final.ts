import dotenv from 'dotenv';
dotenv.config();

import { Composio } from 'composio-core';

async function testComposio() {
  console.log('🧪 Testing Composio with useComposioAuth=true...\n');

  try {
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY!
    });
    console.log('✓ Composio SDK initialized\n');

    const testUserId = 'test_user_' + Date.now();

    console.log('Testing Calendar connection...');
    const connection: any = await composio.connectedAccounts.initiate({
      integrationId: 'googlecalendar',
      entityId: testUserId,
      redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`,
      config: {
        useComposioAuth: true
      }
    });

    console.log('\n✅ SUCCESS!');
    console.log('Redirect URL:', connection.redirectUrl);
    console.log('Connection ID:', connection.connectionId || connection.id);
    console.log('\n🎉 Composio Calendar integration is working correctly!');
  } catch (error: any) {
    console.error('\n❌ Failed!');
    console.error('Error:', error.message);
    console.error('Description:', error.description);
    process.exit(1);
  }
}

testComposio();
