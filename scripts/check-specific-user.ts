import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { user_gmail_tokens } from '../src/db/migrations/schema';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

async function checkSpecificUser() {
  const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString: neonUrl,
  });

  const db = drizzle(pool);

  try {
    const email = 'ahiirparth@gmail.com';
    console.log(`🔍 Checking user: ${email}\n`);

    const user = await db.select().from(user_gmail_tokens).where(eq(user_gmail_tokens.gmail_address, email));

    if (user.length === 0) {
      console.log('❌ User not found in database!');
      return;
    }

    const userData = user[0];
    console.log('User Details:');
    console.log('='.repeat(60));
    console.log(`Email: ${userData.gmail_address}`);
    console.log(`User ID: ${userData.user_id}`);
    console.log(`First Name: ${userData.first_name || '❌ NULL'}`);
    console.log(`Last Name: ${userData.last_name || '❌ NULL'}`);
    console.log(`Full Name: ${userData.full_name || '❌ NULL'}`);
    console.log(`Onboarding Completed: ${userData.onboarding_completed ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`Webhook Active: ${userData.webhook_active ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`Created At: ${userData.created_at}`);
    console.log(`Updated At: ${userData.updated_at}`);
    console.log('');

    // Verification
    console.log('Verification:');
    console.log('='.repeat(60));
    if (userData.first_name === 'Monica') {
      console.log('✅ First name matches: Monica');
    } else {
      console.log(`❌ First name MISMATCH: Expected "Monica", got "${userData.first_name}"`);
    }

    if (userData.last_name === 'Geller') {
      console.log('✅ Last name matches: Geller');
    } else {
      console.log(`❌ Last name MISMATCH: Expected "Geller", got "${userData.last_name}"`);
    }

    if (userData.onboarding_completed) {
      console.log('✅ Onboarding completed flag is TRUE');
    } else {
      console.log('❌ Onboarding completed flag is FALSE');
    }

    // Check email count
    console.log('\n');
    const emailCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM emails WHERE user_id = $1',
      [userData.user_id]
    );
    console.log(`📨 Total emails in DB: ${emailCountResult.rows[0].count}`);

    // Check when emails were received
    const emailDatesResult = await pool.query(
      `SELECT
        received_at,
        subject,
        webhook_processed
      FROM emails
      WHERE user_id = $1
      ORDER BY received_at DESC
      LIMIT 5`,
      [userData.user_id]
    );

    if (emailDatesResult.rows.length > 0) {
      console.log('\n📧 Most Recent Emails:');
      console.log('='.repeat(60));
      emailDatesResult.rows.forEach((email, index) => {
        console.log(`${index + 1}. ${email.subject}`);
        console.log(`   Received: ${email.received_at}`);
        console.log(`   Webhook Processed: ${email.webhook_processed}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkSpecificUser();
