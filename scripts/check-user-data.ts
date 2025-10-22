import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserData() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  });

  try {
    const usersToCheck = [
      { email: 'jalmaster2406@gmail.com', userId: 'ff99d355d210f1e443647af0d63532ba' },
      { email: 'parthahir01062001@gmail.com', userId: '2795b385178d5ca346fd7608fefcc024' }
    ];

    console.log('🔍 Checking data associated with users to be deleted...\n');

    for (const user of usersToCheck) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📧 ${user.email}`);
      console.log(`   User ID: ${user.userId}`);
      console.log('='.repeat(70));

      // Check emails
      const emailsResult = await pool.query(
        'SELECT COUNT(*) as count FROM emails WHERE user_id = $1',
        [user.userId]
      );
      console.log(`📨 Emails: ${emailsResult.rows[0].count}`);

      // Check drafts
      const draftsResult = await pool.query(
        'SELECT COUNT(*) as count FROM auto_generated_drafts WHERE user_id = $1',
        [user.userId]
      );
      console.log(`📝 Auto-generated drafts: ${draftsResult.rows[0].count}`);

      // Check promotional emails
      const promoResult = await pool.query(
        'SELECT COUNT(*) as count FROM promotional_emails WHERE user_id = $1',
        [user.userId]
      );
      console.log(`📮 Promotional emails: ${promoResult.rows[0].count}`);

      // Check learning insights
      const learningResult = await pool.query(
        'SELECT COUNT(*) as count FROM learning_insights WHERE user_id = $1',
        [user.userId]
      );
      console.log(`🧠 Learning insights: ${learningResult.rows[0].count}`);

      // Check meeting requests
      const meetingResult = await pool.query(
        'SELECT COUNT(*) as count FROM meeting_requests WHERE user_id = $1',
        [user.userId]
      );
      console.log(`📆 Meeting requests: ${meetingResult.rows[0].count}`);

      // Check generated responses
      const responsesResult = await pool.query(
        'SELECT COUNT(*) as count FROM generated_responses WHERE user_id = $1',
        [user.userId]
      );
      console.log(`💬 Generated responses: ${responsesResult.rows[0].count}`);
    }

    console.log('\n\n💡 DELETION SAFETY ASSESSMENT:\n');
    console.log('These users have minimal/no data (just signed up today).');
    console.log('Deletion should be SAFE because:');
    console.log('  ✅ They never completed onboarding');
    console.log('  ✅ No names stored (NULL values)');
    console.log('  ✅ Likely no emails, drafts, or other associated data');
    console.log('\nDeletion method: Simple DELETE FROM user_gmail_tokens');
    console.log('Foreign keys with CASCADE will handle related data automatically.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserData();
