import dotenv from 'dotenv';
dotenv.config();

async function testSync() {
  console.log('🔄 Testing Composio sync endpoint...\n');

  try {
    // You'll need to get your JWT token from the browser
    const token = process.env.TEST_JWT_TOKEN;

    if (!token) {
      console.log('❌ Please set TEST_JWT_TOKEN in .env file');
      console.log('   Get it from browser localStorage or network tab');
      return;
    }

    const response = await fetch('http://localhost:3000/api/integrations/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Sync successful!');
      console.log(`Connected Account ID: ${data.connectedAccountId}`);
      console.log(`Gmail accounts: ${data.accounts.gmail.length}`);
      console.log(`Calendar accounts: ${data.accounts.calendar.length}`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testSync();
