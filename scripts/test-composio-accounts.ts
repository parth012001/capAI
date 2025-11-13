import dotenv from 'dotenv';
dotenv.config();
import { Composio } from '@composio/core';
import { pool } from '../src/database/connection';

async function testComposioAccounts() {
  console.log('🔍 Fetching connected accounts from Composio API...\n');

  try {
    const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

    // User ID from database
    const userId = '09d94485bd9a445d373044011f7cdc2b';
    const entityId = `user_${userId}`;

    // Fetch from Composio API
    console.log(`📡 Calling Composio API for entity: ${entityId}\n`);
    const accounts: any = await composio.connectedAccounts.list({
      entityId: entityId
    });

    console.log('✅ API Response:');
    console.log(JSON.stringify(accounts, null, 2));
    console.log('\n');

    // Fetch from database
    const dbResult = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        composio_entity_id,
        composio_connected_account_id,
        composio_connected_at,
        auth_method
      FROM user_gmail_tokens
      WHERE user_id = $1
    `, [userId]);

    console.log('💾 Database Record:');
    console.log(JSON.stringify(dbResult.rows[0], null, 2));
    console.log('\n');

    // Compare
    console.log('🔄 Comparison:');
    const dbAccountId = dbResult.rows[0]?.composio_connected_account_id;
    const apiAccountIds = Array.isArray(accounts?.items)
      ? accounts.items.map((acc: any) => acc.id)
      : [];

    console.log(`Database has: ${dbAccountId || 'NONE'}`);
    console.log(`Composio API has: ${apiAccountIds.length > 0 ? apiAccountIds.join(', ') : 'NONE'}`);

    if (dbAccountId && !apiAccountIds.includes(dbAccountId)) {
      console.log('\n❌ MISMATCH: Database ID not found in Composio API!');
    } else if (dbAccountId && apiAccountIds.includes(dbAccountId)) {
      console.log('\n✅ MATCH: Database ID exists in Composio API');
    } else if (!dbAccountId && apiAccountIds.length > 0) {
      console.log('\n⚠️ Database missing ID, but Composio has accounts:');
      accounts.items.forEach((acc: any) => {
        console.log(`  - ${acc.id} (${acc.appName})`);
      });
    }

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testComposioAccounts();
