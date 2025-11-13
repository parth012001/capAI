import dotenv from 'dotenv';
dotenv.config();
import { Composio } from '@composio/core';

(async () => {
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

  const userId = '09d94485bd9a445d373044011f7cdc2b';
  const entityId = `user_${userId}`;

  console.log('📧 Testing Gmail fetch via Composio...\n');
  console.log(`Entity ID: ${entityId}\n`);

  try {
    // Fetch emails using Composio action
    const result: any = await composio.actions.execute({
      actionName: 'GMAIL_FETCH_EMAILS',
      requestBody: {
        entityId: entityId,
        input: {
          maxResults: 5,
          query: ''
        }
      }
    });

    console.log('✅ Gmail fetch successful!\n');
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.data?.messages) {
      console.log(`\n📊 Found ${result.data.messages.length} emails`);
      result.data.messages.forEach((msg: any, i: number) => {
        console.log(`  ${i + 1}. ${msg.subject || '(no subject)'}`);
      });
    }
  } catch (error: any) {
    console.error('❌ Gmail fetch failed:', error.message);
    if (error.response?.data) {
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
})();
