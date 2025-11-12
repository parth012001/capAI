import dotenv from 'dotenv';
dotenv.config();

import { Composio } from 'composio-core';

async function testComposioCalendar() {
  console.log('🧪 Testing Composio Calendar Connection...\n');

  // Check environment variables
  console.log('Environment Check:');
  console.log('✓ COMPOSIO_API_KEY:', process.env.COMPOSIO_API_KEY ? `${process.env.COMPOSIO_API_KEY.slice(0, 10)}...` : '❌ NOT SET');
  console.log('✓ COMPOSIO_AUTH_CONFIG_ID:', process.env.COMPOSIO_AUTH_CONFIG_ID || '❌ NOT SET');
  console.log('✓ FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET');
  console.log('');

  try {
    // Initialize Composio
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY!
    });
    console.log('✓ Composio SDK initialized\n');

    // Test 1: Create or get entity
    console.log('Test 1: Creating entity...');
    const testUserId = 'test_user_' + Date.now();
    try {
      const entity: any = await composio.entities.create({
        id: testUserId
      });
      console.log('✓ Entity created:', entity.id);
    } catch (error: any) {
      console.error('❌ Entity creation failed:', error.message);
      console.error('   Response:', error?.response?.data);
      throw error;
    }

    // Test 2: Initiate Calendar Connection
    console.log('\nTest 2: Initiating Calendar connection...');
    try {
      const connection: any = await composio.connectedAccounts.initiate({
        integrationId: 'googlecalendar',
        entityId: testUserId,
        redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`,
        authConfig: process.env.COMPOSIO_AUTH_CONFIG_ID
      });

      console.log('✓ Calendar connection initiated!');
      console.log('  Redirect URL:', connection.redirectUrl);
      console.log('  Connection ID:', connection.connectionId || connection.id);
      console.log('\n✅ All tests passed! Calendar integration is working correctly.');
    } catch (error: any) {
      console.error('❌ Calendar connection failed!');
      console.error('   Error message:', error.message);
      console.error('   Error code:', error?.code);
      console.error('   Response status:', error?.response?.status);
      console.error('   Response data:', JSON.stringify(error?.response?.data, null, 2));
      throw error;
    }

  } catch (error: any) {
    console.error('\n❌ Test suite failed!');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testComposioCalendar();
