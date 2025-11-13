import dotenv from 'dotenv';
dotenv.config();
import { Composio } from '@composio/core';
import { queryWithRetry, pool } from '../src/database/connection';

async function syncComposioAccounts() {
  console.log('🔄 Syncing Composio connected accounts to database...\n');

  try {
    const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

    // User ID from database
    const userId = '09d94485bd9a445d373044011f7cdc2b';
    const entityId = `user_${userId}`;

    // Fetch all connected accounts from Composio
    console.log(`📡 Fetching accounts from Composio for entity: ${entityId}\n`);
    const accounts: any = await composio.connectedAccounts.list({
      entityId: entityId
    });

    const allAccounts = Array.isArray(accounts?.items) ? accounts.items : [];

    console.log(`Found ${allAccounts.length} total accounts\n`);

    // Filter active Gmail and Calendar accounts
    const gmailAccounts = allAccounts.filter((acc: any) =>
      acc.toolkit?.slug === 'gmail' && acc.status === 'ACTIVE'
    ).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const calendarAccounts = allAccounts.filter((acc: any) =>
      acc.toolkit?.slug === 'googlecalendar' && acc.status === 'ACTIVE'
    ).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('Active Gmail accounts:');
    gmailAccounts.forEach((acc: any, i: number) => {
      console.log(`  ${i + 1}. ${acc.id} (created: ${new Date(acc.createdAt).toISOString()})`);
    });

    console.log('\nActive Calendar accounts:');
    calendarAccounts.forEach((acc: any, i: number) => {
      console.log(`  ${i + 1}. ${acc.id} (created: ${new Date(acc.createdAt).toISOString()})`);
    });

    // Use most recent Gmail account (preferred), fallback to Calendar
    const latestGmail = gmailAccounts[0];
    const latestCalendar = calendarAccounts[0];
    const connectedAccountId = latestGmail?.id || latestCalendar?.id;

    if (!connectedAccountId) {
      console.log('\n❌ No active accounts found to sync');
      await pool.end();
      return;
    }

    console.log(`\n✅ Using account: ${connectedAccountId} (${latestGmail ? 'Gmail' : 'Calendar'})`);

    // Update database
    const result = await queryWithRetry(
      `UPDATE user_gmail_tokens
       SET composio_connected_account_id = $1,
           composio_connected_at = NOW(),
           auth_method = 'composio',
           migration_status = 'completed'
       WHERE user_id = $2
       RETURNING *`,
      [connectedAccountId, userId]
    );

    console.log('\n💾 Database updated:');
    console.log('  User ID:', result.rows[0].user_id);
    console.log('  Gmail:', result.rows[0].gmail_address);
    console.log('  Entity ID:', result.rows[0].composio_entity_id);
    console.log('  Connected Account ID:', result.rows[0].composio_connected_account_id);
    console.log('  Connected At:', result.rows[0].composio_connected_at);
    console.log('  Auth Method:', result.rows[0].auth_method);
    console.log('  Migration Status:', result.rows[0].migration_status);

    console.log('\n✅ Sync completed successfully!');

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

syncComposioAccounts();
