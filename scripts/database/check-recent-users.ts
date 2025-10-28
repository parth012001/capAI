import { pool, closePool } from '../../src/database/connection';

async function checkRecentUsers() {
  try {
    console.log('📊 Checking recent users in database...\n');

    const result = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        created_at,
        onboarding_completed
      FROM user_gmail_tokens
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No users found in database\n');
    } else {
      console.log(`✅ Found ${result.rows.length} recent users:\n`);

      result.rows.forEach((user, i) => {
        console.log(`${i + 1}. ${user.gmail_address || 'NULL'}`);
        console.log(`   User ID: ${user.user_id.substring(0, 16)}...`);
        console.log(`   Onboarding: ${user.onboarding_completed ? 'Done' : 'Pending'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    }

    await closePool();
  } catch (error) {
    console.error('❌ Error:', error);
    await closePool();
    process.exit(1);
  }
}

checkRecentUsers();
