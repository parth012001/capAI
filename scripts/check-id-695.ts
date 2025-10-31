/**
 * Check what's at ID 695 and why it's causing conflicts
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkId695() {
  try {
    console.log('🔍 Checking ID 695...\n');

    // Check if ID 695 exists
    const query695 = `
      SELECT id, gmail_id, subject, user_id, webhook_processed, created_at
      FROM emails
      WHERE id = 695;
    `;
    const result695 = await pool.query(query695);

    if (result695.rows.length > 0) {
      console.log('✅ ID 695 EXISTS:');
      const email = result695.rows[0];
      console.log(`   Gmail ID: ${email.gmail_id}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   User: ${email.user_id}`);
      console.log(`   Webhook Processed: ${email.webhook_processed}`);
      console.log(`   Created: ${email.created_at}\n`);
    } else {
      console.log('❌ ID 695 does NOT exist\n');
    }

    // Check for the "Quick Update on the Project" email
    const quickUpdateQuery = `
      SELECT id, gmail_id, user_id, webhook_processed
      FROM emails
      WHERE subject LIKE '%Quick Update%'
      ORDER BY id DESC
      LIMIT 5;
    `;
    const quickUpdate = await pool.query(quickUpdateQuery);

    if (quickUpdate.rows.length > 0) {
      console.log('"Quick Update" emails found:');
      quickUpdate.rows.forEach(row => {
        console.log(`   ID ${row.id}: Gmail ${row.gmail_id}, User ${row.user_id?.substring(0, 8)}..., Webhook: ${row.webhook_processed}`);
      });
      console.log('');
    }

    // Check for Gmail message ID from logs: 19a2fc9ccd4048a3
    const gmailIdQuery = `
      SELECT id, gmail_id, subject, user_id, webhook_processed
      FROM emails
      WHERE gmail_id = '19a2fc9ccd4048a3';
    `;
    const gmailIdResult = await pool.query(gmailIdQuery);

    if (gmailIdResult.rows.length > 0) {
      console.log('📧 Gmail message 19a2fc9ccd4048a3 EXISTS in database:');
      gmailIdResult.rows.forEach(row => {
        console.log(`   ID ${row.id}: ${row.subject}`);
        console.log(`   User: ${row.user_id}`);
        console.log(`   Webhook Processed: ${row.webhook_processed}\n`);
      });
    } else {
      console.log('❌ Gmail message 19a2fc9ccd4048a3 NOT in database\n');
    }

    // Check constraint on (gmail_id, user_id)
    console.log('🔍 Checking for (gmail_id, user_id) constraint:');
    const constraintQuery = `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'emails' AND constraint_type = 'UNIQUE';
    `;
    const constraints = await pool.query(constraintQuery);
    if (constraints.rows.length > 0) {
      constraints.rows.forEach(row => {
        console.log(`   ${row.constraint_name}: ${row.constraint_type}`);
      });
    } else {
      console.log('   ⚠️  NO UNIQUE constraint on (gmail_id, user_id)!');
      console.log('   This means the ON CONFLICT clause won\'t work!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkId695();
