import dotenv from 'dotenv';
dotenv.config();
import { Composio } from '@composio/core';

(async () => {
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

  const userId = 'fdbc82643d940e5b9f861d319c5f880e';
  const entityId = `user_${userId}`;

  console.log(`🧹 Cleaning up INITIATED connections for: parth@getcaptainapp.com\n`);

  const accounts: any = await composio.connectedAccounts.list({
    entityId: entityId
  });

  const allAccounts = Array.isArray(accounts?.items) ? accounts.items : [];
  const initiatedAccounts = allAccounts.filter((acc: any) => acc.status === 'INITIATED');

  console.log(`Found ${initiatedAccounts.length} INITIATED connections to delete:\n`);

  for (const acc of initiatedAccounts) {
    console.log(`Deleting: ${acc.id} (${acc.toolkit?.slug})`);
    try {
      await composio.connectedAccounts.delete({
        connectedAccountId: acc.id
      });
      console.log(`  ✅ Deleted\n`);
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}\n`);
    }
  }

  console.log('✅ Cleanup complete!');
})();
