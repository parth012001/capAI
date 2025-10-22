import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { user_gmail_tokens } from '../src/db/migrations/schema';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

async function checkOnboardingFlow() {
  const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString: neonUrl,
  });

  const db = drizzle(pool);

  try {
    console.log('🔍 Checking onboarding flow for recent users...\n');

    // Check recent users (jalmaster2406 and parthahir01062001)
    const recentEmails = ['jalmaster2406@gmail.com', 'parthahir01062001@gmail.com'];

    for (const email of recentEmails) {
      console.log(`\n📧 Checking: ${email}`);
      console.log('='.repeat(60));

      const user = await db.select().from(user_gmail_tokens).where(eq(user_gmail_tokens.gmail_address, email));

      if (user.length === 0) {
        console.log('❌ User not found');
        continue;
      }

      const userData = user[0];
      console.log(`User ID: ${userData.user_id}`);
      console.log(`First Name: ${userData.first_name || '❌ NULL'}`);
      console.log(`Last Name: ${userData.last_name || '❌ NULL'}`);
      console.log(`Full Name: ${userData.full_name || '❌ NULL'}`);
      console.log(`Onboarding Completed: ${userData.onboarding_completed ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`Webhook Active: ${userData.webhook_active ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`Created At: ${userData.created_at}`);
      console.log(`Updated At: ${userData.updated_at}`);
      console.log('');

      // Analysis
      if (!userData.first_name && !userData.last_name) {
        console.log('⚠️  ISSUE: Name fields are NULL - user never completed ProfileSetup');
      }

      if (!userData.onboarding_completed) {
        console.log('⚠️  ISSUE: onboarding_completed is FALSE - flag was never set');
      }

      if (!userData.first_name && !userData.onboarding_completed) {
        console.log('💡 DIAGNOSIS: User went directly to /onboarding without going through /profile-setup');
        console.log('   This means AuthCallback redirected directly to /onboarding, skipping ProfileSetup');
      }
    }

    console.log('\n\n🔍 Checking old users for comparison...\n');

    const oldEmails = ['parthahir012001@gmail.com', 'p.ahiir01@gmail.com'];

    for (const email of oldEmails) {
      console.log(`\n📧 Checking: ${email}`);
      console.log('='.repeat(60));

      const user = await db.select().from(user_gmail_tokens).where(eq(user_gmail_tokens.gmail_address, email));

      if (user.length === 0) {
        console.log('❌ User not found');
        continue;
      }

      const userData = user[0];
      console.log(`User ID: ${userData.user_id}`);
      console.log(`First Name: ${userData.first_name || '❌ NULL'}`);
      console.log(`Last Name: ${userData.last_name || '❌ NULL'}`);
      console.log(`Full Name: ${userData.full_name || '❌ NULL'}`);
      console.log(`Onboarding Completed: ${userData.onboarding_completed ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`Created At: ${userData.created_at}`);
      console.log(`Updated At: ${userData.updated_at}`);
      console.log('');

      if (userData.first_name && userData.onboarding_completed) {
        console.log('✅ This user has BOTH name and onboarding_completed=true');
        console.log('   Likely manually updated OR went through a different flow');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkOnboardingFlow();
