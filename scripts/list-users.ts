import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { user_gmail_tokens } from '../src/db/migrations/schema';
import dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
  const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  console.log('🔗 Using Neon Database:', neonUrl?.includes('neon.tech') ? '✅ Neon' : '❌ Local');

  const pool = new Pool({
    connectionString: neonUrl,
  });

  const db = drizzle(pool);

  try {
    console.log('📧 Fetching all signed up users from Neon DB...\n');

    const users = await db.select({
      gmail_address: user_gmail_tokens.gmail_address,
      user_id: user_gmail_tokens.user_id,
      first_name: user_gmail_tokens.first_name,
      last_name: user_gmail_tokens.last_name,
      full_name: user_gmail_tokens.full_name,
      onboarding_completed: user_gmail_tokens.onboarding_completed,
      webhook_active: user_gmail_tokens.webhook_active,
      created_at: user_gmail_tokens.created_at,
    }).from(user_gmail_tokens);

    console.log(`Found ${users.length} user(s):\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.gmail_address}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   First Name: ${user.first_name || 'NULL'}`);
      console.log(`   Last Name: ${user.last_name || 'NULL'}`);
      console.log(`   Full Name: ${user.full_name || 'NULL'}`);
      console.log(`   Onboarded: ${user.onboarding_completed ? '✅' : '❌'}`);
      console.log(`   Webhook Active: ${user.webhook_active ? '✅' : '❌'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await pool.end();
  }
}

listUsers();
