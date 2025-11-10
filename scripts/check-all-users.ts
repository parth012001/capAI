/**
 * Check all users in production database
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAllUsers() {
  try {
    console.log('🔍 Checking all users in database...\n');

    const usersQuery = `
      SELECT
        user_id,
        gmail_address,
        auth_method,
        composio_entity_id,
        webhook_active,
        created_at
      FROM user_gmail_tokens
      ORDER BY created_at DESC;
    `;

    const users = await pool.query(usersQuery);

    console.log(`📊 Total users: ${users.rows.length}\n`);

    users.rows.forEach((user, i) => {
      console.log(`${i + 1}. ${user.gmail_address}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Auth Method: ${user.auth_method || 'google_oauth (legacy)'}`);
      console.log(`   Composio Entity: ${user.composio_entity_id || 'None'}`);
      console.log(`   Webhook Active: ${user.webhook_active}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAllUsers();
