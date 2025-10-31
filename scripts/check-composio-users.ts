/**
 * Check Composio users in database
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkComposioUsers() {
  try {
    console.log('🔍 Checking Composio users in database...\n');

    // Check Composio users
    const composioQuery = `
      SELECT user_id, gmail_address, composio_entity_id, auth_method, webhook_active
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
    `;
    const composioResult = await pool.query(composioQuery);

    if (composioResult.rows.length > 0) {
      console.log(`✅ Found ${composioResult.rows.length} Composio user(s):\n`);
      composioResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. User ID: ${row.user_id}`);
        console.log(`   Email: ${row.gmail_address}`);
        console.log(`   Entity ID: ${row.composio_entity_id || 'NOT SET'}`);
        console.log(`   Auth Method: ${row.auth_method}`);
        console.log(`   Webhook Active: ${row.webhook_active}\n`);
      });
    } else {
      console.log('⚠️  No Composio users found\n');
    }

    // Check all users
    const allUsersQuery = `
      SELECT user_id, gmail_address, composio_entity_id, auth_method
      FROM user_gmail_tokens
      LIMIT 10
    `;
    const allUsersResult = await pool.query(allUsersQuery);

    if (allUsersResult.rows.length > 0) {
      console.log(`📋 Total users in database: ${allUsersResult.rows.length} (showing first 10):\n`);
      allUsersResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.gmail_address} (${row.auth_method || 'oauth'})`);
        if (row.composio_entity_id) {
          console.log(`   Entity ID: ${row.composio_entity_id}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkComposioUsers();
