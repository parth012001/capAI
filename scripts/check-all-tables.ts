/**
 * Check all user-related tables in database
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAllTables() {
  try {
    console.log('🔍 Checking all user-related data in database...\n');
    console.log('='.repeat(60) + '\n');

    // Check user_gmail_tokens table
    console.log('1️⃣ USER_GMAIL_TOKENS TABLE:');
    const tokensQuery = `
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN auth_method = 'composio' THEN 1 END) as composio_users,
             COUNT(CASE WHEN auth_method = 'google_oauth' THEN 1 END) as google_oauth_users,
             COUNT(CASE WHEN auth_method IS NULL THEN 1 END) as legacy_users
      FROM user_gmail_tokens;
    `;
    const tokens = await pool.query(tokensQuery);
    console.log(`   Total users: ${tokens.rows[0].total}`);
    console.log(`   Composio auth: ${tokens.rows[0].composio_users}`);
    console.log(`   Google OAuth: ${tokens.rows[0].google_oauth_users}`);
    console.log(`   Legacy (NULL): ${tokens.rows[0].legacy_users}\n`);

    // Check if there's a separate users table
    console.log('2️⃣ CHECKING FOR OTHER USER TABLES:');
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%user%'
      ORDER BY table_name;
    `;
    const tables = await pool.query(tablesQuery);
    if (tables.rows.length > 0) {
      console.log('   Found these user-related tables:');
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
    }

    // Check emails table for unique users
    console.log('3️⃣ UNIQUE USERS IN EMAILS TABLE:');
    const emailUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as unique_users
      FROM emails
      WHERE user_id IS NOT NULL;
    `;
    const emailUsers = await pool.query(emailUsersQuery);
    console.log(`   Unique user_ids in emails: ${emailUsers.rows[0].unique_users}\n`);

    // Check auto_generated_drafts for unique users
    console.log('4️⃣ UNIQUE USERS IN AUTO_GENERATED_DRAFTS:');
    const draftUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as unique_users
      FROM auto_generated_drafts
      WHERE user_id IS NOT NULL;
    `;
    const draftUsers = await pool.query(draftUsersQuery);
    console.log(`   Unique user_ids in drafts: ${draftUsers.rows[0].unique_users}\n`);

    // List ALL users from user_gmail_tokens
    console.log('5️⃣ ALL USERS IN user_gmail_tokens:');
    const allUsersQuery = `
      SELECT gmail_address, auth_method, created_at
      FROM user_gmail_tokens
      ORDER BY created_at;
    `;
    const allUsers = await pool.query(allUsersQuery);
    allUsers.rows.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.gmail_address} (${user.auth_method || 'legacy'}) - ${user.created_at}`);
    });

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAllTables();
