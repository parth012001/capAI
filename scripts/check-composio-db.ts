import { pool } from '../src/database/connection';

async function checkComposioData() {
  console.log('🔍 Checking Composio connection data in database...\n');

  try {
    // Check user record
    const userResult = await pool.query(`
      SELECT
        user_id,
        gmail_address,
        composio_entity_id,
        composio_connected_account_id,
        composio_connected_at,
        auth_method,
        migration_status
      FROM user_gmail_tokens
      WHERE gmail_address = 'p.ahiir01@gmail.com'
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ No user found with email p.ahiir01@gmail.com');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('📊 User Record:');
    console.log('  User ID:', user.user_id);
    console.log('  Gmail:', user.gmail_address);
    console.log('  Composio Entity ID:', user.composio_entity_id || '❌ NOT SET');
    console.log('  Composio Connected Account ID:', user.composio_connected_account_id || '❌ NOT SET');
    console.log('  Composio Connected At:', user.composio_connected_at || '❌ NOT SET');
    console.log('  Auth Method:', user.auth_method || 'google_oauth');
    console.log('  Migration Status:', user.migration_status || 'pending');

    console.log('\n📝 Summary:');
    if (user.composio_entity_id) {
      console.log('✅ Composio entity ID is set');
    } else {
      console.log('❌ Composio entity ID is NOT set');
    }

    if (user.composio_connected_account_id) {
      console.log('✅ Composio connected account ID is set');
    } else {
      console.log('❌ Composio connected account ID is NOT set');
    }

    if (user.composio_connected_at) {
      console.log('✅ Connection timestamp is recorded');
    } else {
      console.log('❌ Connection timestamp is NOT recorded');
    }

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkComposioData();
