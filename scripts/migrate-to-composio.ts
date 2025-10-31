/**
 * Migrate existing user to Composio
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateToComposio() {
  try {
    const entityId = 'entity_e7ac7d60-e87c-4094-af88-85c9a4312ce6';
    const email = 'parthahir012001@gmail.com'; // The email receiving webhooks

    console.log('🔄 Migrating user to Composio...\n');
    console.log(`   Email: ${email}`);
    console.log(`   Entity ID: ${entityId}\n`);

    // Update the user to use Composio
    const updateQuery = `
      UPDATE user_gmail_tokens
      SET
        auth_method = 'composio',
        composio_entity_id = $1
      WHERE gmail_address = $2
      RETURNING user_id, gmail_address, composio_entity_id, auth_method
    `;

    const result = await pool.query(updateQuery, [entityId, email]);

    if (result.rows.length > 0) {
      console.log('✅ Successfully migrated user to Composio!\n');
      console.log('📋 Updated record:');
      console.log(`   User ID: ${result.rows[0].user_id}`);
      console.log(`   Email: ${result.rows[0].gmail_address}`);
      console.log(`   Entity ID: ${result.rows[0].composio_entity_id}`);
      console.log(`   Auth Method: ${result.rows[0].auth_method}\n`);

      console.log('🎉 Done! Send a new test email to verify webhooks work.\n');
    } else {
      console.log(`❌ User with email ${email} not found in database\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

migrateToComposio();
