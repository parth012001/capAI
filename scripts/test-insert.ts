/**
 * Test INSERT to see what ID gets assigned
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function testInsert() {
  const client = await pool.connect();

  try {
    console.log('🧪 Testing INSERT into emails table...\n');

    // Test INSERT (will rollback)
    await client.query('BEGIN');

    const testInsert = `
      INSERT INTO emails (
        gmail_id, thread_id, subject, from_email, to_email, body,
        received_at, is_read, webhook_processed, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
      RETURNING id, gmail_id
    `;

    const testValues = [
      'TEST_GMAIL_ID_' + Date.now(),
      'TEST_THREAD_ID',
      'Test Email Subject',
      'test@example.com',
      'user@example.com',
      'Test body',
      new Date(),
      false,
      'c4598eb971248b845da597f8b467a06e'  // Your user ID
    ];

    console.log('Attempting INSERT with these values:');
    console.log(`   Gmail ID: ${testValues[0]}`);
    console.log(`   User ID: ${testValues[8]}\n`);

    const result = await client.query(testInsert, testValues);

    console.log('✅ INSERT succeeded!');
    console.log(`   Assigned ID: ${result.rows[0].id}`);
    console.log(`   Gmail ID: ${result.rows[0].gmail_id}\n`);

    await client.query('ROLLBACK');
    console.log('✅ Transaction rolled back (test data not saved)\n');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ INSERT failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    if (error.detail) {
      console.error(`   Detail: ${error.detail}\n`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

testInsert();
