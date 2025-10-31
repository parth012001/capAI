/**
 * Debug email table structure and sequence
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function debugEmailTable() {
  try {
    console.log('🔍 Debugging emails table...\n');

    // Check table structure
    console.log('1️⃣ Table columns:');
    const columnsQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'emails'
      ORDER BY ordinal_position
      LIMIT 15;
    `;
    const columns = await pool.query(columnsQuery);
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });

    // Check primary key
    console.log('\n2️⃣ Primary key:');
    const pkQuery = `
      SELECT constraint_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'emails' AND constraint_name LIKE '%pkey%';
    `;
    const pk = await pool.query(pkQuery);
    pk.rows.forEach(row => {
      console.log(`   ${row.constraint_name}: ${row.column_name}`);
    });

    // Check unique constraints
    console.log('\n3️⃣ Unique constraints:');
    const uniqueQuery = `
      SELECT constraint_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'emails' AND constraint_name LIKE '%unique%';
    `;
    const unique = await pool.query(uniqueQuery);
    if (unique.rows.length > 0) {
      unique.rows.forEach(row => {
        console.log(`   ${row.constraint_name}: ${row.column_name}`);
      });
    } else {
      console.log('   No unique constraints found');
    }

    // Check sequence current value
    console.log('\n4️⃣ ID sequence status:');
    const seqQuery = `
      SELECT last_value, is_called
      FROM emails_id_seq;
    `;
    const seq = await pool.query(seqQuery);
    console.log(`   Last value: ${seq.rows[0].last_value}`);
    console.log(`   Is called: ${seq.rows[0].is_called}`);

    // Check max ID in table
    console.log('\n5️⃣ Max ID in table:');
    const maxQuery = `SELECT MAX(id) as max_id FROM emails;`;
    const maxResult = await pool.query(maxQuery);
    console.log(`   Max ID: ${maxResult.rows[0].max_id}`);

    // Check if sequence is behind
    const maxId = parseInt(maxResult.rows[0].max_id || '0');
    const seqValue = parseInt(seq.rows[0].last_value);
    if (maxId >= seqValue) {
      console.log('\n⚠️  PROBLEM FOUND: Sequence is behind the max ID!');
      console.log(`   Sequence: ${seqValue}`);
      console.log(`   Max ID: ${maxId}`);
      console.log(`   Next insert will try to use ${seqValue + 1}, which likely already exists!\n`);
    } else {
      console.log('\n✅ Sequence is ahead of max ID (good)\n');
    }

    // Check recent emails
    console.log('6️⃣ Recent emails (last 5):');
    const recentQuery = `
      SELECT id, gmail_id, subject, user_id, webhook_processed
      FROM emails
      ORDER BY id DESC
      LIMIT 5;
    `;
    const recent = await pool.query(recentQuery);
    recent.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.subject?.substring(0, 40)} (user: ${row.user_id?.substring(0, 8)}...)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugEmailTable();
