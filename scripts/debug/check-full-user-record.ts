/**
 * Check full user record to see all fields
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

async function checkFullRecord() {
  try {
    console.log('🔍 Checking full user record...\n');

    const result = await pool.query(`
      SELECT *
      FROM user_gmail_tokens
      WHERE gmail_address = 'parthahir012001@gmail.com'
    `);

    if (result.rows.length === 0) {
      console.log('❌ User not found\n');
      process.exit(1);
    }

    const user = result.rows[0];

    console.log('📊 Full User Record:');
    console.log('=' .repeat(60));
    for (const [key, value] of Object.entries(user)) {
      console.log(`${key}: ${value === null ? 'NULL' : value}`);
    }
    console.log('=' .repeat(60));

    // Check if this is a mixed record
    const hasLegacyTokens = user.access_token_encrypted || user.refresh_token_encrypted;
    const hasComposioData = user.composio_entity_id || user.composio_connected_account_id;

    console.log('\n📋 Record Type Analysis:');
    console.log(`Has Legacy Google OAuth Tokens: ${hasLegacyTokens ? 'YES ⚠️' : 'NO'}`);
    console.log(`Has Composio Data: ${hasComposioData ? 'YES ✅' : 'NO'}`);
    console.log(`Auth Method: ${user.auth_method}`);
    console.log(`Webhook Active: ${user.webhook_active}`);

    if (hasLegacyTokens && hasComposioData) {
      console.log('\n⚠️  MIXED RECORD DETECTED!');
      console.log('   This user has BOTH legacy OAuth tokens AND Composio data');
      console.log('   This might be causing conflicts\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkFullRecord();
