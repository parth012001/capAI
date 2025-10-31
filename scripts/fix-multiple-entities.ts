/**
 * Fix multiple entity ID problem
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixMultipleEntities() {
  try {
    console.log('🔧 Fixing multiple entity ID problem...\n');

    const correctEntityId = 'entity_e7ac7d60-e87c-4094-af88-85c9a4312ce6';
    const email = 'parthahir012001@gmail.com';

    console.log(`✅ Correct entity ID: ${correctEntityId}`);
    console.log(`✅ Email: ${email}\n`);

    // Verify it exists
    const checkQuery = `
      SELECT user_id, gmail_address, composio_entity_id, auth_method
      FROM user_gmail_tokens
      WHERE composio_entity_id = $1;
    `;
    const check = await pool.query(checkQuery, [correctEntityId]);

    if (check.rows.length > 0) {
      console.log('✅ Entity ID is in database:\n');
      console.log(`   User ID: ${check.rows[0].user_id}`);
      console.log(`   Email: ${check.rows[0].gmail_address}`);
      console.log(`   Auth Method: ${check.rows[0].auth_method}\n`);
    } else {
      console.log('❌ Entity ID NOT found in database!\n');
    }

    console.log('⚠️  To fix the multiple webhooks problem:\n');
    console.log('1. Go to Composio dashboard: https://app.composio.dev');
    console.log('2. Find the "Connections" or "Integrations" tab');
    console.log('3. Look for Gmail connections for parthahir012001@gmail.com');
    console.log('4. Delete any connections EXCEPT the one with entity ID:');
    console.log(`   ${correctEntityId}\n`);
    console.log('5. Keep only ONE Gmail connection active\n');

    console.log('This will stop the duplicate webhooks and fix the race condition.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixMultipleEntities();
