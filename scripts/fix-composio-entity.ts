/**
 * Fix missing Composio entity_id in user_gmail_tokens
 * This script updates the database to link a user to their Composio entity_id
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixComposioEntity() {
  try {
    console.log('🔍 Finding users without Composio entity_id...\n');

    // Get all users with auth_method = 'composio' but missing entity_id
    const usersQuery = `
      SELECT user_id, gmail_address
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
      AND (composio_entity_id IS NULL OR composio_entity_id = '')
    `;
    const usersResult = await pool.query(usersQuery);

    if (usersResult.rows.length === 0) {
      console.log('✅ No users found with missing entity_id\n');

      // Show existing entity_ids
      const existingQuery = `
        SELECT user_id, gmail_address, composio_entity_id
        FROM user_gmail_tokens
        WHERE auth_method = 'composio'
      `;
      const existing = await pool.query(existingQuery);

      if (existing.rows.length > 0) {
        console.log('📋 Existing Composio connections:');
        existing.rows.forEach(row => {
          console.log(`   User: ${row.user_id}`);
          console.log(`   Email: ${row.gmail_address}`);
          console.log(`   Entity ID: ${row.composio_entity_id}\n`);
        });
      }

      await pool.end();
      return;
    }

    console.log(`Found ${usersResult.rows.length} user(s) with missing entity_id:\n`);

    usersResult.rows.forEach(row => {
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   Email: ${row.gmail_address}\n`);
    });

    // Get entity_id from webhook logs
    console.log('🔧 To fix this, we need your Composio entity_id from the webhook.');
    console.log('   From your logs, I can see: entity_e7ac7d60-e87c-4094-af88-85c9a4312ce6\n');

    const entityId = 'entity_e7ac7d60-e87c-4094-af88-85c9a4312ce6';
    const userId = usersResult.rows[0].user_id;

    console.log(`🔄 Updating user ${userId} with entity_id: ${entityId}...\n`);

    const updateQuery = `
      UPDATE user_gmail_tokens
      SET composio_entity_id = $1
      WHERE user_id = $2 AND auth_method = 'composio'
    `;
    await pool.query(updateQuery, [entityId, userId]);

    console.log('✅ Successfully updated entity_id!\n');

    // Verify the update
    const verifyQuery = `
      SELECT user_id, gmail_address, composio_entity_id
      FROM user_gmail_tokens
      WHERE user_id = $1 AND auth_method = 'composio'
    `;
    const verify = await pool.query(verifyQuery, [userId]);

    if (verify.rows.length > 0) {
      console.log('📋 Updated record:');
      console.log(`   User ID: ${verify.rows[0].user_id}`);
      console.log(`   Email: ${verify.rows[0].gmail_address}`);
      console.log(`   Entity ID: ${verify.rows[0].composio_entity_id}\n`);
    }

    console.log('🎉 Done! Webhooks should now work.\n');
    console.log('Next step: Send a new test email to verify.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixComposioEntity();
