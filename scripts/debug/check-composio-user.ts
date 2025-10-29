/**
 * Check Composio user data in database
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.join(__dirname, '../../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const pool = new Pool({
  connectionString: envConfig.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUser() {
  try {
    console.log('🔍 Checking Composio user in database...\n');

    const result = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        auth_method,
        composio_entity_id,
        composio_connected_account_id,
        onboarding_completed,
        first_name,
        last_name,
        full_name,
        composio_connected_at,
        created_at
      FROM user_gmail_tokens
      WHERE auth_method = 'composio'
      ORDER BY composio_connected_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Composio user found in database\n');
      console.log('This means the OAuth callback did not save user data properly.');
      process.exit(1);
    }

    const user = result.rows[0];

    console.log('📊 User Data:');
    console.log('=' .repeat(60));
    console.log(`User ID: ${user.user_id}`);
    console.log(`Email: ${user.gmail_address}`);
    console.log(`Auth Method: ${user.auth_method}`);
    console.log(`Entity ID: ${user.composio_entity_id}`);
    console.log(`Connected Account ID: ${user.composio_connected_account_id}`);
    console.log(`Onboarding Completed: ${user.onboarding_completed}`);
    console.log(`First Name: ${user.first_name || 'NULL'}`);
    console.log(`Last Name: ${user.last_name || 'NULL'}`);
    console.log(`Full Name: ${user.full_name || 'NULL'}`);
    console.log(`Composio Connected At: ${user.composio_connected_at}`);
    console.log(`Created At: ${user.created_at}`);
    console.log('=' .repeat(60));

    // Check if onboarding is complete
    if (!user.onboarding_completed) {
      console.log('\n⚠️  User has NOT completed onboarding');
      console.log('   Frontend should show onboarding flow');
    } else {
      console.log('\n✅ User has completed onboarding');
    }

    // Check if profile data exists
    if (!user.first_name || !user.last_name) {
      console.log('\n⚠️  User profile data is missing (first_name, last_name)');
      console.log('   This might be why the system is not working');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkUser();
