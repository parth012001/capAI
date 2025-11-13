import dotenv from 'dotenv';
dotenv.config();
import { Composio } from '@composio/core';

(async () => {
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

  const userId = 'fdbc82643d940e5b9f861d319c5f880e';
  const entityId = `user_${userId}`;

  console.log(`🔍 Checking connections for: parth@getcaptainapp.com`);
  console.log(`   Entity ID: ${entityId}\n`);

  const accounts: any = await composio.connectedAccounts.list({
    entityId: entityId
  });

  const allAccounts = Array.isArray(accounts?.items) ? accounts.items : [];

  console.log(`Total accounts: ${allAccounts.length}\n`);

  // Group by auth config
  const calendarAccounts = allAccounts.filter((a: any) => a.authConfig?.id === 'ac_k53apWo91X9Y');
  const gmailAccounts = allAccounts.filter((a: any) => a.authConfig?.id === 'ac_M2QcFWIKvXv0');

  console.log(`📧 Gmail connections (${gmailAccounts.length}):`);
  gmailAccounts.forEach((acc: any) => {
    console.log(`  - ${acc.id} | Status: ${acc.status} | Created: ${acc.createdAt}`);
  });

  console.log(`\n📅 Calendar connections (${calendarAccounts.length}):`);
  calendarAccounts.forEach((acc: any) => {
    console.log(`  - ${acc.id} | Status: ${acc.status} | Created: ${acc.createdAt}`);
  });

  console.log('\n');
})();
