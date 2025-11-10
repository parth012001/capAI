/**
 * Find ALL user activity across all tables
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function findAllActivity() {
  try {
    console.log('🔍 Finding ALL user activity in database...\n');
    console.log('='.repeat(60) + '\n');

    // Get all unique user_ids from emails
    console.log('1️⃣ UNIQUE USERS FROM EMAILS:');
    const emailQuery = `
      SELECT DISTINCT e.user_id, u.gmail_address, COUNT(*) as email_count
      FROM emails e
      LEFT JOIN user_gmail_tokens u ON e.user_id = u.user_id
      GROUP BY e.user_id, u.gmail_address
      ORDER BY email_count DESC;
    `;
    const emails = await pool.query(emailQuery);
    console.log(`   Found ${emails.rows.length} users with emails:\n`);
    emails.rows.forEach(row => {
      console.log(`   ${row.gmail_address || 'UNKNOWN'} (${row.user_id}): ${row.email_count} emails`);
    });

    // Check user_profiles
    console.log('\n2️⃣ USERS IN user_profiles:');
    const profilesQuery = `
      SELECT user_id, email, full_name, created_at
      FROM user_profiles
      ORDER BY created_at DESC;
    `;
    const profiles = await pool.query(profilesQuery);
    console.log(`   Found ${profiles.rows.length} user profiles:\n`);
    profiles.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.email || 'No email'} (${row.full_name || 'No name'})`);
      console.log(`      User ID: ${row.user_id}`);
      console.log(`      Created: ${row.created_at}\n`);
    });

    // Check tone_profiles for users
    console.log('3️⃣ USERS IN tone_profiles:');
    const toneQuery = `
      SELECT DISTINCT user_id
      FROM tone_profiles;
    `;
    const tone = await pool.query(toneQuery);
    console.log(`   Found ${tone.rows.length} users with tone profiles\n`);

    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

findAllActivity();
